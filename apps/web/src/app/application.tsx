import { QueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Spin } from "antd";
import type { ReactNode } from "react";
import {
  Navigate,
  Outlet,
  type RouteObject,
} from "react-router";

import { ProductOwnerLandingPage } from "../ProductOwnerLandingPage.js";
import {
  AuthenticationProvider,
  useAuthentication,
} from "../auth/authentication-context.js";
import { SignInPage } from "../auth/SignInPage.js";

export const createAuthenticationQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });

const ApplicationBoundary = (): ReactNode => (
  <AuthenticationProvider>
    <Outlet />
  </AuthenticationProvider>
);

const AuthenticationLoading = (): ReactNode => (
  <main className="status-page" aria-live="polite">
    <Card className="status-card" variant="outlined">
      <Spin aria-label="Сеанс текширилмоқда" size="large" />
      <p>Сеанс текширилмоқда.</p>
    </Card>
  </main>
);

const ConnectionUnavailable = (): ReactNode => {
  const authentication = useAuthentication();
  return (
    <main className="status-page" aria-live="polite">
      <Card className="status-card" variant="outlined">
        <Alert
          title="Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг."
          showIcon
          type="warning"
        />
        <Button
          onClick={(): void => {
            void authentication.retrySession();
          }}
          type="primary"
        >
          Қайта уриниш
        </Button>
      </Card>
    </main>
  );
};

const ProtectedConsoleRoute = (): ReactNode => {
  const authentication = useAuthentication();
  if (authentication.authenticationStatus === "LOADING") {
    return <AuthenticationLoading />;
  }
  if (authentication.authenticationStatus === "UNKNOWN") {
    return <ConnectionUnavailable />;
  }
  if (authentication.authenticationStatus === "UNAUTHENTICATED") {
    return <Navigate replace to="/sign-in" />;
  }
  return <ProductOwnerLandingPage />;
};

const RootRoute = (): ReactNode => {
  const authentication = useAuthentication();
  if (authentication.authenticationStatus === "LOADING") {
    return <AuthenticationLoading />;
  }
  if (authentication.authenticationStatus === "UNKNOWN") {
    return <ConnectionUnavailable />;
  }
  return (
    <Navigate
      replace
      to={
        authentication.authenticationStatus === "AUTHENTICATED"
          ? "/console"
          : "/sign-in"
      }
    />
  );
};

export const applicationRoutes: RouteObject[] = [
  {
    children: [
      { element: <RootRoute />, index: true },
      { element: <SignInPage />, path: "sign-in" },
      { element: <ProtectedConsoleRoute />, path: "console" },
      { element: <RootRoute />, path: "*" },
    ],
    element: <ApplicationBoundary />,
    path: "/",
  },
];
