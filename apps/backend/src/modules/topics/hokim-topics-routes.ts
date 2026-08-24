import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  HokimTopicBoardQuerySchema,
  HokimLaneQuerySchema,
  TopicEvidenceQuerySchema,
  HokimTopicStatisticsQuerySchema,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireHokim } from '../auth/require-hokim.js';
import { HokimTopicService, decodeKeysetCursor } from './hokim-topic-service.js';
import {
  TopicEvidenceService,
  TopicNotFoundError,
  decodeEvidenceKeysetCursor,
} from './topic-evidence-service.js';

export function registerHokimTopicsRoutes(fastify: FastifyInstance, db: DbClient): void {
  const topicService = new HokimTopicService(db);
  const topicEvidenceService = new TopicEvidenceService(db);

  fastify.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireHokim(db));

    // 1. Get district mahallas list (sorted uz-Cyrl)
    scope.get(
      '/api/v1/hokim/topics/mahallas',
      async (req: FastifyRequest, reply: FastifyReply) => {
        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Сессия топилмади ёки муддати тугаган.',
            },
          });
        }

        try {
          const mahallas = await topicService.getDistrictMahallas(
            req.actor as { id: string; districtId: string; role: string },
          );
          return reply.status(200).send({ mahallas });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Маҳаллалар рўйхатини юклашда хатолик юз берди.';
          return reply.status(400).send({
            error: {
              code: 'MAHALLAS_QUERY_ERROR',
              message,
            },
          });
        }
      },
    );

    // 2. Get today's or filtered 5-lane topic board
    scope.get(
      '/api/v1/hokim/topics/board',
      async (
        req: FastifyRequest<{ Querystring: unknown }>,
        reply: FastifyReply,
      ) => {
        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Сессия топилмади ёки муддати тугаган.',
            },
          });
        }

        const parseResult = HokimTopicBoardQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Сўров параметрлари нотўғри.',
            },
          });
        }

        try {
          const board = await topicService.getTodayBoard(
            req.actor as { id: string; districtId: string; role: string },
            parseResult.data,
          );
          return reply.status(200).send(board);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Мавзулар тахтасини юклашда хатолик юз берди.';
          return reply.status(400).send({
            error: {
              code: 'TOPIC_BOARD_ERROR',
              message,
            },
          });
        }
      },
    );

    // 3. Get paginated batch for a specific lane
    scope.get(
      '/api/v1/hokim/topics/lane',
      async (req: FastifyRequest<{ Querystring: unknown }>, reply: FastifyReply) => {
        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Сессия топилмади ёки муддати тугаган.',
            },
          });
        }

        const parseResult = HokimLaneQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Сўров параметрлари нотўғри.',
            },
          });
        }

        const { cursor } = parseResult.data;

        if (cursor && !decodeKeysetCursor(cursor)) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }

        try {
          const laneBatch = await topicService.getLaneBatch({
            actorContext: req.actor as { id: string; districtId: string; role: string },
            ...parseResult.data,
          });

          return reply.status(200).send(laneBatch);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Йўналиш маълумотларини юклашда хатолик юз берди.';
          return reply.status(400).send({
            error: {
              code: 'LANE_QUERY_ERROR',
              message,
            },
          });
        }
      },
    );

    // 3. Get complete retained evidence for a specific topic (AC 1-6)
    scope.get(
      '/api/v1/hokim/topics/:id/evidence',
      async (
        req: FastifyRequest<{ Params: { id: string }; Querystring: unknown }>,
        reply: FastifyReply,
      ) => {
        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Сессия топилмади ёки муддати тугаган.',
            },
          });
        }

        const topicId = req.params.id;
        if (!topicId || typeof topicId !== 'string') {
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
              code: 'VALIDATION_ERROR',
              message: 'Курсор нотўғри ёки муддати ўтган.',
            },
          });
        }

        try {
          const evidenceResponse = await topicEvidenceService.getTopicEvidence(
            req.actor as { id: string; districtId: string; role: string },
            topicId,
            parseResult.data,
          );

          return reply.status(200).send(evidenceResponse);
        } catch (err: unknown) {
          if (
            err instanceof TopicNotFoundError ||
            (typeof err === 'object' && err !== null && 'statusCode' in err && (err as { statusCode: number }).statusCode === 404)
          ) {
            const message =
              err instanceof Error ? err.message : 'Мавзу топилмади ёки ушбу туманга тегишли эмас.';
            return reply.status(404).send({
              error: {
                code: 'NOT_FOUND',
                message,
              },
            });
          }
          const message =
            err instanceof Error ? err.message : 'Далилларни юклашда хатолик юз берди.';
          return reply.status(400).send({
            error: {
              code: 'EVIDENCE_QUERY_ERROR',
              message,
            },
          });
        }
      },
    );

    // 5. Get compact neutral statistics for active scope
    scope.get(
      '/api/v1/hokim/topics/statistics',
      async (
        req: FastifyRequest<{ Querystring: unknown }>,
        reply: FastifyReply,
      ) => {
        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHENTICATED',
              message: 'Сессия топилмади ёки муддати тугаган.',
            },
          });
        }

        const parseResult = HokimTopicStatisticsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Сўров параметрлари нотўғри.',
            },
          });
        }

        try {
          const statistics = await topicService.getStatistics(
            req.actor as { id: string; districtId: string; role: string },
            parseResult.data,
          );
          return reply.status(200).send(statistics);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Статистика маълумотларини юклашда хатолик юз берди.';
          return reply.status(400).send({
            error: {
              code: 'STATISTICS_QUERY_ERROR',
              message,
            },
          });
        }
      },
    );
  });
}

