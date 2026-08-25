import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import {
  OverallSystemHealthResponse,
  DistrictHealthResponse,
  DistrictHealthSummary,
  ComponentHealthObservation,
} from '@mahalla-ovozi/api-contracts';
import { DbClient } from '../../adapters/db/client.js';
import { districts } from '../../adapters/db/schema/index.js';
import {
  aggregateComponentStatuses,
  aggregateOverallSystemHealth,
} from './health-evaluator.js';
import {
  checkDatabaseHealth,
  checkProcessingQueueHealth,
  checkStorageHealth,
  checkWebApplicationHealth,
  checkRetentionJobHealth,
  checkDistrictBotHealth,
  checkDistrictGroupsHealth,
  checkDistrictIntakeHealth,
  checkDistrictAiHealth,
  checkDistrictRetentionHealth,
  HealthConfig,
} from './health-checker.js';

export class DistrictNotFoundError extends Error {
  statusCode = 404;
  code = 'NOT_FOUND';
  constructor(message = 'Сўралган туман топилмади.') {
    super(message);
    this.name = 'DistrictNotFoundError';
  }
}

/**
 * High-level health query service for system and district scopes.
 */
export const healthService = {
  /**
   * Fetches application-owned overall system health with all district summaries.
   */
  async getOverallSystemHealth(
    db: DbClient,
    pool: pg.Pool,
    boss?: PgBoss,
    config?: HealthConfig,
  ): Promise<OverallSystemHealthResponse> {
    const evaluatedAt = new Date();

    // 1. Run global infrastructure checks in parallel
    const [dbHealth, queueHealth, storageHealth, webAppHealth, retentionHealth] =
      await Promise.all([
        checkDatabaseHealth(pool, config),
        checkProcessingQueueHealth(boss, config),
        checkStorageHealth(db, config),
        checkWebApplicationHealth(config),
        checkRetentionJobHealth(db, config),
      ]);

    const globalComponents: ComponentHealthObservation[] = [
      dbHealth,
      queueHealth,
      storageHealth,
      webAppHealth,
      retentionHealth,
    ];

    // 2. Fetch all registered districts
    const allDistricts = await db
      .select()
      .from(districts)
      .orderBy(districts.createdAt);

    // 3. Run per-district component checks in parallel
    const districtSummaries: DistrictHealthSummary[] = await Promise.all(
      allDistricts.map(async (district) => {
        const [botHealth, groupsHealth, intakeHealth, aiHealth, retentionDistrictHealth] =
          await Promise.all([
            checkDistrictBotHealth(db, district.id, config),
            checkDistrictGroupsHealth(db, district.id, config),
            checkDistrictIntakeHealth(db, district.id, config),
            checkDistrictAiHealth(db, district.id, config),
            checkDistrictRetentionHealth(db, district.id, config),
          ]);

        const districtComponents: ComponentHealthObservation[] = [
          botHealth,
          groupsHealth,
          intakeHealth,
          aiHealth,
          retentionDistrictHealth,
        ];

        // Attach district lifecycleStatus to observations
        const enrichedComponents = districtComponents.map((c) => ({
          ...c,
          lifecycleStatus: district.status,
        }));

        const aggregateResult = aggregateComponentStatuses(enrichedComponents, {
          isQuietAllowed: true,
          evaluatedAt,
        });

        return {
          districtId: district.id,
          districtName: district.name,
          status: aggregateResult.status,
          lastCheckAt: aggregateResult.lastCheckAt,
          components: enrichedComponents,
          lifecycleStatus: district.status,
        };
      }),
    );

    // 4. Hierarchical aggregation into OverallSystemHealthResponse
    return aggregateOverallSystemHealth(globalComponents, districtSummaries, evaluatedAt);
  },

  /**
   * Fetches district-scoped health for a specific district.
   */
  async getDistrictHealth(
    db: DbClient,
    districtId: string,
    _pool?: pg.Pool,
    _boss?: PgBoss,
    config?: HealthConfig,
  ): Promise<DistrictHealthResponse> {
    const evaluatedAt = new Date();

    const districtList = await db
      .select()
      .from(districts)
      .where(eq(districts.id, districtId))
      .limit(1);

    if (districtList.length === 0 || !districtList[0]) {
      throw new DistrictNotFoundError();
    }

    const district = districtList[0];

    const [botHealth, groupsHealth, intakeHealth, aiHealth, retentionDistrictHealth] =
      await Promise.all([
        checkDistrictBotHealth(db, district.id, config),
        checkDistrictGroupsHealth(db, district.id, config),
        checkDistrictIntakeHealth(db, district.id, config),
        checkDistrictAiHealth(db, district.id, config),
        checkDistrictRetentionHealth(db, district.id, config),
      ]);

    const districtComponents: ComponentHealthObservation[] = [
      botHealth,
      groupsHealth,
      intakeHealth,
      aiHealth,
      retentionDistrictHealth,
    ].map((c) => ({
      ...c,
      lifecycleStatus: district.status,
    }));

    const aggregateResult = aggregateComponentStatuses(districtComponents, {
      isQuietAllowed: true,
      evaluatedAt,
    });

    return {
      districtId: district.id,
      districtName: district.name,
      status: aggregateResult.status,
      lastCheckAt: aggregateResult.lastCheckAt,
      evaluatedAt: evaluatedAt.toISOString(),
      components: districtComponents,
      lifecycleStatus: district.status,
    };
  },
};
