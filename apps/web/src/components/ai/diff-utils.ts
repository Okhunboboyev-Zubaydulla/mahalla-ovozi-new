import type {
  GlobalAnalysisSettingsDto,
  GlobalAnalysisSettingsDraftDto,
  SaveGlobalAnalysisSettingsDraftRequest,
  DistrictAnalysisSettingsDto,
  DistrictAnalysisSettingsDraftDto,
  SaveDistrictAnalysisSettingsDraftRequest,
  GlobalServiceVocabularyItem,
  DistrictLocalVocabularyItem,
} from '@mahalla-ovozi/api-contracts';

export interface ScalarDiffItem {
  fieldKey: string;
  fieldLabel: string;
  oldValue: string | number;
  newValue: string | number;
  hasChanged: boolean;
}

export interface PromptDiffItem {
  promptKey: string;
  promptLabel: string;
  oldValue: string;
  newValue: string;
  hasChanged: boolean;
}

export interface VocabularyDiffItem {
  term: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  category: string;
  oldCategory?: string;
  description?: string;
  oldDescription?: string;
}

export interface HokimTermDiffItem {
  term: string;
  type: 'added' | 'removed' | 'unchanged';
}

export interface GlobalSettingsDiff {
  scalarDiffs: ScalarDiffItem[];
  promptDiffs: PromptDiffItem[];
  vocabularyDiffs: VocabularyDiffItem[];
  hasChanges: boolean;
  totalChangesCount: number;
}

export interface DistrictSettingsDiff {
  hokimTermsDiffs: HokimTermDiffItem[];
  vocabularyDiffs: VocabularyDiffItem[];
  hasChanges: boolean;
  totalChangesCount: number;
}

const GLOBAL_SCALAR_LABELS: Record<string, string> = {
  modelProvider: 'Провайдер',
  modelId: 'Модель идентификатори',
  temperature: 'Ҳарорат (Temperature)',
  maxOutputTokens: 'Максимал токенлар',
};

const GLOBAL_PROMPT_LABELS: Record<string, string> = {
  relevanceSystemPrompt: 'Долзарблик тизим кўрсатмаси (Relevance Prompt)',
  topicMatchingSystemPrompt: 'Мавзу бирлаштириш тизим кўрсатмаси (Topic Matching)',
  topicProjectionSystemPrompt: 'Мавзу проекцияси тизим кўрсатмаси (Topic Projection)',
};

