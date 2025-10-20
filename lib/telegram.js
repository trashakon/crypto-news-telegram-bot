import fetch from 'node-fetch';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) throw new Error('Missing TELEGRAM_BOT_TOKEN');

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export async function sendMessage(chatId, text, options = {}) {
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: options.disable_web_page_preview ?? true,
    reply_markup: options.reply_markup
  };
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
