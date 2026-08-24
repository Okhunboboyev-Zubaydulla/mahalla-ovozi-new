import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

export interface DashboardSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  disabled?: boolean;
}

export const DashboardSearchInput: React.FC<DashboardSearchInputProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = 'Мавзу ёки далил бўйича қидирув...',
  style,
  className,
  disabled = false,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize local input state if external value changes (e.g., reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const triggerChange = useCallback(
    (newValue: string) => {
      onChange(newValue);
      onSearch?.(newValue);
    },
    [onChange, onSearch],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setLocalValue(nextVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!nextVal.trim()) {
      // Clear immediately when input is emptied
      triggerChange('');
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerChange(nextVal);
    }, 400);
  };

  const handlePressEnter = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    triggerChange(localValue);
  };

  return (
    <Input
      className={className}
      value={localValue}
      onChange={handleChange}
      onPressEnter={handlePressEnter}
      placeholder={placeholder}
      prefix={<SearchOutlined style={{ color: '#64748B', fontSize: 14 }} />}
      allowClear
      maxLength={200}
      disabled={disabled}
      aria-label="Мавзулар ва далиллар бўйича қидирув"
      style={{
        width: '100%',
        maxWidth: 320,
        borderRadius: 6,
        borderColor: '#CBD5E1',
        height: 36,
        backgroundColor: '#FFFFFF',
        ...style,
      }}
    />
  );
};
