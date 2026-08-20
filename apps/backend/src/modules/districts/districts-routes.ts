import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreateDistrictRequestSchema } from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import {
  listDistricts,
  getDistrictById,
  createDistrict,
  activateDistrict,
  DistrictNameExistsError,
  DistrictNotFoundError,
  DistrictAlreadyActiveError,
  DistrictNotReadyForActivationError,
  DistrictInvalidStatusError,
} from './districts-service.js';
import {
  evaluateDistrictReadiness,
  confirmDistrictDisclosure,
} from './districts-readiness.js';

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

    // 4. Get district activation readiness
    scope.get(
      '/api/v1/districts/:districtId/readiness',
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
          const readiness = await evaluateDistrictReadiness(db, districtId);
          return reply.status(200).send({ readiness });
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

    // 5. Confirm district external disclosure
    scope.post(
      '/api/v1/districts/:districtId/disclosure-confirmation',
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

        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Авторизациядан ўтилмаган.',
            },
          });
        }

        try {
          const result = await confirmDistrictDisclosure(
            db,
            districtId,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            }
          );
          return reply.status(200).send(result);
        } catch (err: unknown) {
          if (err instanceof DistrictNotFoundError) {
            return reply.status(404).send({
              error: {
                code: err.code,
                message: 'Туман топилмади.',
              },
            });
          }
          if (err instanceof DistrictAlreadyActiveError) {
            return reply.status(409).send({
              error: {
                code: err.code,
                message: 'Туман аллақачон фаоллаштирилган.',
              },
            });
          }
          throw err;
        }
      }
    );

    // 6. Activate district
    scope.post(
      '/api/v1/districts/:districtId/activate',
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

        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Авторизациядан ўтилмаган.',
            },
          });
        }

        try {
          const result = await activateDistrict(
            db,
            districtId,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            }
          );
          return reply.status(200).send(result);
        } catch (err: unknown) {
          if (err instanceof DistrictNotFoundError) {
            return reply.status(404).send({
              error: {
                code: err.code,
                message: 'Туман топилмади.',
              },
            });
          }
          if (err instanceof DistrictNotReadyForActivationError) {
            return reply.status(409).send({
              error: {
                code: err.code,
                message: err.message,
                blockers: err.blockers,
              },
            });
          }
          if (err instanceof DistrictAlreadyActiveError) {
            return reply.status(409).send({
              error: {
                code: err.code,
                message: 'Туман аллақачон фаоллаштирилган.',
              },
            });
          }
          if (err instanceof DistrictInvalidStatusError) {
            return reply.status(409).send({
              error: {
                code: err.code,
                message: err.message,
              },
            });
          }
          throw err;
        }
      }
    );
  });
}


