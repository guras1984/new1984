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

commit;
