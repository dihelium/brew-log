# Supabase setup (manual, one-time)

## 1. Create the `entries` table + RLS

Supabase dashboard → SQL Editor → run:

```sql
create table public.entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text,
  name text not null,
  rating int,
  notes text,
  color text,
  location text,
  photo_path text,
  logged_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.entries enable row level security;

create policy "own entries" on public.entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index entries_user_logged_idx
  on public.entries (user_id, logged_at desc);
```

## 2. Create the private photo bucket + policies

Dashboard → Storage → New bucket → name `brew-photos`, **uncheck** "Public bucket".
Then SQL Editor → run:

```sql
create policy "own photos read" on storage.objects
  for select using (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos insert" on storage.objects
  for insert with check (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own photos delete" on storage.objects
  for delete using (
    bucket_id = 'brew-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

## 3. Google OAuth

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID → Web application.
2. Authorized redirect URI: `https://YOUR-PROJECT-ref.supabase.co/auth/v1/callback`
   (find the exact value in Supabase → Authentication → Providers → Google).
3. Copy the Client ID and Client Secret.
4. Supabase → Authentication → Providers → Google → enable, paste Client ID + Secret, save.
5. Supabase → Authentication → URL Configuration → add your app's origin
   (e.g. `http://localhost:5173` for dev) to the allowed redirect URLs.

## 4. Local env

Copy `.env.example` to `.env` and fill in:
- `VITE_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
- `VITE_SUPABASE_ANON_KEY` — same page → Project API keys → `anon` `public`

## 5. Rotate the leaked Postgres password

The Postgres connection string was shared in plaintext. Supabase → Project Settings →
Database → reset the database password.
