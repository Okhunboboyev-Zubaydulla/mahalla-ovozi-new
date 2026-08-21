/**
 * Pure domain content qualification engine for Telegram messages (Story 2.2).
 * Adheres strictly to AD-1 (Hexagonal Architecture / Pure Domain Logic),
 * AD-9 (Tenant Scope Attribution), and AD-11 (Privacy-Safe Telemetry).
 *
 * Evaluates structural validity of Telegram messages before AI semantic analysis.
 * Preserves verbatim text/captions without mutation and discards structural exclusions.
 */

export interface TelegramUser {
  id: number | string;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number | string;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
}

export type TelegramMessageOrigin =
  | { type: 'user'; date: number; sender_user: TelegramUser }
  | { type: 'hidden_user'; date: number; sender_user_name: string }
  | { type: 'chat'; date: number; sender_chat: TelegramChat; author_signature?: string }
  | { type: 'channel'; date: number; chat: TelegramChat; message_id: number; author_signature?: string };

export interface TelegramMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: TelegramUser;
  language?: string;
  custom_emoji_id?: string;
}

export interface TelegramReplyMetadata {
  replyToMessageId: string;
  replyToUserId?: string;
  replyToIsForwarded: boolean;
  replyToIsBot: boolean;
}

export interface TelegramMessage {
  message_id: number | string;
  date: number;
  chat: TelegramChat;
  from?: TelegramUser;
  sender_chat?: TelegramChat;
  text?: string;
  entities?: TelegramMessageEntity[];
  caption?: string;
  caption_entities?: TelegramMessageEntity[];
  photo?: unknown[];
  video?: unknown;
  document?: unknown;
  animation?: unknown;
  audio?: unknown;
  voice?: unknown;
  paid_media?: unknown;
  video_note?: unknown;
  sticker?: unknown;
  poll?: unknown;
  dice?: unknown;
  game?: unknown;
  story?: unknown;
  giveaway?: unknown;
  giveaway_created?: unknown;
  giveaway_winners?: unknown;
  giveaway_completed?: unknown;
  contact?: unknown;
  location?: unknown;
  venue?: unknown;
  forward_origin?: TelegramMessageOrigin;
  is_automatic_forward?: boolean;
  forward_date?: number;
  forward_from?: TelegramUser;
  forward_from_chat?: TelegramChat;
  forward_from_message_id?: number | string;
  forward_sender_name?: string;
  forward_signature?: string;
  via_bot?: TelegramUser;
  reply_to_message?: TelegramMessage;
  new_chat_members?: unknown[];
  left_chat_member?: unknown;
  new_chat_title?: string;
  new_chat_photo?: unknown[];
  delete_chat_photo?: boolean;
  group_chat_created?: boolean;
  supergroup_chat_created?: boolean;
  channel_chat_created?: boolean;
  message_auto_delete_timer_changed?: unknown;
  migrate_to_chat_id?: number | string;
  migrate_from_chat_id?: number | string;
  pinned_message?: unknown;
  invoice?: unknown;
  successful_payment?: unknown;
  user_shared?: unknown;
  chat_shared?: unknown;
  write_access_allowed?: unknown;
  passport_data?: unknown;
  proximity_alert_triggered?: unknown;
  boost_added?: unknown;
  forum_topic_created?: unknown;
  forum_topic_edited?: unknown;
  forum_topic_closed?: unknown;
  forum_topic_reopened?: unknown;
  general_forum_topic_hidden?: unknown;
  general_forum_topic_unhidden?: unknown;
  video_chat_scheduled?: unknown;
  video_chat_started?: unknown;
  video_chat_ended?: unknown;
  video_chat_participants_invited?: unknown;
  web_app_data?: unknown;
  [key: string]: unknown;
}

export type StructuralExclusionReason =
  | 'FORWARDED_MESSAGE'
  | 'BOT_MESSAGE'
  | 'BOT_COMMAND'
  | 'SERVICE_MESSAGE'
  | 'EMPTY_CONTENT'
  | 'CAPTIONLESS_MEDIA'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'MALFORMED_METADATA';

export interface StructuralCandidate {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  telegramUserId?: string;
  originalTimestamp: string; // ISO-8601 string
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  verbatimText: string;
  replyMetadata: TelegramReplyMetadata | null;
}

export type StructuralQualificationResult =
  | {
      status: 'SUPPORTED';
      candidate: StructuralCandidate;
    }
  | {
      status: 'EXCLUDED';
      reason: StructuralExclusionReason;
      districtId: string;
      mahallaName: string;
      telegramChatId: string;
      telegramMessageId: string;
    };

export interface TelegramIntakeRecordInput {
  id: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramBotId: string;
  telegramChatId: string;
  telegramMessageId: string;
  updateId?: string | null;
  telegramUserId?: string | null;
  originalTimestamp: Date | string;
  rawPayload: unknown;
}

/**
 * Evaluates whether an arbitrary timestamp is valid and converts it to ISO-8601 string.
 * Returns null if the timestamp is missing, unparseable, or an invalid Date.
 */
