import React from 'react';
import {
  Typography,
  Tag,
  Space,
  Card,
  theme,
  Empty,
  Collapse,
  Row,
  Col,
  Divider,
} from 'antd';
import {
  CheckCircleOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type {
  GlobalSettingsDiff,
  DistrictSettingsDiff,
} from './diff-utils.js';

const { Text } = Typography;

export interface ConfigurationDiffViewerProps {
  scope: 'global' | 'district';
  globalDiff?: GlobalSettingsDiff;
  districtDiff?: DistrictSettingsDiff;
}

export const ConfigurationDiffViewer: React.FC<ConfigurationDiffViewerProps> = ({
  scope,
  globalDiff,
  districtDiff,
}) => {
  const { token } = theme.useToken();

  const diff = scope === 'global' ? globalDiff : districtDiff;

  if (!diff || !diff.hasChanges) {
    return (
      <Card
        size="small"
        style={{
          background: token.colorFillQuaternary,
          borderRadius: token.borderRadius,
          textAlign: 'center',
          padding: 16,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary">
              Қораламада фаол созламаларга нисбатан ҳеч қандай ўзгариш мавжуд эмас.
            </Text>
          }
        />
      </Card>
    );
  }

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Созламалар ўзгаришлари фарқи"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxHeight: 420,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingRight: 4,
        outline: 'none',
      }}
    >
      {/* Scope: Global Configuration Diffs */}
      {scope === 'global' && globalDiff && (
        <>
          {/* Scalar parameters diff */}
          {globalDiff.scalarDiffs.some((s) => s.hasChanged) && (
            <Card
              size="small"
              title={
                <Text strong style={{ fontSize: 13 }}>
                  Асосий модел параметрлари ўзгариши
                </Text>
              }
              style={{
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {globalDiff.scalarDiffs.map((item) => (
                  <Row
                    key={item.fieldKey}
                    align="middle"
                    justify="space-between"
                    style={{
                      padding: '4px 0',
                      borderBottom: `1px dashed ${token.colorBorderSecondary}`,
                    }}
                  >
                    <Col span={10}>
                      <Text type="secondary">{item.fieldLabel}:</Text>
                    </Col>
                    <Col span={14} style={{ textAlign: 'right' }}>
                      {item.hasChanged ? (
                        <Space wrap>
                          <Tag
                            color="error"
                            icon={<MinusCircleOutlined />}
                            style={{ margin: 0 }}
                          >
                            {String(item.oldValue)}
                          </Tag>
                          <Text type="secondary">➔</Text>
                          <Tag
                            color="success"
                            icon={<PlusCircleOutlined />}
                            style={{ margin: 0 }}
                          >
                            {String(item.newValue)}
                          </Tag>
                        </Space>
                      ) : (
                        <Tag color="default" style={{ margin: 0 }}>
                          {String(item.oldValue)} (Ўзгаришсиз)
                        </Tag>
                      )}
                    </Col>
                  </Row>
                ))}
              </div>
            </Card>
          )}

          {/* System Prompt diffs */}
          {globalDiff.promptDiffs.some((p) => p.hasChanged) && (
            <Card
              size="small"
              title={
                <Text strong style={{ fontSize: 13 }}>
                  Тизим кўрсатмалари (System Prompts) фарқи
                </Text>
              }
              style={{
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <Collapse
                defaultActiveKey={globalDiff.promptDiffs
                  .filter((p) => p.hasChanged)
                  .map((p) => p.promptKey)}
                items={globalDiff.promptDiffs.map((prompt) => ({
                  key: prompt.promptKey,
                  label: (
                    <Space>
                      <Text strong>
                        {prompt.promptLabel}
                      </Text>
                      {prompt.hasChanged ? (
                        <Tag color="processing" icon={<SyncOutlined spin={false} />}>
                          Ўзгартирилди
                        </Tag>
                      ) : (
                        <Tag color="default" icon={<CheckCircleOutlined />}>
                          Ўзгаришсиз
                        </Tag>
                      )}
                    </Space>
                  ),
                  children: prompt.hasChanged ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <Text type="danger" strong style={{ fontSize: 12 }}>
                          - Аввалги матн (Жорий фаол):
                        </Text>
                        <div
                          tabIndex={0}
                          role="region"
                          aria-label={`${prompt.promptLabel} аввалги матни`}
                          style={{
                            background: token.colorErrorBg,
                            border: `1px solid ${token.colorErrorBorder}`,
                            borderRadius: token.borderRadiusSM,
                            padding: 10,
                            marginTop: 4,
                            maxHeight: 140,
                            overflowY: 'auto',
                            fontFamily: token.fontFamilyCode,
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {prompt.oldValue}
                        </div>
                      </div>

                      <div>
                        <Text type="success" strong style={{ fontSize: 12 }}>
                          + Янги матн (Қоралама):
                        </Text>
                        <div
                          tabIndex={0}
                          role="region"
                          aria-label={`${prompt.promptLabel} янги матни`}
                          style={{
                            background: token.colorSuccessBg,
                            border: `1px solid ${token.colorSuccessBorder}`,
                            borderRadius: token.borderRadiusSM,
                            padding: 10,
                            marginTop: 4,
                            maxHeight: 140,
                            overflowY: 'auto',
                            fontFamily: token.fontFamilyCode,
                            fontSize: 12,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {prompt.newValue}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Тизим кўрсатмаси ўзгаришсиз сақланган.
                    </Text>
                  ),
                }))}
              />
            </Card>
          )}

          {/* Global Service Vocabulary diffs */}
          {globalDiff.vocabularyDiffs.some((v) => v.type !== 'unchanged') && (
            <Card
              size="small"
              title={
                <Text strong style={{ fontSize: 13 }}>
                  Умумий хизмат луғати ўзгаришлари
                </Text>
              }
              style={{
                borderRadius: token.borderRadius,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Added terms */}
                {globalDiff.vocabularyDiffs.some((v) => v.type === 'added') && (
                  <div>
                    <Text type="success" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      + Қўшилган янги атамалар:
                    </Text>
                    <Space wrap size={[6, 8]}>
                      {globalDiff.vocabularyDiffs
                        .filter((v) => v.type === 'added')
                        .map((v) => (
                          <Tag
                            key={v.term}
                            color="success"
                            icon={<PlusCircleOutlined />}
                            style={{ padding: '2px 8px' }}
                          >
                            <Text strong style={{ color: 'inherit' }}>
                              + {v.term}
                            </Text>{' '}
                            <span style={{ opacity: 0.85 }}>({v.category})</span>
                          </Tag>
                        ))}
                    </Space>
                  </div>
                )}

                {/* Modified terms */}
                {globalDiff.vocabularyDiffs.some((v) => v.type === 'modified') && (
                  <div>
                    <Text type="warning" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      ~ Таҳрирланган атамалар:
                    </Text>
                    <Space wrap size={[6, 8]}>
                      {globalDiff.vocabularyDiffs
                        .filter((v) => v.type === 'modified')
                        .map((v) => (
                          <Tag
                            key={v.term}
                            color="processing"
                            icon={<SyncOutlined />}
                            style={{ padding: '2px 8px' }}
                          >
                            <Text strong style={{ color: 'inherit' }}>
                              ~ {v.term}
                            </Text>{' '}
                            <span style={{ opacity: 0.85 }}>
                              ({v.oldCategory} ➔ {v.category})
                            </span>
                          </Tag>
                        ))}
                    </Space>
                  </div>
                )}

                {/* Removed terms */}
                {globalDiff.vocabularyDiffs.some((v) => v.type === 'removed') && (
                  <div>
                    <Text type="danger" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      - Ўчирилган атамалар:
                    </Text>
                    <Space wrap size={[6, 8]}>
                      {globalDiff.vocabularyDiffs
                        .filter((v) => v.type === 'removed')
                        .map((v) => (
                          <Tag
                            key={v.term}
                            color="error"
                            icon={<MinusCircleOutlined />}
                            style={{ padding: '2px 8px' }}
                          >
                            <del style={{ color: 'inherit' }}>- {v.term}</del>{' '}
                            <span style={{ opacity: 0.85 }}>({v.category})</span>
                          </Tag>
                        ))}
                    </Space>
                  </div>
                )}

                {/* Unchanged terms summary */}
                <Divider style={{ margin: '8px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Ўзгаришсиз сақланган атамалар:{' '}
                  {globalDiff.vocabularyDiffs.filter((v) => v.type === 'unchanged').length} та
                </Text>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Scope: District Configuration Diffs */}
      {scope === 'district' && districtDiff && (
        <>
          {/* Hokim Recognition Terms diffs */}
          <Card
            size="small"
            title={
              <Text strong style={{ fontSize: 13 }}>
                Ҳокимга оид атамалар (Hokim Recognition Terms)
              </Text>
            }
            style={{
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Added terms */}
              {districtDiff.hokimTermsDiffs.some((t) => t.type === 'added') && (
                <div>
                  <Text type="success" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    + Қўшилган янги атамалар:
                  </Text>
                  <Space wrap size={[6, 8]}>
                    {districtDiff.hokimTermsDiffs
                      .filter((t) => t.type === 'added')
                      .map((t) => (
                        <Tag
                          key={t.term}
                          color="success"
                          icon={<PlusCircleOutlined />}
                          style={{ padding: '2px 8px' }}
                        >
                          + {t.term}
                        </Tag>
                      ))}
                  </Space>
                </div>
              )}

              {/* Removed terms */}
              {districtDiff.hokimTermsDiffs.some((t) => t.type === 'removed') && (
                <div>
                  <Text type="danger" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    - Ўчирилган атамалар:
                  </Text>
                  <Space wrap size={[6, 8]}>
                    {districtDiff.hokimTermsDiffs
                      .filter((t) => t.type === 'removed')
                      .map((t) => (
                        <Tag
                          key={t.term}
                          color="error"
                          icon={<MinusCircleOutlined />}
                          style={{ padding: '2px 8px' }}
                        >
                          <del>- {t.term}</del>
                        </Tag>
                      ))}
                  </Space>
                </div>
              )}

              {/* Unchanged terms summary */}
              <Divider style={{ margin: '8px 0' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Ўзгаришсиз сақланган атамалар:{' '}
                {districtDiff.hokimTermsDiffs.filter((t) => t.type === 'unchanged').length} та
              </Text>
            </div>
          </Card>

          {/* District Local Vocabulary diffs */}
          <Card
            size="small"
            title={
              <Text strong style={{ fontSize: 13 }}>
                Қўшимча маҳаллий луғат (District Local Vocabulary)
              </Text>
            }
            style={{
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Added vocab */}
              {districtDiff.vocabularyDiffs.some((v) => v.type === 'added') && (
                <div>
                  <Text type="success" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    + Қўшилган янги атамалар:
                  </Text>
                  <Space wrap size={[6, 8]}>
                    {districtDiff.vocabularyDiffs
                      .filter((v) => v.type === 'added')
                      .map((v) => (
                        <Tag
                          key={v.term}
                          color="success"
                          icon={<PlusCircleOutlined />}
                          style={{ padding: '2px 8px' }}
                        >
                          <Text strong style={{ color: 'inherit' }}>
                            + {v.term}
                          </Text>{' '}
                          <span style={{ opacity: 0.85 }}>({v.category})</span>
                        </Tag>
                      ))}
                  </Space>
                </div>
              )}

              {/* Modified vocab */}
              {districtDiff.vocabularyDiffs.some((v) => v.type === 'modified') && (
                <div>
                  <Text type="warning" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    ~ Таҳрирланган атамалар:
                  </Text>
                  <Space wrap size={[6, 8]}>
                    {districtDiff.vocabularyDiffs
                      .filter((v) => v.type === 'modified')
                      .map((v) => (
                        <Tag
                          key={v.term}
                          color="processing"
                          icon={<SyncOutlined />}
                          style={{ padding: '2px 8px' }}
                        >
                          <Text strong style={{ color: 'inherit' }}>
                            ~ {v.term}
                          </Text>{' '}
                          <span style={{ opacity: 0.85 }}>
                            ({v.oldCategory} ➔ {v.category})
                          </span>
                        </Tag>
                      ))}
                  </Space>
                </div>
              )}

              {/* Removed vocab */}
              {districtDiff.vocabularyDiffs.some((v) => v.type === 'removed') && (
                <div>
                  <Text type="danger" strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    - Ўчирилган атамалар:
                  </Text>
                  <Space wrap size={[6, 8]}>
                    {districtDiff.vocabularyDiffs
                      .filter((v) => v.type === 'removed')
                      .map((v) => (
                        <Tag
                          key={v.term}
                          color="error"
                          icon={<MinusCircleOutlined />}
                          style={{ padding: '2px 8px' }}
                        >
                          <del style={{ color: 'inherit' }}>- {v.term}</del>{' '}
                          <span style={{ opacity: 0.85 }}>({v.category})</span>
                        </Tag>
                      ))}
                  </Space>
                </div>
              )}

              {/* Unchanged vocab summary */}
              <Divider style={{ margin: '8px 0' }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Ўзгаришсиз сақланган атамалар:{' '}
                {districtDiff.vocabularyDiffs.filter((v) => v.type === 'unchanged').length} та
              </Text>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};
