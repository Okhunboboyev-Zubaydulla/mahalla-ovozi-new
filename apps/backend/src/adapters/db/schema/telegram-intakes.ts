import { pgTable, text, timestamp, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { districts } from './districts.js';

export const telegramIntakeRecords = pgTable(
  'telegram_intake_records',
  {
    id: text('id').primaryKey(),
    districtId: text('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'cascade' }),
    mahallaName: text('mahalla_name').notNull(),
    telegramBotId: text('telegram_bot_id').notNull(),
    telegramChatId: text('telegram_chat_id').notNull(),
    telegramMessageId: text('telegram_message_id').notNull(),
    updateId: text('update_id'),
    telegramUserId: text('telegram_user_id'),
    originalTimestamp: timestamp('original_timestamp', { withTimezone: true }).notNull(),
    calendarDay: text('calendar_day').notNull(), // 'YYYY-MM-DD' in Asia/Tashkent
    rawPayload: jsonb('raw_payload').notNull(),
    batchId: text('batch_id'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Deduplication constraint: exactly 1 record per district + chat + message
    uniqueIndex('telegram_intakes_district_chat_msg_idx').on(
      table.districtId,
      table.telegramChatId,
      table.telegramMessageId,
    ),
    // Scoped query index for topic clustering & daily snapshot assembly
    index('telegram_intakes_district_day_mahalla_idx').on(
      table.districtId,
      table.calendarDay,
      table.mahallaName,
    ),
    // Query index for district chronological lookups
    index('telegram_intakes_district_created_idx').on(
      table.districtId,
      table.createdAt,
    ),
    // Query index for burst buffer lookups
    index('telegram_intakes_burst_unprocessed_idx').on(
      table.districtId,
      table.telegramChatId,
      table.telegramUserId,
      table.processedAt,
    ),
  ],
);

export type TelegramIntakeRecord = typeof telegramIntakeRecords.$inferSelect;
export type NewTelegramIntakeRecord = typeof telegramIntakeRecords.$inferInsert;
