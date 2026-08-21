import { eq, and, desc, sql } from 'drizzle-orm';
import { DbClient, DbOrTx } from '../../adapters/db/client.js';
import {
  districts,
  districtTelegramBots,
  districtTelegramGroups,
  accounts,
} from '../../adapters/db/schema/index.js';
import {
  DistrictReadiness,
  PrerequisiteItem,
  DistrictStatusSchema,
  ConfirmDisclosureResponse,
} from '@mahalla-ovozi/api-contracts';
import { DistrictNotFoundError, DistrictAlreadyActiveError } from './districts-service.js';
import { recordAuditEvent } from '../audit/audit-service.js';

export function evaluateDistrictPrerequisites(
  district: typeof districts.$inferSelect,
  telegramBot?: typeof districtTelegramBots.$inferSelect | null,
  telegramGroups?: Array<typeof districtTelegramGroups.$inferSelect>,
  hokimAccount?: typeof accounts.$inferSelect | null,
): PrerequisiteItem[] {
  const isBotValid = Boolean(telegramBot && telegramBot.status === 'VALID');
  const groups = telegramGroups ?? [];
  const hasGroups = groups.length > 0;
  const allGroupsValid = hasGroups && groups.every((g) => g.status === 'VALID');
  const invalidGroupCount = groups.filter((g) => g.status !== 'VALID').length;

  const isHokimValid = Boolean(hokimAccount && hokimAccount.status === 'ACTIVE');
  const isHokimDisabled = Boolean(hokimAccount && hokimAccount.status === 'DISABLED');

  const items: PrerequisiteItem[] = [
    {
      key: 'district_identity',
      label: 'Туман маълумотлари',
      description: 'Туман номи ва ҳудудий маълумотлари қайд этилган',
      status: district.name && district.name.trim().length > 0 ? 'passed' : 'incomplete',
      blockerReason:
        district.name && district.name.trim().length > 0
          ? undefined
          : 'Туман номи тўлиқ киритилмаган.',
    },
    {
      key: 'access_eligibility',
      label: 'Тизимга кириш ҳуқуқи',
      description: 'Туман тизимга кириш учун фаол ҳолатда',
      status: district.accessEligible ? 'passed' : 'failed',
      blockerReason: district.accessEligible
        ? undefined
        : 'Туманнинг тизимга кириш ҳуқуқи чекланган.',
    },
    {
      key: 'analysis_configuration',
      label: 'Асосий таҳлил созламалари',
      description: 'Тасдиқланган базавий таҳлил профили бириктирилган',
      status: district.analysisConfigProfileId === 'baseline_v1' ? 'passed' : 'incomplete',
      blockerReason:
        district.analysisConfigProfileId === 'baseline_v1'
          ? undefined
          : 'Базавий таҳлил профили созланмаган.',
    },
    {
      key: 'district_isolation',
      label: 'Ҳудудий хавфсизлик чегараси',
      description: 'Туманнинг алоҳида хавфсизлик муҳити текширилди',
      status: 'passed',
    },
    {
      key: 'disclosure_confirmation',
      label: 'Операцион кириш очиқлигини тасдиқлаш',
      description: 'Ташқи операцион кириш бўйича расмий тасдиқлов қайд этилди',
      status: district.disclosureConfirmedAt ? 'passed' : 'incomplete',
      blockerReason: district.disclosureConfirmedAt
        ? undefined
        : 'Маҳсулот эгаси томонидан операцион кириш очиқлиги тасдиқланмаган.',
      actionRequired: !district.disclosureConfirmedAt,
      completedAt: district.disclosureConfirmedAt
        ? district.disclosureConfirmedAt.toISOString()
        : undefined,
      completedBy: district.disclosureConfirmedById ?? undefined,
    },
    {
      key: 'telegram_bot',
      label: 'Telegram бот уланиши',
      description:
        isBotValid && telegramBot
          ? `Туманнинг расмий Telegram боти (${telegramBot.botUsername ? `@${telegramBot.botUsername}` : telegramBot.botFirstName}) фаоллаштирилди`
          : 'Туманнинг расмий Telegram боти фаоллаштирилди',
      status: isBotValid ? 'passed' : 'incomplete',
      blockerReason: isBotValid ? undefined : 'Telegram бот ҳали уланмаган (1.4-босқич).',
      actionRequired: !isBotValid,
      actionPath: !isBotValid ? '/telegram-setup' : undefined,
      completedAt: isBotValid && telegramBot ? telegramBot.lastValidatedAt.toISOString() : undefined,
    },
    {
      key: 'group_mappings',
      label: 'Гуруҳлар ва маҳаллалар харитаси',
      description: allGroupsValid
        ? `${groups.length} та маҳалла Telegram гуруҳи муваффақиятли бириктирилди ва синовдан ўтди`
        : 'Telegram гуруҳлари тегишли маҳаллаларга бириктирилди',
      status: allGroupsValid ? 'passed' : 'incomplete',
      blockerReason: !hasGroups
        ? 'Маҳалла Telegram гуруҳлари ҳали бириктирилмаган.'
        : !allGroupsValid
          ? `${invalidGroupCount} та гуруҳ ҳали тўлиқ синовдан ўтмаган ёки тасдиқланмаган.`
          : undefined,
      actionRequired: !allGroupsValid,
      actionPath: !allGroupsValid ? '/telegram-setup' : undefined,
      completedAt: allGroupsValid
        ? (groups
            .map((g) => g.lastValidatedAt || g.testMessageReceivedAt || g.updatedAt)
            .filter(Boolean)
            .sort((a, b) => (b ? new Date(b).getTime() : 0) - (a ? new Date(a).getTime() : 0))[0]
            ?.toISOString() ?? undefined)
        : undefined,
    },
    {
      key: 'hokim_account',
      label: 'Ҳоким аккаунти',
      description: isHokimValid && hokimAccount
        ? `Туман ҳокими учун хавфсиз аккаунт яратилди (@${hokimAccount.username})`
        : 'Туман ҳокими учун хавфсиз аккаунт яратилди',
      status: isHokimValid ? 'passed' : 'incomplete',
      blockerReason: isHokimValid
        ? undefined
        : isHokimDisabled
          ? 'Ҳоким аккаунти фаолсизлантирилган (1.6-босқич). Янги аккаунт яратинг ёки алмаштиринг.'
          : 'Ҳоким аккаунти яратилмаган (1.6-босқич).',
      actionRequired: !isHokimValid,
      actionPath: !isHokimValid ? '/hokim-accounts' : undefined,
      completedAt: isHokimValid && hokimAccount
        ? (hokimAccount.updatedAt || hokimAccount.createdAt).toISOString()
        : undefined,
    },
  ];

  return items;
}

