import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import pg from 'pg';
import {
  GetGlobalAnalysisSettingsResponse,
  SaveGlobalAnalysisSettingsDraftResponse,
  SaveGlobalAnalysisSettingsDraftRequest,
} from '@mahalla-ovozi/api-contracts';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { buildHttpServer } from '../src/entrypoints/http.js';
import { accounts, districts, auditEvents, aiProfiles, globalAnalysisSettingsVersions, globalAnalysisSettingsDrafts } from '../src/adapters/db/schema/index.js';
import { ensureDefaultAiProfiles, ensureDefaultGlobalAnalysisSettings } from '../src/adapters/db/seeds.js';
import { createOrResetProductOwner } from '../src/modules/auth/account-service.js';
import { hashPassword } from '../src/adapters/crypto/argon2.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

const SAME_ORIGIN_HEADERS = {
  origin: 'http://localhost:5173',
  host: 'localhost:3000',
};

describe('Story 5.1: Global Analysis Settings & Drafts Integration Tests', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let server: FastifyInstance;

  let poCookie = '';
  let poAccountId = '';
  let hokimCookie = '';
  let districtId = '';

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);

    server = await buildHttpServer({ db, pool });
    await server.ready();

    // 1. Ensure default seed profiles and global configuration version
    await ensureDefaultAiProfiles(db);
    await ensureDefaultGlobalAnalysisSettings(db);

    // 2. Seed Product Owner
    const poUsername = `po_settings_test_${Date.now()}`;
    const poPassword = 'SecurePOPassword2026!';
    const poAccount = await createOrResetProductOwner(db, {
      username: poUsername,
      password: poPassword,
    });
    poAccountId = poAccount.accountId;

    const poSignIn = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: { 'content-type': 'application/json', ...SAME_ORIGIN_HEADERS },
      payload: { username: poUsername, password: poPassword },
    });
    expect(poSignIn.statusCode).toBe(200);
    const poSetCookie = poSignIn.headers['set-cookie'];
    poCookie =
      (Array.isArray(poSetCookie) ? poSetCookie[0] : (poSetCookie as string)) ||
      '';

    // 3. Seed District & Hokim
    districtId = `dist_settings_test_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: districtId,
      name: `SettingsTestDistrict_${crypto.randomUUID().slice(0, 8)}`,
      status: 'ACTIVE',
    });

    const hokimUsername = `hokim_settings_${Date.now()}`;
    const hokimPassword = 'HokimPassword2026!';
    const hokimPasswordHash = await hashPassword(hokimPassword);
    const hokimAccountId = `acc_hokim_${crypto.randomUUID()}`;

    await db.insert(accounts).values({
      id: hokimAccountId,
      username: hokimUsername,
      passwordHash: hokimPasswordHash,
      role: 'DISTRICT_HOKIM',
      status: 'ACTIVE',
      districtId,
      mustChangePassword: false,
    });

    const hokimSignIn = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: { 'content-type': 'application/json', ...SAME_ORIGIN_HEADERS },
      payload: { username: hokimUsername, password: hokimPassword },
    });
    expect(hokimSignIn.statusCode).toBe(200);
    const hokimSetCookie = hokimSignIn.headers['set-cookie'];
    hokimCookie =
      (Array.isArray(hokimSetCookie)
        ? hokimSetCookie[0]
        : (hokimSetCookie as string)) || '';
  });

  afterAll(async () => {
    // Cleanup test records
    await db.delete(globalAnalysisSettingsDrafts).where(eq(globalAnalysisSettingsDrafts.id, 'global'));
    await db.delete(accounts).where(eq(accounts.id, poAccountId));
    await db.delete(districts).where(eq(districts.id, districtId));
    await server.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Reset draft before each test
    await db.delete(globalAnalysisSettingsDrafts).where(eq(globalAnalysisSettingsDrafts.id, 'global'));
  });

  describe('Authorization Boundary (AC 8)', () => {
    it('allows Product Owner to fetch global settings (200)', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/ai/settings/global',
        headers: {
          cookie: poCookie,
          ...SAME_ORIGIN_HEADERS,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload) as GetGlobalAnalysisSettingsResponse;
      expect(data.activeConfiguration).toBeDefined();
      expect(data.activeConfiguration.id).toBe('gcfg_v1');
      expect(data.activeConfiguration.version).toBe(1);
    });

    it('denies District Hokim with 403 Forbidden on GET /api/v1/ai/settings/global', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/ai/settings/global',
        headers: {
          cookie: hokimCookie,
          ...SAME_ORIGIN_HEADERS,
        },
      });

      expect(res.statusCode).toBe(403);
      const err = JSON.parse(res.payload);
      expect(err.error?.code).toBe('FORBIDDEN');
    });

    it('denies District Hokim with 403 Forbidden on POST /api/v1/ai/settings/global/draft', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/ai/settings/global/draft',
        headers: {
          cookie: hokimCookie,
          'content-type': 'application/json',
          ...SAME_ORIGIN_HEADERS,
        },
        payload: {
          modelProvider: 'OPENAI',
          modelId: 'gpt-4o-mini',
          temperature: 0.1,
          maxOutputTokens: 500,
          relevanceSystemPrompt: 'This is a valid prompt string with more than twenty characters.',
          topicMatchingSystemPrompt: 'This is a valid prompt string with more than twenty characters.',
          topicProjectionSystemPrompt: 'This is a valid prompt string with more than twenty characters.',
          globalServiceVocabulary: [
            { term: 'Сув таъминоти', category: 'Сув таъминоти' },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it('denies unauthenticated request with 401 Unauthorized', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/ai/settings/global',
        headers: SAME_ORIGIN_HEADERS,
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Active Configuration Presentation & Initial Draft State (AC 1, 2, 3)', () => {
    it('returns active configuration gcfg_v1 with null draft when no draft exists', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/ai/settings/global',
        headers: {
          cookie: poCookie,
          ...SAME_ORIGIN_HEADERS,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload) as GetGlobalAnalysisSettingsResponse;
      expect(data.activeConfiguration.id).toBe('gcfg_v1');
      expect(data.activeConfiguration.modelProvider).toBe('OLLAMA');
      expect(data.activeConfiguration.modelId).toBe('gemma4:12b');
      expect(data.activeConfiguration.temperature).toBe(0.0);
      expect(data.activeConfiguration.maxOutputTokens).toBe(500);
      expect(data.activeConfiguration.isActive).toBe(true);
      expect(data.activeConfiguration.globalServiceVocabulary.length).toBeGreaterThanOrEqual(6);
      expect(data.draft).toBeNull();
    });

    it('returns dynamically discovered Ollama models on GET /api/v1/ai/settings/ollama-models', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/ai/settings/ollama-models',
        headers: {
          cookie: poCookie,
          ...SAME_ORIGIN_HEADERS,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload) as { isAvailable: boolean; models: string[] };
      expect(Array.isArray(data.models)).toBe(true);
      expect(data.models.length).toBeGreaterThan(0);
      expect(typeof data.isAvailable).toBe('boolean');
    });
  });

  describe('Valid Draft Persistence & Audit Logging (AC 2, 3, 5, 7)', () => {
    it('saves valid draft, persists to database, and records audit event without mutating active profiles', async () => {
      const initialProfiles = await db.select().from(aiProfiles);
      const initialVersions = await db.select().from(globalAnalysisSettingsVersions);

      const validPayload: SaveGlobalAnalysisSettingsDraftRequest = {
        modelProvider: 'GEMINI',
        modelId: 'gemini-2.0-flash',
        temperature: 0.15,
        maxOutputTokens: 1000,
        relevanceSystemPrompt: 'Updated relevance system prompt for future-only evaluation (20+ chars).',
        topicMatchingSystemPrompt: 'Updated topic matching system prompt for future-only clustering (20+ chars).',
        topicProjectionSystemPrompt: 'Updated topic projection system prompt for future-only projection (20+ chars).',
        globalServiceVocabulary: [
          { term: 'Тоза ичимлик суви', category: 'Сув таъминоти', description: 'Сув босими ва сифати' },
          { term: 'Газ таъминоти', category: 'Газ таъминоти', description: 'Газ узилишлари' },
          { term: 'Электр тармоқлари', category: 'Электр энергияси' },
        ],
      };

      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/ai/settings/global/draft',
        headers: {
          cookie: poCookie,
          'content-type': 'application/json',
          ...SAME_ORIGIN_HEADERS,
        },
        payload: validPayload,
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload) as SaveGlobalAnalysisSettingsDraftResponse;
      expect(data.message).toBe('Қоралама муваффақиятли сақланди');
      expect(data.draft.id).toBe('global');
      expect(data.draft.baseActiveVersionId).toBe('gcfg_v1');
      expect(data.draft.modelProvider).toBe('GEMINI');
      expect(data.draft.modelId).toBe('gemini-2.0-flash');
      expect(data.draft.temperature).toBeCloseTo(0.15);
      expect(data.draft.maxOutputTokens).toBe(1000);
      expect(data.draft.globalServiceVocabulary).toHaveLength(3);

      // Verify subsequent GET returns the persisted draft
      const getRes = await server.inject({
        method: 'GET',
        url: '/api/v1/ai/settings/global',
        headers: {
          cookie: poCookie,
          ...SAME_ORIGIN_HEADERS,
        },
      });
      const getData = JSON.parse(getRes.payload) as GetGlobalAnalysisSettingsResponse;
      expect(getData.draft).not.toBeNull();
      expect(getData.draft?.modelId).toBe('gemini-2.0-flash');
      expect(getData.draft?.temperature).toBeCloseTo(0.15);

      // Verify Audit Event was recorded
      const [auditEvent] = await db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.action, 'GLOBAL_ANALYSIS_SETTINGS_DRAFT_SAVED'),
            eq(auditEvents.actorId, poAccountId),
          ),
        )
        .orderBy(desc(auditEvents.createdAt));

      expect(auditEvent).toBeDefined();
      expect(auditEvent!.actorRole).toBe('PRODUCT_OWNER');
      expect(auditEvent!.actorId).toBe(poAccountId);
      expect(auditEvent!.districtId).toBeNull();
      const meta = auditEvent!.metadata as Record<string, unknown>;
      expect(meta.modelProvider).toBe('GEMINI');
      expect(meta.modelId).toBe('gemini-2.0-flash');

      // Verify Active Profiles & Versions are completely unchanged (Zero Runtime Mutation Invariant AD-8)
      const afterProfiles = await db.select().from(aiProfiles);
      expect(afterProfiles.length).toBe(initialProfiles.length);

      const afterVersions = await db.select().from(globalAnalysisSettingsVersions);
      expect(afterVersions.length).toBe(initialVersions.length);
      const activeVer = afterVersions.find((v) => v.isActive);
      expect(activeVer).toBeDefined();
      expect(activeVer!.id).toBe('gcfg_v1');
      expect(activeVer!.modelProvider).toBe('OLLAMA'); // remains OLLAMA
    });
  });

  describe('Validation & Edge Case Handling (AC 6, 7)', () => {
    it('rejects invalid temperature (< 0.0 or > 1.0) with 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/ai/settings/global/draft',
        headers: {
          cookie: poCookie,
          'content-type': 'application/json',
          ...SAME_ORIGIN_HEADERS,
        },
        payload: {
          modelProvider: 'OPENAI',
          modelId: 'gpt-4o-mini',
          temperature: 1.5,
          maxOutputTokens: 500,
          relevanceSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicMatchingSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicProjectionSystemPrompt: 'Valid prompt string with more than twenty characters.',
          globalServiceVocabulary: [
            { term: 'Ичимлик суви', category: 'Сув таъминоти' },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const err = JSON.parse(res.payload);
      expect(err.error?.code).toBe('VALIDATION_ERROR');
      expect(err.error?.validationErrors?.some((v: { path: (string | number)[] }) => v.path.includes('temperature'))).toBe(true);
    });

    it('rejects maxOutputTokens out of range (< 100 or > 2000) with 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/ai/settings/global/draft',
        headers: {
          cookie: poCookie,
          'content-type': 'application/json',
          ...SAME_ORIGIN_HEADERS,
        },
        payload: {
          modelProvider: 'OPENAI',
          modelId: 'gpt-4o-mini',
          temperature: 0.0,
          maxOutputTokens: 50, // below 100
          relevanceSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicMatchingSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicProjectionSystemPrompt: 'Valid prompt string with more than twenty characters.',
          globalServiceVocabulary: [
            { term: 'Ичимлик суви', category: 'Сув таъминоти' },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const err = JSON.parse(res.payload);
      expect(err.error?.code).toBe('VALIDATION_ERROR');
      expect(err.error?.validationErrors?.some((v: { path: (string | number)[] }) => v.path.includes('maxOutputTokens'))).toBe(true);
    });

    it('rejects short system prompt (< 20 chars) with 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/ai/settings/global/draft',
        headers: {
          cookie: poCookie,
          'content-type': 'application/json',
          ...SAME_ORIGIN_HEADERS,
        },
        payload: {
          modelProvider: 'OPENAI',
          modelId: 'gpt-4o-mini',
          temperature: 0.0,
          maxOutputTokens: 500,
          relevanceSystemPrompt: 'Too short',
          topicMatchingSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicProjectionSystemPrompt: 'Valid prompt string with more than twenty characters.',
          globalServiceVocabulary: [
            { term: 'Ичимлик суви', category: 'Сув таъминоти' },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const err = JSON.parse(res.payload);
      expect(err.error?.code).toBe('VALIDATION_ERROR');
      expect(err.error?.validationErrors?.some((v: { path: (string | number)[] }) => v.path.includes('relevanceSystemPrompt'))).toBe(true);
    });

    it('rejects duplicate vocabulary terms (case-insensitive) with 400', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/v1/ai/settings/global/draft',
        headers: {
          cookie: poCookie,
          'content-type': 'application/json',
          ...SAME_ORIGIN_HEADERS,
        },
        payload: {
          modelProvider: 'OPENAI',
          modelId: 'gpt-4o-mini',
          temperature: 0.0,
          maxOutputTokens: 500,
          relevanceSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicMatchingSystemPrompt: 'Valid prompt string with more than twenty characters.',
          topicProjectionSystemPrompt: 'Valid prompt string with more than twenty characters.',
          globalServiceVocabulary: [
            { term: 'Ичимлик суви', category: 'Сув таъминоти' },
            { term: 'ичимлик суви', category: 'Бошқа тоифа' }, // Duplicate term
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      const err = JSON.parse(res.payload);
      expect(err.error?.code).toBe('VALIDATION_ERROR');
      expect(err.error?.validationErrors?.some((v: { message: string }) => v.message.includes('такрорланмаслиги керак'))).toBe(true);
    });
  });
});
