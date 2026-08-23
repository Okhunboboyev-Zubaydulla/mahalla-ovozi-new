import React from 'react';
import { Button, Alert, Empty, Typography } from 'antd';
import { ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { TopicEvidenceItem } from '@mahalla-ovozi/api-contracts';
import { EvidenceItem } from './EvidenceItem.js';

const { Text } = Typography;

export interface EvidenceTimelineProps {
  evidenceList: TopicEvidenceItem[];
  totalCount: number;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  onFetchNextPage: () => void;
}

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({
  evidenceList,
  totalCount,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onFetchNextPage,
}) => {
  if (evidenceList.length === 0) {
    return (
      <div style={{ padding: '32px 16px', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text style={{ color: '#64748B', fontSize: 14 }}>
              Ушбу мавзу бўйича сақланган далиллар топилмади.
            </Text>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Chronological list of evidence items (oldest to newest) */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {evidenceList.map((evidence) => (
          <EvidenceItem key={evidence.id} evidence={evidence} />
        ))}
      </div>

      {/* Scoped Error / Retry State for Progressive Continuation (AC 3) */}
      {isFetchNextPageError && (
        <div style={{ marginTop: 8, marginBottom: 12 }}>
          <Alert
            message="Қўшимча далилларни юклаб бўлмади."
            type="error"
            showIcon
            style={{
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #FECACA',
              backgroundColor: '#FEE2E2',
              boxShadow: 'none',
            }}
            action={
              <Button
                size="small"
                type="text"
                danger
                icon={<ReloadOutlined />}
                onClick={onFetchNextPage}
                style={{ fontWeight: 600, fontSize: 12, boxShadow: 'none' }}
              >
                Қайта уриниш
              </Button>
            }
          />
        </div>
      )}

      {/* Keyset Pagination Continuation Button (AC 3) */}
      {hasNextPage && !isFetchNextPageError && (
        <div style={{ marginTop: 4, marginBottom: 16, textAlign: 'center' }}>
          <Button
            block
            onClick={onFetchNextPage}
            loading={isFetchingNextPage}
            icon={!isFetchingNextPage ? <DownOutlined style={{ fontSize: 12 }} /> : undefined}
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#CBD5E1',
              color: '#0F172A',
              fontWeight: 600,
              fontSize: 13,
              height: 38,
              borderRadius: 6,
              boxShadow: 'none',
            }}
          >
            {isFetchingNextPage
              ? 'Юкланмоқда...'
              : `Яна кўрсатиш (${evidenceList.length} / ${Math.max(totalCount, evidenceList.length)})`}
          </Button>
        </div>
      )}
    </div>
  );
};
