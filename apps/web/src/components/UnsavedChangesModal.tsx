import React from 'react';
import { Modal } from 'antd';
import { useDistrict } from '../district/district-context.js';

export const UnsavedChangesModal: React.FC = () => {
  const { pendingTransition, confirmDiscard, cancelTransition } = useDistrict();

  const isOpen = pendingTransition !== null;

  return (
    <Modal
      title="Сақланмаган ўзгаришлар мавжуд"
      open={isOpen}
      onOk={cancelTransition}
      onCancel={confirmDiscard}
      okText="Таҳрирлашни давом эттириш"
      okType="primary"
      okButtonProps={{ autoFocus: true }}
      cancelText="Ўзгаришларни бекор қилиш"
      cancelButtonProps={{ danger: true }}
      maskClosable={true}
      keyboard={true}
      destroyOnHidden={true}
      centered
    >
      <p style={{ margin: '16px 0 8px 0', fontSize: 14, color: '#172321' }}>
        Киритилган маълумотлар сақланмаган. Саҳифани тарк этсангиз, ўзгаришлар йўқолади.
      </p>
    </Modal>
  );
};
