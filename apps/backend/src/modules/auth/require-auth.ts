import { eq } from 'drizzle-orm';
import { FastifyRequest, FastifyReply } from 'fastify';
import { DbClient } from '../../adapters/db/client.js';
import { COOKIE_NAME, validateAndTouchSession } from './session-manager.js';
import { Account, districts } from '../../adapters/db/schema/index.js';

// Augment FastifyRequest to include authenticated actor
declare module 'fastify' {
  interface FastifyRequest {
    actor?: Account;
  }
}

export interface RequireAuthOptions {
  allowedRoles?: readonly string[];
  requireDistrictId?: boolean;
  allowMatchingDistrictOnly?: boolean;
}

/**
 * Canonical Fastify authentication and authorization preHandler guard (AD-9).
 * - Extracts and verifies session token from HTTP-only cookie.
 * - Touches session activity timestamp.
 * - Handles automated cookie clearance on invalid/expired sessions.
 * - Enforces role-based permissions and strict tenant/district isolation.
 */
export function createRequireAuth(db: DbClient, options: RequireAuthOptions = {}) {
  return async function requireAuth(
    req: FastifyRequest<{ Params?: { districtId?: string } }>,
    reply: FastifyReply,
  ): Promise<void> {
    const rawToken = req.cookies[COOKIE_NAME];
    if (!rawToken) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Сессия топилмади ёки муддати тугаган.',
        },
      });
      return;
    }

    const validation = await validateAndTouchSession(db, rawToken);
    if (!validation.isValid || !validation.account || !validation.session) {
      reply.clearCookie(COOKIE_NAME, {
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
      });
      reply.status(401).send({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Сессия топилмади ёки муддати тугаган.',
        },
      });
      return;
    }

    const { account } = validation;

    // 1. Role validation
    if (options.allowedRoles && options.allowedRoles.length > 0) {
      if (!options.allowedRoles.includes(account.role)) {
        reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Ушбу амални бажариш учун ҳуқуқ етарли эмас.',
          },
        });
        return;
      }
    }

    // 2. District ID requirement and live status check (for DISTRICT_HOKIM)
    if (account.role === 'DISTRICT_HOKIM') {
      if (!account.districtId) {
        reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Ушбу амални бажариш учун ҳуқуқ етарли эмас.',
          },
        });
        return;
      }

      const [district] = await db
        .select({
          status: districts.status,
          accessEligible: districts.accessEligible,
        })
        .from(districts)
        .where(eq(districts.id, account.districtId))
        .limit(1);

      if (!district || district.accessEligible === false) {
        reply.status(403).send({
          error: {
            code: 'DISTRICT_NOT_ACTIVE',
            message: 'Ушбу туман хизмати фаол эмас.',
          },
        });
        return;
      }

      if (district.status === 'SUSPENDED') {
        reply.status(403).send({
          error: {
            code: 'DISTRICT_SUSPENDED',
            message: 'Ушбу туман хизмати вақтинча тўхтатилган (Suspended).',
          },
        });
        return;
      }

      if (district.status === 'CANCELLED' || district.status === 'SETUP_INCOMPLETE') {
        reply.status(403).send({
          error: {
            code: 'DISTRICT_NOT_ACTIVE',
            message: 'Ушбу туман хизмати фаол эмас.',
          },
        });
        return;
      }
    }

    // 3. Strict tenant matching if requested
    if (options.allowMatchingDistrictOnly && account.role === 'DISTRICT_HOKIM') {
      const requestedDistrictId = req.params?.districtId;
      if (!requestedDistrictId || account.districtId !== requestedDistrictId) {
        reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Ушбу туман маълумотларини кўриш учун рухсат йўқ.',
          },
        });
        return;
      }
    }

    // Attach validated account to request for downstream route handlers
    req.actor = account;
  };
}

export function createRequireProductOwner(db: DbClient) {
  return createRequireAuth(db, { allowedRoles: ['PRODUCT_OWNER'] });
}

export function createRequireHokim(db: DbClient) {
  return createRequireAuth(db, {
    allowedRoles: ['DISTRICT_HOKIM'],
    requireDistrictId: true,
  });
}

export function createRequireDistrictAccess(db: DbClient) {
  return createRequireAuth(db, {
    allowedRoles: ['PRODUCT_OWNER', 'DISTRICT_HOKIM'],
    allowMatchingDistrictOnly: true,
  });
}
