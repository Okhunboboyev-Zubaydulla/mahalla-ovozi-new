import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, index, uniqueIndex, check } from 'drizzle-orm/pg-core';

export const districts = pgTable(
  'districts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    region: text('region'),
    status: text('status').notNull().default('SETUP_INCOMPLETE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Status check constraint matching database migration
    check(
      'districts_status_check',
      sql`${table.status} IN ('SETUP_INCOMPLETE', 'ACTIVE', 'SUSPENDED', 'CANCELLED')`
    ),
    // Functional unique index — enforces case-insensitive name uniqueness at DB level (P2-A)
    uniqueIndex('districts_name_lower_idx').on(sql`LOWER(${table.name})`),
    // Name index for text search lookups
    index('districts_name_idx').on(table.name),
  ]
);

export type District = typeof districts.$inferSelect;
export type NewDistrict = typeof districts.$inferInsert;