export function computeGlobalSettingsDiff(
  active: GlobalAnalysisSettingsDto,
  draft: GlobalAnalysisSettingsDraftDto | SaveGlobalAnalysisSettingsDraftRequest | null,
): GlobalSettingsDiff {
  if (!draft) {
    return {
      scalarDiffs: [],
      promptDiffs: [],
      vocabularyDiffs: [],
      hasChanges: false,
      totalChangesCount: 0,
    };
  }

  let totalChanges = 0;

  // 1. Scalar diffs
  const activeModelProvider = active?.modelProvider || 'GEMINI';
  const draftModelProvider = draft?.modelProvider || activeModelProvider;
  const activeModelId = active?.modelId || '';
  const draftModelId = draft?.modelId || activeModelId;
  const activeTemp = active?.temperature ?? 0.0;
  const draftTemp = draft?.temperature ?? activeTemp;
  const activeMaxTokens = active?.maxOutputTokens ?? 500;
  const draftMaxTokens = draft?.maxOutputTokens ?? activeMaxTokens;

  const scalarDiffs: ScalarDiffItem[] = [
    {
      fieldKey: 'modelProvider',
      fieldLabel: GLOBAL_SCALAR_LABELS.modelProvider || 'modelProvider',
      oldValue: activeModelProvider,
      newValue: draftModelProvider,
      hasChanged: activeModelProvider !== draftModelProvider,
    },
    {
      fieldKey: 'modelId',
      fieldLabel: GLOBAL_SCALAR_LABELS.modelId || 'modelId',
      oldValue: activeModelId,
      newValue: draftModelId,
      hasChanged: activeModelId !== draftModelId,
    },
    {
      fieldKey: 'temperature',
      fieldLabel: GLOBAL_SCALAR_LABELS.temperature || 'temperature',
      oldValue: activeTemp,
      newValue: draftTemp,
      hasChanged: activeTemp !== draftTemp,
    },
    {
      fieldKey: 'maxOutputTokens',
      fieldLabel: GLOBAL_SCALAR_LABELS.maxOutputTokens || 'maxOutputTokens',
      oldValue: activeMaxTokens,
      newValue: draftMaxTokens,
      hasChanged: activeMaxTokens !== draftMaxTokens,
    },
  ];

  totalChanges += scalarDiffs.filter((s) => s.hasChanged).length;

  // 2. Prompt diffs
  const activeRel = active?.relevanceSystemPrompt || '';
  const draftRel = draft?.relevanceSystemPrompt ?? activeRel;
  const activeTopicMatch = active?.topicMatchingSystemPrompt || '';
  const draftTopicMatch = draft?.topicMatchingSystemPrompt ?? activeTopicMatch;
  const activeTopicProj = active?.topicProjectionSystemPrompt || '';
  const draftTopicProj = draft?.topicProjectionSystemPrompt ?? activeTopicProj;

  const promptDiffs: PromptDiffItem[] = [
    {
      promptKey: 'relevanceSystemPrompt',
      promptLabel: GLOBAL_PROMPT_LABELS.relevanceSystemPrompt || 'relevanceSystemPrompt',
      oldValue: activeRel,
      newValue: draftRel,
      hasChanged: activeRel.trim() !== draftRel.trim(),
    },
    {
      promptKey: 'topicMatchingSystemPrompt',
      promptLabel: GLOBAL_PROMPT_LABELS.topicMatchingSystemPrompt || 'topicMatchingSystemPrompt',
      oldValue: activeTopicMatch,
      newValue: draftTopicMatch,
      hasChanged: activeTopicMatch.trim() !== draftTopicMatch.trim(),
    },
    {
      promptKey: 'topicProjectionSystemPrompt',
      promptLabel: GLOBAL_PROMPT_LABELS.topicProjectionSystemPrompt || 'topicProjectionSystemPrompt',
      oldValue: activeTopicProj,
      newValue: draftTopicProj,
      hasChanged: activeTopicProj.trim() !== draftTopicProj.trim(),
    },
  ];

  totalChanges += promptDiffs.filter((p) => p.hasChanged).length;

  // 3. Vocabulary diffs
  const activeVocabMap = new Map<string, GlobalServiceVocabularyItem>();
  for (const item of active?.globalServiceVocabulary || []) {
    if (!item || typeof item.term !== 'string') continue;
    const key = item.term.trim().toLowerCase().normalize('NFC');
    if (key) activeVocabMap.set(key, item);
  }

  const draftVocabMap = new Map<string, GlobalServiceVocabularyItem>();
  for (const item of draft?.globalServiceVocabulary || []) {
    if (!item || typeof item.term !== 'string') continue;
    const key = item.term.trim().toLowerCase().normalize('NFC');
    if (key) draftVocabMap.set(key, item);
  }

  const vocabularyDiffs: VocabularyDiffItem[] = [];

  // Check draft items for added or modified
  for (const [key, draftItem] of draftVocabMap.entries()) {
    const activeItem = activeVocabMap.get(key);
    const draftCategory = (draftItem.category || '').trim();
    const draftDesc = (draftItem.description || '').trim();

    if (!activeItem) {
      vocabularyDiffs.push({
        term: draftItem.term,
        type: 'added',
        category: draftItem.category,
        description: draftItem.description,
      });
      totalChanges++;
    } else {
      const activeCategory = (activeItem.category || '').trim();
      const activeDesc = (activeItem.description || '').trim();
      const isModified =
        activeCategory !== draftCategory || activeDesc !== draftDesc;

      if (isModified) {
        vocabularyDiffs.push({
          term: draftItem.term,
          type: 'modified',
          category: draftItem.category,
          oldCategory: activeItem.category,
          description: draftItem.description,
          oldDescription: activeItem.description,
        });
        totalChanges++;
      } else {
        vocabularyDiffs.push({
          term: draftItem.term,
          type: 'unchanged',
          category: draftItem.category,
          description: draftItem.description,
        });
      }
    }
  }

  // Check active items for removed
  for (const [key, activeItem] of activeVocabMap.entries()) {
    if (!draftVocabMap.has(key)) {
      vocabularyDiffs.push({
        term: activeItem.term,
        type: 'removed',
        category: activeItem.category,
        description: activeItem.description,
      });
      totalChanges++;
    }
  }

  return {
    scalarDiffs,
    promptDiffs,
    vocabularyDiffs,
    hasChanges: totalChanges > 0,
    totalChangesCount: totalChanges,
  };
}

