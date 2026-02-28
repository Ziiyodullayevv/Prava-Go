-- Expo + Supabase Theory -> Topics -> Tests flow uchun migration
-- Run in Supabase SQL Editor

create extension if not exists pgcrypto;

-- enums
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
		CREATE TYPE public.question_type AS ENUM ('single_choice');
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'test_mode') THEN
		CREATE TYPE public.test_mode AS ENUM ('topic_practice', 'mock_exam');
	END IF;
END
$$;

-- updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
	new.updated_at = timezone('utc', now());
	return new;
end;
$$;

-- 1) topics
create table if not exists public.topics (
	id uuid primary key default gen_random_uuid(),
	slug text not null unique,
	title text not null,
	subtitle text,
	"order" integer not null default 0,
	image_key text,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now())
);

-- 2) questions
create table if not exists public.questions (
	id uuid primary key default gen_random_uuid(),
	topic_id uuid not null references public.topics(id) on delete cascade,
	type public.question_type not null default 'single_choice',
	prompt text not null,
	image_url text,
	explanation text,
	difficulty integer,
	is_active boolean not null default true,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint questions_topic_prompt_unique unique (topic_id, prompt)
);

-- 3) question_options
create table if not exists public.question_options (
	id uuid primary key default gen_random_uuid(),
	question_id uuid not null references public.questions(id) on delete cascade,
	label text not null,
	text text not null,
	is_correct boolean not null default false,
	"order" integer not null default 0,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint question_options_question_label_unique unique (question_id, label)
);

-- 4) user_question_stats
create table if not exists public.user_question_stats (
	user_id uuid not null references auth.users(id) on delete cascade,
	question_id uuid not null references public.questions(id) on delete cascade,
	seen_count integer not null default 0,
	correct_count integer not null default 0,
	incorrect_count integer not null default 0,
	last_answered_at timestamptz,
	last_is_correct boolean,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	primary key (user_id, question_id),
	constraint user_question_stats_seen_non_negative check (seen_count >= 0),
	constraint user_question_stats_correct_non_negative check (correct_count >= 0),
	constraint user_question_stats_incorrect_non_negative check (incorrect_count >= 0)
);

-- 5) test_sessions
create table if not exists public.test_sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users(id) on delete cascade,
	topic_id uuid references public.topics(id) on delete set null,
	mode public.test_mode not null,
	total_questions integer not null default 0,
	settings jsonb not null default '{}'::jsonb,
	started_at timestamptz not null default timezone('utc', now()),
	finished_at timestamptz,
	score_correct integer not null default 0,
	score_incorrect integer not null default 0,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint test_sessions_total_questions_non_negative check (total_questions >= 0),
	constraint test_sessions_score_correct_non_negative check (score_correct >= 0),
	constraint test_sessions_score_incorrect_non_negative check (score_incorrect >= 0)
);

-- 6) test_session_questions
create table if not exists public.test_session_questions (
	id uuid primary key default gen_random_uuid(),
	session_id uuid not null references public.test_sessions(id) on delete cascade,
	question_id uuid not null references public.questions(id) on delete cascade,
	position integer not null,
	selected_option_id uuid references public.question_options(id) on delete set null,
	is_correct boolean,
	answered_at timestamptz,
	created_at timestamptz not null default timezone('utc', now()),
	updated_at timestamptz not null default timezone('utc', now()),
	constraint test_session_questions_position_positive check (position > 0),
	constraint test_session_questions_session_position_unique unique (session_id, position)
);

-- indexes
create index if not exists topics_order_idx on public.topics ("order");
create index if not exists topics_active_idx on public.topics (is_active);

create index if not exists questions_topic_id_idx on public.questions (topic_id);
create index if not exists questions_active_idx on public.questions (is_active);

create index if not exists question_options_question_id_idx on public.question_options (question_id);
create index if not exists question_options_order_idx on public.question_options (question_id, "order");

create index if not exists user_question_stats_user_id_idx on public.user_question_stats (user_id);
create index if not exists user_question_stats_question_id_idx on public.user_question_stats (question_id);

create index if not exists test_sessions_user_id_idx on public.test_sessions (user_id);
create index if not exists test_sessions_topic_id_idx on public.test_sessions (topic_id);
create index if not exists test_sessions_started_at_idx on public.test_sessions (started_at desc);

create index if not exists test_session_questions_session_id_idx on public.test_session_questions (session_id);
create index if not exists test_session_questions_question_id_idx on public.test_session_questions (question_id);

