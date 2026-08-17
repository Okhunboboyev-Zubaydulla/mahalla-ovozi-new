import React from 'react';
import { Modal, Button } from 'antd';
import { useDistrict } from '../district/district-context.js';

export const UnsavedChangesModal: React.FC = () => {
  const { pendingTransition, confirmDiscard, cancelTransition } = useDistrict();

  const isOpen = pendingTransition !== null;

  return (
    <Modal
      title="Сақланмаган ўзгаришлар мавжуд"
      open={isOpen}
      onCancel={cancelTransition}
      maskClosable={true}
      keyboard={true}
      destroyOnHidden={true}
      centered
      footer={[
        <Button key="discard" danger onClick={confirmDiscard}>
          Ўзгаришларни бекор қилиш
        </Button>,
        <Button key="continue" type="primary" autoFocus onClick={cancelTransition}>
          Таҳрирлашни давом эттириш
        </Button>,
      ]}
    >
      <p style={{ margin: '16px 0 8px 0', fontSize: 14, color: '#172321' }}>
        Киритилган маълумотлар сақланмаган. Саҳифани тарк этсангиз, ўзгаришлар йўқолади.
      </p>
    </Modal>
  );
};