export function computeDistrictSettingsDiff(
  active: DistrictAnalysisSettingsDto,
  draft:
    | DistrictAnalysisSettingsDraftDto
    | SaveDistrictAnalysisSettingsDraftRequest
    | null,
): DistrictSettingsDiff {
  if (!draft) {
    return {
      hokimTermsDiffs: [],
      vocabularyDiffs: [],
      hasChanges: false,
      totalChangesCount: 0,
    };
  }

  let totalChanges = 0;

  // 1. Hokim Recognition Terms diffs
  const activeTermsMap = new Map<string, string>();
  for (const term of active?.hokimRecognitionTerms || []) {
    if (typeof term !== 'string') continue;
    const key = term.trim().toLowerCase().normalize('NFC');
    if (key) activeTermsMap.set(key, term.trim());
  }

  const draftTermsMap = new Map<string, string>();
  for (const term of draft?.hokimRecognitionTerms || []) {
    if (typeof term !== 'string') continue;
    const key = term.trim().toLowerCase().normalize('NFC');
    if (key) draftTermsMap.set(key, term.trim());
  }

  const hokimTermsDiffs: HokimTermDiffItem[] = [];

  for (const [key, draftTerm] of draftTermsMap.entries()) {
    if (!activeTermsMap.has(key)) {
      hokimTermsDiffs.push({
        term: draftTerm,
        type: 'added',
      });
      totalChanges++;
    } else {
      hokimTermsDiffs.push({
        term: draftTerm,
        type: 'unchanged',
      });
    }
  }

  for (const [key, activeTerm] of activeTermsMap.entries()) {
    if (!draftTermsMap.has(key)) {
      hokimTermsDiffs.push({
        term: activeTerm,
        type: 'removed',
      });
      totalChanges++;
    }
  }

  // 2. District Local Vocabulary diffs
  const activeVocabMap = new Map<string, DistrictLocalVocabularyItem>();
  for (const item of active?.localVocabularyAdditions || []) {
    if (!item || typeof item.term !== 'string') continue;
    const key = item.term.trim().toLowerCase().normalize('NFC');
    if (key) activeVocabMap.set(key, item);
  }

  const draftVocabMap = new Map<string, DistrictLocalVocabularyItem>();
  for (const item of draft?.localVocabularyAdditions || []) {
    if (!item || typeof item.term !== 'string') continue;
    const key = item.term.trim().toLowerCase().normalize('NFC');
    if (key) draftVocabMap.set(key, item);
  }

  const vocabularyDiffs: VocabularyDiffItem[] = [];

  for (const [key, draftItem] of draftVocabMap.entries()) {
    const activeItem = activeVocabMap.get(key);
    const draftCategory = (draftItem.category || '').trim();
    const draftDesc = (draftItem.description || '').trim();

    if (!activeItem) {
      vocabularyDiffs.push({
        term: draftItem.term,
        type: 'added',
        category: draftItem.category,
        description: draftItem.description,
      });
      totalChanges++;
    } else {
      const activeCategory = (activeItem.category || '').trim();
      const activeDesc = (activeItem.description || '').trim();
      const isModified =
        activeCategory !== draftCategory || activeDesc !== draftDesc;

      if (isModified) {
        vocabularyDiffs.push({
          term: draftItem.term,
          type: 'modified',
          category: draftItem.category,
          oldCategory: activeItem.category,
          description: draftItem.description,
          oldDescription: activeItem.description,
        });
        totalChanges++;
      } else {
        vocabularyDiffs.push({
          term: draftItem.term,
          type: 'unchanged',
          category: draftItem.category,
          description: draftItem.description,
        });
      }
    }
  }

  for (const [key, activeItem] of activeVocabMap.entries()) {
    if (!draftVocabMap.has(key)) {
      vocabularyDiffs.push({
        term: activeItem.term,
        type: 'removed',
        category: activeItem.category,
        description: activeItem.description,
      });
      totalChanges++;
    }
  }

  return {
    hokimTermsDiffs,
    vocabularyDiffs,
    hasChanges: totalChanges > 0,
    totalChangesCount: totalChanges,
  };
}
