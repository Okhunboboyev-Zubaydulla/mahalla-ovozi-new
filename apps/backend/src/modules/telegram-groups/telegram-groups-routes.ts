import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  CreateTelegramGroupRequestSchema,
  UpdateTelegramGroupRequestSchema,
  SimulateTestMessageRequestSchema,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { verifyStateChangingOrigin } from '../auth/origin-guard.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import {
  listDistrictTelegramGroups,
  getDistrictTelegramGroup,
  createDistrictTelegramGroup,
  updateDistrictTelegramGroup,
  deleteDistrictTelegramGroup,
  TelegramGroupNotFoundError,
  MahallaNameAlreadyExistsError,
  GroupAlreadyMappedError,
  GroupAlreadyAssignedError,
  BotNotConnectedError,
} from './telegram-groups-service.js';
import {
  startGroupTestSession,
  getGroupTestStatus,
  simulateGroupTestMessage,
  handleIncomingWebhookMessage,
} from './telegram-groups-testing.js';
import { DistrictNotFoundError } from '../districts/districts-service.js';
import {
  TelegramIntegrationError,
  TelegramChatNotFoundError,
  TelegramBotNotMemberError,
  TelegramBotIsAdminError,
  TelegramPrivacyModeEnabledError,
} from '../../adapters/telegram/telegram-client.js';

