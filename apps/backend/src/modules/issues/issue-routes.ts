import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import {
  OperationalIssuesQuerySchema,
  OperationalIssuesQuery,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import {
  issueService,
  OperationalIssueNotFoundError,
} from './issue-service.js';

const DistrictIssueParamsSchema = z.object({
  districtId: z.string().min(1, 'Туман ID киритилиши шарт.'),
});

const IssueDetailParamsSchema = z.object({
  issueId: z.string().min(1, 'Муаммо ID киритилиши шарт.'),
});

export function registerIssueRoutes(
  server: FastifyInstance,
  deps: {
    db: DbClient;
    pool: pg.Pool;
    boss?: PgBoss;
  },
): void {
  // Encapsulated Fastify plugin scope with Product Owner auth & origin guard (Story 4.2 AC 1, AC 5)
  server.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireProductOwner(deps.db));

    /**
     * GET /api/v1/issues
     * Returns list of operational issues with optional filters for Product Owner.
     */
    scope.get(
      '/api/v1/issues',
      async (
        req: FastifyRequest<{ Querystring: OperationalIssuesQuery }>,
        reply: FastifyReply,
      ) => {
        const parseResult = OperationalIssuesQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message:
                parseResult.error.issues[0]?.message ||
                'Нотўғри қидирув параметрлари киритилди.',
              statusCode: 400,
            },
          });
        }

        const result = await issueService.getOperationalIssues(
          deps.db,
          parseResult.data,
        );
        return reply.status(200).send(result);
      },
    );

    /**
     * GET /api/v1/issues/:issueId
     * Returns operational issue detail and audit timeline for Product Owner.
     */
    scope.get(
      '/api/v1/issues/:issueId',
      async (
        req: FastifyRequest<{ Params: { issueId: string } }>,
        reply: FastifyReply,
      ) => {
        const paramResult = IssueDetailParamsSchema.safeParse(req.params);
        if (!paramResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message:
                paramResult.error.issues[0]?.message ||
                'Муаммо ID нотўғри кўрсатилди.',
              statusCode: 400,
            },
          });
        }

        try {
          const result = await issueService.getOperationalIssueDetail(
            deps.db,
            paramResult.data.issueId,
          );
          return reply.status(200).send(result);
        } catch (err) {
          if (err instanceof OperationalIssueNotFoundError) {
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

    /**
     * GET /api/v1/districts/:districtId/issues
     * Returns district-scoped operational issues for Product Owner.
     */
    scope.get(
      '/api/v1/districts/:districtId/issues',
      async (
        req: FastifyRequest<{
          Params: { districtId: string };
          Querystring: OperationalIssuesQuery;
        }>,
        reply: FastifyReply,
      ) => {
        const paramResult = DistrictIssueParamsSchema.safeParse(req.params);
        if (!paramResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message:
                paramResult.error.issues[0]?.message ||
                'Нотўғри туман ID кўрсатилди.',
              statusCode: 400,
            },
          });
        }

        const queryResult = OperationalIssuesQuerySchema.safeParse(req.query);
        const queryParams = queryResult.success ? queryResult.data : {};

        const result = await issueService.getOperationalIssues(deps.db, {
          ...queryParams,
          districtId: paramResult.data.districtId,
        });
        return reply.status(200).send(result);
      },
    );
  });
}
