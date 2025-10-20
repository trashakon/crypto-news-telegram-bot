import Parser from 'rss-parser';
import { supabase } from '../lib/supabase.js';
import { sha256Hex } from '../utils/hash.js';
import { generateTitleAndSummary } from '../lib/gemini.js';
import { sendMessage } from '../lib/telegram.js';

const parser = new Parser();
const FEED_URLS = (process.env.RSS_FEEDS || '').split(',').map(s => s.trim()).filter(Boolean);
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const feeds = FEED_URLS.length ? FEED_URLS : ['https://www.theblock.co/rss.xml'];

    for (const feedUrl of feeds) {
      const feed = await parser.parseURL(feedUrl);
      for (const item of feed.items || []) {
        const guid = item.guid || item.link || item.id || item.title;
        const hash = sha256Hex(`${feedUrl}|${guid}`);

        // cek dedupe
        const { data: existing, error: selError } = await supabase
          .from('news')
          .select('id')
          .eq('hash', hash)
          .limit(1);

        if (selError) {
          console.error('Supabase select error', selError);
          continue;
        }
        if (existing && existing.length) {
          // sudah ada -> lewati
          continue;
        }

        // Ambil konten untuk ringkasan — RSS biasanya hanya punya snippet. Gunakan item.content atau link.
        const articleText = item.contentSnippet || item.content || item.title || item.link || '';

        // Generate via Gemini
        let ai = { title: item.title, summary: item.contentSnippet || '' };
        try {
          const out = await generateTitleAndSummary(articleText);
          ai = { ...ai, ...out };
        } catch (err) {
          console.error('AI generation failed:', err.message);
        }

        // simpan ke Supabase
        const { data: insertData, error: insertErr } = await supabase.from('news').insert([{
          source: feedUrl,
          title: ai.title,
          summary: ai.summary,
          url: item.link || null,
          guid,
          hash,
          published_at: item.isoDate ? new Date(item.isoDate).toISOString() : null
        }]).select().single();

        if (insertErr) {
          console.error('Supabase insert error', insertErr);
          continue;
        }

        // publish to Telegram
        const message = `<b>${ai.title}</b>\n\n${ai.summary}\n\n<em>— sumber: ${feedUrl}</em>`;
        try {
          await sendMessage(TELEGRAM_CHAT_ID, message);
        } catch (err) {
          console.error('Telegram send error', err);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
            }
