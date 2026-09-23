-- ---------------------------------------------------------------------------
-- Custom food logo colour and advanced nutrients (master handover, Create
-- Custom Food frame)
--
-- The handover's Create Custom Food screen lets the user step the selected
-- logo icon through six colours ("Tap the selected icon again to change its
-- colour.") and enter any nutrient beyond the four macros ("Per serving.
-- Leave anything you do not have blank."). custom_foods had nowhere to keep
-- either. Both are nullable additions; existing rows and existing writes are
-- untouched.
--
-- REVIEW, THEN APPLY BY HAND. Run it in the Supabase SQL editor once
-- reviewed. Until it is applied the app still saves custom foods, just
-- without these two extras.
-- ---------------------------------------------------------------------------

-- Index into the six logo tones the app ships (0-5, in the handover's
-- order: #A299DE, #A2C8C2, #E8C877, #E0A9C6, #5F5093, #4F7F78). Null means
-- the default, uncoloured tile.
alter table public.custom_foods
  add column if not exists logo_tone smallint null
    check (logo_tone between 0 and 5);

-- Per-SERVING nutrient amounts keyed by the canonical keys in
-- src/data/nutrientSchema.ts, on the same basis as calories / protein_g etc.
-- A key absent from the map means "no data", never zero, exactly like
-- food_nutrients.nutrients. Logging snapshots these (multiplied by quantity)
-- into food_log_entries.nutrients the same way catalog foods do.
alter table public.custom_foods
  add column if not exists nutrients jsonb null
    check (nutrients is null or jsonb_typeof(nutrients) = 'object');

comment on column public.custom_foods.logo_tone is
  'Logo colour chosen on Create Custom Food: index 0-5 into the app''s six logo tones. Null = default tile.';
comment on column public.custom_foods.nutrients is
  'Per-serving amounts for nutrients beyond the four macros, keyed by nutrientSchema keys. Missing key = no data, never zero.';

-- No policy changes: custom_foods' existing owner-only policies already cover
-- reading and writing these columns.
