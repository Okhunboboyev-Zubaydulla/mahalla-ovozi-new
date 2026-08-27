import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  SaveGlobalAnalysisSettingsDraftSchema,
  type SaveGlobalAnalysisSettingsDraftRequest,
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
  });
}
