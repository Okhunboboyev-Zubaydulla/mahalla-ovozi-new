import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  SignInRequestSchema,
  FirstSignInPasswordChangeRequestSchema,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { accounts, districts, sessions } from '../../adapters/db/schema/index.js';
import { eq, and, ne, isNull } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../../adapters/crypto/argon2.js';
import { validatePassword } from '../../adapters/crypto/password-policy.js';
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  buildRateLimitKey,
} from './rate-limiter.js';
import {
  createSession,
  validateAndTouchSession,
  revokeSessionByToken,
  COOKIE_NAME,
} from './session-manager.js';
import { verifyStateChangingOrigin } from './origin-guard.js';
import { recordAuditEvent } from '../audit/audit-service.js';


// Pre-computed dummy hash to equalise timing when the account is not found (B1).
// This prevents user enumeration via response-time measurement.
const DUMMY_HASH = await hashPassword('dummy-timing-equaliser-password-2026');

export function registerAuthRoutes(fastify: FastifyInstance, db: DbClient) {
  // Pre-handler hook for origin verification on state-changing methods
  fastify.addHook('preHandler', verifyStateChangingOrigin);

  // 1. Sign In
  fastify.post('/api/v1/auth/sign-in', async (req: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
    const parseResult = SignInRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Фойдаланувчи номи ёки парол талаблари нотўғри.',
        },
      });
    }

    const { username, password } = parseResult.data;
    const ip = req.ip || '127.0.0.1';
    const rateLimitKey = buildRateLimitKey(ip, username);

    // Check rate limit
    const rateLimitStatus = await checkRateLimit(db, rateLimitKey);
    if (rateLimitStatus.isLocked) {
      if (rateLimitStatus.retryAfterSeconds) {
        reply.header('Retry-After', rateLimitStatus.retryAfterSeconds.toString());
      }
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Уринишлар сони ошди. Илтимос, кейинроқ қайта уриниб кўринг.',
        },
      });
    }

    // Look up account
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.username, username.trim()))
      .limit(1);

    if (!account) {
      // B1: Run dummy Argon2id verification to equalise response time and prevent
      // user enumeration via timing differences between found/not-found paths.
      await verifyPassword(DUMMY_HASH, password);
      await recordFailedAttempt(db, rateLimitKey);
      await recordAuditEvent(db, {
        action: 'AUTH_SIGN_IN_FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        metadata: { username, reason: 'ACCOUNT_NOT_FOUND' },
      });
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Нотўғри фойдаланувчи номи ёки парол.',
        },
      });
    }

    // Verify password with Argon2id
    const isPasswordValid = await verifyPassword(account.passwordHash, password);
    if (!isPasswordValid) {
      await recordFailedAttempt(db, rateLimitKey);
      await recordAuditEvent(db, {
        actorId: account.id,
        actorRole: account.role,
        action: 'AUTH_SIGN_IN_FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        metadata: { username, reason: 'INVALID_PASSWORD' },
      });
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Нотўғри фойдаланувчи номи ёки парол.',
        },
      });
    }

    // Security check: Verify account status is ACTIVE only AFTER password verification
    // to prevent probing disabled account statuses.
    if (account.status !== 'ACTIVE') {
      await recordFailedAttempt(db, rateLimitKey);
      await recordAuditEvent(db, {
        actorId: account.id,
        actorRole: account.role,
        action: 'AUTH_SIGN_IN_FAILURE',
        ipAddress: ip,
        userAgent: req.headers['user-agent'],
        metadata: { username, reason: 'ACCOUNT_DISABLED' },
      });
      return reply.status(401).send({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Нотўғри фойдаланувчи номи ёки парол.',
        },
      });
    }

    // Security check: If role is DISTRICT_HOKIM, ensure assigned district is ACTIVE (AC 6)
    if (account.role === 'DISTRICT_HOKIM') {
      if (!account.districtId) {
        return reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Ҳоким аккаунти туманга бириктирилмаган.',
          },
        });
      }

      const [district] = await db
        .select()
        .from(districts)
        .where(eq(districts.id, account.districtId))
        .limit(1);

      if (!district || district.status !== 'ACTIVE') {
        await recordAuditEvent(db, {
          actorId: account.id,
          actorRole: account.role,
          action: 'AUTH_SIGN_IN_FAILURE',
          ipAddress: ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            username,
            districtId: account.districtId,
            districtStatus: district?.status ?? 'NOT_FOUND',
            reason: 'DISTRICT_NOT_ACTIVE',
          },
        });
        return reply.status(403).send({
          error: {
            code: 'DISTRICT_NOT_ACTIVE',
            message: 'Туман ҳали фаоллаштирилмаган ёки фаолияти тўхтатилган.',
          },
        });
      }
    }

    // Reset rate limiter on successful authentication
    await resetRateLimit(db, rateLimitKey);

    // Create session with concurrency check
    let sessionResult;
    try {
      sessionResult = await createSession(db, {
        accountId: account.id,
        expectedCredentialVersion: account.credentialVersion,
      });
    } catch (err) {
      // B5: Only concurrency conflicts (credential changed between login and session creation)
      // return 401. All other errors (DB down, OOM) propagate as 500 via the global error handler.
      const message = err instanceof Error ? err.message : '';
      if (message === 'CREDENTIAL_CONCURRENCY_CONFLICT') {
        return reply.status(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Нотўғри фойдаланувчи номи ёки парол.',
          },
        });
      }
      throw err;
    }

    // B4: __Host- prefixed cookies require Secure=true per RFC 6265bis §4.1.3.
    // Development must use HTTPS (e.g. `vite --https` with a self-signed cert).
    reply.setCookie(COOKIE_NAME, sessionResult.sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: sessionResult.expiresAt,
    });

    await recordAuditEvent(db, {
      actorId: account.id,
      actorRole: account.role,
      action: 'AUTH_SIGN_IN_SUCCESS',
      ipAddress: ip,
      userAgent: req.headers['user-agent'],
      metadata: { username: account.username },
    });

    return reply.status(200).send({
      actor: {
        id: account.id,
        role: account.role,
        username: account.username,
        districtId: account.districtId ?? null,
        mustChangePassword: account.mustChangePassword,
      },
      session: {
        expiresAt: sessionResult.expiresAt.toISOString(),
      },
    });
  });

  // 2. Sign Out
  fastify.post('/api/v1/auth/sign-out', async (req: FastifyRequest, reply: FastifyReply) => {
    const rawToken = req.cookies[COOKIE_NAME];
    if (rawToken) {
      await revokeSessionByToken(db, rawToken);
      await recordAuditEvent(db, {
        action: 'AUTH_SIGN_OUT',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    }

    reply.clearCookie(COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
    });

    return reply.status(200).send({ success: true });
  });

  // 3. Current Session
  fastify.get('/api/v1/auth/session', async (req: FastifyRequest, reply: FastifyReply) => {
    const rawToken = req.cookies[COOKIE_NAME];
    if (!rawToken) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Сессия топилмади ёки муддати тугаган.',
        },
      });
    }

    const validation = await validateAndTouchSession(db, rawToken);
    if (!validation.isValid || !validation.account || !validation.session) {
      reply.clearCookie(COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
      });
      return reply.status(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Сессия топилмади ёки муддати тугаган.',
        },
      });
    }

    return reply.status(200).send({
      actor: {
        id: validation.account.id,
        role: validation.account.role,
        username: validation.account.username,
        districtId: validation.account.districtId ?? null,
        mustChangePassword: validation.account.mustChangePassword,
      },
      session: {
        expiresAt: validation.session.expiresAt.toISOString(),
      },
    });
  });

  // 4. Change First Login Password (AC 10, 11, 12, 13, 15)
  fastify.post(
    '/api/v1/auth/change-first-login-password',
    async (req: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
      const rawToken = req.cookies[COOKIE_NAME];
      if (!rawToken) {
        return reply.status(401).send({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Сессия топилмади ёки муддати тугаган.',
          },
        });
      }

      const validation = await validateAndTouchSession(db, rawToken);
      if (!validation.isValid || !validation.account || !validation.session) {
        reply.clearCookie(COOKIE_NAME, {
          path: '/',
          httpOnly: true,
          sameSite: 'strict',
          secure: true,
        });
        return reply.status(401).send({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Сессия топилмади ёки муддати тугаган.',
          },
        });
      }

      const { account, session } = validation;

      if (account.role !== 'DISTRICT_HOKIM' || !account.mustChangePassword) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_ACTION',
            message: 'Ушбу аккаунт учун паролни мажбурий ўзгартириш талаб қилинмайди.',
          },
        });
      }

      const parseResult = FirstSignInPasswordChangeRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: parseResult.error.errors[0]?.message || 'Киритилган маълумотлар нотўғри.',
          },
        });
      }

      const { currentPassword, newPassword } = parseResult.data;

      // Verify current temporary password with Argon2id
      const isCurrentValid = await verifyPassword(account.passwordHash, currentPassword);
      if (!isCurrentValid) {
        await recordAuditEvent(db, {
          actorId: account.id,
          actorRole: account.role,
          action: 'AUTH_FIRST_LOGIN_PASSWORD_CHANGE_FAILED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { username: account.username, reason: 'INVALID_CURRENT_PASSWORD' },
        });
        return reply.status(401).send({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Жорий парол нотўғри.',
          },
        });
      }

      // Validate new password against policy (>=15 chars, <=128 code points, not on blocklist)
      const policyResult = validatePassword(newPassword);
      if (!policyResult.isValid) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: policyResult.message || 'Янги парол талабларга жавоб бермайди.',
          },
        });
      }

      // Hash new password with Argon2id
      const newPasswordHash = await hashPassword(newPassword);
      const now = new Date();
      const newCredentialVersion = account.credentialVersion + 1;

      // Atomic transaction: update account, sync current session version, revoke other sessions, log audit event
      await db.transaction(async (tx) => {
        const [updatedAccount] = await tx
          .update(accounts)
          .set({
            passwordHash: newPasswordHash,
            mustChangePassword: false,
            credentialVersion: newCredentialVersion,
            updatedAt: now,
          })
          .where(
            and(
              eq(accounts.id, account.id),
              eq(accounts.credentialVersion, account.credentialVersion)
            )
          )
          .returning();

        if (!updatedAccount) {
          throw new Error('CREDENTIAL_CONCURRENCY_CONFLICT');
        }

        // Atomically update current session's credentialVersion so it remains valid
        await tx
          .update(sessions)
          .set({
            credentialVersion: newCredentialVersion,
            lastActiveAt: now,
          })
          .where(eq(sessions.id, session.id));

        // Revoke all other active sessions for that account
        await tx
          .update(sessions)
          .set({ revokedAt: now })
          .where(
            and(
              eq(sessions.accountId, account.id),
              ne(sessions.id, session.id),
              isNull(sessions.revokedAt)
            )
          );

        // Record audit event
        await recordAuditEvent(tx, {
          actorId: account.id,
          actorRole: account.role,
          action: 'ACCOUNT_HOKIM_FIRST_LOGIN_PASSWORD_CHANGED',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: {
            accountId: account.id,
            districtId: account.districtId,
            username: account.username,
            credentialVersion: newCredentialVersion,
          },
        });
      });

      return reply.status(200).send({
        success: true,
        actor: {
          id: account.id,
          role: account.role,
          username: account.username,
          districtId: account.districtId ?? null,
          mustChangePassword: false,
        },
      });
    }
  );
}

