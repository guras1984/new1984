begin;

-- Cloud cosmetics vaults use their own ID/password credentials. No email or
-- Supabase Auth user is created. Only the Edge Function can access this table.
create table if not exists public.new1984_vaults (
  player_id text primary key check (player_id ~ '^[a-z0-9_-]{3,16}$'),
  password_salt text not null check (password_salt ~ '^[0-9a-f]{32}$'),
  password_hash text not null check (password_hash ~ '^[0-9a-f]{64}$'),
  gems integer not null default 0 check (gems between 0 and 10000000),
  owned jsonb not null default '[]'::jsonb check (jsonb_typeof(owned) = 'array'),
  equipped jsonb not null default '{}'::jsonb check (jsonb_typeof(equipped) = 'object'),
  failed_attempts integer not null default 0 check (failed_attempts between 0 and 8),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.new1984_vaults enable row level security;
revoke all on public.new1984_vaults from public, anon, authenticated;
grant all on public.new1984_vaults to service_role;

commit;