export function toSafeIsoTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return null;
  }
  return date.toISOString();
}

/**
 * Checks whether text contains meaningful characters after removing standard whitespace
 * and zero-width formatting characters (\\u200B-\\u200D, \\uFEFF, \\u2060, \\u00AD, \\u200E, \\u200F).
 */
export function hasMeaningfulText(text: unknown): boolean {
  if (typeof text !== 'string') {
    return false;
  }
  return text.replace(/[\s\u200B-\u200D\uFEFF\u2060\u00AD\u200E\u200F]/g, '').length > 0;
}

/**
 * Evaluates whether a message is marked as forwarded via modern Bot API 7.0+
 * forward_origin, automatic forward flag, or legacy forward metadata.
 */
export function isTelegramForwarded(message: TelegramMessage): boolean {
  if (message.forward_origin != null) {
    return true;
  }
  if (message.is_automatic_forward === true) {
    return true;
  }
  if (
    message.forward_date != null ||
    message.forward_from != null ||
    message.forward_from_chat != null ||
    message.forward_from_message_id != null ||
    message.forward_sender_name != null ||
    message.forward_signature != null
  ) {
    return true;
  }
  return false;
}

/**
 * Evaluates whether a message originated directly from a bot or was sent via an inline bot.
 */
export function isTelegramBotMessage(message: TelegramMessage): boolean {
  if (message.from?.is_bot === true) {
    return true;
  }
  if (message.via_bot !== undefined && message.via_bot !== null) {
    return true;
  }
  return false;
}

/**
 * Evaluates whether a message represents a bot command.
 * Commands start with `/` or have a bot_command entity at offset 0.
 */
export function isTelegramCommand(message: TelegramMessage): boolean {
  if (Array.isArray(message.entities) && message.entities.some((e) => e?.type === 'bot_command' && e?.offset === 0)) {
    return true;
  }
  if (Array.isArray(message.caption_entities) && message.caption_entities.some((e) => e?.type === 'bot_command' && e?.offset === 0)) {
    return true;
  }
  if (typeof message.text === 'string' && message.text.trimStart().startsWith('/')) {
    return true;
  }
  if (typeof message.caption === 'string' && message.caption.trimStart().startsWith('/')) {
    return true;
  }
  return false;
}

const SERVICE_MESSAGE_KEYS: readonly string[] = [
  'new_chat_members',
  'left_chat_member',
  'new_chat_title',
  'new_chat_photo',
  'delete_chat_photo',
  'group_chat_created',
  'supergroup_chat_created',
  'channel_chat_created',
  'message_auto_delete_timer_changed',
  'migrate_to_chat_id',
  'migrate_from_chat_id',
  'pinned_message',
  'invoice',
  'successful_payment',
  'user_shared',
  'chat_shared',
  'write_access_allowed',
  'passport_data',
  'proximity_alert_triggered',
  'boost_added',
  'forum_topic_created',
  'forum_topic_edited',
  'forum_topic_closed',
  'forum_topic_reopened',
  'general_forum_topic_hidden',
  'general_forum_topic_unhidden',
  'giveaway',
  'giveaway_created',
  'giveaway_winners',
  'giveaway_completed',
  'video_chat_scheduled',
  'video_chat_started',
  'video_chat_ended',
  'video_chat_participants_invited',
  'web_app_data',
];

/**
 * Evaluates whether a message is an automated service/event message.
 */
export function isTelegramServiceMessage(message: TelegramMessage): boolean {
  for (const key of SERVICE_MESSAGE_KEYS) {
    if (message[key] !== undefined && message[key] !== null) {
      if (Array.isArray(message[key])) {
        if ((message[key] as unknown[]).length > 0) return true;
      } else {
        return true;
      }
    }
  }
  return false;
}

const UNSUPPORTED_MEDIA_KEYS: readonly string[] = [
  'sticker',
  'video_note',
  'poll',
  'dice',
  'game',
  'story',
  'contact',
  'location',
  'venue',
];

function isMediaPresent(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return typeof value === 'object';
}

/**
 * Evaluates whether a message contains media that never supports human topic discussion.
 */
function hasUnsupportedMediaType(message: TelegramMessage): boolean {
  for (const key of UNSUPPORTED_MEDIA_KEYS) {
    if (isMediaPresent(message[key])) {
      return true;
    }
  }
  return false;
}

const CAPTIONABLE_MEDIA_KEYS: readonly string[] = [
  'photo',
  'video',
  'document',
  'animation',
  'audio',
  'voice',
  'paid_media',
];

/**
 * Evaluates whether a message contains caption-capable media.
 */
function hasCaptionableMedia(message: TelegramMessage): boolean {
  for (const key of CAPTIONABLE_MEDIA_KEYS) {
    if (isMediaPresent(message[key])) {
      return true;
    }
  }
  return false;
}

/**
 * Extracts relationship metadata from reply_to_message if present.
 */
