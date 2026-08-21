import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { deriveWebhookSecret, verifyTelegramSecretToken } from './webhook-security.js';
import {
  processTelegramWebhookUpdate,
  TelegramUpdate,
} from './telegram-intake-service.js';

export interface TelegramIntakeRoutesOptions {
  pool: pg.Pool;
  boss: PgBoss;
}

export function registerTelegramIntakeRoutes(
  fastify: FastifyInstance,
  options: TelegramIntakeRoutesOptions,
): void {
  fastify.post(
    '/api/v1/webhooks/telegram/:botId',
    {
      preHandler: async (
        req: FastifyRequest<{ Params: { botId: string } }>,
        reply: FastifyReply,
      ) => {
        const { botId } = req.params;
        const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
        const expectedSecret = deriveWebhookSecret(botId);

        if (!verifyTelegramSecretToken(secretHeader, expectedSecret)) {
          return reply.status(401).send({
            error: {
              code: 'UNAUTHORIZED_WEBHOOK',
              message: 'Ноқонуний Telegram webhook сўрови.',
            },
          });
        }
      },
    },
    async (
      req: FastifyRequest<{ Params: { botId: string }; Body: TelegramUpdate }>,
      reply: FastifyReply,
    ) => {
      const { botId } = req.params;
      const startTime = performance.now();

      try {
        const result = await processTelegramWebhookUpdate(
          options.pool,
          options.boss,
          botId,
          req.body,
        );

        const durationMs = Math.round(performance.now() - startTime);

        if (result.status === 'ACCEPTED') {
          // Privacy-safe telemetry logging: strictly no message text, captions, or tokens
          console.log('[telemetry:telegram-intake]', {
            event: 'TELEGRAM_INTAKE',
            botId,
            districtId: result.districtId,
            mahallaName: result.mahallaName,
            status: 'ACCEPTED',
            intakeId: result.intakeId,
            jobId: result.jobId,
            durationMs,
          });

          return reply.status(200).send({
            ok: true,
            status: 'ACCEPTED',
            intakeId: result.intakeId,
          });
        }

        if (result.status === 'DUPLICATE') {
          console.log('[telemetry:telegram-intake]', {
            event: 'TELEGRAM_INTAKE_DUPLICATE',
            botId,
            districtId: result.districtId,
            mahallaName: result.mahallaName,
            status: 'DUPLICATE',
            durationMs,
          });

          return reply.status(200).send({
            ok: true,
            status: 'DUPLICATE',
          });
        }

        // result.status === 'DROPPED'
        console.log('[telemetry:telegram-intake]', {
          event: 'TELEGRAM_INTAKE_DROPPED',
          botId,
          reason: result.reason,
          status: 'DROPPED',
          durationMs,
        });

        return reply.status(200).send({
          ok: true,
          status: 'DROPPED',
          reason: result.reason,
        });
      } catch (err: unknown) {
        const durationMs = Math.round(performance.now() - startTime);
        console.error('[telemetry:telegram-intake-error]', {
          event: 'TELEGRAM_INTAKE_ERROR',
          botId,
          errorMessage: err instanceof Error ? err.message : String(err),
          durationMs,
        });

        // 500 prompts Telegram to retry delivery for retryable/transient persistence errors
        return reply.status(500).send({
          error: {
            code: 'INTAKE_PERSISTENCE_FAILED',
            message: 'Хабарни қабул қилишда хатолик юз берди.',
          },
        });
      }
    },
  );
}
