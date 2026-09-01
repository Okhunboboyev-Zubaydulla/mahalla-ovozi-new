import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import {
  ListAiOperationsQuerySchema,
  ListGlobalAiOperationsQuerySchema,
  GetAiHealthMetricsQuerySchema,
  ListSignalsQuerySchema,
  PromoteSignalRequestSchema,
  ReclassifyEvidenceRequestSchema,
  UpdateEvidenceTextRequestSchema,
  DeleteEvidenceRequestSchema,
  CreateManualSignalRequestSchema,
} from '@mahalla-ovozi/api-contracts';
import type { DbClient } from '../../adapters/db/client.js';
import {
  createRequireProductOwner,
  createRequireDistrictAccess,
} from '../auth/require-auth.js';
import {
  aiOperationQueryService,
  InvalidDistrictScopeError,
  OperationNotFoundError,
  PrivacyBoundaryViolationError,
} from './ai-operation-query-service.js';
import {
  signalManagementService,
  SignalNotFoundError,
  SignalAlreadyAcceptedError,
} from './signal-management-service.js';

export interface AiOperationsRouteDeps {
  db: DbClient;
  pool?: pg.Pool;
  boss?: PgBoss;
}

function handleAiOperationError(err: unknown, reply: FastifyReply, req?: FastifyRequest) {
  if (err instanceof InvalidDistrictScopeError) {
    return reply.status(400).send({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }
  if (err instanceof OperationNotFoundError || err instanceof SignalNotFoundError) {
    return reply.status(404).send({
      error: {
        code: (err as any).code || 'NOT_FOUND',
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
  if (err instanceof PrivacyBoundaryViolationError) {
    req?.log?.error({ err }, 'Privacy boundary violation detected');
    return reply.status(500).send({
      error: {
        code: err.code,
        message: err.message,
      },
    });
  }

  console.error('AI OPERATIONS ERROR:', err);
  req?.log?.error({ err }, 'Unhandled AI operations error');
  return reply.status(500).send({
    error: {
      code: 'INTERNAL_ERROR',
      message: (err as any)?.message || 'Серверда кутилмаган хатолик юз берди.',
    },
  });
}

export function registerAiOperationsRoutes(
  fastify: FastifyInstance,
  depsOrDb: AiOperationsRouteDeps | DbClient,
): void {
  const db = 'db' in depsOrDb ? depsOrDb.db : depsOrDb;
  const pool = 'pool' in depsOrDb ? depsOrDb.pool : undefined;
  const boss = 'boss' in depsOrDb ? depsOrDb.boss : undefined;

  // 1. District-scoped routes
  fastify.register(async (scope) => {
    scope.addHook('preHandler', createRequireDistrictAccess(db));

    // GET /api/v1/districts/:districtId/ai-operations
    scope.get(
      '/api/v1/districts/:districtId/ai-operations',
      async (
        req: FastifyRequest<{
          Params: { districtId: string };
          Querystring: Record<string, unknown>;
        }>,
        reply: FastifyReply,
      ) => {
        const { districtId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_DISTRICT_SCOPE',
              message: 'Туман идентификатори талаб қилинади ва бўш бўлмаслиги керак.',
            },
          });
        }

        const parseResult = ListAiOperationsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Қидирув параметрлари нотўғри.',
            },
          });
        }

        const query = parseResult.data;
        try {
          const result = await aiOperationQueryService.listDistrictOperations(db, districtId, {
            mahallaName: query.mahallaName,
            calendarDay: query.calendarDay,
            operationType: query.operationType,
            finalStatus: query.finalStatus,
            targetId: query.targetId,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            cursor: query.cursor,
            limit: query.limit,
            direction: query.direction,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
        }
      },
    );

    // GET /api/v1/districts/:districtId/ai-operations/:operationId
    scope.get(
      '/api/v1/districts/:districtId/ai-operations/:operationId',
      async (
        req: FastifyRequest<{
          Params: { districtId: string; operationId: string };
        }>,
        reply: FastifyReply,
      ) => {
        const { districtId, operationId } = req.params;
        if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
          return reply.status(400).send({
            error: {
              code: 'INVALID_DISTRICT_SCOPE',
              message: 'Туман идентификатори талаб қилинади ва бўш бўлмаслиги керак.',
            },
          });
        }
        if (!operationId || typeof operationId !== 'string' || operationId.trim() === '') {
          return reply.status(404).send({
            error: {
              code: 'OPERATION_NOT_FOUND',
              message: 'AI амалиёти топилмади.',
            },
          });
        }

        try {
          const details = await aiOperationQueryService.getDistrictOperationDetails(
            db,
            districtId,
            operationId,
          );
          return reply.status(200).send({ operation: details });
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
        }
      },
    );
  });

  // 2. Global admin routes (Product Owner only)
  fastify.register(async (scope) => {
    scope.addHook('preHandler', createRequireProductOwner(db));

    // GET /api/v1/admin/ai-operations
    scope.get(
      '/api/v1/admin/ai-operations',
      async (
        req: FastifyRequest<{ Querystring: Record<string, unknown> }>,
        reply: FastifyReply,
      ) => {
        const parseResult = ListGlobalAiOperationsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Қидирув параметрлари нотўғри.',
            },
          });
        }

        const query = parseResult.data;
        try {
          const result = await aiOperationQueryService.listGlobalOperations(db, {
            districtId: query.districtId,
            mahallaName: query.mahallaName,
            calendarDay: query.calendarDay,
            operationType: query.operationType,
            finalStatus: query.finalStatus,
            targetId: query.targetId,
            startDate: query.startDate ? new Date(query.startDate) : undefined,
            endDate: query.endDate ? new Date(query.endDate) : undefined,
            cursor: query.cursor,
            limit: query.limit,
            direction: query.direction,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
        }
      },
    );

    // GET /api/v1/admin/ai-operations/health-metrics
    scope.get(
      '/api/v1/admin/ai-operations/health-metrics',
      async (
        req: FastifyRequest<{ Querystring: Record<string, unknown> }>,
        reply: FastifyReply,
      ) => {
        const parseResult = GetAiHealthMetricsQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
          return reply.status(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: parseResult.error.errors[0]?.message || 'Қидирув параметрлари нотўғри.',
            },
          });
        }

        const query = parseResult.data;
        try {
          const metrics = await aiOperationQueryService.getSystemHealthAiMetrics(db, {
            districtId: query.districtId,
            timeframe:
              query.from || query.to
                ? {
                    from: query.from ? new Date(query.from) : undefined,
                    to: query.to ? new Date(query.to) : undefined,
                  }
                : undefined,
          });

          return reply.status(200).send({ metrics });
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
        }
      },
    );

    // GET /api/v1/admin/ai-operations/:operationId
    scope.get(
      '/api/v1/admin/ai-operations/:operationId',
      async (
        req: FastifyRequest<{ Params: { operationId: string } }>,
        reply: FastifyReply,
      ) => {
        const { operationId } = req.params;
        if (!operationId || typeof operationId !== 'string' || operationId.trim() === '') {
          return reply.status(404).send({
            error: {
              code: 'OPERATION_NOT_FOUND',
              message: 'AI амалиёти топилмади.',
            },
          });
        }

        try {
          const details = await aiOperationQueryService.getGlobalOperationDetails(
            db,
            operationId,
          );
          return reply.status(200).send({ operation: details });
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
        }
      },
    );

    // ── Signal & Evidence Management Routes (Product Owner Console) ──

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
          const result = await signalManagementService.listSignals(db, parseResult.data);
          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
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
          const details = await signalManagementService.getSignalDetail(db, id.trim());
          return reply.status(200).send(details);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
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
          const result = await signalManagementService.promoteSignal(pool, boss, db, {
            intakeId: id.trim(),
            lanes: parseResult.data.lanes,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
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
          const result = await signalManagementService.reclassifyEvidence(pool, boss, db, {
            evidenceId: id.trim(),
            lanes: parseResult.data.lanes,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
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
          const result = await signalManagementService.updateEvidenceText(pool, boss, db, {
            evidenceId: id.trim(),
            verbatimText: parseResult.data.verbatimText,
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
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
          const result = await signalManagementService.deleteEvidence(pool, boss, db, {
            evidenceId: id.trim(),
            changeReason: parseResult.data.changeReason,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(200).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
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
          const result = await signalManagementService.createManualSignal(pool, boss, db, {
            ...parseResult.data,
            actorId: actor?.id,
            actorRole: actor?.role,
          });

          return reply.status(201).send(result);
        } catch (err: unknown) {
          return handleAiOperationError(err, reply, req);
        }
      },
    );
  });
}
