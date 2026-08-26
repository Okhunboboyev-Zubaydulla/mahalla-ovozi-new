import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  DistrictTopicsQuerySchema,
  DistrictTopicsSearchBodySchema,
  TopicEvidenceQuerySchema,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import {
  DistrictTopicsService,
  DistrictNotFoundError,
  DistrictRequiredError,
  InvalidCursorError,
  TopicNotFoundError,
  decodeDistrictTopicKeysetCursor,
} from '../topics/district-topics-service.js';
import { decodeEvidenceKeysetCursor } from '../topics/topic-evidence-service.js';

export function registerDistrictTopicsRoutes(fastify: FastifyInstance, db: DbClient): void {
  const districtTopicsService = new DistrictTopicsService(db);

  fastify.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireProductOwner(db));

    // 1. Get district mahallas
    scope.get(
      '/api/v1/districts/:districtId/topics/mahallas',
      async (
        req: FastifyRequest<{ Params: { districtId: string } }>,
        reply: FastifyReply,
      ) => {
        const { districtId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'DISTRICT_REQUIRED',
              message: 'Туман ID кўрсатилиши шарт.',
            },
          });
        }

        try {
          const mahallas = await districtTopicsService.getDistrictMahallas(districtId);
          return reply.status(200).send({ mahallas });
        } catch (err: unknown) {
          return handleDistrictTopicsError(err, reply);
        }
      },
    );

    // 2. Get district topics (GET)
    scope.get(
      '/api/v1/districts/:districtId/topics',
      async (
        req: FastifyRequest<{ Params: { districtId: string }; Querystring: unknown }>,
        reply: FastifyReply,
      ) => {
        const { districtId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'DISTRICT_REQUIRED',
              message: 'Туман ID кўрсатилиши шарт.',
            },
          });
        }

        const parseResult = DistrictTopicsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Сўров параметрлари нотўғри.',
            },
          });
        }

        const { cursor } = parseResult.data;
        if (cursor && !decodeDistrictTopicKeysetCursor(cursor)) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CURSOR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }

        try {
          const page = await districtTopicsService.getDistrictTopics({
            districtId,
            filter: parseResult.data,
          });
          return reply.status(200).send(page);
        } catch (err: unknown) {
          return handleDistrictTopicsError(err, reply);
        }
      },
    );

    // 3. Search district topics (POST for privacy-safe search term transmission)
    scope.post(
      '/api/v1/districts/:districtId/topics/search',
      async (
        req: FastifyRequest<{ Params: { districtId: string }; Body: unknown }>,
        reply: FastifyReply,
      ) => {
        const { districtId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'DISTRICT_REQUIRED',
              message: 'Туман ID кўрсатилиши шарт.',
            },
          });
        }

        const parseResult = DistrictTopicsSearchBodySchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Сўров параметрлари нотўғри.',
            },
          });
        }

        const { cursor } = parseResult.data;
        if (cursor && !decodeDistrictTopicKeysetCursor(cursor)) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CURSOR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }

        try {
          const page = await districtTopicsService.getDistrictTopics({
            districtId,
            filter: parseResult.data,
          });
          return reply.status(200).send(page);
        } catch (err: unknown) {
          return handleDistrictTopicsError(err, reply);
        }
      },
    );

    // 4. Get district topic evidence (GET)
    scope.get(
      '/api/v1/districts/:districtId/topics/:topicId/evidence',
      async (
        req: FastifyRequest<{
          Params: { districtId: string; topicId: string };
          Querystring: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const { districtId, topicId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'DISTRICT_REQUIRED',
              message: 'Туман ID кўрсатилиши шарт.',
            },
          });
        }
        if (!topicId || typeof topicId !== 'string' || topicId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Мавзу идентификатори киритилмаган.',
            },
          });
        }

        const parseResult = TopicEvidenceQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Сўров параметрлари нотўғри.',
            },
          });
        }

        const { cursor } = parseResult.data;
        if (cursor && !decodeEvidenceKeysetCursor(cursor)) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_CURSOR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }

        try {
          const evidenceResponse = await districtTopicsService.getDistrictTopicEvidence({
            districtId,
            topicId,
            query: parseResult.data,
          });
          return reply.status(200).send(evidenceResponse);
        } catch (err: unknown) {
          return handleDistrictTopicsError(err, reply);
        }
      },
    );
  });
}

function handleDistrictTopicsError(err: unknown, reply: FastifyReply) {
  if (err instanceof DistrictNotFoundError) {
    return reply.status(404).send({
      error: { code: 'DISTRICT_NOT_FOUND', message: err.message },
    });
  }

  if (err instanceof TopicNotFoundError) {
    return reply.status(404).send({
      error: { code: 'NOT_FOUND', message: err.message },
    });
  }

  if (err instanceof DistrictRequiredError) {
    return reply.status(400).send({
      error: { code: 'DISTRICT_REQUIRED', message: err.message },
    });
  }

  if (err instanceof InvalidCursorError) {
    return reply.status(400).send({
      error: { code: 'INVALID_CURSOR', message: err.message },
    });
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode: number }).statusCode === 'number'
  ) {
    const statusCode = (err as { statusCode: number }).statusCode;
    const code =
      'code' in err && typeof (err as { code: string }).code === 'string'
        ? (err as { code: string }).code
        : 'ERROR';
    const message = err instanceof Error ? err.message : 'Хатолик юз берди.';
    return reply.status(statusCode).send({
      error: { code, message },
    });
  }

  throw err;
}
