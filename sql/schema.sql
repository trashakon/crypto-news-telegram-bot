-- news table: menyimpan berita yang sudah dipublish/seen untuk dedupe
create table if not exists news (
  id uuid default gen_random_uuid() primary key,
  source text not null,
  title text,
  summary text,
  url text,
  guid text,
  hash text unique,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- replies table: menyimpan percakapan bot <-> user (optional)
create table if not exists replies (
  id uuid default gen_random_uuid() primary key,
  news_id uuid references news(id),
  telegram_message_id bigint,
  telegram_user_id bigint,
  content text,
  ai_response text,
  created_at timestamptz default now()
);

-- simple index for hash
create index if not exists idx_news_hash on news (hash);
