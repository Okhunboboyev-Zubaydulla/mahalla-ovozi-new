import crypto from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import {
  districts,
  districtTelegramBots,
  districtTelegramGroups,
  DistrictTelegramGroup,
} from '../../adapters/db/schema/index.js';
import {
  TelegramGroupMapping,
  TelegramGroupStatusSchema,
  CreateTelegramGroupRequest,
  UpdateTelegramGroupRequest,
  StartGroupTestResponse,
  GetGroupTestStatusResponse,
  SimulateTestMessageResponse,
} from '@mahalla-ovozi/api-contracts';
import { decryptToken } from '../../adapters/crypto/token-cipher.js';
import {
  getTelegramChat,
  verifyBotGroupMembership,
  checkGroupPrivacyMode,
} from '../../adapters/telegram/telegram-client.js';
import { filterTelegramMessage, TelegramIncomingMessage } from '../../adapters/telegram/telegram-message-filter.js';
import { recordAuditEvent } from '../audit/audit-service.js';
import { DistrictNotFoundError } from '../districts/districts-service.js';
import { globalTestSessionManager, TelegramTestSessionManager } from './telegram-test-session-manager.js';

export class TelegramGroupNotFoundError extends Error {
  readonly code = 'TELEGRAM_GROUP_NOT_FOUND' as const;
  constructor(groupId: string) {
    super(`Маҳалла Telegram гуруҳи топилмади (ID: ${groupId}).`);
    this.name = 'TelegramGroupNotFoundError';
  }
}

export class MahallaNameAlreadyExistsError extends Error {
  readonly code = 'MAHALLA_NAME_EXISTS' as const;
  constructor(mahallaName: string) {
    super(`«${mahallaName}» номли маҳалла ушбу туманда аллақачон мавжуд.`);
    this.name = 'MahallaNameAlreadyExistsError';
  }
}

export class GroupAlreadyMappedError extends Error {
  readonly code = 'GROUP_ALREADY_MAPPED' as const;
  constructor(chatId: string) {
    super(`«${chatId}» ID рақамли Telegram гуруҳ ушбу туманда аллақачон бошқа маҳаллага бириктирилган.`);
    this.name = 'GroupAlreadyMappedError';
  }
}

export class GroupAlreadyAssignedError extends Error {
  readonly code = 'GROUP_ALREADY_ASSIGNED' as const;
  constructor(chatId: string) {
    super(`«${chatId}» ID рақамли Telegram гуруҳ бошқа туманга бириктирилган.`);
    this.name = 'GroupAlreadyAssignedError';
  }
}

export class BotNotConnectedError extends Error {
  readonly code = 'TELEGRAM_BOT_NOT_FOUND' as const;
  constructor(districtId: string) {
    super(`Гуруҳларни созлашдан аввал туман учун Telegram ботни уланг (District ID: ${districtId}).`);
    this.name = 'BotNotConnectedError';
  }
}