-- triggers
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'trg_topics_updated_at'
	) THEN
		CREATE TRIGGER trg_topics_updated_at
		BEFORE UPDATE ON public.topics
		FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'trg_questions_updated_at'
	) THEN
		CREATE TRIGGER trg_questions_updated_at
		BEFORE UPDATE ON public.questions
		FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'trg_question_options_updated_at'
	) THEN
		CREATE TRIGGER trg_question_options_updated_at
		BEFORE UPDATE ON public.question_options
		FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'trg_user_question_stats_updated_at'
	) THEN
		CREATE TRIGGER trg_user_question_stats_updated_at
		BEFORE UPDATE ON public.user_question_stats
		FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'trg_test_sessions_updated_at'
	) THEN
		CREATE TRIGGER trg_test_sessions_updated_at
		BEFORE UPDATE ON public.test_sessions
		FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_trigger
		WHERE tgname = 'trg_test_session_questions_updated_at'
	) THEN
		CREATE TRIGGER trg_test_session_questions_updated_at
		BEFORE UPDATE ON public.test_session_questions
		FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
	END IF;
END
$$;

-- grants
grant select on table public.topics to authenticated;
grant select on table public.questions to authenticated;
grant select on table public.question_options to authenticated;

grant select, insert, update, delete on table public.user_question_stats to authenticated;
grant select, insert, update, delete on table public.test_sessions to authenticated;
grant select, insert, update, delete on table public.test_session_questions to authenticated;

-- RLS
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.user_question_stats enable row level security;
alter table public.test_sessions enable row level security;
alter table public.test_session_questions enable row level security;

-- active content readable by authenticated users
DROP POLICY IF EXISTS topics_read_active ON public.topics;
create policy topics_read_active
on public.topics
for select
to authenticated
using (is_active = true);

DROP POLICY IF EXISTS questions_read_active ON public.questions;
create policy questions_read_active
on public.questions
for select
to authenticated
using (
	is_active = true
	and exists (
		select 1 from public.topics t
		where t.id = questions.topic_id and t.is_active = true
	)
);

DROP POLICY IF EXISTS question_options_read_active ON public.question_options;
create policy question_options_read_active
on public.question_options
for select
to authenticated
using (
	exists (
		select 1
		from public.questions q
		join public.topics t on t.id = q.topic_id
		where q.id = question_options.question_id
			and q.is_active = true
			and t.is_active = true
	)
);

-- user_question_stats policies
DROP POLICY IF EXISTS user_question_stats_select_own ON public.user_question_stats;
create policy user_question_stats_select_own
on public.user_question_stats
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS user_question_stats_insert_own ON public.user_question_stats;
create policy user_question_stats_insert_own
on public.user_question_stats
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS user_question_stats_update_own ON public.user_question_stats;
create policy user_question_stats_update_own
on public.user_question_stats
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS user_question_stats_delete_own ON public.user_question_stats;
create policy user_question_stats_delete_own
on public.user_question_stats
for delete
to authenticated
using (auth.uid() = user_id);

-- test_sessions policies
DROP POLICY IF EXISTS test_sessions_select_own ON public.test_sessions;
create policy test_sessions_select_own
on public.test_sessions
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS test_sessions_insert_own ON public.test_sessions;
create policy test_sessions_insert_own
on public.test_sessions
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS test_sessions_update_own ON public.test_sessions;
create policy test_sessions_update_own
on public.test_sessions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS test_sessions_delete_own ON public.test_sessions;
create policy test_sessions_delete_own
on public.test_sessions
for delete
to authenticated
using (auth.uid() = user_id);

