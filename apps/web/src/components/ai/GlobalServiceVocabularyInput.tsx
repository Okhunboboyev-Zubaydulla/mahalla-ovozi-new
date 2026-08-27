import React, { useState } from 'react';
import {
  Space,
  Input,
  Select,
  Button,
  Table,
  Tag,
  Typography,
  theme,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { GlobalServiceVocabularyItem } from '@mahalla-ovozi/api-contracts';

const { Text } = Typography;

export const PRESET_CATEGORIES = [
  'Сув таъминоти',
  'Газ таъминоти',
  'Электр энергияси',
  'Чиқинди ва тозалик',
  'Йўл ва инфратузилма',
  'Ҳокимият ва бошқарув',
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  'Сув таъминоти': 'blue',
  'Газ таъминоти': 'orange',
  'Электр энергияси': 'gold',
  'Чиқинди ва тозалик': 'green',
  'Йўл ва инфратузилма': 'purple',
  'Ҳокимият ва бошқарув': 'cyan',
};

interface GlobalServiceVocabularyInputProps {
  value?: GlobalServiceVocabularyItem[];
  onChange?: (value: GlobalServiceVocabularyItem[]) => void;
  disabled?: boolean;
}

export const GlobalServiceVocabularyInput: React.FC<
  GlobalServiceVocabularyInputProps
> = ({ value = [], onChange, disabled = false }) => {
  const { token } = theme.useToken();
  const [newTerm, setNewTerm] = useState('');
  const [newCategory, setNewCategory] = useState<string>(PRESET_CATEGORIES[0]);
  const [newDescription, setNewDescription] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  const handleAdd = () => {
    const trimmedTerm = newTerm.trim();
    const trimmedCategory = newCategory.trim();
    const trimmedDesc = newDescription.trim();

    if (!trimmedTerm) {
      setInputError('Атама номини киритинг.');
      return;
    }
    if (trimmedTerm.length > 100) {
      setInputError('Атама 100 та белгидан ошмаслиги керак.');
      return;
    }
    if (trimmedDesc.length > 500) {
      setInputError('Тавсиф 500 та белгидан ошмаслиги керак.');
      return;
    }
    if (!trimmedCategory) {
      setInputError('Тоифани танланг ёки киритинг.');
      return;
    }

    const normalizedNew = trimmedTerm
      .normalize('NFC')
      .replace(/\s+/g, ' ')
      .toLowerCase();
    const exists = value.some(
      (item) =>
        item.term.trim().normalize('NFC').replace(/\s+/g, ' ').toLowerCase() ===
        normalizedNew,
    );
    if (exists) {
      setInputError(`"${trimmedTerm}" атамаси рўйхатда аллақачон мавжуд.`);
      return;
    }

    setInputError(null);
    const updated: GlobalServiceVocabularyItem[] = [
      ...value,
      {
        term: trimmedTerm,
        category: trimmedCategory,
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
      },
    ];

    onChange?.(updated);
    setNewTerm('');
    setNewDescription('');
  };

  const handleRemove = (index: number) => {
    const updated = value.filter((_, idx) => idx !== index);
    onChange?.(updated);
  };

  const columns = [
    {
      title: 'Атама',
      dataIndex: 'term',
      key: 'term',
      width: '30%',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Тоифа',
      dataIndex: 'category',
      key: 'category',
      width: '25%',
      render: (category: string) => (
        <Tag color={CATEGORY_COLORS[category] || 'default'}>{category}</Tag>
      ),
    },
    {
      title: 'Тавсиф',
      dataIndex: 'description',
      key: 'description',
      width: '35%',
      render: (desc?: string) => (
        <Text type="secondary">{desc || '—'}</Text>
      ),
    },
    {
      title: 'Амал',
      key: 'action',
      width: '10%',
      render: (_: unknown, record: GlobalServiceVocabularyItem) => (
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          disabled={disabled || value.length <= 1}
          onClick={() => {
            const actualIndex = value.findIndex(
              (item) => item.term === record.term,
            );
            if (actualIndex !== -1) {
              handleRemove(actualIndex);
            }
          }}
          aria-label={`Ўчириш: ${record.term}`}
        />
      ),
    },
  ];

  return (
    <div
      id="draft-globalServiceVocabulary"
      tabIndex={-1}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        outline: 'none',
      }}
    >
      {!disabled && (
        <div
          style={{
            background: token.colorFillAlter,
            padding: 12,
            borderRadius: token.borderRadiusLG,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            <Space wrap style={{ width: '100%' }}>
              <Input
                id="vocabulary-new-term"
                placeholder="Янги атама (масалан: Сув босими)"
                value={newTerm}
                onChange={(e) => {
                  setNewTerm(e.target.value);
                  if (inputError) setInputError(null);
                }}
                onPressEnter={handleAdd}
                style={{ width: 220 }}
                maxLength={100}
              />
              <Select
                id="vocabulary-new-category"
                value={newCategory}
                onChange={setNewCategory}
                style={{ width: 180 }}
                options={PRESET_CATEGORIES.map((cat) => ({
                  label: cat,
                  value: cat,
                }))}
              />
              <Input
                id="vocabulary-new-description"
                placeholder="Қисқача тавсиф (ихтиёрий)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                onPressEnter={handleAdd}
                style={{ width: 240 }}
                maxLength={500}
              />
              <Button
                id="vocabulary-add-button"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleAdd}
              >
                Қўшиш
              </Button>
            </Space>
            {inputError && (
              <Text type="danger" style={{ fontSize: 13 }}>
                {inputError}
              </Text>
            )}
          </Space>
        </div>
      )}

      <Table
        dataSource={value.map((item, idx) => ({ ...item, key: `${item.term}-${idx}` }))}
        columns={columns}
        pagination={{ pageSize: 6, size: 'small' }}
        size="small"
        bordered
      />
    </div>
  );
};
