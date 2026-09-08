import 'dotenv/config';
import { createDbPool } from '../adapters/db/client.js';
import { decryptToken } from '../adapters/crypto/token-cipher.js';
import { deriveWebhookSecret } from '../modules/telegram-intake/webhook-security.js';

interface BotRow {
  bot_id: string;
  bot_username: string | null;
  district_id: string;
  status: string;
  encrypted_token: string;
  token_iv: string;
  token_tag: string;
}

export async function run() {
  const args = process.argv.slice(2);
  const isInfoOnly = args.includes('--info') || args.includes('-i');
  const isDelete = args.includes('--delete');
  const nonFlagArgs = args.filter((arg) => !arg.startsWith('-'));

  // First non-flag argument is baseUrl, or fallback to APP_ORIGIN or default prod
  const rawBaseUrl =
    nonFlagArgs[0] ||
    process.env.APP_ORIGIN ||
    'https://mahalla-ovozi.uz';
  const baseUrl = rawBaseUrl.replace(/\/+$/, '');

  // Second non-flag argument or --bot=<id>
  const botFlag = args.find((a) => a.startsWith('--bot='));
  const targetBotId = botFlag ? botFlag.split('=')[1] : nonFlagArgs[1];

  const pool = createDbPool();

  try {
    let rows: BotRow[] = [];
    if (targetBotId) {
      const res = await pool.query<BotRow>(
        `SELECT bot_id, bot_username, district_id, status, encrypted_token, token_iv, token_tag
         FROM district_telegram_bots
         WHERE bot_id = $1`,
        [targetBotId],
      );
      rows = res.rows;
      if (rows.length === 0) {
        console.error(`❌ Bot ID ${targetBotId} not found in database.`);
        process.exit(1);
      }
    } else {
      const res = await pool.query<BotRow>(
        `SELECT bot_id, bot_username, district_id, status, encrypted_token, token_iv, token_tag
         FROM district_telegram_bots
         WHERE status = 'VALID'`,
      );
      rows = res.rows;
      if (rows.length === 0) {
        console.warn('⚠️ No bots in VALID status found in database.');
        return;
      }
    }

    console.log(`\n==============================================================`);
    console.log(`       TELEGRAM BOT WEBHOOK MANAGEMENT CLI TOOL              `);
    console.log(`==============================================================`);
    console.log(`Base URL:     ${baseUrl}`);
    console.log(`Mode:         ${isInfoOnly ? 'INSPECT (--info)' : isDelete ? 'DELETE (--delete)' : 'REGISTER'}`);
    console.log(`Target Bots:  ${rows.length} bot(s) found`);
    console.log(`--------------------------------------------------------------\n`);

    for (const row of rows) {
      console.log(`▶ Processing Bot: ${row.bot_username ? '@' + row.bot_username : row.bot_id} (District: ${row.district_id}, Status: ${row.status})`);

      let token: string;
      try {
        token = decryptToken({
          encryptedToken: row.encrypted_token,
          tokenIv: row.token_iv,
          tokenTag: row.token_tag,
        });
      } catch (err) {
        console.error(`  ❌ Failed to decrypt token for bot ${row.bot_id}:`, err instanceof Error ? err.message : err);
        continue;
      }

      if (isDelete) {
        const delRes = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
        const delData = await delRes.json();
        console.log(`  🗑️ deleteWebhook response:`, delData);
      } else if (!isInfoOnly) {
        const webhookUrl = `${baseUrl}/api/v1/webhooks/telegram/${row.bot_id}`;
        const secretToken = deriveWebhookSecret(row.bot_id);

        console.log(`  🔗 Setting Webhook URL -> ${webhookUrl}`);
        console.log(`  🔑 Secret Token Prefix:   ${secretToken.slice(0, 8)}... (HMAC length ${secretToken.length})`);

        const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: webhookUrl,
            secret_token: secretToken,
            allowed_updates: ['message', 'edited_message', 'channel_post', 'edited_channel_post'],
            drop_pending_updates: false,
          }),
        });

        const tgData = await tgRes.json();
        console.log(`  📡 Telegram setWebhook response:`, tgData);
      }

      // Always retrieve and show current webhook info
      const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const infoData = await infoRes.json();
      console.log(`  ℹ️  Current Webhook Info:`, infoData);
      console.log(`--------------------------------------------------------------\n`);
    }

    console.log(`✅ Webhook operation completed successfully.\n`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.includes('register-webhook')) {
  run().catch((err) => {
    console.error('Fatal CLI error:', err);
    process.exit(1);
  });
}
