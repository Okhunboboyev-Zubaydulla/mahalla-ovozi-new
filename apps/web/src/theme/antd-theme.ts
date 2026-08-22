import { ThemeConfig } from 'antd';

export const mahallaTheme: ThemeConfig = {
  token: {
    colorBgLayout: '#F5F7F6',
    colorBgContainer: '#FFFFFF',
    colorPrimary: '#0F5C5E',
    colorPrimaryHover: '#0C4B4D',
    colorPrimaryActive: '#093B3C',
    colorText: '#172321',
    colorTextSecondary: '#52615E',
    colorBorder: '#C9D5D1',
    colorError: '#BA1A1A',
    // P5-I: Warning color tokens for status tags
    colorWarning: '#6B4B00',
    colorWarningBg: '#FFF4D6',
    borderRadius: 8,
    controlHeight: 44,
    fontSize: 15,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Button: {
      controlHeight: 44,
      borderRadius: 8,
      fontWeight: 600,
      colorPrimary: '#0F5C5E',
      colorPrimaryHover: '#0C4B4D',
      colorPrimaryActive: '#093B3C',
    },
    Input: {
      controlHeight: 44,
      borderRadius: 8,
      colorBorder: '#C9D5D1',
      hoverBorderColor: '#007A7C',
      activeBorderColor: '#007A7C',
    },
    Card: {
      borderRadiusLG: 12,
      colorBorderSecondary: '#E2EAE7',
    },
    // P5-B: Menu component tokens
    Menu: {
      itemSelectedColor: '#0F5C5E',
      itemSelectedBg: '#EDF3F1',
      itemHoverBg: '#EDF3F1',
      itemColor: '#172321',
      itemActiveBg: '#EDF3F1',
    },
  },
};

/**
 * Semantic color constants derived from mahallaTheme tokens.
 * Import from here instead of hardcoding hex values in component styles.
 * All values are in sync with the Ant Design theme configuration above.
 */
export const themeColors = {
  // Brand / Primary
  colorPrimary: '#0F5C5E',
  colorPrimaryHover: '#0C4B4D',

  // Text
  colorText: '#172321',
  colorTextSecondary: '#52615E',
  colorTextMuted: '#64748b',       // Tailwind slate-500 — used for placeholder/inactive text

  // Backgrounds
  colorBgLayout: '#F5F7F6',
  colorBgSubtle: '#f8fafc',        // Light card / section backgrounds
  colorBgEmpty: '#f1f5f9',         // Empty state backgrounds

  // Borders
  colorBorder: '#C9D5D1',
  colorBorderSecondary: '#E2EAE7',
  colorBorderInput: '#cbd5e1',     // Input inner borders

  // Semantic states
  colorError: '#BA1A1A',
  colorErrorBg: '#fef2f2',
  colorWarning: '#6B4B00',

  // Success (used for active/online status indicators)
  colorSuccess: '#10b981',
  colorSuccessBg: '#ecfdf5',

  // Icon placeholder (inactive / hint icons inside inputs)
  colorIconPlaceholder: '#bfbfbf',
} as const;
