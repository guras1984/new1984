begin;
create table if not exists public.new1984_scores (
 id uuid primary key,
 nickname text not null check(char_length(nickname) between 1 and 12 and nickname !~ '[[:cntrl:]<>]'),
 score integer not null check(score between 0 and 1000000000),
 difficulty text not null check(difficulty in ('easy','normal','hard')),
 plane text not null check(plane in ('standard','jet','propeller','cruiser','copter')),
 stage integer not null check(stage between 1 and 100),
 kills integer not null check(kills between 0 and 1000000),
 created_at timestamptz not null default now()
);
alter table public.new1984_scores enable row level security;
revoke all on public.new1984_scores from anon,authenticated;
create index if not exists new1984_scores_board on public.new1984_scores(score desc,created_at asc,id);
create or replace function public.new1984_submit_score(
 p_id uuid,p_nickname text,p_score integer,p_difficulty text,p_plane text,p_stage integer,p_kills integer
) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if p_id is null or p_nickname is null or char_length(trim(p_nickname)) not between 1 and 12
 or p_nickname ~ '[[:cntrl:]<>]' or p_score is null or p_score not between 0 and 1000000000
 or p_difficulty is null or p_difficulty not in ('easy','normal','hard')
 or p_plane is null or p_plane not in ('standard','jet','propeller','cruiser','copter')
 or p_stage is null or p_stage not between 1 and 100 or p_kills is null or p_kills not between 0 and 1000000
 then raise exception 'INVALID_SCORE'; end if;
 insert into public.new1984_scores(id,nickname,score,difficulty,plane,stage,kills)
 values(p_id,trim(p_nickname),p_score,p_difficulty,p_plane,p_stage,p_kills)
 on conflict(id) do nothing;
 return true;
end $$;
create or replace function public.new1984_leaderboard()
returns table(nickname text,score integer,difficulty text,plane text,stage integer,kills integer)
language sql stable security definer set search_path='' as $$
 select s.nickname,s.score,s.difficulty,s.plane,s.stage,s.kills
 from public.new1984_scores s order by s.score desc,s.created_at asc,s.id limit 10;
$$;
revoke all on function public.new1984_submit_score(uuid,text,integer,text,text,integer,integer) from public,anon,authenticated;
revoke all on function public.new1984_leaderboard() from public,anon,authenticated;
grant execute on function public.new1984_submit_score(uuid,text,integer,text,text,integer,integer) to anon,authenticated;
grant execute on function public.new1984_leaderboard() to anon,authenticated;

create table if not exists public.new1984_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 player_id text not null unique check(player_id ~ '^[a-z0-9_-]{3,16}$'),
 gems integer not null default 0 check(gems between 0 and 10000000),
 owned jsonb not null default '[]'::jsonb check(jsonb_typeof(owned)='array'),
 equipped jsonb not null default '{}'::jsonb check(jsonb_typeof(equipped)='object'),
 updated_at timestamptz not null default now()
);
alter table public.new1984_profiles enable row level security;
revoke all on public.new1984_profiles from anon, public;
grant select,insert,update on public.new1984_profiles to authenticated;
drop policy if exists new1984_profiles_owner on public.new1984_profiles;
create policy new1984_profiles_owner on public.new1984_profiles for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.new1984_username_available(p_player_id text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_player_id is null or p_player_id !~ '^[a-z0-9_-]{3,16}$' then raise exception 'INVALID_PLAYER_ID'; end if;
 return jsonb_build_object('available',not exists(select 1 from public.new1984_profiles where player_id=p_player_id));
end $$;
revoke all on function public.new1984_username_available(text) from public,authenticated;
grant execute on function public.new1984_username_available(text) to anon;

-- Keep the ID/email mapping private; only the login Edge Function may resolve it.
create table if not exists public.new1984_player_auth (
 player_id text primary key references public.new1984_profiles(player_id) on delete cascade,
 user_id uuid not null unique references auth.users(id) on delete cascade,
 email text not null unique
);
alter table public.new1984_player_auth enable row level security;
revoke all on public.new1984_player_auth from public,anon,authenticated;
create or replace function public.new1984_register_player()
returns trigger language plpgsql security definer set search_path='' as $$
declare player_id text;
begin
 player_id := lower(new.raw_user_meta_data->>'player_id');
 if player_id is null or player_id !~ '^[a-z0-9_-]{3,16}$' then raise exception 'INVALID_PLAYER_ID'; end if;
 insert into public.new1984_profiles(user_id,player_id) values(new.id,player_id);
 insert into public.new1984_player_auth(player_id,user_id,email) values(player_id,new.id,lower(new.email));
 return new;
end $$;
drop trigger if exists new1984_auth_user_created on auth.users;
create trigger new1984_auth_user_created after insert on auth.users
 for each row execute function public.new1984_register_player();
create or replace function public.new1984_get_player_email(p_player_id text)
returns text language sql stable security definer set search_path='' as $$
 select email from public.new1984_player_auth where player_id=p_player_id;
$$;
revoke all on function public.new1984_get_player_email(text) from public,anon,authenticated;
grant execute on function public.new1984_get_player_email(text) to service_role;

commit;
