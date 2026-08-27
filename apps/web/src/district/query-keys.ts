/**
 * Canonical Query Key Factory for District Management & Workspace Domain (AD-10).
 * Guarantees unified serialization for TanStack Query caching, cancellation, and invalidation.
 */
export const districtQueryKeys = {
  all: ['district'] as const,
  list: () => ['districts'] as const,
  district: (id: string | null) => ['district', id] as const,
  details: (id: string | null) => ['district', id, 'details'] as const,
  readiness: (id: string | null) => ['district', id, 'readiness'] as const,
  bot: (id: string | null) => ['district', id, 'telegram-bot'] as const,
  groups: (id: string | null) => ['district', id, 'telegram-groups'] as const,
  hokim: (id: string | null) => ['district', id, 'hokim-account'] as const,
};

export type DistrictQueryKeys = typeof districtQueryKeys;
