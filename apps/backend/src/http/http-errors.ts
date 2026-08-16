import type { ApiError, ApiErrorCode } from "@mahalla-ovozi/api-contracts";
import type { FastifyReply } from "fastify";

const errorMessages: Readonly<Record<ApiErrorCode, string>> = {
  FORBIDDEN: "Бу амалга рухсат берилмаган.",
  INTERNAL_ERROR: "Серверда ички хато юз берди.",
  INVALID_CREDENTIALS: "Нотўғри фойдаланувчи номи ёки парол.",
  RATE_LIMITED: "Жуда кўп уриниш. Кейинроқ қайта уриниб кўринг.",
  REQUEST_ORIGIN_REJECTED: "Сўров манбаси тасдиқланмади.",
  UNAUTHENTICATED: "Тизимга кириш талаб қилинади.",
  VALIDATION_ERROR: "Сўров маълумотлари нотўғри.",
};

export const createApiError = (code: ApiErrorCode): ApiError => ({
  error: { code, message: errorMessages[code] },
});

export const sendApiError = (
  reply: FastifyReply,
  statusCode: number,
  code: ApiErrorCode,
): void => {
  void reply.code(statusCode).send(createApiError(code));
};
