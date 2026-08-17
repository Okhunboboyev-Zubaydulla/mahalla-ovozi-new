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

export function createRequireProductOwner(db: DbClient) {
  return async function requireProductOwner(req: FastifyRequest, reply: FastifyReply): Promise<void> {
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

    if (validation.account.role !== 'PRODUCT_OWNER') {
      reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Ушбу амални бажариш учун ҳуқуқ етарли эмас.',
        },
      });
      return;
    }

    // Attach validated account to request for downstream route handlers
    req.actor = validation.account;
  };
}
