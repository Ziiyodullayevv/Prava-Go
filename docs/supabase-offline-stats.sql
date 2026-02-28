-- Offline-first statistics sync tables (optional)
-- Run in Supabase SQL Editor if you want background sync from local cache.

create table if not exists public.user_theory_question_stats (
	user_id uuid not null references auth.users(id) on delete cascade,
	question_id text not null,
	seen_count integer not null default 0,
	correct_count integer not null default 0,
	incorrect_count integer not null default 0,
	last_is_correct boolean,
	last_answered_at timestamptz,
	updated_at timestamptz not null default timezone('utc', now()),
	primary key (user_id, question_id)
);

create table if not exists public.user_theory_sessions (
	user_id uuid not null references auth.users(id) on delete cascade,
	session_id text not null,
	topic_id text,
	total_questions integer not null default 0,
	score_correct integer not null default 0,
	score_incorrect integer not null default 0,
	finished_at timestamptz,
	updated_at timestamptz not null default timezone('utc', now()),
	payload jsonb not null default '{}'::jsonb,
	primary key (user_id, session_id)
);

alter table public.user_theory_question_stats enable row level security;
alter table public.user_theory_sessions enable row level security;

drop policy if exists user_theory_question_stats_owner on public.user_theory_question_stats;
create policy user_theory_question_stats_owner
on public.user_theory_question_stats
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_theory_sessions_owner on public.user_theory_sessions;
create policy user_theory_sessions_owner
on public.user_theory_sessions
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