-- test_session_questions policies (owner via session)
DROP POLICY IF EXISTS test_session_questions_select_owner ON public.test_session_questions;
create policy test_session_questions_select_owner
on public.test_session_questions
for select
to authenticated
using (
	exists (
		select 1 from public.test_sessions s
		where s.id = test_session_questions.session_id
			and s.user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS test_session_questions_insert_owner ON public.test_session_questions;
create policy test_session_questions_insert_owner
on public.test_session_questions
for insert
to authenticated
with check (
	exists (
		select 1 from public.test_sessions s
		where s.id = test_session_questions.session_id
			and s.user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS test_session_questions_update_owner ON public.test_session_questions;
create policy test_session_questions_update_owner
on public.test_session_questions
for update
to authenticated
using (
	exists (
		select 1 from public.test_sessions s
		where s.id = test_session_questions.session_id
			and s.user_id = auth.uid()
	)
)
with check (
	exists (
		select 1 from public.test_sessions s
		where s.id = test_session_questions.session_id
			and s.user_id = auth.uid()
	)
);

DROP POLICY IF EXISTS test_session_questions_delete_owner ON public.test_session_questions;
create policy test_session_questions_delete_owner
on public.test_session_questions
for delete
to authenticated
using (
	exists (
		select 1 from public.test_sessions s
		where s.id = test_session_questions.session_id
			and s.user_id = auth.uid()
	)
);

-- seed topics
insert into public.topics (slug, title, subtitle, "order", image_key, is_active)
values
	('alertness', 'Alertness', 'Improve your awareness on the road', 1, 'books', true),
	('attitude', 'Attitude', 'Safe and responsible driving behaviour', 2, 'book', true),
	('video-case-study', 'Video Case Study', 'Practice real-life driving scenarios', 3, 'video', true),
	('safety-and-your-vehicle', 'Safety and Your Vehicle', 'Understand how to keep your vehicle safe', 4, 'books', true),
	('road-and-traffic-signs', 'Road and Traffic Signs', 'Master the meaning of road signs', 5, 'books', true),
	('rules-of-the-road', 'Rules of The Road', 'Understand right of way and road rules', 6, 'books', true)
on conflict (slug) do update
set
	title = excluded.title,
	subtitle = excluded.subtitle,
	"order" = excluded."order",
	image_key = excluded.image_key,
	is_active = excluded.is_active;

-- seed questions (minimal demo set)
insert into public.questions (topic_id, type, prompt, explanation, difficulty, is_active)
select t.id, 'single_choice', 'When driving in fog, which lights should you use?', 'Use dipped headlights and fog lights when visibility is seriously reduced.', 1, true
from public.topics t
where t.slug = 'alertness'
on conflict (topic_id, prompt) do update
set explanation = excluded.explanation,
	difficulty = excluded.difficulty,
	is_active = excluded.is_active;

insert into public.questions (topic_id, type, prompt, explanation, difficulty, is_active)
select t.id, 'single_choice', 'What is the safest following distance in normal conditions?', 'Keep at least a two-second gap and increase in poor conditions.', 1, true
from public.topics t
where t.slug = 'alertness'
on conflict (topic_id, prompt) do update
set explanation = excluded.explanation,
	difficulty = excluded.difficulty,
	is_active = excluded.is_active;

insert into public.questions (topic_id, type, prompt, explanation, difficulty, is_active)
select t.id, 'single_choice', 'How should you react to aggressive drivers?', 'Stay calm, avoid eye contact, and keep a safe distance.', 1, true
from public.topics t
where t.slug = 'attitude'
on conflict (topic_id, prompt) do update
set explanation = excluded.explanation,
	difficulty = excluded.difficulty,
	is_active = excluded.is_active;

insert into public.questions (topic_id, type, prompt, explanation, difficulty, is_active)
select t.id, 'single_choice', 'What does a triangular red-bordered sign usually mean?', 'Warning signs are often triangular with a red border.', 1, true
from public.topics t
where t.slug = 'road-and-traffic-signs'
on conflict (topic_id, prompt) do update
set explanation = excluded.explanation,
	difficulty = excluded.difficulty,
	is_active = excluded.is_active;

-- seed options helper inserts
insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'A', 'High beam only', false, 1
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'When driving in fog, which lights should you use?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'B', 'No lights', false, 2
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'When driving in fog, which lights should you use?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'C', 'Dipped headlights and fog lights', true, 3
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'When driving in fog, which lights should you use?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'D', 'Hazard lights all the time', false, 4
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'When driving in fog, which lights should you use?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'A', 'One-second gap', false, 1
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'What is the safest following distance in normal conditions?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'B', 'Two-second gap', true, 2
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'What is the safest following distance in normal conditions?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'C', 'Half-car length', false, 3
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'What is the safest following distance in normal conditions?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'D', 'Any distance is fine', false, 4
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'alertness' and q.prompt = 'What is the safest following distance in normal conditions?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'A', 'Respond aggressively', false, 1
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'attitude' and q.prompt = 'How should you react to aggressive drivers?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'B', 'Stay calm and keep distance', true, 2
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'attitude' and q.prompt = 'How should you react to aggressive drivers?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'C', 'Block their way', false, 3
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'attitude' and q.prompt = 'How should you react to aggressive drivers?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'D', 'Race them', false, 4
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'attitude' and q.prompt = 'How should you react to aggressive drivers?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'A', 'Mandatory instruction', false, 1
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'road-and-traffic-signs' and q.prompt = 'What does a triangular red-bordered sign usually mean?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'B', 'Warning', true, 2
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'road-and-traffic-signs' and q.prompt = 'What does a triangular red-bordered sign usually mean?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'C', 'Direction only', false, 3
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'road-and-traffic-signs' and q.prompt = 'What does a triangular red-bordered sign usually mean?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";

insert into public.question_options (question_id, label, text, is_correct, "order")
select q.id, 'D', 'No parking only', false, 4
from public.questions q
join public.topics t on t.id = q.topic_id
where t.slug = 'road-and-traffic-signs' and q.prompt = 'What does a triangular red-bordered sign usually mean?'
on conflict (question_id, label) do update
set text = excluded.text, is_correct = excluded.is_correct, "order" = excluded."order";
