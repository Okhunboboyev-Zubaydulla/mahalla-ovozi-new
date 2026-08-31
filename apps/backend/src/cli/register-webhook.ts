import { createDbPool } from '../adapters/db/client.js';
import { decryptToken } from '../adapters/crypto/token-cipher.js';
import { deriveWebhookSecret } from '../modules/telegram-intake/webhook-security.js';

export async function run() {
  const ngrokUrl = process.argv[2] || 'https://mulled-revivable-satirical.ngrok-free.dev';
  const pool = createDbPool();

  try {
    const res = await pool.query(
      'SELECT bot_id, encrypted_token, token_iv, token_tag FROM district_telegram_bots WHERE bot_id = $1',
      ['8293431272'],
    );
    const row = res.rows[0];
    if (!row) {
      console.error('Bot 8293431272 not found in DB');
      return;
    }

    const token = decryptToken({
      encryptedToken: row.encrypted_token,
      tokenIv: row.token_iv,
      tokenTag: row.token_tag,
    });

    const webhookUrl = `${ngrokUrl}/api/v1/webhooks/telegram/${row.bot_id}`;
    const secretToken = deriveWebhookSecret(row.bot_id);

    console.log(`Setting Telegram webhook -> ${webhookUrl}`);

    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ['message', 'edited_message'],
      }),
    });

    const tgData = await tgRes.json();
    console.log('Telegram API setWebhook response:', tgData);

    const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const infoData = await infoRes.json();
    console.log('Telegram Webhook Info:', infoData);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes('register-webhook')) {
  run().catch(console.error);
}
