import { pgTable, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id'),
    actorRole: text('actor_role'),
    action: text('action').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audit_events_created_at_idx').on(table.createdAt),
    index('audit_events_action_idx').on(table.action),
    index('audit_events_actor_id_idx').on(table.actorId),
  ]
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
