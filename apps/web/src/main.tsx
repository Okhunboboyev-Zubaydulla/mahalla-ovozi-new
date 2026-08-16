import { QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";

import {
  applicationRoutes,
  createAuthenticationQueryClient,
} from "./app/application.js";
import { applicationTheme } from "./app/theme.js";
import "./styles.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Application root element was not found.");
}

const queryClient = createAuthenticationQueryClient();
const router = createBrowserRouter(applicationRoutes);

createRoot(rootElement).render(
  <StrictMode>
    <ConfigProvider theme={applicationTheme}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
);
