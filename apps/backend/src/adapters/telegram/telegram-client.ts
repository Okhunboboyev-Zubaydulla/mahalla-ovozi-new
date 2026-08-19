export class TelegramIntegrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'TelegramIntegrationError';
  }
}

export class TelegramInvalidTokenError extends TelegramIntegrationError {
  constructor(message = 'Telegram бот токени ҳақиқий эмас ёки бот топилмади.') {
    super(message, 'TELEGRAM_INVALID_TOKEN', 400);
    this.name = 'TelegramInvalidTokenError';
  }
}

export class TelegramNetworkTimeoutError extends TelegramIntegrationError {
  constructor(message = 'Telegram сервери билан боғланиш вақти тугади (5 сония).') {
    super(message, 'TELEGRAM_TIMEOUT', 504);
    this.name = 'TelegramNetworkTimeoutError';
  }
}

export class TelegramRateLimitError extends TelegramIntegrationError {
  constructor(
    message = 'Telegram сўровлар сони чекланди. Бироздан сўнг қайта уриниб кўринг.',
  ) {
    super(message, 'TELEGRAM_RATE_LIMITED', 429);
    this.name = 'TelegramRateLimitError';
  }
}

export class TelegramApiError extends TelegramIntegrationError {
  constructor(message = 'Telegram серверига уланишда хатолик юз берди.') {
    super(message, 'TELEGRAM_API_ERROR', 502);
    this.name = 'TelegramApiError';
  }
}

/**
 * Sanitizes Telegram API URLs and text occurrences to ensure tokens are never leaked into logs or errors.
 */
export function redactTokenFromUrl(text: string, token?: string): string {
  let result = text.replace(/\/bot[^/]+/g, '/bot[REDACTED]');
  if (token) {
    result = result.replaceAll(token, '[REDACTED]');
  }
  return result;
}

export interface ValidatedTelegramBot {
  botId: string;
  botFirstName: string;
  botUsername: string | null;
}

export interface ValidateTelegramBotOptions {
  timeoutMs?: number;
  baseUrl?: string;
  customFetch?: typeof fetch;
}

interface TelegramGetMeResponse {
  ok?: boolean;
  result?: {
    id?: number | string;
    is_bot?: boolean;
    first_name?: string;
    username?: string;
  };
  description?: string;
  error_code?: number;
}

const TELEGRAM_TOKEN_REGEX = /^\d{6,16}:[a-zA-Z0-9_-]{20,50}$/;

/**
 * Authoritatively validates a Telegram bot token against Telegram Bot API (getMe).
 * Enforces timeout (5000ms), URL token redaction, and strict error mapping.
 * Pure HTTP execution strictly outside database transactions.
 */
export async function validateTelegramBot(
  token: string,
  options: ValidateTelegramBotOptions = {},
): Promise<ValidatedTelegramBot> {
  const trimmedToken = token?.trim() ?? '';
  if (!TELEGRAM_TOKEN_REGEX.test(trimmedToken)) {
    throw new TelegramInvalidTokenError('Telegram бот токени ҳақиқий эмас ёки формати нотўғри.');
  }

  const baseUrl = (
    options.baseUrl ??
    process.env.TELEGRAM_API_BASE_URL ??
    'https://api.telegram.org'
  ).replace(/\/+$/, '');
  const url = `${baseUrl}/bot${trimmedToken}/getMe`;
  const timeoutMs = options.timeoutMs ?? 5000;
  const fetchFn = options.customFetch ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorName = err instanceof Error ? err.name : '';
    const isTimeout =
      errorName === 'TimeoutError' ||
      errorName === 'AbortError' ||
      /timeout|abort/i.test(errorMessage);

    if (isTimeout) {
      throw new TelegramNetworkTimeoutError();
    }

    const sanitizedMessage = redactTokenFromUrl(errorMessage, trimmedToken);
    throw new TelegramApiError(`Telegram API сўрови бажарилмади: ${sanitizedMessage}`);
  }

  if (response.status === 400 || response.status === 401 || response.status === 404) {
    throw new TelegramInvalidTokenError();
  }

  if (response.status === 429) {
    throw new TelegramRateLimitError();
  }

  if (!response.ok) {
    throw new TelegramApiError();
  }

  let data: TelegramGetMeResponse | undefined;
  try {
    data = (await response.json()) as TelegramGetMeResponse;
  } catch {
    throw new TelegramApiError('Telegram жавобини ўқиб бўлмади.');
  }

  if (!data?.ok || !data?.result || !data.result.is_bot || !data.result.id) {
    throw new TelegramInvalidTokenError('Telegram ҳисоби бот эмас ёки маълумотлар тўлиқ эмас.');
  }

  return {
    botId: String(data.result.id),
    botFirstName: String(data.result.first_name || ''),
    botUsername: data.result.username ? String(data.result.username) : null,
  };
}
