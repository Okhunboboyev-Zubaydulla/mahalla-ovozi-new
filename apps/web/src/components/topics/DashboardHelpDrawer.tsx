import React, { useEffect, useRef } from 'react';
import { Drawer, Typography } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { HelpContent } from './HelpContent.js';

const { Title } = Typography;

export interface DashboardHelpDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const DashboardHelpDrawer: React.FC<DashboardHelpDrawerProps> = ({
  open,
  onClose,
}) => {
  const headingRef = useRef<HTMLDivElement>(null);

  // Programmatic focus on drawer heading when opened (AC 3)
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        headingRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Keyboard Escape listener to close drawer and restore focus (AC 3)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      mask={false}
      rootStyle={{ pointerEvents: 'none' }}
      width={520}
      aria-label="Тизим ёрдами ва тушунтиришлар"
      aria-modal={false}
      keyboard={false}
      closeIcon={<CloseOutlined aria-label="Ёпиш" style={{ fontSize: 16, color: '#64748B' }} />}
      styles={{
        wrapper: {
          boxShadow: 'none',
          pointerEvents: 'auto',
        },
        content: {
          boxShadow: 'none',
          borderLeft: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        },
        header: {
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 20px',
        },
        body: {
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: '#F8FAFC',
        },
      }}
      title={
        <div
          ref={headingRef}
          tabIndex={-1}
          id="dashboard-help-heading"
          style={{ outline: 'none' }}
        >
          <Title
            level={5}
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#0F172A',
            }}
          >
            Тизим ёрдами ва тушунтиришлар
          </Title>
        </div>
      }
    >
      <section
        role="region"
        aria-label="Тизим ёрдами ва тушунтиришлар"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <HelpContent />
      </section>
    </Drawer>
  );
};
