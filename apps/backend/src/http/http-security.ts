import type { FastifyReply, FastifyRequest } from "fastify";

export const SESSION_COOKIE_NAME = "__Host-mahalla_session";

export const sessionCookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "strict",
  secure: true,
} as const;

export const setSessionCookie = (
  reply: FastifyReply,
  token: string,
): void => {
  reply.setCookie(SESSION_COOKIE_NAME, token, sessionCookieOptions);
};

export const clearSessionCookie = (reply: FastifyReply): void => {
  reply.clearCookie(SESSION_COOKIE_NAME, sessionCookieOptions);
};

export const readSessionToken = (request: FastifyRequest): string | null => {
  const token = request.cookies[SESSION_COOKIE_NAME];
  return token === undefined || token.length === 0 ? null : token;
};

export const isTrustedBrowserMutation = (
  request: FastifyRequest,
  applicationOrigin: string,
): boolean => {
  if (request.headers.origin !== applicationOrigin) {
    return false;
  }

  const fetchSite = request.headers["sec-fetch-site"];
  return fetchSite === undefined || fetchSite === "same-origin";
};
