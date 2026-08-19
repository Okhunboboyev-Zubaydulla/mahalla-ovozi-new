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

export class TelegramChatNotFoundError extends TelegramIntegrationError {
  constructor(message = 'Telegram гуруҳи топилмади ёки бот ушбу гуруҳга қўшилмаган.') {
    super(message, 'BOT_NOT_IN_GROUP', 400);
    this.name = 'TelegramChatNotFoundError';
  }
}

export class TelegramBotNotMemberError extends TelegramIntegrationError {
  constructor(message = 'Telegram бот мазкур гуруҳга аъзо эмас.') {
    super(message, 'BOT_NOT_IN_GROUP', 400);
    this.name = 'TelegramBotNotMemberError';
  }
}

export class TelegramBotIsAdminError extends TelegramIntegrationError {
  constructor(
    message = 'Хавфсизлик талаби: Бот Telegram гуруҳда администратор бўлмаслиги керак, фақат оддий аъзо бўлиши шарт.',
  ) {
    super(message, 'BOT_IS_ADMIN_FORBIDDEN', 400);
    this.name = 'TelegramBotIsAdminError';
  }
}

export class TelegramPrivacyModeEnabledError extends TelegramIntegrationError {
  constructor(
    message = 'Telegram ботда гуруҳ махфийлик режими фаол. @BotFather орқали махфийлик режимини ўчиринг (/setprivacy -> Disable).',
  ) {
    super(message, 'TELEGRAM_PRIVACY_MODE_ENABLED', 400);
    this.name = 'TelegramPrivacyModeEnabledError';
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

export interface TelegramChatInfo {
  chatId: string;
  chatTitle: string;
  chatType: string;
  chatUsername: string | null;
}

interface TelegramGetChatResponse {
  ok?: boolean;
  result?: {
    id?: number | string;
    title?: string;
    type?: string;
    username?: string;
  };
  description?: string;
  error_code?: number;
}

interface TelegramGetChatMemberResponse {
  ok?: boolean;
  result?: {
    status?: string;
    user?: {
      id?: number | string;
      is_bot?: boolean;
      first_name?: string;
    };
  };
  description?: string;
  error_code?: number;
}

interface TelegramPrivacyResponse {
  ok?: boolean;
  result?: {
    id?: number | string;
    can_read_all_group_messages?: boolean;
  };
  description?: string;
  error_code?: number;
}

/**
 * Authoritatively retrieves Telegram chat/group details via getChat.
 */
export async function getTelegramChat(
  token: string,
  chatId: string,
  options: ValidateTelegramBotOptions = {},
): Promise<TelegramChatInfo> {
  const trimmedToken = token?.trim() ?? '';
  const trimmedChatId = chatId?.trim() ?? '';
  if (!trimmedToken || !trimmedChatId) {
    throw new TelegramChatNotFoundError('Telegram токени ёки гуруҳ ID киритилмаган.');
  }

  const baseUrl = (
    options.baseUrl ??
    process.env.TELEGRAM_API_BASE_URL ??
    'https://api.telegram.org'
  ).replace(/\/+$/, '');
  const url = `${baseUrl}/bot${trimmedToken}/getChat`;
  const timeoutMs = options.timeoutMs ?? 5000;
  const fetchFn = options.customFetch ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: trimmedChatId }),
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

  if (response.status === 429) {
    throw new TelegramRateLimitError();
  }

  let data: TelegramGetChatResponse | undefined;
  try {
    data = (await response.json()) as TelegramGetChatResponse;
  } catch {
    throw new TelegramApiError('Telegram жавобини ўқиб бўлмади.');
  }

  if (
    response.status === 400 ||
    response.status === 404 ||
    !data?.ok ||
    !data.result ||
    !data.result.id
  ) {
    throw new TelegramChatNotFoundError(
      data?.description ? `Telegram гуруҳи топилмади: ${data.description}` : undefined,
    );
  }

  return {
    chatId: String(data.result.id),
    chatTitle: String(data.result.title || ''),
    chatType: String(data.result.type || ''),
    chatUsername: data.result.username ? String(data.result.username) : null,
  };
}

/**
 * Authoritatively verifies that the bot is an ordinary non-admin member in the specified chat.
 * Strictly enforces passive non-admin security boundary (FR-1, AC 4).
 */
export async function verifyBotGroupMembership(
  token: string,
  chatId: string,
  botId: string,
  options: ValidateTelegramBotOptions = {},
): Promise<{ status: 'member' }> {
  const trimmedToken = token?.trim() ?? '';
  const trimmedChatId = chatId?.trim() ?? '';
  const trimmedBotId = botId?.trim() ?? '';

  const baseUrl = (
    options.baseUrl ??
    process.env.TELEGRAM_API_BASE_URL ??
    'https://api.telegram.org'
  ).replace(/\/+$/, '');
  const url = `${baseUrl}/bot${trimmedToken}/getChatMember`;
  const timeoutMs = options.timeoutMs ?? 5000;
  const fetchFn = options.customFetch ?? fetch;

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: trimmedChatId, user_id: trimmedBotId }),
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

  if (response.status === 429) {
    throw new TelegramRateLimitError();
  }

  let data: TelegramGetChatMemberResponse | undefined;
  try {
    data = (await response.json()) as TelegramGetChatMemberResponse;
  } catch {
    throw new TelegramApiError('Telegram жавобини ўқиб бўлмади.');
  }

  if (response.status === 400 || response.status === 404 || !data?.ok || !data.result) {
    throw new TelegramBotNotMemberError(
      data?.description ? `Бот гуруҳ аъзоси эмас: ${data.description}` : undefined,
    );
  }

  const membershipStatus = data.result.status;
  if (membershipStatus === 'administrator' || membershipStatus === 'creator') {
    throw new TelegramBotIsAdminError();
  }

  if (membershipStatus !== 'member') {
    throw new TelegramBotNotMemberError();
  }

  return { status: 'member' };
}

/**
 * Evaluates whether Telegram Group Privacy Mode is disabled (AC 5).
 * Returns true if can_read_all_group_messages is true, false otherwise.
 */
export async function checkGroupPrivacyMode(
  token: string,
  options: ValidateTelegramBotOptions = {},
): Promise<boolean> {
  const trimmedToken = token?.trim() ?? '';
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

  if (!response.ok) {
    throw new TelegramApiError('Бот маълумотларини олиб бўлмади.');
  }

  let data: TelegramPrivacyResponse | undefined;
  try {
    data = (await response.json()) as TelegramPrivacyResponse;
  } catch {
    throw new TelegramApiError('Telegram жавобини ўқиб бўлмади.');
  }

  return Boolean(data?.ok && data?.result?.can_read_all_group_messages === true);
}
