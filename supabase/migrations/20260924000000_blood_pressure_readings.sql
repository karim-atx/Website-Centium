-- ---------------------------------------------------------------------------
-- Blood pressure readings (master handover Part 4, R2)
--
-- Add Metric has had a blood-pressure entry with no backing store. This gives
-- it one: a manually logged, insert-only time series, the same model as
-- public.health_metrics (a reading means "this was the reading at
-- recorded_at"; the day's value is its latest reading). Its own table rather
-- than a health_metrics row because a reading is a PAIR of values that must
-- be stored and validated together.
--
-- REVIEW, THEN APPLY BY HAND. This migration is not applied by the app or by
-- the handover work; run it in the Supabase SQL editor once reviewed. Until
-- it is applied the app says blood pressure can't be saved yet, rather than
-- failing silently.
-- ---------------------------------------------------------------------------

create table if not exists public.blood_pressure_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- mmHg. Bounds are wide physiological plausibility, not clinical ranges:
  -- they exist to turn a typo into an error, never to judge a real reading.
  systolic smallint not null check (systolic between 50 and 300),
  diastolic smallint not null check (diastolic between 20 and 200),
  -- When the reading HAPPENED (client-supplied; backdated entries use noon
  -- local on their day, like health_metrics).
  recorded_at timestamptz not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint blood_pressure_readings_order_check check (systolic > diastolic)
);

comment on table public.blood_pressure_readings is
  'Manually logged blood pressure, insert-only. A day''s value is its latest reading by (recorded_at, created_at). Mirrors health_metrics.';

create index if not exists blood_pressure_readings_user_recorded_idx
  on public.blood_pressure_readings (user_id, recorded_at desc);

alter table public.blood_pressure_readings enable row level security;

-- Owner only: read and add their own readings. No UPDATE policy — the series
-- is append-only, as health_metrics is. Owners may delete their own rows.
create policy "Blood pressure readings are readable by their owner"
  on public.blood_pressure_readings for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Blood pressure readings are insertable by their owner"
  on public.blood_pressure_readings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Blood pressure readings are deletable by their owner"
  on public.blood_pressure_readings for delete
  to authenticated
  using (auth.uid() = user_id);
