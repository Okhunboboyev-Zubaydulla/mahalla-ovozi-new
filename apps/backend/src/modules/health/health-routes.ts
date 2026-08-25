import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { DbClient } from '../../adapters/db/client.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { healthService, DistrictNotFoundError } from './health-service.js';
import { HealthConfig } from './health-checker.js';

const DistrictHealthParamsSchema = z.object({
  districtId: z.string().min(1, 'Туман ID киритилиши шарт.'),
});

export function registerHealthRoutes(
  server: FastifyInstance,
  deps: {
    db: DbClient;
    pool: pg.Pool;
    boss?: PgBoss;
    config?: HealthConfig;
  },
): void {
  // Encapsulated Fastify plugin scope with Product Owner auth & origin guard
  server.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireProductOwner(deps.db));

    /**
     * GET /api/v1/health/system
     * Overall system health and all-district summaries for Product Owner.
     */
    scope.get(
      '/api/v1/health/system',
      async (_req: FastifyRequest, reply: FastifyReply) => {
        const result = await healthService.getOverallSystemHealth(
          deps.db,
          deps.pool,
          deps.boss,
          deps.config,
        );
        return reply.status(200).send(result);
      },
    );

    /**
     * GET /api/v1/districts/:districtId/health
     * District-scoped health observation for Product Owner.
     */
    scope.get(
      '/api/v1/districts/:districtId/health',
      async (
        req: FastifyRequest<{ Params: { districtId: string } }>,
        reply: FastifyReply,
      ) => {
        const parseResult = DistrictHealthParamsSchema.safeParse(req.params);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.issues[0]?.message || 'Нотўғри туман ID кўрсатилди.',
              statusCode: 400,
            },
          });
        }

        try {
          const result = await healthService.getDistrictHealth(
            deps.db,
            parseResult.data.districtId,
            deps.pool,
            deps.boss,
            deps.config,
          );
          return reply.status(200).send(result);
        } catch (err) {
          if (err instanceof DistrictNotFoundError) {
            return reply.status(404).send({
              error: {
                code: 'NOT_FOUND',
                message: err.message,
                statusCode: 404,
              },
            });
          }
          throw err;
        }
      },
    );
  });
}