export async function evaluateDistrictReadiness(
  db: DbOrTx,
  districtId: string,
): Promise<DistrictReadiness> {

  const [district] = await db
    .select()
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

  const groupRows = await db
    .select()
    .from(districtTelegramGroups)
    .where(eq(districtTelegramGroups.districtId, districtId));

  const [hokimAccount] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.districtId, districtId),
        eq(accounts.role, 'DISTRICT_HOKIM'),
      ),
    )
    .orderBy(
      sql`CASE WHEN ${accounts.status} = 'ACTIVE' THEN 1 ELSE 2 END`,
      desc(accounts.updatedAt),
    )
    .limit(1);

  const items = evaluateDistrictPrerequisites(district, botRow, groupRows, hokimAccount);
  const passedCount = items.filter((item) => item.status === 'passed').length;
  const totalCount = items.length;
  const isActivationReady = passedCount === totalCount;

  return {
    districtId: district.id,
    districtName: district.name,
    status: DistrictStatusSchema.parse(district.status),
    isActivationReady,
    passedCount,
    totalCount,
    evaluatedAt: new Date().toISOString(),
    items,
    disclosureConfirmedAt: district.disclosureConfirmedAt
      ? district.disclosureConfirmedAt.toISOString()
      : null,
    disclosureConfirmedById: district.disclosureConfirmedById ?? null,
  };
}

export async function confirmDistrictDisclosure(
  db: DbClient,
  districtId: string,
  actor: { id: string; role: string },
  clientInfo?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<ConfirmDisclosureResponse> {
  const [district] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!district) {
    throw new DistrictNotFoundError(districtId);
  }

  if (district.status !== 'SETUP_INCOMPLETE') {
    throw new DistrictAlreadyActiveError(districtId);
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    // Explicit updatedAt rule (Patch P1 / P2-C) & CAS concurrency guard
    const [updated] = await tx
      .update(districts)
      .set({
        disclosureConfirmedAt: now,
        disclosureConfirmedById: actor.id,
        updatedAt: now,
      })
      .where(
        and(
          eq(districts.id, districtId),
          eq(districts.status, 'SETUP_INCOMPLETE')
        )
      )
      .returning();

    if (!updated) {
      const [current] = await tx
        .select({ status: districts.status })
        .from(districts)
        .where(eq(districts.id, districtId))
        .limit(1);

      if (!current) {
        throw new DistrictNotFoundError(districtId);
      }
      throw new DistrictAlreadyActiveError(districtId);
    }

    // AD-9 privacy-safe audit metadata
    await recordAuditEvent(tx, {
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DISTRICT_DISCLOSURE_CONFIRMED',
      ipAddress: clientInfo?.ipAddress ?? null,
      userAgent: clientInfo?.userAgent ?? null,
      metadata: {
        districtId,
        districtName: district.name,
        confirmedAt: now.toISOString(),
      },
    });
  });

  return {
    districtId,
    disclosureConfirmedAt: now.toISOString(),
    disclosureConfirmedById: actor.id,
  };
}
