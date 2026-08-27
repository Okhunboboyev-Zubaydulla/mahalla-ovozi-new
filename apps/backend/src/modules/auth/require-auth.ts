import { FastifyRequest, FastifyReply } from 'fastify';
import { DbClient } from '../../adapters/db/client.js';
import { COOKIE_NAME, validateAndTouchSession } from './session-manager.js';
import { Account } from '../../adapters/db/schema/index.js';

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

    // 2. District ID requirement (for DISTRICT_HOKIM)
    if (options.requireDistrictId && !account.districtId) {
      reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Ушбу амални бажариш учун ҳуқуқ етарли эмас.',
        },
      });
      return;
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
