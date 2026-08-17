import { ApiErrorEnvelopeSchema } from '@mahalla-ovozi/api-contracts';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  isNetworkError: boolean;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isNetworkError: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
  }
}

export async function request<T>(
  url: string,
  options: RequestInit,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: unknown } }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include', // Include host-scoped session cookies
      headers,
    });
  } catch (_networkErr) {
    // Network uncertainty: server unreachable, DNS failure, offline
    throw new ApiError(
      'Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.',
      'NETWORK_ERROR',
      0,
      true
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorParsed = ApiErrorEnvelopeSchema.safeParse(body);
    if (errorParsed.success) {
      throw new ApiError(
        errorParsed.data.error.message,
        errorParsed.data.error.code,
        response.status
      );
    }
    throw new ApiError(
      'Серверда кутилмаган хатолик юз берди.',
      'SERVER_ERROR',
      response.status
    );
  }

  const result = schema.safeParse(body);
  if (!result.success || !result.data) {
    throw new ApiError(
      'Сервердан нотўғри форматдаги маълумот олинди.',
      'INVALID_RESPONSE',
      response.status
    );
  }

  return result.data;
}
