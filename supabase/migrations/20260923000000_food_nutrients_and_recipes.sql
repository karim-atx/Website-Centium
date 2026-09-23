-- Mobile handoff items 2, 9, 10 — per-nutrient food data + Recipes.
--
-- HOW TO APPLY THIS FILE
-- This repository is a 100% static frontend (Vite -> GitHub Pages, proxied
-- to atraxia.org by a Cloudflare Worker — see README.md "Deployment"). There
-- is no backend/server code here and the app only ever holds an anon/
-- publishable Supabase key (see .env.example's own header comment). Nothing
-- in this codebase can execute DDL against the live database. Apply this
-- file by pasting it into the Supabase dashboard's SQL editor (the same
-- mechanism the README's "Known follow-ups" notes are already written
-- against) using an account with schema-modification rights, or via
-- `supabase db push` from a machine that holds the project's service-role
-- credentials. Review every statement first — this is a real schema change
-- on a live, in-use database.
--
-- WHAT THIS DOES
-- 1. `food_nutrients` — one row per CATALOG food (`foods.id`), holding a
--    jsonb map of per-nutrient amounts keyed by the canonical keys in
--    src/data/nutrientSchema.ts, on the SAME basis as `foods.calories` (i.e.
--    per that food's own `serving_label`, not per 100g — the import script
--    in scripts/import-fdc-nutrients.ts does that conversion before writing
--    a row). Populated by that import script, run manually by whoever holds
--    the service-role key and a USDA FoodData Central API key — not by
--    this app, and not automatically by this migration.
-- 2. `food_log_entries.nutrients` — a nullable per-entry snapshot, mirroring
--    exactly how `calories`/`protein_g`/`carbs_g`/`fat_g` already work on
--    this table: populated once at log time (src/services/food/index.ts's
--    logFoodEntry, the single canonical write path) by multiplying that
--    food's food_nutrients row by the same servingMultiplier() used for the
--    macros, then left untouched even if the food's nutrient data is later
--    re-imported. This preserves this table's existing doctrine (a resolved
--    snapshot, never re-derived from the catalog at read time) instead of
--    quietly breaking it for every OTHER column on the same row.
-- 3. `recipes` / `recipe_items` — new, mirroring `custom_meals` /
--    `custom_meal_items` exactly per the mobile handoff's own instruction
--    ("Mirror custom meals"), with two deltas the handoff calls out by name:
--    no `meal_type` column (meal is chosen at log time, not stored — see
--    the handoff's "What does not carry over cleanly" point 1), and a
--    free-text `note` column on `recipe_items` alongside the existing
--    enum+quantity shape (the user's answer to the handoff's Q3).

-- ---------------------------------------------------------------------------
-- 1. food_nutrients
-- ---------------------------------------------------------------------------

create table if not exists public.food_nutrients (
  food_id uuid primary key references public.foods(id) on delete cascade,
  fdc_id integer null,
  fdc_description text null,
  -- 'exact' | 'fuzzy' | 'manual' — how the import script matched this food
  -- to an FDC entry, so a low-confidence match can be surfaced/re-reviewed
  -- later instead of looking identical to a verified one.
  match_confidence text not null default 'exact',
  -- Keyed by the canonical `key` values in src/data/nutrientSchema.ts.
  -- Amount is on the SAME basis as `foods.calories` for this food (per its
  -- own serving_label). A key absent from the map means "no data for this
  -- nutrient" and must render as a dash, never a zero — never invent one.
  nutrients jsonb not null default '{}'::jsonb,
  imported_at timestamptz not null default now()
);

comment on table public.food_nutrients is
  'Per-nutrient data for catalog foods, sourced from USDA FoodData Central by scripts/import-fdc-nutrients.ts. A missing food_id or a missing key inside `nutrients` both mean "no data", not zero.';

alter table public.food_nutrients enable row level security;

-- Readable by anyone signed in, matching `foods` itself (the catalog is not
-- per-user data). Only the import script (service-role key, bypasses RLS)
-- writes to this table — no anon/authenticated insert/update/delete policy
-- is defined on purpose, so a compromised client key cannot corrupt it.
create policy "food_nutrients are readable by authenticated users"
  on public.food_nutrients for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. food_log_entries.nutrients — per-entry snapshot
-- ---------------------------------------------------------------------------

alter table public.food_log_entries
  add column if not exists nutrients jsonb null;

comment on column public.food_log_entries.nutrients is
  'Per-nutrient snapshot, multiplied by the logged quantity at write time exactly like calories/protein_g/carbs_g/fat_g on this same row. Null for custom/manual foods and for any catalog food with no food_nutrients row yet — never re-derived from the catalog at read time, matching this table''s existing snapshot doctrine.';

-- ---------------------------------------------------------------------------
-- 3. recipes / recipe_items
-- ---------------------------------------------------------------------------

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  servings integer not null check (servings >= 1),
  steps text null,
  -- Professional-authored recipes for one client only — mirrors
  -- custom_meals.scoped_to_client_id exactly (handoff Q6, answered yes).
  scoped_to_client_id uuid null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.recipes is
  'Recipe definitions. Mirrors custom_meals: items are live pointers (see recipe_items), not a resolved snapshot, so editing a referenced food changes every recipe''s per-serving nutrition. Deliberately has NO meal_type column — meal is chosen at log time on the detail screen, per the handoff.';

create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  food_id uuid null references public.foods(id) on delete cascade,
  custom_food_id uuid null references public.custom_foods(id) on delete cascade,
  quantity numeric not null,
  unit public.food_unit not null default 'serving',
  -- Handoff Q3 (answered): free-text alongside the enum+quantity shape, so
  -- "400g dry" / "3 large" can be shown as written without losing the
  -- structured quantity+unit custom_meal_items already relies on.
  note text null,
  position integer not null,
  constraint recipe_items_single_source_check check (num_nonnulls(food_id, custom_food_id) = 1)
);

comment on table public.recipe_items is
  'One ingredient row per recipe. Mirrors custom_meal_items: food_id/custom_food_id are exclusive pointers (ON DELETE CASCADE, matching "deleting a food removes the ingredient rather than leaving a hole"), replaced wholesale on edit rather than diffed, ordered by position.';

create index if not exists recipe_items_recipe_id_idx on public.recipe_items(recipe_id);

alter table public.recipes enable row level security;
alter table public.recipe_items enable row level security;

-- Owner: full CRUD. Matches custom_meals' policy shape exactly.
create policy "Recipes are manageable by their owner"
  on public.recipes for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Scoped client: read-only, for a professional-authored recipe assigned to
-- them. Matches custom_meals' second policy exactly (handoff Q6).
create policy "Recipes are readable by their scoped client"
  on public.recipes for select
  to authenticated
  using (auth.uid() = scoped_to_client_id);

-- recipe_items has no owner_id of its own — access is via the parent recipe,
-- same shape as custom_meal_items.
create policy "Recipe items are manageable by the recipe's owner"
  on public.recipe_items for all
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.owner_id = auth.uid()));

create policy "Recipe items are readable by the recipe's scoped client"
  on public.recipe_items for select
  to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.scoped_to_client_id = auth.uid()));
