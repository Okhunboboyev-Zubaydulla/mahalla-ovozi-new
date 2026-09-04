# Deferred Work

## Deferred from: code review of implementation_plan.md (2026-09-04)
- **Database Indexing Gap on `original_timestamp` and `mahalla_name` (`pg_trgm`)**: `telegram_intake_records` currently lacks dedicated indexes for high-volume timestamp ranges and substring search (`ILIKE %...%`). Requires a future migration to add composite index on `(district_id, original_timestamp)` and a `pg_trgm` GIN index on `mahalla_name`.
- **Backend Bidirectional Keyset Pagination (`direction: 'backward'`)**: `ListSignalsQuerySchema` specifies `direction: 'forward' | 'backward'`, but `SignalManagementService.listSignals` only implements forward comparison. The frontend currently works around this by maintaining an in-memory cursor history stack.
- **Timezone Offset Standardization on Local Dayjs**: DatePicker range presets and formatting use browser-local time rather than explicit `Asia/Tashkent` (`UTC+5`) Dayjs timezone extension. Standardize Dayjs timezone globally across the web application in a dedicated i18n pass.
