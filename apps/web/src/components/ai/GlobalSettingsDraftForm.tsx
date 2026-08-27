import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Slider,
  InputNumber,
  Button,
  Space,
  Badge,
  Alert,
  Typography,
  theme,
  App,
  AutoComplete,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import {
  type GlobalAnalysisSettingsDto,
  type GlobalAnalysisSettingsDraftDto,
  type SaveGlobalAnalysisSettingsDraftRequest,
  type AiModelProvider,
  SaveGlobalAnalysisSettingsDraftSchema,
} from '@mahalla-ovozi/api-contracts';
import { useSaveGlobalSettingsDraft } from '../../hooks/useGlobalAnalysisSettings.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { useDirtyState } from '../../district/useDirtyState.js';
import { GlobalServiceVocabularyInput } from './GlobalServiceVocabularyInput.js';
import { ApiError } from '../../lib/api-client.js';

const { Text, Title } = Typography;
const { TextArea } = Input;

const PROVIDER_MODEL_PRESETS: Record<AiModelProvider, string[]> = {
  OPENAI: ['gpt-4o-mini', 'gpt-4o', 'gpt-4o-mini-2024-07-18'],
  GEMINI: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-pro-exp-02-05'],
  GROQ: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  OLLAMA: ['qwen2.5:7b', 'llama3.1:8b'],
};

interface GlobalSettingsDraftFormProps {
  activeSettings: GlobalAnalysisSettingsDto;
  draft: GlobalAnalysisSettingsDraftDto | null;
  onSaveSuccess?: () => void;
}