export function registerTelegramGroupRoutes(fastify: FastifyInstance, db: DbClient): void {
  // Public webhook route for Telegram Bot updates (no auth cookie required)
  fastify.post(
    '/api/v1/telegram/webhook/:botId',
    async (
      req: FastifyRequest<{ Params: { botId: string }; Body: unknown }>,
      reply: FastifyReply,
    ) => {
      const { botId } = req.params;
      try {
        const result = await handleIncomingWebhookMessage(db, botId, req.body);
        return reply.status(200).send({ ok: true, result });
      } catch (err: unknown) {
        req.log.error({ err, botId }, 'Error handling incoming Telegram webhook');
        return reply.status(200).send({ ok: true, handled: false, error: 'INTERNAL_ERROR' });
      }
    },
  );

  // Authenticated Product Owner Routes
  fastify.register(async (scope) => {
    scope.addHook('preHandler', verifyStateChangingOrigin);
    scope.addHook('preHandler', createRequireProductOwner(db));

    // 1. GET /api/v1/districts/:districtId/groups
    scope.get(
      '/api/v1/districts/:districtId/groups',
      async (req: FastifyRequest<{ Params: { districtId: string } }>, reply: FastifyReply) => {
        const { districtId } = req.params;
        try {
          const groups = await listDistrictTelegramGroups(db, districtId);
          return reply.status(200).send({ groups });
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 2. GET /api/v1/districts/:districtId/groups/:groupId
    scope.get(
      '/api/v1/districts/:districtId/groups/:groupId',
      async (
        req: FastifyRequest<{ Params: { districtId: string; groupId: string } }>,
        reply: FastifyReply,
      ) => {
        const { districtId, groupId } = req.params;
        try {
          const group = await getDistrictTelegramGroup(db, districtId, groupId);
          return reply.status(200).send({ group });
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 3. POST /api/v1/districts/:districtId/groups
    scope.post(
      '/api/v1/districts/:districtId/groups',
      async (
        req: FastifyRequest<{ Params: { districtId: string }; Body: unknown }>,
        reply: FastifyReply,
      ) => {
        const { districtId } = req.params;
        const parseResult = CreateTelegramGroupRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Маълумотлар нотўғри киритилди.',
            },
          });
        }

        try {
          const group = await createDistrictTelegramGroup(
            db,
            districtId,
            parseResult.data,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            },
          );
          return reply.status(201).send({ group });
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 4. PUT /api/v1/districts/:districtId/groups/:groupId
    scope.put(
      '/api/v1/districts/:districtId/groups/:groupId',
      async (
        req: FastifyRequest<{ Params: { districtId: string; groupId: string }; Body: unknown }>,
        reply: FastifyReply,
      ) => {
        const { districtId, groupId } = req.params;
        const parseResult = UpdateTelegramGroupRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Маълумотлар нотўғри киритилди.',
            },
          });
        }

        try {
          const group = await updateDistrictTelegramGroup(
            db,
            districtId,
            groupId,
            parseResult.data,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            },
          );
          return reply.status(200).send({ group });
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 5. DELETE /api/v1/districts/:districtId/groups/:groupId
    scope.delete(
      '/api/v1/districts/:districtId/groups/:groupId',
      async (
        req: FastifyRequest<{ Params: { districtId: string; groupId: string } }>,
        reply: FastifyReply,
      ) => {
        const { districtId, groupId } = req.params;
        try {
          const result = await deleteDistrictTelegramGroup(
            db,
            districtId,
            groupId,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            },
          );
          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 6. POST /api/v1/districts/:districtId/groups/:groupId/start-test
    scope.post(
      '/api/v1/districts/:districtId/groups/:groupId/start-test',
      async (
        req: FastifyRequest<{ Params: { districtId: string; groupId: string } }>,
        reply: FastifyReply,
      ) => {
        const { districtId, groupId } = req.params;
        try {
          const result = await startGroupTestSession(db, districtId, groupId, req.actor);
          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 7. GET /api/v1/districts/:districtId/groups/:groupId/test-status
    scope.get(
      '/api/v1/districts/:districtId/groups/:groupId/test-status',
      async (
        req: FastifyRequest<{ Params: { districtId: string; groupId: string } }>,
        reply: FastifyReply,
      ) => {
        const { districtId, groupId } = req.params;
        try {
          const result = await getGroupTestStatus(db, districtId, groupId, req.actor, {
            ipAddress: req.ip || null,
            userAgent: (req.headers['user-agent'] as string) || null,
          });
          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );

    // 8. POST /api/v1/districts/:districtId/groups/:groupId/simulate-test-message (Non-production only)
    scope.post(
      '/api/v1/districts/:districtId/groups/:groupId/simulate-test-message',
      async (
        req: FastifyRequest<{ Params: { districtId: string; groupId: string }; Body: unknown }>,
        reply: FastifyReply,
      ) => {
        if (process.env.NODE_ENV === 'production') {
          return reply.status(403).send({
            error: {
              code: 'FORBIDDEN_IN_PRODUCTION',
              message: 'Симуляция фақат синов муҳитида рухсат этилган.',
            },
          });
        }

        const { districtId, groupId } = req.params;
        const parseResult = SimulateTestMessageRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Симуляция хабари нотўғри форматда.',
            },
          });
        }

        try {
          const result = await simulateGroupTestMessage(
            db,
            districtId,
            groupId,
            parseResult.data.message,
            req.actor,
            {
              ipAddress: req.ip || null,
              userAgent: (req.headers['user-agent'] as string) || null,
            },
          );
          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleGroupRouteError(err, reply);
        }
      },
    );
  });
}

function handleGroupRouteError(err: unknown, reply: FastifyReply) {
  if (err instanceof DistrictNotFoundError) {
    return reply.status(404).send({
      error: { code: 'DISTRICT_NOT_FOUND', message: err.message },
    });
  }

  if (err instanceof TelegramGroupNotFoundError) {
    return reply.status(404).send({
      error: { code: 'TELEGRAM_GROUP_NOT_FOUND', message: err.message },
    });
  }

  if (err instanceof MahallaNameAlreadyExistsError) {
    return reply.status(409).send({
      error: { code: 'MAHALLA_NAME_EXISTS', message: err.message },
    });
  }

  if (err instanceof GroupAlreadyMappedError) {
    return reply.status(409).send({
      error: { code: 'GROUP_ALREADY_MAPPED', message: err.message },
    });
  }

  if (err instanceof GroupAlreadyAssignedError) {
    return reply.status(409).send({
      error: { code: 'GROUP_ALREADY_ASSIGNED', message: err.message },
    });
  }

  if (err instanceof BotNotConnectedError) {
    return reply.status(400).send({
      error: { code: 'TELEGRAM_BOT_NOT_FOUND', message: err.message },
    });
  }

  if (err instanceof TelegramChatNotFoundError) {
    return reply.status(400).send({
      error: { code: 'BOT_NOT_IN_GROUP', message: err.message },
    });
  }

  if (err instanceof TelegramBotNotMemberError) {
    return reply.status(400).send({
      error: { code: 'BOT_NOT_IN_GROUP', message: err.message },
    });
  }

  if (err instanceof TelegramBotIsAdminError) {
    return reply.status(400).send({
      error: { code: 'BOT_IS_ADMIN_FORBIDDEN', message: err.message },
    });
  }

  if (err instanceof TelegramPrivacyModeEnabledError) {
    return reply.status(400).send({
      error: { code: 'TELEGRAM_PRIVACY_MODE_ENABLED', message: err.message },
    });
  }

  // All TelegramIntegrationError subclasses (TelegramInvalidTokenError,
  // TelegramNetworkTimeoutError, TelegramRateLimitError, TelegramApiError, etc.)
  // carry httpStatus and code on the base class — no need to list each subclass.
  if (err instanceof TelegramIntegrationError) {
    return reply.status(err.httpStatus).send({
      error: { code: err.code, message: err.message },
    });
  }

  throw err;
}