export function formatTelegramGroup(row: DistrictTelegramGroup): TelegramGroupMapping {
  return {
    id: row.id,
    districtId: row.districtId,
    mahallaName: row.mahallaName,
    telegramChatId: row.telegramChatId,
    telegramChatTitle: row.telegramChatTitle,
    telegramChatUsername: row.telegramChatUsername || null,
    status: TelegramGroupStatusSchema.parse(row.status),
    botMembershipStatus: row.botMembershipStatus || null,
    privacyModeDisabled: row.privacyModeDisabled,
    testMessageReceivedAt: row.testMessageReceivedAt ? row.testMessageReceivedAt.toISOString() : null,
    lastValidatedAt: row.lastValidatedAt ? row.lastValidatedAt.toISOString() : null,
    lastError: row.lastError || null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export interface Actor {
  id: string;
  role: string;
  username?: string;
}

export interface ClientInfo {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface GroupServiceOptions {
  sessionManager?: TelegramTestSessionManager;
}

/**
 * Lists all Telegram group mappings for a district.
 */
export async function listDistrictTelegramGroups(
  db: DbClient,
  districtId: string,
): Promise<TelegramGroupMapping[]> {
  const [district] = await db
    .select({ id: districts.id })
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  const rows = await db
    .select()
    .from(districtTelegramGroups)
    .where(eq(districtTelegramGroups.districtId, districtId))
    .orderBy(districtTelegramGroups.createdAt);

  return rows.map(formatTelegramGroup);
}

/**
 * Gets a single Telegram group mapping.
 */
export async function getDistrictTelegramGroup(
  db: DbClient,
  districtId: string,
  groupId: string,
): Promise<TelegramGroupMapping> {
  const [district] = await db
    .select({ id: districts.id })
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  const [row] = await db
    .select()
    .from(districtTelegramGroups)
    .where(
      and(
        eq(districtTelegramGroups.districtId, districtId),
        eq(districtTelegramGroups.id, groupId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  return formatTelegramGroup(row);
}

/**
 * Maps a new Telegram group to a Mahalla.
 * 1. Checks District and active Telegram bot existence.
 * 2. Decrypts bot token and verifies Telegram group membership via Telegram API (outside DB tx).
 * 3. Enforces passive non-admin constraint & checks group privacy mode.
 * 4. Persists record in DB and logs privacy-safe audit event.
 */
export async function createDistrictTelegramGroup(
  db: DbClient,
  districtId: string,
  input: CreateTelegramGroupRequest,
  actor?: Actor,
  clientInfo?: ClientInfo,
): Promise<TelegramGroupMapping> {
  const [district] = await db
    .select({ id: districts.id, name: districts.name })
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  const [botRow] = await db
    .select()
    .from(districtTelegramBots)
    .where(eq(districtTelegramBots.districtId, districtId))
    .limit(1);

  if (!botRow || botRow.status !== 'VALID') {
    throw new BotNotConnectedError(districtId);
  }

  // Decrypt bot token
  const token = decryptToken({
    encryptedToken: botRow.encryptedToken,
    tokenIv: botRow.tokenIv,
    tokenTag: botRow.tokenTag,
  });

  const trimmedChatId = input.telegramChatId.trim();
  const trimmedMahalla = input.mahallaName.trim();

  // Authoritative Telegram API validation OUTSIDE DB transaction (AD-1)
  const chatInfo = await getTelegramChat(token, trimmedChatId);
  await verifyBotGroupMembership(token, trimmedChatId, botRow.botId);
  const isPrivacyDisabled = await checkGroupPrivacyMode(token);

  const groupId = `dtg_${crypto.randomUUID()}`;
  const now = new Date();

  let savedRow: DistrictTelegramGroup | undefined;

  try {
    await db.transaction(async (tx) => {
      // Check case-insensitive mahalla name uniqueness within district
      const [existingMahalla] = await tx
        .select({ id: districtTelegramGroups.id })
        .from(districtTelegramGroups)
        .where(
          and(
            eq(districtTelegramGroups.districtId, districtId),
            sql`LOWER(${districtTelegramGroups.mahallaName}) = LOWER(${trimmedMahalla})`,
          ),
        )
        .limit(1);

      if (existingMahalla) {
        throw new MahallaNameAlreadyExistsError(trimmedMahalla);
      }

      // Check telegramChatId uniqueness within and across districts
      const [existingChat] = await tx
        .select({ id: districtTelegramGroups.id, districtId: districtTelegramGroups.districtId })
        .from(districtTelegramGroups)
        .where(eq(districtTelegramGroups.telegramChatId, trimmedChatId))
        .limit(1);

      if (existingChat) {
        if (existingChat.districtId === districtId) {
          throw new GroupAlreadyMappedError(trimmedChatId);
        } else {
          throw new GroupAlreadyAssignedError(trimmedChatId);
        }
      }

      const [inserted] = await tx
        .insert(districtTelegramGroups)
        .values({
          id: groupId,
          districtId,
          mahallaName: trimmedMahalla,
          telegramChatId: trimmedChatId,
          telegramChatTitle: chatInfo.chatTitle,
          telegramChatUsername: chatInfo.chatUsername,
          status: 'PENDING',
          botMembershipStatus: 'member',
          privacyModeDisabled: isPrivacyDisabled,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      savedRow = inserted;

      await recordAuditEvent(tx, {
        actorId: actor?.id || null,
        actorRole: actor?.role || null,
        action: 'DISTRICT_GROUP_MAPPED',
        metadata: {
          districtId,
          groupId,
          mahallaName: trimmedMahalla,
          telegramChatId: trimmedChatId,
          telegramChatTitle: chatInfo.chatTitle,
        },
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
      });
    });
  } catch (err: unknown) {
    if (
      err instanceof MahallaNameAlreadyExistsError ||
      err instanceof GroupAlreadyMappedError ||
      err instanceof GroupAlreadyAssignedError
    ) {
      throw err;
    }

    const pgErr = (
      err && typeof err === 'object' && 'cause' in err && err.cause && typeof err.cause === 'object'
        ? err.cause
        : err
    ) as { code?: string; detail?: string; constraint?: string } | null;

    if (pgErr && pgErr.code === '23505') {
      const detail = String(pgErr.detail || '');
      const constraint = String(pgErr.constraint || '');
      if (
        detail.includes('mahalla_name') ||
        constraint.includes('district_telegram_groups_district_mahalla_lower_idx')
      ) {
        throw new MahallaNameAlreadyExistsError(trimmedMahalla);
      }
      if (
        detail.includes('telegram_chat_id') ||
        constraint.includes('district_telegram_groups_chat_id_idx')
      ) {
        throw new GroupAlreadyAssignedError(trimmedChatId);
      }
    }
    throw err;
  }

  if (!savedRow) {
    throw new Error('Failed to create telegram group mapping.');
  }

  return formatTelegramGroup(savedRow);
}

/**
 * Updates a Mahalla or Telegram Chat ID mapping.
 */
export async function updateDistrictTelegramGroup(
  db: DbClient,
  districtId: string,
  groupId: string,
  input: UpdateTelegramGroupRequest,
  actor?: Actor,
  clientInfo?: ClientInfo,
): Promise<TelegramGroupMapping> {
  const [group] = await db
    .select()
    .from(districtTelegramGroups)
    .where(
      and(
        eq(districtTelegramGroups.districtId, districtId),
        eq(districtTelegramGroups.id, groupId),
      ),
    )
    .limit(1);

  if (!group) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  const [botRow] = await db
    .select()
    .from(districtTelegramBots)
    .where(eq(districtTelegramBots.districtId, districtId))
    .limit(1);

  if (!botRow || botRow.status !== 'VALID') {
    throw new BotNotConnectedError(districtId);
  }

  const newMahallaName = input.mahallaName ? input.mahallaName.trim() : group.mahallaName;
  const newChatId = input.telegramChatId ? input.telegramChatId.trim() : group.telegramChatId;
  const isChatChanged = newChatId !== group.telegramChatId;

  let chatInfo = {
    chatTitle: group.telegramChatTitle,
    chatUsername: group.telegramChatUsername,
  };
  let isPrivacyDisabled = group.privacyModeDisabled;

  if (isChatChanged) {
    const token = decryptToken({
      encryptedToken: botRow.encryptedToken,
      tokenIv: botRow.tokenIv,
      tokenTag: botRow.tokenTag,
    });

    const info = await getTelegramChat(token, newChatId);
    await verifyBotGroupMembership(token, newChatId, botRow.botId);
    isPrivacyDisabled = await checkGroupPrivacyMode(token);
    chatInfo = {
      chatTitle: info.chatTitle,
      chatUsername: info.chatUsername,
    };
  }

  const now = new Date();
  let updatedRow: DistrictTelegramGroup | undefined;

  await db.transaction(async (tx) => {
    // Check mahalla name collision if changed
    if (newMahallaName.toLowerCase() !== group.mahallaName.toLowerCase()) {
      const [existingMahalla] = await tx
        .select({ id: districtTelegramGroups.id })
        .from(districtTelegramGroups)
        .where(
          and(
            eq(districtTelegramGroups.districtId, districtId),
            sql`LOWER(${districtTelegramGroups.mahallaName}) = LOWER(${newMahallaName})`,
          ),
        )
        .limit(1);

      if (existingMahalla) {
        throw new MahallaNameAlreadyExistsError(newMahallaName);
      }
    }

    // Check chat id collision if changed
    if (isChatChanged) {
      const [existingChat] = await tx
        .select({ id: districtTelegramGroups.id, districtId: districtTelegramGroups.districtId })
        .from(districtTelegramGroups)
        .where(eq(districtTelegramGroups.telegramChatId, newChatId))
        .limit(1);

      if (existingChat && existingChat.id !== groupId) {
        if (existingChat.districtId === districtId) {
          throw new GroupAlreadyMappedError(newChatId);
        } else {
          throw new GroupAlreadyAssignedError(newChatId);
        }
      }
    }

    const [updated] = await tx
      .update(districtTelegramGroups)
      .set({
        mahallaName: newMahallaName,
        telegramChatId: newChatId,
        telegramChatTitle: chatInfo.chatTitle,
        telegramChatUsername: chatInfo.chatUsername,
        status: isChatChanged ? 'PENDING' : group.status,
        botMembershipStatus: isChatChanged ? 'member' : group.botMembershipStatus,
        privacyModeDisabled: isPrivacyDisabled,
        testMessageReceivedAt: isChatChanged ? null : group.testMessageReceivedAt,
        lastValidatedAt: isChatChanged ? null : group.lastValidatedAt,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(districtTelegramGroups.id, groupId))
      .returning();

    updatedRow = updated;

    await recordAuditEvent(tx, {
      actorId: actor?.id || null,
      actorRole: actor?.role || null,
      action: 'DISTRICT_GROUP_REMAPPED',
      metadata: {
        districtId,
        groupId,
        mahallaName: newMahallaName,
        telegramChatId: newChatId,
        isChatChanged,
      },
      ipAddress: clientInfo?.ipAddress || null,
      userAgent: clientInfo?.userAgent || null,
    });
  });

  if (!updatedRow) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  return formatTelegramGroup(updatedRow);
}

/**
 * Removes a Telegram group mapping.
 */
export async function deleteDistrictTelegramGroup(
  db: DbClient,
  districtId: string,
  groupId: string,
  actor?: Actor,
  clientInfo?: ClientInfo,
): Promise<{ success: boolean; deletedGroupId: string }> {
  const [group] = await db
    .select()
    .from(districtTelegramGroups)
    .where(
      and(
        eq(districtTelegramGroups.districtId, districtId),
        eq(districtTelegramGroups.id, groupId),
      ),
    )
    .limit(1);

  if (!group) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  await db.transaction(async (tx) => {
    const [deleted] = await tx
      .delete(districtTelegramGroups)
      .where(eq(districtTelegramGroups.id, groupId))
      .returning();

    if (!deleted) {
      throw new TelegramGroupNotFoundError(groupId);
    }

    await recordAuditEvent(tx, {
      actorId: actor?.id || null,
      actorRole: actor?.role || null,
      action: 'DISTRICT_GROUP_UNMAPPED',
      metadata: {
        districtId,
        groupId,
        mahallaName: group.mahallaName,
        telegramChatId: group.telegramChatId,
      },
      ipAddress: clientInfo?.ipAddress || null,
      userAgent: clientInfo?.userAgent || null,
    });
  });

  return { success: true, deletedGroupId: groupId };
}

/**
 * Starts a 60-second in-memory test session for a group.
 */
export async function startGroupTestSession(
  db: DbClient,
  districtId: string,
  groupId: string,
  _actor?: Actor,
  options: GroupServiceOptions = {},
): Promise<StartGroupTestResponse> {
  const manager = options.sessionManager ?? globalTestSessionManager;

  const [group] = await db
    .select()
    .from(districtTelegramGroups)
    .where(
      and(
        eq(districtTelegramGroups.districtId, districtId),
        eq(districtTelegramGroups.id, groupId),
      ),
    )
    .limit(1);

  if (!group) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  const [botRow] = await db
    .select()
    .from(districtTelegramBots)
    .where(eq(districtTelegramBots.districtId, districtId))
    .limit(1);

  if (!botRow || botRow.status !== 'VALID') {
    throw new BotNotConnectedError(districtId);
  }

  const session = manager.createSession({
    districtId,
    groupId,
    chatId: group.telegramChatId,
    botId: botRow.botId,
  });

  await db
    .update(districtTelegramGroups)
    .set({
      status: 'TESTING',
      updatedAt: new Date(),
    })
    .where(eq(districtTelegramGroups.id, groupId));

  return {
    session: {
      status: session.status,
      expiresAt: session.expiresAt.toISOString(),
    },
  };
}

/**
 * Checks test session status and synchronizes DB state upon success/timeout.
 */
export async function getGroupTestStatus(
  db: DbClient,
  districtId: string,
  groupId: string,
  actor?: Actor,
  clientInfo?: ClientInfo,
  options: GroupServiceOptions = {},
): Promise<GetGroupTestStatusResponse> {
  const manager = options.sessionManager ?? globalTestSessionManager;

  const [group] = await db
    .select()
    .from(districtTelegramGroups)
    .where(
      and(
        eq(districtTelegramGroups.districtId, districtId),
        eq(districtTelegramGroups.id, groupId),
      ),
    )
    .limit(1);

  if (!group) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  const session = manager.getSession(districtId, groupId);

  if (session?.status === 'SUCCESS' && group.status !== 'VALID') {
    const receivedAt = session.testMessageReceivedAt || new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(districtTelegramGroups)
        .set({
          status: 'VALID',
          testMessageReceivedAt: receivedAt,
          lastValidatedAt: receivedAt,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(districtTelegramGroups.id, groupId));

      await recordAuditEvent(tx, {
        actorId: actor?.id || null,
        actorRole: actor?.role || null,
        action: 'DISTRICT_GROUP_VALIDATED',
        metadata: {
          districtId,
          groupId,
          mahallaName: group.mahallaName,
          telegramChatId: group.telegramChatId,
          validatedAt: receivedAt.toISOString(),
        },
        ipAddress: clientInfo?.ipAddress || null,
        userAgent: clientInfo?.userAgent || null,
      });
    });

    return {
      status: 'SUCCESS',
      testMessageReceivedAt: receivedAt.toISOString(),
      lastError: null,
    };
  }

  if (session?.status === 'TIMEOUT' && group.status === 'TESTING') {
    await db
      .update(districtTelegramGroups)
      .set({
        status: 'FAILED',
        lastError: session.lastError || 'СинОВ вақти тугади.',
        updatedAt: new Date(),
      })
      .where(eq(districtTelegramGroups.id, groupId));

    return {
      status: 'TIMEOUT',
      testMessageReceivedAt: null,
      lastError: session.lastError || 'СинОВ вақти тугади.',
    };
  }

  if (group.status === 'VALID') {
    return {
      status: 'SUCCESS',
      testMessageReceivedAt: group.testMessageReceivedAt ? group.testMessageReceivedAt.toISOString() : null,
      lastError: null,
    };
  }

  return {
    status: (session?.status as 'PENDING' | 'SUCCESS' | 'TIMEOUT' | 'FAILED') || (group.status as any),
    testMessageReceivedAt: group.testMessageReceivedAt ? group.testMessageReceivedAt.toISOString() : null,
    lastError: group.lastError || null,
  };
}

/**
 * Handles incoming Telegram webhook updates for onboarding districts.
 * Zero resident test data persistence (AC 8).
 */
export async function handleIncomingWebhookMessage(
  db: DbClient,
  _botId: string,
  rawUpdate: unknown,
  options: GroupServiceOptions = {},
): Promise<{ handled: boolean; accepted: boolean; reason?: string }> {
  const manager = options.sessionManager ?? globalTestSessionManager;
  const update = rawUpdate as { message?: TelegramIncomingMessage; channel_post?: TelegramIncomingMessage };
  const incoming = update?.message || update?.channel_post;

  if (!incoming) {
    return { handled: false, accepted: false, reason: 'NO_MESSAGE' };
  }

  const filterResult = filterTelegramMessage(incoming);
  if (!filterResult.accepted) {
    return { handled: true, accepted: false, reason: filterResult.reason };
  }

  const chatId = String(incoming.chat?.id || '');
  const activeSession = manager.findActiveSessionByChatId(chatId);

  if (!activeSession) {
    // No active test session open for this chat during onboarding; discard immediately
    return { handled: true, accepted: false, reason: 'NO_ACTIVE_SESSION' };
  }

  const now = new Date();
  manager.resolveSessionSuccess(activeSession.districtId, activeSession.groupId, now);

  await db.transaction(async (tx) => {
    await tx
      .update(districtTelegramGroups)
      .set({
        status: 'VALID',
        testMessageReceivedAt: now,
        lastValidatedAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(districtTelegramGroups.id, activeSession.groupId));

    await recordAuditEvent(tx, {
      actorId: 'system:telegram-webhook',
      actorRole: 'system',
      action: 'DISTRICT_GROUP_VALIDATED',
      metadata: {
        districtId: activeSession.districtId,
        groupId: activeSession.groupId,
        telegramChatId: chatId,
        validatedAt: now.toISOString(),
      },
      ipAddress: null,
      userAgent: null,
    });
  });

  return { handled: true, accepted: true };
}

/**
 * Non-production test simulation endpoint (AC 10).
 */
export async function simulateGroupTestMessage(
  db: DbClient,
  districtId: string,
  groupId: string,
  messagePayload: unknown,
  actor?: Actor,
  clientInfo?: ClientInfo,
  options: GroupServiceOptions = {},
): Promise<SimulateTestMessageResponse> {
  const manager = options.sessionManager ?? globalTestSessionManager;

  const [group] = await db
    .select()
    .from(districtTelegramGroups)
    .where(
      and(
        eq(districtTelegramGroups.districtId, districtId),
        eq(districtTelegramGroups.id, groupId),
      ),
    )
    .limit(1);

  if (!group) {
    throw new TelegramGroupNotFoundError(groupId);
  }

  const incoming = messagePayload as TelegramIncomingMessage;
  const filterResult = filterTelegramMessage(incoming);

  if (!filterResult.accepted) {
    return {
      success: true,
      accepted: false,
      reason: filterResult.reason,
    };
  }

  const now = new Date();
  manager.resolveSessionSuccess(districtId, groupId, now);

  await db.transaction(async (tx) => {
    await tx
      .update(districtTelegramGroups)
      .set({
        status: 'VALID',
        testMessageReceivedAt: now,
        lastValidatedAt: now,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(districtTelegramGroups.id, groupId));

    await recordAuditEvent(tx, {
      actorId: actor?.id || 'system:simulator',
      actorRole: actor?.role || 'system',
      action: 'DISTRICT_GROUP_VALIDATED',
      metadata: {
        districtId,
        groupId,
        mahallaName: group.mahallaName,
        telegramChatId: group.telegramChatId,
        simulated: true,
        validatedAt: now.toISOString(),
      },
      ipAddress: clientInfo?.ipAddress || null,
      userAgent: clientInfo?.userAgent || null,
    });
  });

  return {
    success: true,
    accepted: true,
  };
}
