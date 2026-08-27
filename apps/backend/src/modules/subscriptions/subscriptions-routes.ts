import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  UpdateDistrictSubscriptionRequestSchema,
  ListDistrictSubscriptionsResponse,
  GetDistrictSubscriptionResponse,
  UpdateDistrictSubscriptionResponse,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import { DistrictNotFoundError } from '../districts/districts-service.js';
import {
  listDistrictSubscriptions,
  getDistrictSubscription,
  updateDistrictSubscriptionMetadata,
} from './subscriptions-service.js';

export function registerSubscriptionRoutes(fastify: FastifyInstance, db: DbClient): void {
  fastify.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireProductOwner(db));

    // 1. List all district subscriptions
    scope.get('/api/v1/subscriptions', async (_req: FastifyRequest, reply: FastifyReply) => {
      const subscriptions = await listDistrictSubscriptions(db);
      const response: ListDistrictSubscriptionsResponse = { subscriptions };
      return reply.status(200).send(response);
    });

    // 2. Get single district subscription
    scope.get(
      '/api/v1/districts/:districtId/subscription',
      async (req: FastifyRequest<{ Params: { districtId: string } }>, reply: FastifyReply) => {
        const { districtId } = req.params;
        try {
          const subscription = await getDistrictSubscription(db, districtId);
          const response: GetDistrictSubscriptionResponse = { subscription };
          return reply.status(200).send(response);
        } catch (err: unknown) {
          if (err instanceof DistrictNotFoundError) {
            return reply.status(404).send({
              error: {
                code: err.code,
                message: err.message,
              },
            });
          }
          throw err;
        }
      },
    );

    // 3. Update district subscription metadata
    scope.patch(
      '/api/v1/districts/:districtId/subscription',
      async (
        req: FastifyRequest<{ Params: { districtId: string }; Body: unknown }>,
        reply: FastifyReply,
      ) => {
        const { districtId } = req.params;
        const parseResult = UpdateDistrictSubscriptionRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Обуна маълумотлари нотўғри.',
              details: parseResult.error.errors,
            },
          });
        }

        try {
          const subscription = await updateDistrictSubscriptionMetadata(
            db,
            districtId,
            parseResult.data,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            },
          );

          const response: UpdateDistrictSubscriptionResponse = {
            subscription,
            message: 'Обуна маълумотлари муваффақиятли сақланди.',
          };
          return reply.status(200).send(response);
        } catch (err: unknown) {
          if (err instanceof DistrictNotFoundError) {
            return reply.status(404).send({
              error: {
                code: err.code,
                message: err.message,
              },
            });
          }
          throw err;
        }
      },
    );
  });
}
