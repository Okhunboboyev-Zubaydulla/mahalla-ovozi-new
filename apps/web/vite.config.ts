import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";
import { defineConfig, type UserConfigExport } from "vite";

const viteConfig: UserConfigExport = defineConfig(({ mode }) => ({
  plugins: [
    ...(mode === "e2e" ? [basicSsl({ name: "mahalla-ovozi-e2e" })] : []),
    react(),
  ],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
}));

export default viteConfig;
