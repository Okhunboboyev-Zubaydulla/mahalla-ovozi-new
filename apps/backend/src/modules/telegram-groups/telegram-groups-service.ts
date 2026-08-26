import crypto from 'node:crypto';
import { eq, and, sql } from 'drizzle-orm';
import { DbClient, mapPostgresConstraintError } from '../../adapters/db/client.js';
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
} from '@mahalla-ovozi/api-contracts';
import { decryptToken } from '../../adapters/crypto/token-cipher.js';
import {
  getTelegramChat,
  verifyBotGroupMembership,
  checkGroupPrivacyMode,
  TelegramIntegrationError,
} from '../../adapters/telegram/telegram-client.js';
import { recordAuditEvent } from '../audit/audit-service.js';
import { DistrictNotFoundError } from '../districts/district-onboarding-engine.js';
import { globalTestSessionManager, TelegramTestSessionManager } from './telegram-test-session-store.js';

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

  const token = decryptToken({
    encryptedToken: botRow.encryptedToken,
    tokenIv: botRow.tokenIv,
    tokenTag: botRow.tokenTag,
  });

  const trimmedChatId = input.telegramChatId.trim();
  const trimmedMahalla = input.mahallaName.trim();

  const chatInfo = await getTelegramChat(token, trimmedChatId);
  if (chatInfo.chatType !== 'group' && chatInfo.chatType !== 'supergroup') {
    throw new TelegramIntegrationError(
      'Фақат Telegram гуруҳларини (гуруҳ ёки супергуруҳ) бириктириш мумкин. Канал ёки шахсий ёзишмалар қабул қилинмайди.',
      'INVALID_CHAT_TYPE',
      400,
    );
  }
  await verifyBotGroupMembership(token, trimmedChatId, botRow.botId);
  const isPrivacyDisabled = await checkGroupPrivacyMode(token);

  const groupId = `dtg_${crypto.randomUUID()}`;
  const now = new Date();

  let savedRow: DistrictTelegramGroup | undefined;

  try {
    await db.transaction(async (tx) => {
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

    mapPostgresConstraintError(err, {
      district_telegram_groups_district_mahalla_lower_idx: () => new MahallaNameAlreadyExistsError(trimmedMahalla),
      mahalla_name: () => new MahallaNameAlreadyExistsError(trimmedMahalla),
      district_telegram_groups_chat_id_idx: () => new GroupAlreadyAssignedError(trimmedChatId),
      telegram_chat_id: () => new GroupAlreadyAssignedError(trimmedChatId),
    });
    throw err;
  }

  if (!savedRow) {
    throw new Error('Failed to create telegram group mapping.');
  }

  return formatTelegramGroup(savedRow);
}

export async function updateDistrictTelegramGroup(
  db: DbClient,
  districtId: string,
  groupId: string,
  input: UpdateTelegramGroupRequest,
  actor?: Actor,
  clientInfo?: ClientInfo,
  options: GroupServiceOptions = {},
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
  const isMahallaChanged = newMahallaName.toLowerCase() !== group.mahallaName.toLowerCase();

  if (!isChatChanged && !isMahallaChanged && input.mahallaName === undefined && input.telegramChatId === undefined) {
    return formatTelegramGroup(group);
  }

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
    if (info.chatType !== 'group' && info.chatType !== 'supergroup') {
      throw new TelegramIntegrationError(
        'Фақат Telegram гуруҳларини (гуруҳ ёки супергуруҳ) бириктириш мумкин. Канал ёки шахсий ёзишмалар қабул қилинмайди.',
        'INVALID_CHAT_TYPE',
        400,
      );
    }
    await verifyBotGroupMembership(token, newChatId, botRow.botId);
    isPrivacyDisabled = await checkGroupPrivacyMode(token);
    chatInfo = {
      chatTitle: info.chatTitle,
      chatUsername: info.chatUsername,
    };

    (options.sessionManager ?? globalTestSessionManager).resolveSessionFailure(
      districtId,
      groupId,
      'Гуруҳ Chat ID ўзгартирилди',
    );
  }

  const now = new Date();
  let updatedRow: DistrictTelegramGroup | undefined;

  await db.transaction(async (tx) => {
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

export async function deleteDistrictTelegramGroup(
  db: DbClient,
  districtId: string,
  groupId: string,
  actor?: Actor,
  clientInfo?: ClientInfo,
  options: GroupServiceOptions = {},
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

  (options.sessionManager ?? globalTestSessionManager).resolveSessionFailure(
    districtId,
    groupId,
    'Гуруҳ ўчирилди',
  );

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
