import { pgTable, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { districts } from './districts.js';

export const topics = pgTable(
  'topics',
  {
    id: text('id').primaryKey(), // 'top_<uuid>'
    districtId: text('district_id')
      .notNull()
      .references(() => districts.id, { onDelete: 'cascade' }),
    mahallaName: text('mahalla_name').notNull(),
    calendarDay: text('calendar_day').notNull(), // 'YYYY-MM-DD' in Asia/Tashkent
    primaryLane: text('primary_lane').notNull(), // 'WATER' | 'ELECTRICITY' | 'GAS' | 'WASTE' | 'HOKIM_RELATED'
    status: text('status').notNull().default('ACTIVE'), // 'ACTIVE' | 'ARCHIVED'
    latestRelevantEvidenceTimestamp: timestamp('latest_relevant_evidence_timestamp', {
      withTimezone: true,
    }).notNull(),
    retentionExpiresAt: timestamp('retention_expires_at', {
      withTimezone: true,
    }).notNull(),
    requiredDerivedGeneration: integer('required_derived_generation').notNull().default(1),
    appliedDerivedGeneration: integer('applied_derived_generation').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Scoped query index for day/mahalla topic lookups
    index('topics_district_mahalla_day_idx').on(
      table.districtId,
      table.mahallaName,
      table.calendarDay,
    ),
    // Query index for district topic status lookups
    index('topics_district_status_idx').on(table.districtId, table.status),
    // Scoped index for retention scans and expiry cleanups (Story 2.6 / FR-12)
    index('topics_district_retention_idx').on(table.districtId, table.retentionExpiresAt),
  ],
);

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;
