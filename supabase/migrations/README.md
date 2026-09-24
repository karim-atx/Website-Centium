# This directory should be empty, and these two files are why it is not

**Schema lives in Database-Atraxia.** Not here. If you are about to add a
`.sql` file to this folder, add it to that repository instead.

## What went wrong

`20260924000000_blood_pressure_readings.sql` was written here, in the app
repo, and never applied anywhere. The service that depends on it
(`src/services/blood-pressure/`) shipped against a table that did not exist,
carrying a `TABLE_MISSING_MESSAGE` for the failure it knew was coming, and the
entry UI in `AddMetricSheet` has been unreachable ever since. Meanwhile the
table itself was created by hand against staging — with policies and no DML
grant, so those policies could not fire — and Database-Atraxia had to adopt it
in `20260924395000` to put it right.

Its timestamp also collided: `20260924000000` is `contact_submissions` over
there. Two repositories numbering migrations independently against one
database is a race nobody wins.

That file is now deleted. Two remain, and neither is safe to delete blindly:

| File | State |
| --- | --- |
| `20260923000000_food_nutrients_and_recipes.sql` | Same name in Database-Atraxia, **different contents**. Reconcile before deleting. |
| `20260925000000_custom_food_logo_and_nutrients.sql` | Exists **only here**. Adds `custom_foods.logo_tone` and `custom_foods.nutrients`, which are in no database. Move it to Database-Atraxia, do not delete it. |

## The link

`supabase/.temp/linked-project.json` pointed this working copy at the
`atraxia-staging` project — the same project Database-Atraxia is linked to —
which is what made `supabase db push` from this directory possible in the
first place. It has been removed. It is gitignored, so it can come back the
moment somebody runs `supabase link` here; do not.

`package.json`'s `gen:types` still names the staging project id. That one
stays: it only reads the schema into `lib/supabase/database.types.ts` and
cannot write.
