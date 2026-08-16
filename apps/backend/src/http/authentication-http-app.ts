import type { Writable } from "node:stream";

import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import {
  apiErrorSchema,
  authActorSchema,
  authNoBodySchema,
  authSignInRequestSchema,
} from "@mahalla-ovozi/api-contracts";
import Fastify, {
  type FastifyInstance,
  type FastifyReply,
  type FastifyRequest,
  LogController,
} from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import {
  InvalidCredentialsError,
  type AuthService,
} from "../modules/auth/auth-service.js";
import { sendApiError } from "./http-errors.js";
import {
  clearSessionCookie,
  isTrustedBrowserMutation,
  readSessionToken,
  setSessionCookie,
} from "./http-security.js";

export type AuthenticationHttpApplicationDependencies = Readonly<{
  applicationOrigin: string;
  authService: AuthService;
  logDestination: Writable;
}>;

const sensitiveLogFieldNames = [
  "password",
  "passwordHash",
  "sessionToken",
  "token",
  "tokenHash",
] as const;

const sensitiveLogPaths = sensitiveLogFieldNames.flatMap((fieldName) => [
  fieldName,
  `*.${fieldName}`,
  `*.*.${fieldName}`,
]);

const requestValidationErrorCodes = new Set([
  "FST_ERR_CTP_BODY_TOO_LARGE",
  "FST_ERR_CTP_INVALID_JSON_BODY",
  "FST_ERR_CTP_INVALID_MEDIA_TYPE",
]);

const authenticationBodyLimitBytes = 8 * 1_024;

const isRequestValidationError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const validation = "validation" in error ? error.validation : undefined;
  const code =
    "code" in error && typeof error.code === "string" ? error.code : "";
  return validation !== undefined || requestValidationErrorCodes.has(code);
};

const validateApplicationOrigin = (applicationOrigin: string): void => {
  const parsedOrigin = new URL(applicationOrigin);
  if (parsedOrigin.origin !== applicationOrigin) {
    throw new TypeError("applicationOrigin must be an exact URL origin.");
  }
};

const addNoStoreHeader = (reply: FastifyReply): void => {
  void reply.header("Cache-Control", "no-store");
};

const createOriginGuard = (applicationOrigin: string) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!isTrustedBrowserMutation(request, applicationOrigin)) {
      sendApiError(reply, 403, "REQUEST_ORIGIN_REJECTED");
    }
  };

const rejectUnexpectedBody = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  if (!authNoBodySchema.safeParse(request.body).success) {
    sendApiError(reply, 400, "VALIDATION_ERROR");
  }
};

const sendUnauthenticated = (reply: FastifyReply): void => {
  clearSessionCookie(reply);
  sendApiError(reply, 401, "UNAUTHENTICATED");
};

