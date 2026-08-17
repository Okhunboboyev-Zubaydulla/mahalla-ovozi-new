import { describe, it, expect } from 'vitest';
import {
  DistrictStatusSchema,
  DistrictSchema,
  CreateDistrictRequestSchema,
  CreateDistrictResponseSchema,
  ListDistrictsResponseSchema,
  GetDistrictResponseSchema,
} from '../src/index.js';

describe('District API Contracts', () => {
  describe('DistrictStatusSchema', () => {
    it('accepts valid status values', () => {
      const validStatuses = ['SETUP_INCOMPLETE', 'ACTIVE', 'SUSPENDED', 'CANCELLED'];
      for (const status of validStatuses) {
        expect(DistrictStatusSchema.safeParse(status).success).toBe(true);
      }
    });

    it('rejects unknown status values', () => {
      expect(DistrictStatusSchema.safeParse('DELETED').success).toBe(false);
      expect(DistrictStatusSchema.safeParse('INACTIVE').success).toBe(false);
    });
  });

  describe('CreateDistrictRequestSchema', () => {
    it('accepts valid district name and region', () => {
      const payload = {
        name: 'Чилонзор',
        region: 'Тошкент шаҳри',
      };
      const result = CreateDistrictRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Чилонзор');
        expect(result.data.region).toBe('Тошкент шаҳри');
      }
    });

    it('accepts valid district name without region', () => {
      const payload = {
        name: 'Мирзо Улуғбек',
      };
      const result = CreateDistrictRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Мирзо Улуғбек');
        expect(result.data.region).toBeUndefined();
      }
    });

    it('transforms empty or whitespace-only region to undefined', () => {
      const payload = {
        name: 'Юнусобод',
        region: '   ',
      };
      const result = CreateDistrictRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Юнусобод');
        expect(result.data.region).toBeUndefined();
      }
    });

    it('trims district name before checking length (P1-C)', () => {
      // "  a  " trimmed has length 1, which must fail the >= 2 check
      const payload = {
        name: '  a  ',
      };
      const result = CreateDistrictRequestSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('counts code points using Unicode spread (B10)', () => {
      // 2 emoji: 2 code points, 4 UTF-16 code units
      const payload = {
        name: '🇺🇿🇺🇿',
      };
      const result = CreateDistrictRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects district name longer than 100 code points', () => {
      const longName = 'а'.repeat(101);
      const result = CreateDistrictRequestSchema.safeParse({ name: longName });
      expect(result.success).toBe(false);
    });

    it('rejects region longer than 100 code points', () => {
      const longRegion = 'б'.repeat(101);
      const result = CreateDistrictRequestSchema.safeParse({
        name: 'Самарқанд',
        region: longRegion,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DistrictSchema & Response Schemas', () => {
    it('validates a complete District object (P1-B)', () => {
      const district = {
        id: 'dist_12345',
        name: 'Олмазор',
        region: 'Тошкент',
        status: 'SETUP_INCOMPLETE',
        createdAt: '2026-08-17T12:00:00.000Z',
      };
      const result = DistrictSchema.safeParse(district);
      expect(result.success).toBe(true);
    });

    it('rejects non-ISO-8601 datetime for createdAt', () => {
      const district = {
        id: 'dist_12345',
        name: 'Олмазор',
        status: 'SETUP_INCOMPLETE',
        createdAt: 'invalid-date',
      };
      const result = DistrictSchema.safeParse(district);
      expect(result.success).toBe(false);
    });

    it('validates CreateDistrictResponseSchema wrapping { district } (P1-A)', () => {
      const response = {
        district: {
          id: 'dist_12345',
          name: 'Яшнобод',
          status: 'SETUP_INCOMPLETE',
          createdAt: '2026-08-17T12:00:00.000Z',
        },
      };
      const result = CreateDistrictResponseSchema.safeParse(response);
      expect(result.success).toBe(true);
    });

    it('validates ListDistrictsResponseSchema and GetDistrictResponseSchema', () => {
      const listResponse = {
        districts: [
          {
            id: 'dist_1',
            name: 'Яккасарой',
            status: 'SETUP_INCOMPLETE',
            createdAt: '2026-08-17T12:00:00.000Z',
          },
        ],
      };
      expect(ListDistrictsResponseSchema.safeParse(listResponse).success).toBe(true);

      const getResponse = {
        district: {
          id: 'dist_1',
          name: 'Яккасарой',
          status: 'SETUP_INCOMPLETE',
          createdAt: '2026-08-17T12:00:00.000Z',
        },
      };
      expect(GetDistrictResponseSchema.safeParse(getResponse).success).toBe(true);
    });
  });
});
