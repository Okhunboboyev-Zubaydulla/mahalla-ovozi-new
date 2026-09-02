import type { Account } from '../adapters/db/schema/index.js';

declare module 'fastify' {
  interface FastifyRequest {
    actor?: Account;
  }
}
