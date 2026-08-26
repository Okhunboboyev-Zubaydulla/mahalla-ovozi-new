import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { createDbPool, createDbClient, DbClient } from '../adapters/db/client.js';
import { registerAuthRoutes } from '../modules/auth/auth-routes.js';
import { registerDistrictRoutes } from '../modules/districts/districts-routes.js';
import { registerTelegramBotRoutes } from '../modules/telegram-bot/telegram-bot-routes.js';
import { registerTelegramGroupRoutes } from '../modules/telegram-groups/telegram-groups-routes.js';
import { registerHokimAccountRoutes } from '../modules/hokim-accounts/hokim-accounts-routes.js';
import { registerTelegramIntakeRoutes } from '../modules/telegram-intake/telegram-intake-routes.js';
import { registerAiOperationsRoutes } from '../modules/ai/ai-operations-routes.js';
import { registerHokimTopicsRoutes } from '../modules/topics/hokim-topics-routes.js';
import { registerHealthRoutes } from '../modules/health/health-routes.js';
import { registerIssueRoutes } from '../modules/issues/issue-routes.js';
import { registerAuditRoutes } from '../modules/audit/audit-routes.js';
import { createBossClient, initBossQueues } from '../adapters/jobs/boss-client.js';
import type PgBoss from 'pg-boss';
import pg from 'pg';

// Plain HTTP error with statusCode + code fields — Fastify's error handler maps these correctly.
class ForbiddenOriginError extends Error {
  statusCode = 403;
  code = 'FORBIDDEN_ORIGIN';
  constructor() { super('Ноқонуний сўров манбаи.'); }
}

export async function buildHttpServer(options?: {
  db?: DbClient;
  pool?: pg.Pool;
  boss?: PgBoss;
}): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false, // Logging controlled via telemetry adapter
    trustProxy: true,
  });

  // Fastify 5 V8 monomorphic shape optimization: decorate request prototype
  server.decorateRequest('actor', undefined);

  // Robust JSON parser that handles empty bodies gracefully
  server.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    if (!body || (typeof body === 'string' && body.trim() === '')) {
      done(null, {});
      return;
    }
    try {
      const json = JSON.parse(body.toString());
      done(null, json);
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  // Register cookie support
  await server.register(fastifyCookie);

  // B11: Restrict CORS to explicitly configured APP_ORIGIN, not all origins.
  // Allowing all origins with credentials: true leaks session info to any site.
  const allowedOrigin = process.env.APP_ORIGIN || 'http://localhost:5173';
  await server.register(fastifyCors, {
    origin: (origin, cb) => {
      // Allow same-origin requests (no Origin header) and the configured origin
      if (!origin || origin === allowedOrigin) {
        cb(null, true);
      } else {
        // Use a typed HTTP error so the error handler returns 403, not 500
        cb(new ForbiddenOriginError(), false);
      }
    },
    credentials: true,
  });

  // B8: Sanitized global error handler — logs the full error for observability,
  // then returns a safe generic response to the client (no stack traces exposed).
  server.setErrorHandler((error: unknown, request, reply) => {
    // Log the actual error for debugging via structured Pino logger — never expose it to the client
    request.log.error(
      {
        err: error,
        reqId: request.id,
        method: request.method,
        url: request.url,
      },
      'Unhandled request error',
    );

    // Zod validation error handling
    if (
      error &&
      typeof error === 'object' &&
      (('name' in error && error.name === 'ZodError') ||
        ('issues' in error && Array.isArray((error as { issues: unknown[] }).issues)))
    ) {
      const zodErr = error as {
        issues: Array<{ path: (string | number)[]; message: string; code?: string }>;
      };
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: zodErr.issues[0]?.message || 'Киритилган маълумотларда хатолик бор.',
          statusCode: 400,
          validationErrors: zodErr.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
            code: issue.code,
          })),
        },
      });
      return;
    }

    const statusCode =
      typeof error === 'object' && error && 'statusCode' in error && typeof (error as { statusCode: number }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    const errorCode =
      typeof error === 'object' && error && 'code' in error && typeof (error as { code: string }).code === 'string'
        ? (error as { code: string }).code
        : 'INTERNAL_ERROR';

    // Preserve client-safe error messages for 4xx status codes; fallback to generic 500 message for internal errors
    let errorMessage = 'Серверда кутилмаган хатолик юз берди.';
    if (statusCode < 500 && error instanceof Error && error.message) {
      errorMessage = error.message;
    }

    const errorPayload: Record<string, unknown> = {
      code: errorCode,
      message: errorMessage,
      statusCode,
    };

    if (typeof error === 'object' && error) {
      if ('blockers' in error && Array.isArray((error as { blockers: unknown[] }).blockers)) {
        errorPayload.blockers = (error as { blockers: unknown[] }).blockers;
      }
      if ('details' in error && (error as { details: unknown }).details !== undefined) {
        errorPayload.details = (error as { details: unknown }).details;
      }
      if ('validationErrors' in error && Array.isArray((error as { validationErrors: unknown[] }).validationErrors)) {
        errorPayload.validationErrors = (error as { validationErrors: unknown[] }).validationErrors;
      }
    }

    reply.status(statusCode).send({
      error: errorPayload,
    });
  });

  server.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'Сўралган манзил топилмади.',
      },
    });
  });

  const pool = options?.pool || createDbPool();
  const db = options?.db || createDbClient(pool);
  const boss = options?.boss || createBossClient();

  // Ensure pg-boss queues are bootstrapped
  await initBossQueues(boss);

  // Teardown hook for Fastify graceful close
  server.addHook('onClose', async () => {
    await boss.stop({ graceful: true, timeout: 5000 }).catch(() => {});
  });

  // Register domain module routes
  registerAuthRoutes(server, db);
  registerDistrictRoutes(server, db);
  registerTelegramBotRoutes(server, db);
  registerTelegramGroupRoutes(server, db);
  registerHokimAccountRoutes(server, db);
  registerTelegramIntakeRoutes(server, { pool, boss });
  registerAiOperationsRoutes(server, db);
  registerHokimTopicsRoutes(server, db);
  registerHealthRoutes(server, { db, pool, boss });
  registerIssueRoutes(server, { db, pool, boss });
  registerAuditRoutes(server, db);

  return server;
}

export async function startServer() {
  const server = await buildHttpServer();
  const port = parseInt(process.env.PORT || '3000', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    const address = await server.listen({ port, host });
    console.log('[http] Mahalla Ovozi backend listening', { address });
  } catch (err) {
    console.error('[http] Failed to start server:', err);
    process.exit(1);
  }
}

const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  startServer();
}
