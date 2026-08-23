import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  HokimTopicBoardQuerySchema,
  HokimLaneQuerySchema,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireHokim } from '../auth/require-hokim.js';
import { HokimTopicService, decodeKeysetCursor } from './hokim-topic-service.js';

export function registerHokimTopicsRoutes(fastify: FastifyInstance, db: DbClient): void {
  const topicService = new HokimTopicService(db);

  fastify.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireHokim(db));

    // 1. Get today's 5-lane topic board
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
            parseResult.data.calendarDay,
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

    // 2. Get paginated batch for a specific lane
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

        const { lane, calendarDay, cursor, limit, baselineTimestamp } = parseResult.data;

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
            lane,
            calendarDay,
            cursor,
            limit,
            baselineTimestamp,
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
  });
}