export const createAuthenticationHttpApplication = async (
  dependencies: AuthenticationHttpApplicationDependencies,
): Promise<FastifyInstance> => {
  validateApplicationOrigin(dependencies.applicationOrigin);
  const application = Fastify({
    logController: new LogController({ disableRequestLogging: true }),
    logger: {
      level: "info",
      redact: {
        censor: "[REDACTED]",
        paths: [
          "req.headers.authorization",
          "req.headers.cookie",
          "res.headers.set-cookie",
          ...sensitiveLogPaths,
        ],
      },
      stream: dependencies.logDestination,
    },
  });
  application.setValidatorCompiler(validatorCompiler);
  application.setSerializerCompiler(serializerCompiler);
  await application.register(cookie);
  await application.register(rateLimit, {
    global: false,
    max: 10,
    timeWindow: 15 * 60 * 1_000,
  });

  application.addHook("onRequest", async (request, reply): Promise<void> => {
    if (request.url.startsWith("/api/v1/auth/")) {
      addNoStoreHeader(reply);
    }
  });

  application.addHook("onResponse", async (request, reply): Promise<void> => {
    if (request.routeOptions.url?.startsWith("/api/v1/auth/") === true) {
      request.log.info(
        {
          durationMs: reply.elapsedTime,
          method: request.method,
          requestId: request.id,
          route: request.routeOptions.url,
          securityEvent: "AUTH_HTTP_REQUEST",
          statusCode: reply.statusCode,
        },
        "Authentication request completed",
      );
    }
  });

  application.setErrorHandler((error, request, reply): void => {
    if (error instanceof InvalidCredentialsError) {
      sendApiError(reply, 401, "INVALID_CREDENTIALS");
      return;
    }
    if (isRequestValidationError(error)) {
      sendApiError(reply, 400, "VALIDATION_ERROR");
      return;
    }

    request.log.error(
      {
        errorCategory: "INTERNAL_ERROR",
        method: request.method,
        requestId: request.id,
        route: request.routeOptions.url,
      },
      "Authentication request failed",
    );
    sendApiError(reply, 500, "INTERNAL_ERROR");
  });

  const routes = application.withTypeProvider<ZodTypeProvider>();
  const originGuard = createOriginGuard(dependencies.applicationOrigin);
  const checkSignInRateLimit = application.createRateLimit({
    max: 10,
    timeWindow: 15 * 60 * 1_000,
  });

  routes.post(
    "/api/v1/auth/sign-in",
    {
      bodyLimit: authenticationBodyLimitBytes,
      onRequest: originGuard,
      schema: {
        body: authSignInRequestSchema,
        response: {
          200: authActorSchema,
          400: apiErrorSchema,
          401: apiErrorSchema,
          403: apiErrorSchema,
          429: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const rateStatus = await checkSignInRateLimit(request, {
        increment: false,
      });
      if (!rateStatus.isAllowed && rateStatus.remaining === 0) {
        await dependencies.authService.recordRateLimited(request.id);
        void reply.header(
          "Retry-After",
          String(Math.max(1, rateStatus.ttlInSeconds)),
        );
        sendApiError(reply, 429, "RATE_LIMITED");
        return;
      }

      let authentication: Awaited<
        ReturnType<AuthService["authenticate"]>
      >;
      try {
        authentication = await dependencies.authService.authenticate({
          ...request.body,
          requestId: request.id,
        });
      } catch (error) {
        if (error instanceof InvalidCredentialsError) {
          await checkSignInRateLimit(request);
          await dependencies.authService.recordLoginFailed(request.id);
        }
        throw error;
      }
      setSessionCookie(reply, authentication.token);
      return authentication.actor;
    },
  );

  routes.get(
    "/api/v1/auth/session",
    {
      schema: {
        response: {
          200: authActorSchema,
          401: apiErrorSchema,
          500: apiErrorSchema,
        },
      },
    },
    async (request, reply) => {
      const token = readSessionToken(request);
      const actor =
        token === null
          ? null
          : await dependencies.authService.getSession(token);
      if (actor === null) {
        sendUnauthenticated(reply);
        return;
      }
      return actor;
    },
  );

  routes.post(
    "/api/v1/auth/sign-out",
    {
      bodyLimit: authenticationBodyLimitBytes,
      onRequest: originGuard,
      preValidation: rejectUnexpectedBody,
    },
    async (request, reply): Promise<void> => {
      const token = readSessionToken(request);
      if (token !== null) {
        await dependencies.authService.signOut(token, request.id);
      }
      clearSessionCookie(reply);
      void reply.code(204).send();
    },
  );

  routes.post(
    "/api/v1/auth/activity",
    {
      bodyLimit: authenticationBodyLimitBytes,
      onRequest: originGuard,
      preValidation: rejectUnexpectedBody,
    },
    async (request, reply): Promise<void> => {
      const token = readSessionToken(request);
      const acknowledged =
        token !== null &&
        (await dependencies.authService.acknowledgeActivity(token));
      if (!acknowledged) {
        sendUnauthenticated(reply);
        return;
      }
      void reply.code(204).send();
    },
  );

  await application.ready();
  return application;
};
