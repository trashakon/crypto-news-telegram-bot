import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY');

export async function generateTitleAndSummary(articleText, maxTokens = 800) {
  // contoh request body — sesuaikan endpoint & schema provider
  const payload = {
    model: 'gemini-2.0-flash',
    input: `Buat ringkasan singkat (max 300 kata) dan judul yang menarik untuk artikel berikut. Jawab dalam format JSON: {"title":"...","summary":"..."}.\n\nArtikel:\n${articleText}`
  };

  const res = await fetch('https://api.gemini.example/v1/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${txt}`);
  }
  const data = await res.json();
  // asumsi data.output atau data.content — sesuaikan
  // Contoh: parse JSON dari data.output[0].content
  // Berikut adalah parsing defensif:
  let text = data?.output?.[0]?.content || data?.content || JSON.stringify(data);
  // Jika model merespon JSON-string, cobalah parse
  try {
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || parsed.judul || '',
      summary: parsed.summary || parsed.ringkasan || ''
    };
  } catch (e) {
    // fallback: potong text dan kembalikan sebagai summary
    return { title: text.slice(0, 80), summary: text.slice(0, 300) };
  }
}
