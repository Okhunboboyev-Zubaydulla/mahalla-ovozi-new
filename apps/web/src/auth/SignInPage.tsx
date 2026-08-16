import type { AuthSignInRequest } from "@mahalla-ovozi/api-contracts";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import type { ReactNode } from "react";
import { Navigate } from "react-router";

import { AuthenticationApiError } from "./auth-api.js";
import { useAuthentication } from "./authentication-context.js";

const { Paragraph, Title } = Typography;

const signInErrorMessage = (error: AuthenticationApiError): string => {
  if (
    error.apiCode === "INVALID_CREDENTIALS" ||
    error.apiCode === "RATE_LIMITED" ||
    error.apiCode === "VALIDATION_ERROR"
  ) {
    return error.message;
  }
  if (error.category === "NETWORK") {
    return "Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг.";
  }
  return "Серверда ички хато юз берди. Қайта уриниб кўринг.";
};

export const SignInPage = (): ReactNode => {
  const authentication = useAuthentication();
  const [form] = Form.useForm<AuthSignInRequest>();

  if (authentication.authenticationStatus === "AUTHENTICATED") {
    return <Navigate replace to="/console" />;
  }

  const submit = async (values: AuthSignInRequest): Promise<void> => {
    try {
      await authentication.authenticate(values);
    } catch (error) {
      if (
        error instanceof AuthenticationApiError &&
        error.apiCode === "INVALID_CREDENTIALS"
      ) {
        form.setFieldValue("password", "");
      }
      if (!(error instanceof AuthenticationApiError)) {
        throw error;
      }
    }
  };

  return (
    <main className="auth-page">
      <Card className="auth-card" variant="outlined">
        <div className="brand-lockup" aria-label="Mahalla Ovozi">
          <span aria-hidden="true" className="brand-mark">
            🗣️
          </span>
          <Title level={1}>Mahalla Ovozi</Title>
        </div>
        <Paragraph>Маҳсулот эгаси тизимига кириш</Paragraph>
        {authentication.sessionEnded ? (
          <Alert title="Сеанс тугади. Қайта киринг." showIcon type="warning" />
        ) : null}
        {authentication.authenticationStatus === "UNKNOWN" ? (
          <Alert
            title="Сервер билан боғланиб бўлмади. Интернет алоқасини текшириб, қайта урининг."
            showIcon
            type="warning"
          />
        ) : null}
        {authentication.signInError === null ? null : (
          <Alert
            title={signInErrorMessage(authentication.signInError)}
            showIcon
            type={
              authentication.signInError.apiCode === "RATE_LIMITED"
                ? "warning"
                : "error"
            }
          />
        )}
        <Form<AuthSignInRequest>
          form={form}
          layout="vertical"
          name="product-owner-sign-in"
          onFinish={submit}
          onValuesChange={authentication.resetSignInError}
          requiredMark={false}
        >
          <Form.Item<AuthSignInRequest>
            label="Фойдаланувчи номи"
            name="username"
            rules={[{ message: "Фойдаланувчи номини киритинг.", required: true }]}
          >
            <Input autoComplete="username" disabled={authentication.isSigningIn} />
          </Form.Item>
          <Form.Item<AuthSignInRequest>
            label="Парол"
            name="password"
            rules={[{ message: "Паролни киритинг.", required: true }]}
          >
            <Input
              autoComplete="current-password"
              disabled={authentication.isSigningIn}
              type="password"
            />
          </Form.Item>
          <Button
            block
            disabled={authentication.isSigningIn}
            htmlType="submit"
            loading={authentication.isSigningIn}
            type="primary"
          >
            Кириш
          </Button>
        </Form>
      </Card>
    </main>
  );
};
