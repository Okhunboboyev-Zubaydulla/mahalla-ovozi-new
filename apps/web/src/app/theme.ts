import type { ThemeConfig } from "antd";

export const applicationTheme: ThemeConfig = {
  components: {
    Button: {
      controlHeight: 44,
      primaryShadow: "none",
    },
    Card: {
      boxShadow: "none",
    },
    Input: {
      controlHeight: 44,
    },
  },
  token: {
    borderRadius: 8,
    colorBgBase: "#F8FAFC",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F8FAFC",
    colorBorder: "#E2E8F0",
    colorBorderSecondary: "#CBD5E1",
    colorPrimary: "#0284C7",
    colorPrimaryHover: "#0369A1",
    colorText: "#0F172A",
    colorTextSecondary: "#475569",
    fontFamily: "system-ui, sans-serif",
    fontSize: 15,
    motionDurationFast: "0.12s",
    motionDurationMid: "0.18s",
  },
};
