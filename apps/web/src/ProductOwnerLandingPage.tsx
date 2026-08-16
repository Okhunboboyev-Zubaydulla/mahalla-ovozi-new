import { Alert, Button, Card, Typography } from "antd";
import type { ReactNode } from "react";

import { useAuthentication } from "./auth/authentication-context.js";

const { Paragraph, Title } = Typography;

export const ProductOwnerLandingPage = (): ReactNode => {
  const authentication = useAuthentication();

  return (
    <main className="console-page">
      <Card className="console-card" variant="outlined">
        <Title level={1}>Маҳсулот эгаси консоли</Title>
        <Paragraph>Маҳалла Овози</Paragraph>
        <Paragraph>{authentication.actor?.username}</Paragraph>
        {authentication.isReadOnly ? (
          <Alert
            title="Алоқа вақтинча мавжуд эмас. Аввал юкланган маълумотлар фақат ўқиш учун қолди."
            showIcon
            type="warning"
          />
        ) : null}
        {authentication.signOutError === null ? null : (
          <Alert
            title="Чиқиш тасдиқланмади. Сервер билан алоқани текшириб, қайта урининг."
            showIcon
            type="error"
          />
        )}
        <Button
          disabled={authentication.isReadOnly}
          loading={authentication.isSigningOut}
          onClick={authentication.signOutNow}
          type="primary"
        >
          Чиқиш
        </Button>
      </Card>
    </main>
  );
};