export function extractReplyMetadata(message: TelegramMessage): TelegramReplyMetadata | null {
  const reply = message.reply_to_message;
  if (!reply || typeof reply !== 'object') {
    return null;
  }

  const replyToMessageId = reply.message_id != null ? String(reply.message_id) : '';
  if (!replyToMessageId) {
    return null;
  }

  return {
    replyToMessageId,
    replyToUserId: reply.from?.id != null ? String(reply.from.id) : undefined,
    replyToIsForwarded: isTelegramForwarded(reply),
    replyToIsBot: isTelegramBotMessage(reply),
  };
}

/**
 * Pure qualification engine function.
 * Evaluates intake record and Telegram payload against structural rules in strict deterministic order.
 */
export function qualifyTelegramContent(
  record: TelegramIntakeRecordInput,
): StructuralQualificationResult {
  const baseExclusion = (reason: StructuralExclusionReason): StructuralQualificationResult => ({
    status: 'EXCLUDED',
    reason,
    districtId: record?.districtId ?? '',
    mahallaName: record?.mahallaName ?? '',
    telegramChatId: record?.telegramChatId ?? '',
    telegramMessageId: record?.telegramMessageId ?? '',
  });

  // Guard against malformed or missing record / payload
  if (!record || typeof record !== 'object' || !record.rawPayload || typeof record.rawPayload !== 'object') {
    return baseExclusion('MALFORMED_METADATA');
  }

  const payload = record.rawPayload as Record<string, unknown>;
  const rawMsg = (
    payload.message ??
    payload.channel_post ??
    payload.edited_message ??
    payload.edited_channel_post ??
    payload.business_message ??
    payload.edited_business_message ??
    payload
  ) as TelegramMessage;

  if (
    !rawMsg ||
    typeof rawMsg !== 'object' ||
    rawMsg.message_id === undefined ||
    rawMsg.message_id === null ||
    !rawMsg.chat ||
    typeof rawMsg.chat !== 'object'
  ) {
    return baseExclusion('MALFORMED_METADATA');
  }

  // 1. Forward guard (AC 4)
  if (isTelegramForwarded(rawMsg)) {
    return baseExclusion('FORWARDED_MESSAGE');
  }

  // 2. Bot guard (AC 3)
  if (isTelegramBotMessage(rawMsg)) {
    return baseExclusion('BOT_MESSAGE');
  }

  // 3. Command guard (AC 3)
  if (isTelegramCommand(rawMsg)) {
    return baseExclusion('BOT_COMMAND');
  }

  // 4. Service message guard (AC 3)
  if (isTelegramServiceMessage(rawMsg)) {
    return baseExclusion('SERVICE_MESSAGE');
  }

  // 5. Unsupported media type guard (AC 3)
  if (hasUnsupportedMediaType(rawMsg)) {
    return baseExclusion('UNSUPPORTED_MEDIA_TYPE');
  }

  const isoTimestamp = toSafeIsoTimestamp(record.originalTimestamp);
  if (!isoTimestamp) {
    return baseExclusion('MALFORMED_METADATA');
  }

  const telegramUserId =
    record.telegramUserId != null && record.telegramUserId !== ''
      ? record.telegramUserId
      : (rawMsg.from?.id != null ? String(rawMsg.from.id) : undefined);

  // 6. Captionable media evaluation (AC 2 & AC 3)
  if (hasCaptionableMedia(rawMsg)) {
    if (typeof rawMsg.caption === 'string' && hasMeaningfulText(rawMsg.caption)) {
      return {
        status: 'SUPPORTED',
        candidate: {
          intakeId: record.id,
          districtId: record.districtId,
          mahallaName: record.mahallaName,
          calendarDay: record.calendarDay,
          telegramChatId: record.telegramChatId,
          telegramMessageId: record.telegramMessageId,
          telegramUserId,
          originalTimestamp: isoTimestamp,
          contentType: 'MEDIA_CAPTION',
          verbatimText: rawMsg.caption,
          replyMetadata: extractReplyMetadata(rawMsg),
        },
      };
    }
    return baseExclusion('CAPTIONLESS_MEDIA');
  }

  // 7. Human text message evaluation (AC 1 & AC 3)
  if (typeof rawMsg.text === 'string') {
    if (hasMeaningfulText(rawMsg.text)) {
      return {
        status: 'SUPPORTED',
        candidate: {
          intakeId: record.id,
          districtId: record.districtId,
          mahallaName: record.mahallaName,
          calendarDay: record.calendarDay,
          telegramChatId: record.telegramChatId,
          telegramMessageId: record.telegramMessageId,
          telegramUserId,
          originalTimestamp: isoTimestamp,
          contentType: 'TEXT',
          verbatimText: rawMsg.text,
          replyMetadata: extractReplyMetadata(rawMsg),
        },
      };
    }
    return baseExclusion('EMPTY_CONTENT');
  }

  // 8. Fallback for unhandled/malformed structure (AC 10)
  return baseExclusion('MALFORMED_METADATA');
}
