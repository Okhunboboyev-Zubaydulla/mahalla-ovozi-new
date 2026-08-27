import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  SaveGlobalAnalysisSettingsDraftSchema,
  ActivateGlobalAnalysisSettingsRequestSchema,
  RollbackGlobalAnalysisSettingsRequestSchema,
  type SaveGlobalAnalysisSettingsDraftRequest,
  type ActivateGlobalAnalysisSettingsRequest,
  type RollbackGlobalAnalysisSettingsRequest,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { createRequireProductOwner } from '../auth/require-product-owner.js';
import { globalAnalysisSettingsService } from './global-analysis-settings-service.js';

export function registerGlobalAnalysisSettingsRoutes(
  server: FastifyInstance,
  db: DbClient,
): void {
  // Encapsulated Fastify scope with strict Product Owner authorization guard (AC 1, AC 8)
  server.register(async (scope) => {
    scope.addHook('preHandler', createRequireProductOwner(db));

    /**
     * GET /api/v1/ai/settings/global
     * Returns current active global analysis configuration and saved draft if any (AC 1, 2, 3, 8).
     */
    scope.get(
      '/api/v1/ai/settings/global',
      async (_req: FastifyRequest, reply: FastifyReply) => {
        const [activeConfiguration, draft] = await Promise.all([
          globalAnalysisSettingsService.getActiveConfiguration(db),
          globalAnalysisSettingsService.getDraft(db),
        ]);

        return reply.status(200).send({
          activeConfiguration,
          draft,
        });
      },
    );

    /**
     * POST /api/v1/ai/settings/global/draft
     * Validates and saves the singleton global analysis settings draft with audit trail (AC 2, 5, 6, 7, 8).
     */
    scope.post(
      '/api/v1/ai/settings/global/draft',
      async (
        req: FastifyRequest<{ Body: SaveGlobalAnalysisSettingsDraftRequest }>,
        reply: FastifyReply,
      ) => {
        const parseResult = SaveGlobalAnalysisSettingsDraftSchema.safeParse(
          req.body,
        );

        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message:
                parseResult.error.issues[0]?.message ||
                'Киритилган созламаларда хатолик бор.',
              statusCode: 400,
              validationErrors: parseResult.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
                code: issue.code,
              })),
            },
          });
        }

        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Аутентификация талаб қилинади.',
              statusCode: 401,
            },
          });
        }

        const actor = {
          id: req.actor.id,
          role: req.actor.role,
          ipAddress: req.ip || null,
          userAgent:
            typeof req.headers['user-agent'] === 'string'
              ? req.headers['user-agent']
              : null,
        };

        const savedDraft = await globalAnalysisSettingsService.saveDraft(
          db,
          actor,
          parseResult.data,
        );

        return reply.status(200).send({
          draft: savedDraft,
          message: 'Қоралама муваффақиятли сақланди',
        });
      },
    );

    /**
     * POST /api/v1/ai/settings/global/activate
     * Atomically validates, deactivates prior version, bumps monotonic version,
     * deletes draft, and activates new immutable global analysis settings version (Story 5.3).
     */
    scope.post(
      '/api/v1/ai/settings/global/activate',
      async (
        req: FastifyRequest<{ Body: ActivateGlobalAnalysisSettingsRequest }>,
        reply: FastifyReply,
      ) => {
        const parseResult =
          ActivateGlobalAnalysisSettingsRequestSchema.safeParse(req.body);

        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message:
                parseResult.error.issues[0]?.message ||
                'Фаоллаштириш сўровида хатолик бор.',
              statusCode: 400,
              validationErrors: parseResult.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
                code: issue.code,
              })),
            },
          });
        }

        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Аутентификация талаб қилинади.',
              statusCode: 401,
            },
          });
        }

        const actor = {
          id: req.actor.id,
          role: req.actor.role,
          ipAddress: req.ip || null,
          userAgent:
            typeof req.headers['user-agent'] === 'string'
              ? req.headers['user-agent']
              : null,
        };

        try {
          const result = await globalAnalysisSettingsService.activateDraft(
            db,
            actor,
            parseResult.data,
          );

          return reply.status(200).send(result);
        } catch (err: any) {
          const statusCode =
            typeof err.statusCode === 'number' ? err.statusCode : 500;
          const code =
            typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR';
          const message =
            statusCode < 500 && typeof err.message === 'string'
              ? err.message
              : 'Глобал созламаларни фаоллаштиришда хатолик юз берди.';

          return reply.status(statusCode).send({
            error: {
              code,
              message,
              statusCode,
            },
          });
        }
      },
    );

    /**
     * GET /api/v1/ai/settings/global/history
     * Returns immutable history of activated global analysis configuration versions (Story 5.4).
     */
    scope.get(
      '/api/v1/ai/settings/global/history',
      async (req: FastifyRequest, reply: FastifyReply) => {
        try {
          const history =
            await globalAnalysisSettingsService.getHistory(db);

          return reply.status(200).send(history);
        } catch (err: any) {
          req.log.error(
            { err },
            'Failed to fetch global analysis settings history',
          );
          return reply.status(500).send({
            error: {
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Глобал созламалар тарихини юклашда хатолик юз берди.',
              statusCode: 500,
            },
          });
        }
      },
    );

    /**
     * POST /api/v1/ai/settings/global/rollback
     * Atomically rolls back to a target historical configuration as a new future-only version (Story 5.4).
     */
    scope.post(
      '/api/v1/ai/settings/global/rollback',
      async (
        req: FastifyRequest<{ Body: RollbackGlobalAnalysisSettingsRequest }>,
        reply: FastifyReply,
      ) => {
        const parseResult =
          RollbackGlobalAnalysisSettingsRequestSchema.safeParse(req.body);

        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message:
                parseResult.error.issues[0]?.message ||
                'Қайтариш сўровида хатолик бор.',
              statusCode: 400,
              validationErrors: parseResult.error.issues.map((issue) => ({
                path: issue.path,
                message: issue.message,
                code: issue.code,
              })),
            },
          });
        }

        if (!req.actor) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED',
              message: 'Аутентификация талаб қилинади.',
              statusCode: 401,
            },
          });
        }

        const actor = {
          id: req.actor.id,
          role: req.actor.role,
          ipAddress: req.ip || null,
          userAgent:
            typeof req.headers['user-agent'] === 'string'
              ? req.headers['user-agent']
              : null,
        };

        try {
          const result = await globalAnalysisSettingsService.rollback(
            db,
            actor,
            parseResult.data,
          );

          return reply.status(200).send(result);
        } catch (err: any) {
          const statusCode =
            typeof err.statusCode === 'number' ? err.statusCode : 500;
          const code =
            typeof err.code === 'string' ? err.code : 'INTERNAL_SERVER_ERROR';
          const message =
            statusCode < 500 && typeof err.message === 'string'
              ? err.message
              : 'Глобал созламаларни қайтаришда хатолик юз берди.';

          return reply.status(statusCode).send({
            error: {
              code,
              message,
              statusCode,
            },
          });
        }
      },
    );
  });
}


