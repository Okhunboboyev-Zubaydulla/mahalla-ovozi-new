export interface TelegramChatSummary {
  id: number | string;
  type: string;
  title?: string;
  username?: string;
}

export interface TelegramUserSummary {
  id: number | string;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramMessageOrigin {
  type: string;
  date?: number;
  sender_user?: TelegramUserSummary;
  sender_user_name?: string;
  sender_chat?: TelegramChatSummary;
  chat?: TelegramChatSummary;
  message_id?: number;
}

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
}

export interface TelegramIncomingMessage {
  message_id: number;
  date: number;
  chat: TelegramChatSummary;
  from?: TelegramUserSummary;
  sender_chat?: TelegramChatSummary;
  forward_origin?: TelegramMessageOrigin;
  forward_date?: number;
  forward_from?: TelegramUserSummary;
  forward_from_chat?: TelegramChatSummary;
  text?: string;
  caption?: string;
  entities?: TelegramMessageEntity[];
  caption_entities?: TelegramMessageEntity[];
}

export interface MessageFilterResult {
  accepted: boolean;
  reason?: 'BOT_SENDER' | 'FORWARDED_MESSAGE' | 'BOT_COMMAND' | 'EMPTY_CONTENT' | 'NON_TEXT';
  text?: string;
}

/**
 * Pure predicate enforcing strict message eligibility criteria (AC 7, FR-20):
 * - Rejects bot senders (`from.is_bot === true` or presence of `sender_chat`)
 * - Rejects forwarded messages (`forward_origin`, `forward_date`, `forward_from`, `forward_from_chat`)
 * - Rejects bot commands (starts with `/` or has `bot_command` entity)
 * - Extracts text or caption; rejects empty/whitespace content
 */
export function filterTelegramMessage(
  message: TelegramIncomingMessage | null | undefined,
): MessageFilterResult {
  if (!message) {
    return { accepted: false, reason: 'EMPTY_CONTENT' };
  }

  // 1. Rejects bot senders or channel author
  if (message.from?.is_bot || message.sender_chat) {
    return { accepted: false, reason: 'BOT_SENDER' };
  }

  // 2. Rejects forwarded messages (modern Bot API 7.0+ origin and legacy fields)
  if (
    message.forward_origin ||
    message.forward_date ||
    message.forward_from ||
    message.forward_from_chat
  ) {
    return { accepted: false, reason: 'FORWARDED_MESSAGE' };
  }

  // 3. Extract text / caption
  const rawText = (message.text || message.caption || '').trim();
  if (!rawText) {
    return { accepted: false, reason: 'EMPTY_CONTENT' };
  }

  // 4. Rejects slash-command text (/start, /help)
  if (rawText.startsWith('/')) {
    return { accepted: false, reason: 'BOT_COMMAND' };
  }

  // 5. Rejects bot command entities
  const allEntities = [...(message.entities || []), ...(message.caption_entities || [])];
  if (allEntities.some((entity) => entity.type === 'bot_command')) {
    return { accepted: false, reason: 'BOT_COMMAND' };
  }

  return { accepted: true, text: rawText };
}
