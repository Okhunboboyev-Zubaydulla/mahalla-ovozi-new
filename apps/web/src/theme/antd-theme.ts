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
  },
};
