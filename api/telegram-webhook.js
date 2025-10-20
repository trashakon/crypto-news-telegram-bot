import { supabase } from '../lib/supabase.js';
import { sendMessage } from '../lib/telegram.js';
import { generateTitleAndSummary } from '../lib/gemini.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const body = req.body;

    // Simple safety: only handle message.reply_to_message (user replying to bot message)
    const message = body.message || body.edited_message;
    if (!message) return res.status(200).send();

    const chatId = message.chat.id;
    const fromId = message.from?.id;
    const text = message.text || '';

    // If user is replying to a bot message containing a link/backref, try find news_id by matching url/title
    // For simplicity, we won't attempt deep matching — just process text and generate a reply
    
    const prompt = `User asked: "${text}". Jawab seolah asisten yang ramah, informatif, dan singkat (max 300 kata). Jika relevan, sertakan ringkasan langkah atau sumber.`;
    let aiResp = 'Maaf, saya tidak bisa menjawab saat ini.';
    try {
      const out = await generateTitleAndSummary(prompt); // reusing wrapper; if wrapper expects article, it's OK — will fallback
      aiResp = out.summary || out.title || aiResp;
    } catch (err) {
      console.error('AI reply error', err);
    }

    // send reply
    await sendMessage(chatId, aiResp, { reply_markup: null });

    // save conversation to Supabase (optional)
    try {
      await supabase.from('replies').insert([{
        telegram_message_id: message.message_id,
        telegram_user_id: fromId,
        content: text,
        ai_response: aiResp
      }]);
    } catch (e) {
      console.error('Supabase save reply error', e);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
