import { describe, it, expect } from 'vitest';
import {
  computeGlobalSettingsDiff,
  computeDistrictSettingsDiff,
} from '../../src/components/ai/diff-utils.js';
import type {
  GlobalAnalysisSettingsDto,
  DistrictAnalysisSettingsDto,
} from '@mahalla-ovozi/api-contracts';

describe('diff-utils unit tests', () => {
  const baseGlobalConfig: GlobalAnalysisSettingsDto = {
    id: 'gcfg_v1',
    version: 1,
    modelProvider: 'GEMINI',
    modelId: 'gemini-1.5-flash',
    temperature: 0.2,
    maxOutputTokens: 2048,
    relevanceSystemPrompt: 'Асосий тизим кўрсатмаси',
    topicMatchingSystemPrompt: 'Туман таҳлили кўрсатмаси',
    topicProjectionSystemPrompt: 'Мавзуларни проекциялаш кўрсатмаси',
    globalServiceVocabulary: [
      {
        term: 'Аҳоли мурожаати',
        category: 'Маҳаллий атамалар',
        description: 'Фуқаролар томонидан берилган ёзма ёки оғзаки мурожаат',
      },
    ],
    isActive: true,
    activatedAt: '2026-08-01T00:00:00.000Z',
    activatedBy: 'po_123',
    changeReason: 'Дастлабки глобал созламалар',
    createdAt: '2026-08-01T00:00:00.000Z',
  };

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

  describe('computeGlobalSettingsDiff', () => {
    it('detects no changes when comparing identical configurations', () => {
      const diff = computeGlobalSettingsDiff(baseGlobalConfig, {
        ...baseGlobalConfig,
      });
      expect(diff.hasChanges).toBe(false);
      expect(diff.totalChangesCount).toBe(0);
      expect(diff.scalarDiffs.every((s) => !s.hasChanged)).toBe(true);
      expect(diff.promptDiffs.every((p) => !p.hasChanged)).toBe(true);
      expect(diff.vocabularyDiffs.every((v) => v.type === 'unchanged')).toBe(true);
    });

    it('detects scalar differences (provider and model)', () => {
      const target: GlobalAnalysisSettingsDto = {
        ...baseGlobalConfig,
        modelProvider: 'OPENAI',
        modelId: 'gpt-4o-mini',
      };
      const diff = computeGlobalSettingsDiff(baseGlobalConfig, target);
      expect(diff.hasChanges).toBe(true);
      expect(diff.totalChangesCount).toBe(2);

      const providerDiff = diff.scalarDiffs.find(
        (s) => s.fieldKey === 'modelProvider',
      );
      expect(providerDiff?.hasChanged).toBe(true);
      expect(providerDiff?.oldValue).toBe('GEMINI');
      expect(providerDiff?.newValue).toBe('OPENAI');
    });

    it('detects prompt differences with whitespace normalization', () => {
      const target: GlobalAnalysisSettingsDto = {
        ...baseGlobalConfig,
        relevanceSystemPrompt: 'Янгиланган асосий тизим кўрсатмаси',
      };
      const diff = computeGlobalSettingsDiff(baseGlobalConfig, target);
      expect(diff.hasChanges).toBe(true);

      const generalPrompt = diff.promptDiffs.find(
        (p) => p.promptKey === 'relevanceSystemPrompt',
      );
      expect(generalPrompt?.hasChanged).toBe(true);
      expect(generalPrompt?.oldValue).toBe('Асосий тизим кўрсатмаси');
      expect(generalPrompt?.newValue).toBe('Янгиланган асосий тизим кўрсатмаси');
    });

    it('detects added, removed, and modified vocabulary items', () => {
      const target: GlobalAnalysisSettingsDto = {
        ...baseGlobalConfig,
        globalServiceVocabulary: [
          {
            term: 'Аҳоли мурожаати',
            category: 'Маҳаллий атамалар',
            description: 'Янгиланган тавсиф', // modified description
          },
          {
            term: 'Коммунал тўлов',
            category: 'Бошқа',
            description: 'Газ, электр ва сув тўловлари', // added term
          },
        ],
      };
      const diff = computeGlobalSettingsDiff(baseGlobalConfig, target);
      expect(diff.hasChanges).toBe(true);

      const modifiedVocab = diff.vocabularyDiffs.find(
        (v) => v.term === 'Аҳоли мурожаати',
      );
      expect(modifiedVocab?.type).toBe('modified');

      const addedVocab = diff.vocabularyDiffs.find(
        (v) => v.term === 'Коммунал тўлов',
      );
      expect(addedVocab?.type).toBe('added');
    });
  });

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
