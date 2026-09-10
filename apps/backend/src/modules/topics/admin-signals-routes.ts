import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import type { DbClient } from '../../adapters/db/client.js';
import {
  ListSignalsQuerySchema,
  PromoteSignalRequestSchema,
  ReclassifyEvidenceRequestSchema,
  UpdateEvidenceTextRequestSchema,
  DeleteEvidenceRequestSchema,
  CreateManualSignalRequestSchema,
  BatchDeleteSignalsRequestSchema,
} from '@mahalla-ovozi/api-contracts';
import { createRequireProductOwner } from '../auth/require-auth.js';
import {
  topicEvidenceManagementService,
  SignalNotFoundError,
  SignalAlreadyAcceptedError,
} from './topic-evidence-management-service.js';

export interface AdminSignalsRoutesDeps {
  db: DbClient;
  pool?: pg.Pool;
  boss?: PgBoss;
}

function handleSignalError(err: unknown, reply: FastifyReply, req?: FastifyRequest) {
  if (err instanceof SignalNotFoundError) {
    return reply.status(404).send({
      error: {
        code: 'SIGNAL_NOT_FOUND',
        message: err.message,
      },
    });
  }
  if (err instanceof SignalAlreadyAcceptedError) {
    return reply.status(409).send({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  req?.log.error({ err }, 'Admin signal operation failed');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: err instanceof Error ? err.message : 'Кутилмаган хатолик юз берди.',
    },
  });
}

export function registerAdminSignalsRoutes(
  fastify: FastifyInstance,
  deps: AdminSignalsRoutesDeps,
): void {
  const { db, pool, boss } = deps;

  fastify.register(async (scope) => {
    scope.addHook('preHandler', createRequireProductOwner(db));

    // GET /api/v1/admin/signals
    scope.get(
      '/api/v1/admin/signals',
      async (
        req: FastifyRequest<{ Querystring: Record<string, unknown> }>,
        reply: FastifyReply,
      ) => {
        const parseResult = ListSignalsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Қидирув параметрлари нотўғри.',
            },
          });
        }

        try {
          const result = await topicEvidenceManagementService.listSignals(db, parseResult.data);
          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // GET /api/v1/admin/signals/:id
    scope.get(
      '/api/v1/admin/signals/:id',
      async (
        req: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        if (!id || typeof id !== 'string' || id.trim() === '') {
          return reply.status(404).send({
            error: {
              code: 'SIGNAL_NOT_FOUND',
              message: 'Сигнал топилмади.',
            },
          });
        }

        try {
          const details = await topicEvidenceManagementService.getSignalDetail(db, id.trim());
          return reply.status(200).send(details);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // POST /api/v1/admin/signals/:id/promote
    scope.post(
      '/api/v1/admin/signals/:id/promote',
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const parseResult = PromoteSignalRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Нотўғри маълумотлар киритилди.',
            },
          });
        }

        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }

        try {
          const actor = (req as any).actor;
          const result = await topicEvidenceManagementService.promoteSignal(pool, boss, db, {
            intakeId: id.trim(),
            lanes: parseResult.data.lanes,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // POST /api/v1/admin/signals/:id/reclassify
    scope.post(
      '/api/v1/admin/signals/:id/reclassify',
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const parseResult = ReclassifyEvidenceRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Нотўғри маълумотлар киритилди.',
            },
          });
        }

        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }

        try {
          const actor = (req as any).actor;
          const result = await topicEvidenceManagementService.reclassifyEvidence(pool, boss, db, {
            evidenceId: id.trim(),
            lanes: parseResult.data.lanes,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // PATCH /api/v1/admin/signals/:id/evidence
    scope.patch(
      '/api/v1/admin/signals/:id/evidence',
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const parseResult = UpdateEvidenceTextRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Нотўғри маълумотлар киритилди.',
            },
          });
        }

        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }

        try {
          const actor = (req as any).actor;
          const result = await topicEvidenceManagementService.updateEvidenceText(pool, boss, db, {
            evidenceId: id.trim(),
            verbatimText: parseResult.data.verbatimText,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // DELETE /api/v1/admin/signals/:id/evidence
    scope.delete(
      '/api/v1/admin/signals/:id/evidence',
      async (
        req: FastifyRequest<{
          Params: { id: string };
          Body: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const { id } = req.params;
        const parseResult = DeleteEvidenceRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Ўчириш сабабини киритиш шарт.',
            },
          });
        }

        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }

        try {
          const actor = (req as any).actor;
          const result = await topicEvidenceManagementService.deleteEvidence(pool, boss, db, {
            evidenceId: id.trim(),
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // POST /api/v1/admin/signals/manual
    scope.post(
      '/api/v1/admin/signals/manual',
      async (
        req: FastifyRequest<{
          Body: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const parseResult = CreateManualSignalRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Нотўғри маълумотлар киритилди.',
            },
          });
        }

        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }

        try {
          const actor = (req as any).actor;
          const result = await topicEvidenceManagementService.createManualSignal(pool, boss, db, {
            ...parseResult.data,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(201).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );

    // POST /api/v1/admin/signals/batch-delete
    scope.post(
      '/api/v1/admin/signals/batch-delete',
      async (
        req: FastifyRequest<{
          Body: unknown;
        }>,
        reply: FastifyReply,
      ) => {
        const parseResult = BatchDeleteSignalsRequestSchema.safeParse(req.body);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Нотўғри маълумотлар киритилди.',
            },
          });
        }

        if (!pool || !boss) {
          return reply.status(500).send({
            error: {
              code: 'SERVER_MISCONFIGURED',
              message: 'Сервер навбат тизимига уланмаган.',
            },
          });
        }

        try {
          const actor = (req as any).actor;
          const result = await topicEvidenceManagementService.batchDeleteSignals(pool, boss, db, {
            ids: parseResult.data.ids,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleSignalError(err, reply, req);
        }
      },
    );
  });
}
