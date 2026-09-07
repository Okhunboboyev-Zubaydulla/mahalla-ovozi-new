import { describe, it, expect } from 'vitest';
import {
  computeDistrictSettingsDiff,
} from '../../src/components/ai/diff-utils.js';
import type {
  DistrictAnalysisSettingsDto,
} from '@mahalla-ovozi/api-contracts';

describe('diff-utils unit tests', () => {
  const baseDistrictConfig: DistrictAnalysisSettingsDto = {
    id: 'dcfg_dist_123_v1',
    districtId: 'dist_123',
    version: 1,
    hokimRecognitionTerms: ['Ҳоким', 'Туман ҳокими'],
    localVocabularyAdditions: [
      {
        term: 'Чилонзор савдо маркази',
        category: 'Мўлжал ва жойлар',
        description: 'Чилонзор туманидаги асосий савдо маркази',
      },
    ],
    isActive: true,
    activatedAt: '2026-08-01T00:00:00.000Z',
    activatedBy: 'po_123',
    changeReason: 'Туманнинг дастлабки фаол созламалари',
    createdAt: '2026-08-01T00:00:00.000Z',
  };

  describe('computeDistrictSettingsDiff', () => {
    it('detects no changes when comparing identical district configurations', () => {
      const diff = computeDistrictSettingsDiff(baseDistrictConfig, {
        ...baseDistrictConfig,
      });
      expect(diff.hasChanges).toBe(false);
      expect(diff.totalChangesCount).toBe(0);
      expect(diff.hokimTermsDiffs.every((t) => t.type === 'unchanged')).toBe(true);
      expect(diff.vocabularyDiffs.every((v) => v.type === 'unchanged')).toBe(true);
    });

    it('detects added and removed Hokim recognition terms', () => {
      const target: DistrictAnalysisSettingsDto = {
        ...baseDistrictConfig,
        hokimRecognitionTerms: ['Ҳоким', 'Сектор бошлиғи'], // removed 'Туман ҳокими', added 'Сектор бошлиғи'
      };
      const diff = computeDistrictSettingsDiff(baseDistrictConfig, target);
      expect(diff.hasChanges).toBe(true);

      const addedTerm = diff.hokimTermsDiffs.find(
        (t) => t.term === 'Сектор бошлиғи',
      );
      expect(addedTerm?.type).toBe('added');

      const removedTerm = diff.hokimTermsDiffs.find(
        (t) => t.term === 'Туман ҳокими',
      );
      expect(removedTerm?.type).toBe('removed');
    });

    it('detects modified district local vocabulary categories', () => {
      const target: DistrictAnalysisSettingsDto = {
        ...baseDistrictConfig,
        localVocabularyAdditions: [
          {
            term: 'Чилонзор савдо маркази',
            category: 'Маҳаллий муассасалар', // category changed
            description: 'Чилонзор туманидаги асосий савдо маркази',
          },
        ],
      };
      const diff = computeDistrictSettingsDiff(baseDistrictConfig, target);
      expect(diff.hasChanges).toBe(true);

      const mod = diff.vocabularyDiffs.find(
        (v) => v.term === 'Чилонзор савдо маркази',
      );
      expect(mod?.type).toBe('modified');
      expect(mod?.oldCategory).toBe('Мўлжал ва жойлар');
      expect(mod?.category).toBe('Маҳаллий муассасалар');
    });
  });
});
