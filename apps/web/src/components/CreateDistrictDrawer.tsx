import React, { useState, useRef } from 'react';
import {
  Drawer,
  Form,
  Input,
  Button,
  type InputRef,
} from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { districtClient } from '../district/district-client.js';
import { useDistrict } from '../district/district-context.js';
import { useDirtyState } from '../district/useDirtyState.js';
import { CreateDistrictRequestSchema, CreateDistrictRequest } from '@mahalla-ovozi/api-contracts';
import { ApiError } from '../lib/api-client.js';

interface CreateDistrictDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const CreateDistrictDrawer: React.FC<CreateDistrictDrawerProps> = ({ open, onClose }) => {
  const queryClient = useQueryClient();
  const { clearDirty, setActiveDistrictDirectly, attemptTransition } = useDistrict();
  const [form] = Form.useForm();

  const [formValues, setFormValues] = useState<{ name: string; region: string }>({
    name: '',
    region: '',
  });
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; region?: string; server?: string }>({});

  const nameInputRef = useRef<InputRef>(null);
  const regionInputRef = useRef<InputRef>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);

  // Track if user has typed anything in form fields
  const isDirty = formValues.name.trim().length > 0 || formValues.region.trim().length > 0;
  // P4-D: Register dirty state
  useDirtyState('create-district-drawer', open && isDirty);

  const mutation = useMutation({
    mutationFn: (payload: CreateDistrictRequest) => districtClient.createDistrict(payload),
    onSuccess: async (data) => {
      // Clear dirty state immediately upon successful creation
      clearDirty('create-district-drawer');
      // Invalidate list
      await queryClient.invalidateQueries({ queryKey: ['districts', 'list'] });
      // Reset form & local state
      form.resetFields();
      setFormValues({ name: '', region: '' });
      setFieldErrors({});
      // Auto-select the newly created district directly
      setActiveDistrictDirectly(data.district.id);
      onClose();
    },
    onError: (err: unknown) => {
      let serverMsg = 'Серверда кутилмаган хатолик юз берди.';
      if (err instanceof ApiError) {
        serverMsg = err.message;
      }
      setFieldErrors({ server: serverMsg });
      // P5-E: Imperatively move focus to error summary
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 0);
    },
  });

  const handleClose = () => {
    if (isDirty) {
      attemptTransition(() => {
        form.resetFields();
        setFormValues({ name: '', region: '' });
        setFieldErrors({});
        onClose();
      });
    } else {
      form.resetFields();
      setFormValues({ name: '', region: '' });
      setFieldErrors({});
      onClose();
    }
  };

  const handleValuesChange = (_changed: unknown, allValues: { name?: string; region?: string }) => {
    setFormValues({
      name: allValues.name || '',
      region: allValues.region || '',
    });
    // Clear errors when typing
    if (fieldErrors.name || fieldErrors.region || fieldErrors.server) {
      setFieldErrors({});
    }
  };

  const handleSubmit = async () => {
    const rawValues = {
      name: formValues.name,
      region: formValues.region,
    };

    // Client-side Zod validation
    const parsed = CreateDistrictRequestSchema.safeParse(rawValues);
    if (!parsed.success) {
      const errors: { name?: string; region?: string } = {};
      for (const issue of parsed.error.errors) {
        if (issue.path[0] === 'name' && !errors.name) {
          errors.name = issue.message;
        } else if (issue.path[0] === 'region' && !errors.region) {
          errors.region = issue.message;
        }
      }
      setFieldErrors(errors);
      // P5-E: Focus error summary
      setTimeout(() => {
        errorSummaryRef.current?.focus();
      }, 0);
      return;
    }

    setFieldErrors({});
    mutation.mutate(parsed.data);
  };

  const errorCount = Object.keys(fieldErrors).filter((k) => !!fieldErrors[k as keyof typeof fieldErrors]).length;

  return (
    <Drawer
      title="Янги туман қўшиш"
      width={480}
      open={open}
      onClose={handleClose}
      destroyOnHidden
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <Button onClick={handleClose} disabled={mutation.isPending}>
            Бекор қилиш
          </Button>
          <Button
            id="create-district-submit"
            type="primary"
            onClick={handleSubmit}
            loading={mutation.isPending}
          >
            Сақлаш
          </Button>
        </div>
      }
    >
      {/* P5-E: Accessible error summary container */}
      {errorCount > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          id="create-district-error-summary"
          style={{
            background: '#FFF4D6',
            border: '1px solid #6B4B00',
            borderRadius: 8,
            padding: 16,
            marginBottom: 24,
            outline: 'none',
          }}
        >
          <div style={{ fontWeight: 600, color: '#6B4B00', marginBottom: 8 }}>
            Тўлдиришда хатоликлар мавжуд ({errorCount} та):
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {fieldErrors.name && (
              <li>
                <button
                  type="button"
                  onClick={() => nameInputRef.current?.focus()}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#0F5C5E',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Туман номи: {fieldErrors.name}
                </button>
              </li>
            )}
            {fieldErrors.region && (
              <li>
                <button
                  type="button"
                  onClick={() => regionInputRef.current?.focus()}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: '#0F5C5E',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 14,
                  }}
                >
                  Вилоят / Ҳудуд: {fieldErrors.region}
                </button>
              </li>
            )}
            {fieldErrors.server && (
              <li style={{ color: '#BA1A1A', fontSize: 14 }}>{fieldErrors.server}</li>
            )}
          </ul>
        </div>
      )}

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        requiredMark="optional"
      >
        <Form.Item
          name="name"
          label="Туман номи"
          required
          validateStatus={fieldErrors.name ? 'error' : undefined}
          help={fieldErrors.name}
        >
          <Input
            ref={nameInputRef}
            id="district-name-input"
            placeholder="Масалан: Юнусобод"
            value={formValues.name}
            onChange={(e) => {
              setFormValues((prev) => ({ ...prev, name: e.target.value }));
              if (fieldErrors.name || fieldErrors.server) {
                setFieldErrors((prev) => ({ ...prev, name: undefined, server: undefined }));
              }
            }}
            maxLength={100}
            disabled={mutation.isPending}
          />
        </Form.Item>

        <Form.Item
          name="region"
          label="Вилоят / Ҳудуд"
          validateStatus={fieldErrors.region ? 'error' : undefined}
          help={fieldErrors.region}
        >
          <Input
            ref={regionInputRef}
            id="district-region-input"
            placeholder="Масалан: Тошкент шаҳри (ихтиёрий)"
            value={formValues.region}
            onChange={(e) => {
              setFormValues((prev) => ({ ...prev, region: e.target.value }));
              if (fieldErrors.region || fieldErrors.server) {
                setFieldErrors((prev) => ({ ...prev, region: undefined, server: undefined }));
              }
            }}
            maxLength={100}
            disabled={mutation.isPending}
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
};