export const GlobalSettingsDraftForm: React.FC<GlobalSettingsDraftFormProps> = ({
  activeSettings,
  draft,
  onSaveSuccess,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const isOffline = useOnlineStatus();
  const [form] = Form.useForm<SaveGlobalAnalysisSettingsDraftRequest>();
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  const saveMutation = useSaveGlobalSettingsDraft();

  // Initial values baseline: draft if present, else activeSettings
  const initialValues: SaveGlobalAnalysisSettingsDraftRequest = {
    modelProvider: draft?.modelProvider || activeSettings.modelProvider,
    modelId: draft?.modelId || activeSettings.modelId,
    temperature: draft?.temperature ?? activeSettings.temperature,
    maxOutputTokens: draft?.maxOutputTokens ?? activeSettings.maxOutputTokens,
    relevanceSystemPrompt:
      draft?.relevanceSystemPrompt || activeSettings.relevanceSystemPrompt,
    topicMatchingSystemPrompt:
      draft?.topicMatchingSystemPrompt || activeSettings.topicMatchingSystemPrompt,
    topicProjectionSystemPrompt:
      draft?.topicProjectionSystemPrompt || activeSettings.topicProjectionSystemPrompt,
    globalServiceVocabulary:
      draft?.globalServiceVocabulary || activeSettings.globalServiceVocabulary,
  };

  const [selectedProvider, setSelectedProvider] = useState<AiModelProvider>(
    initialValues.modelProvider,
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Sync form when incoming draft or activeSettings change (and form is clean)
  useEffect(() => {
    if (!isFormDirty) {
      form.setFieldsValue(initialValues);
      setSelectedProvider(initialValues.modelProvider);
    }
  }, [draft?.updatedAt, activeSettings.id]);

  // Track dirty state with global unsaved guard
  useDirtyState('global-settings-draft', isFormDirty);

  const handleValuesChange = (
    changed: Partial<SaveGlobalAnalysisSettingsDraftRequest>,
  ) => {
    setIsFormDirty(true);
    if (changed.modelProvider) {
      setSelectedProvider(changed.modelProvider);
      const presets = PROVIDER_MODEL_PRESETS[changed.modelProvider];
      if (presets && presets[0]) {
        form.setFieldValue('modelId', presets[0]);
      }
    }
    // Clear specific error on change
    const changedKey = Object.keys(changed)[0];
    if (changedKey && fieldErrors[changedKey]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[changedKey];
        return next;
      });
    }
  };

  const handleResetToBaseline = () => {
    form.setFieldsValue(initialValues);
    setSelectedProvider(initialValues.modelProvider);
    setFieldErrors({});
    setIsFormDirty(false);
    message.info('Форма дастлабки ҳолатига қайтарилди.');
  };

  const handleSubmit = async () => {
    if (isOffline || saveMutation.isPending) return;

    const values = form.getFieldsValue(true) as SaveGlobalAnalysisSettingsDraftRequest;

    const parsed = SaveGlobalAnalysisSettingsDraftSchema.safeParse(values);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const pathKey = issue.path[0] ? String(issue.path[0]) : 'form';
        if (!errors[pathKey]) {
          errors[pathKey] = issue.message;
        }
      }
      setFieldErrors(errors);
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 0);
      return;
    }

    setFieldErrors({});

    try {
      const response = await saveMutation.mutateAsync(parsed.data);
      message.success(response.message || 'Қоралама муваффақиятли сақланди');
      setIsFormDirty(false);
      onSaveSuccess?.();
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setFieldErrors({ server: err.message });
      } else if (err instanceof Error) {
        setFieldErrors({ server: err.message });
      } else {
        setFieldErrors({
          server: 'Қораламани сақлашда кутилмаган хатолик юз берди.',
        });
      }
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 0);
    }
  };

  const errorCount = Object.keys(fieldErrors).length;

  const getFieldError = (fieldName: string) => fieldErrors[fieldName];

  const fieldLabels: Record<string, string> = {
    modelProvider: 'Провайдер',
    modelId: 'Модель идентификатори',
    temperature: 'Ҳарорат (Temperature)',
    maxOutputTokens: 'Максимал токенлар',
    relevanceSystemPrompt: 'Долзарблик тизим кўрсатмаси',
    topicMatchingSystemPrompt: 'Мавзу бирлаштириш тизим кўрсатмаси',
    topicProjectionSystemPrompt: 'Мавзу проекцияси тизим кўрсатмаси',
    globalServiceVocabulary: 'Умумий хизмат луғати',
    server: 'Сервер хатолиги',
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Title level={4} style={{ margin: 0 }}>
            Глобал таҳлил созламалари қораламаси
          </Title>
          <Badge
            count="Қоралама"
            style={{
              backgroundColor: token.colorWarning,
              color: '#fff',
              fontWeight: 500,
            }}
          />
          {isFormDirty && (
            <Tag color="orange" style={{ margin: 0 }}>
              Ўзгаришлар сақланмаган
            </Tag>
          )}
        </div>
      }
      variant="outlined"
      style={{
        borderRadius: token.borderRadiusLG,
        background: token.colorBgContainer,
      }}
    >
      {/* Offline Status Banner */}
      {isOffline && (
        <Alert
          message="Тармоқ билан алоқа узилган"
          description="Сиз офлайн режимдасиз. Маълумотларни кўриб чиқишингиз мумкин, бироқ қораламани сақлаш учун интернет алоқаси талаб этилади."
          type="warning"
          showIcon
          icon={<DisconnectOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Accessible Error Summary Container */}
      {errorCount > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          id="global-settings-error-summary"
          role="alert"
          style={{
            background: token.colorErrorBg,
            border: `1px solid ${token.colorErrorBorder}`,
            borderRadius: token.borderRadius,
            padding: 16,
            marginBottom: 24,
            outline: 'none',
          }}
        >
          <div
            style={{
              fontWeight: 600,
              color: token.colorErrorText,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <ExclamationCircleOutlined />
            <span>Тўлдиришда хатоликлар мавжуд ({errorCount} та):</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.entries(fieldErrors).map(([field, msg]) => (
              <li key={field}>
                {field !== 'server' ? (
                  <button
                    type="button"
                    onClick={() => {
                      form.scrollToField(field, { behavior: 'smooth' });
                      const el = document.getElementById(`draft-${field}`);
                      if (el) el.focus();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: token.colorPrimary,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    {fieldLabels[field] || field}: {msg}
                  </button>
                ) : (
                  <Text type="danger" style={{ fontSize: 14 }}>
                    {msg}
                  </Text>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onValuesChange={handleValuesChange}
        requiredMark="optional"
      >
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="modelProvider"
              label="Провайдер"
              required
              validateStatus={getFieldError('modelProvider') ? 'error' : undefined}
              help={getFieldError('modelProvider')}
            >
              <Select
                id="draft-modelProvider"
                options={[
                  { label: 'OpenAI (GPT-4o)', value: 'OPENAI' },
                  { label: 'Google Gemini', value: 'GEMINI' },
                  { label: 'Groq (Llama)', value: 'GROQ' },
                  { label: 'Ollama (Local)', value: 'OLLAMA' },
                ]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="modelId"
              label="Модель идентификатори"
              required
              validateStatus={getFieldError('modelId') ? 'error' : undefined}
              help={getFieldError('modelId')}
            >
              <AutoComplete
                id="draft-modelId"
                placeholder="Модель номи ёки идентификатори"
                options={(
                  PROVIDER_MODEL_PRESETS[selectedProvider] || []
                ).map((m) => ({ value: m, label: m }))}
                filterOption={(inputValue, option) =>
                  (option?.value?.toUpperCase().indexOf(inputValue.toUpperCase()) ??
                    -1) !== -1
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Ҳарорат (Temperature: 0.0 - 1.0)"
              required
              validateStatus={getFieldError('temperature') ? 'error' : undefined}
              help={getFieldError('temperature')}
            >
              <Row gutter={12} align="middle">
                <Col span={18}>
                  <Form.Item name="temperature" noStyle>
                    <Slider
                      min={0.0}
                      max={1.0}
                      step={0.05}
                    />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="temperature" noStyle>
                    <InputNumber
                      id="draft-temperature"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              name="maxOutputTokens"
              label="Максимал токенлар (100 - 2000)"
              required
              validateStatus={
                getFieldError('maxOutputTokens') ? 'error' : undefined
              }
              help={getFieldError('maxOutputTokens')}
            >
              <InputNumber
                id="draft-maxOutputTokens"
                min={100}
                max={2000}
                step={50}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="relevanceSystemPrompt"
          label="Долзарблик таҳлили тизим кўрсатмаси (Semantic Relevance System Prompt)"
          required
          validateStatus={
            getFieldError('relevanceSystemPrompt') ? 'error' : undefined
          }
          help={getFieldError('relevanceSystemPrompt')}
        >
          <TextArea
            id="draft-relevanceSystemPrompt"
            rows={5}
            maxLength={10000}
            showCount
            style={{ fontFamily: token.fontFamilyCode, fontSize: 13 }}
            placeholder="Долзарблик таҳлили учун тизим кўрсатмаси..."
          />
        </Form.Item>

        <Form.Item
          name="topicMatchingSystemPrompt"
          label="Мавзу бирлаштириш тизим кўрсатмаси (Topic Matching System Prompt)"
          required
          validateStatus={
            getFieldError('topicMatchingSystemPrompt') ? 'error' : undefined
          }
          help={getFieldError('topicMatchingSystemPrompt')}
        >
          <TextArea
            id="draft-topicMatchingSystemPrompt"
            rows={5}
            maxLength={10000}
            showCount
            style={{ fontFamily: token.fontFamilyCode, fontSize: 13 }}
            placeholder="Мавзу бирлаштириш учун тизим кўрсатмаси..."
          />
        </Form.Item>

        <Form.Item
          name="topicProjectionSystemPrompt"
          label="Мавзу проекцияси тизим кўрсатмаси (Topic Projection System Prompt)"
          required
          validateStatus={
            getFieldError('topicProjectionSystemPrompt') ? 'error' : undefined
          }
          help={getFieldError('topicProjectionSystemPrompt')}
        >
          <TextArea
            id="draft-topicProjectionSystemPrompt"
            rows={5}
            maxLength={10000}
            showCount
            style={{ fontFamily: token.fontFamilyCode, fontSize: 13 }}
            placeholder="Мавзу проекцияси учун тизим кўрсатмаси..."
          />
        </Form.Item>

        <Form.Item
          name="globalServiceVocabulary"
          label="Умумий хизмат луғати (Global Service Vocabulary)"
          required
          validateStatus={
            getFieldError('globalServiceVocabulary') ? 'error' : undefined
          }
          help={getFieldError('globalServiceVocabulary')}
        >
          <GlobalServiceVocabularyInput />
        </Form.Item>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            paddingTop: 16,
            marginTop: 16,
          }}
        >
          <Button
            icon={<UndoOutlined />}
            onClick={handleResetToBaseline}
            disabled={!isFormDirty || saveMutation.isPending}
          >
            Ўзгаришларни бекор қилиш
          </Button>

          <Space>
            <Button
              id="draft-submit-button"
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={saveMutation.isPending}
              disabled={isOffline}
            >
              Сақлаш
            </Button>
          </Space>
        </div>
      </Form>
    </Card>
  );
};
