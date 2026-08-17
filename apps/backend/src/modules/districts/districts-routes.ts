import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateDistrictRequestSchema } from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import {
  listDistricts,
  getDistrictById,
  createDistrict,
  DistrictNameExistsError,
  DistrictNotFoundError,
} from './districts-service.js';

export function registerDistrictRoutes(fastify: FastifyInstance, db: DbClient): void {
  // P3-D & P3-E: Encapsulate district routes in a plugin scope so requireProductOwner only applies here
  fastify.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireProductOwner(db));

    // 1. List all districts
    scope.get('/api/v1/districts', async (_req: FastifyRequest, reply: FastifyReply) => {
      const districtsList = await listDistricts(db);
      return reply.status(200).send({ districts: districtsList });
    });

    // 2. Create district
    scope.post(
      '/api/v1/districts',
      async (req: FastifyRequest<{ Body: unknown }>, reply: FastifyReply) => {
        const parseResult = CreateDistrictRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Туман маълумотлари нотўғри.',
            },
          });
        }

        try {
          const district = await createDistrict(
            db,
            parseResult.data,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            }
          );
          // P3-G: Returns HTTP 201 Created on success
          return reply.status(201).send({ district });
        } catch (err: unknown) {
          if (err instanceof DistrictNameExistsError) {
            return reply.status(409).send({
              error: {
                code: err.code,
                message: 'Бу номдаги туман аллақачон мавжуд.',
              },
            });
          }
          throw err;
        }
      }
    );

    // 3. Get district by ID
    scope.get(
      '/api/v1/districts/:districtId',
      async (req: FastifyRequest<{ Params: { districtId: string } }>, reply: FastifyReply) => {
        const { districtId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Туман идентификатори талаб қилинади.',
            },
          });
        }

        try {
          const district = await getDistrictById(db, districtId);
          return reply.status(200).send({ district });
        } catch (err: unknown) {
          if (err instanceof DistrictNotFoundError) {
            return reply.status(404).send({
              error: {
                code: err.code,
                message: 'Туман топилмади.',
              },
            });
          }
          throw err;
        }
      }
    );
  });
}
