# Food Logging — Session Summary

Real Supabase food catalog and diary. Stage (a) catalog seeding is committed
and pushed; stage (b) service layer and type restructure are complete but
uncommitted.

---

## 1. Open questions flagged during discovery

Raised before implementation. All now decided.

| # | Question | Resolution |
|---|---|---|
| a | `public.foods` was **empty** in staging (0 rows, not "a handful of test rows") — search would return nothing forever | Seeded 92 rows via migration: 66 USDA + 26 Lebanese |
| b | No barcode input existed anywhere; the "scan" view was a fake viewport with a hardcoded 1.6s result | Add an input below the existing viewport, nothing removed. **Not yet built** — stage (c)/(d) |
| c | Diary fetch scope — streaks walk every dated entry, copy-yesterday needs the previous day | Rolling 90-day window. Service supports it; AppContext doesn't call it yet |
| d | The existing local diary (9 seeded entries + local logs) | Drop it, stop seeding |
| e | Mock stored per-serving macros and multiplied at read; schema stores totals and forbids multiplying | Snapshot totals at write. Decided myself, stated as an assumption |
| f | Editing an entry with no stored per-serving base | `new = old × (new_multiplier / old_multiplier)`. `quantity > 0` is a check constraint, so the divisor is never zero |
| g | `food_log_entries` has no `category` / `is_lebanese` / `serving_label` — these drive the icon, star and serving text | **Asked, you deferred to me.** Join at read time for display only. Flagged that `serving_label` genuinely belongs on the row — a changed catalog label would silently alter an old entry's meaning |
| h | `unitScale` assumes every serving is ~240 g — measurably wrong against the real catalog | **Asked, you deferred to me.** Parse grams from `serving_label` with an ordered rule set, falling back to `unitScale` |

Also flagged, not questions:

- AI Voice and AI Scan both do `mockFoods.find(...)!` and dereference — they break if `mockFoods` is deleted. Still mock-backed, still working.
- "Grilled Chicken Breast" (mock, 150 g, 250 kcal) is effectively a 5th overlap with USDA chicken breast. Validates well (167 vs 165 per 100 g). You approved dropping 4; this one kept.
- `is_verified` did not exist as a column — flagged rather than invented.
- 66 + 26 = **92**, not the 90 in the request.

---

## 2. Old-shape localStorage entries

**There is no migration helper.** No function reads an old entry and converts
it. The opposite approach was taken deliberately.

`src/context/AppContext.tsx` (~line 771):

```ts
const [foodLog, setFoodLog] = usePersistentState<FoodLogEntry[]>("foodLog_v2", []);

// Drop the superseded key rather than leaving it to accumulate in every
// existing user's browser forever.
useEffect(() => {
  try {
    localStorage.removeItem(`${STORAGE_KEY}:foodLog`);
  } catch {
    // A browser blocking site data is not a reason to fail startup.
  }
}, []);
```

**What happens to an old entry:** nothing ever reads one. The key changed from
`foodLog` to `foodLog_v2`, so the app reads a key that has never existed and
gets an empty array. The old key is deleted on mount. The `try/catch` is there
because `localStorage` throws outright in private windows or with site data
blocked, and that must not break startup.

**Why not convert:** an old entry has no `display` block and holds per-serving
macros, so converting means re-multiplying values whose source food may no
longer exist — four mock foods were deleted this session. It's local-only
prototype data, and per (d) it's being dropped anyway.

**How it was found:** not by typechecking, which passed. The browser threw
`TypeError: Cannot read properties of undefined (reading 'category')`.
`localStorage` is untyped by construction; the compiler cannot see into it.

---

## 3. The 5 consumer files

**`src/pages/food/Food.tsx`** — Four per-meal reducers stopped multiplying and
became plain sums. Eight read sites moved off the removed nested food object:
`e.food.name` → `e.name`, `e.food.calories` → `e.calories`, and icon/star/serving
→ `e.display.*`.

**`src/components/food/EditFoodEntrySheet.tsx`** — Three display reads
repointed to `entry.display.*` and `entry.name`. The rescale-on-save now
happens in AppContext's `updateFoodEntry`, which this sheet calls.

**`src/components/food/AddFoodSheet.tsx`** — Preview switched to
`servingMultiplier` so the number shown matches the number logged.
`addFoodEntry` builds the flattened snapshot. `recentFoods` resolves each
entry's `foodId` back to a catalog food; unresolvable entries drop out. The
`allFoods` memo moved above `recentFoods` to fix a use-before-init error.

**`src/components/food/AIVoiceLogger.tsx`** — Builds the snapshot instead of
passing a `Food`, hoists `quantity` to a variable, sets `unit: "serving"`
explicitly now that `unit` is required.

**`src/context/AppContext.tsx`** — `seedFoodLog` deleted (~25 lines) along with
the now-unused `mockFoods`/`Food`/`YESTERDAY` imports; AppContext no longer
depends on mock food data at all. `foodLog` starts empty under the versioned
key. `updateFoodEntry` rescales; `logCustomMeal` snapshots.

Two supporting files also changed: `services/nutrition/index.ts` (`sumNutrition`
became a plain sum; added `servingMultiplier`, `snapshotFromFood`,
`rescaleEntry`, `gramsInServingLabel`) and `utils/dietaryRestrictions.ts`
(`isFoodRestricted` now takes `{ name: string }` — it only ever read `.name`).

---

## 4. Multiplier test cases

Re-run against current code after the fraction fix. **11/11 pass.**

| # | serving_label | qty | unit | expected | actual | result |
|---|---|---|---|---|---|---|
| 1 | `100 g` | 100 | g | 1.0000 | 1.0000 | PASS |
| 2 | `100 g` | 150 | g | 1.5000 | 1.5000 | PASS |
| 3 | `1 tbsp (13.5 g)` | 1 | tbsp | 1.0000 | 1.0000 | PASS |
| 4 | `1 tbsp (13.5 g)` | 2 | tbsp | 2.0000 | 2.0000 | PASS |
| 5 | `1 cup (186 g)` | 1 | cup | 1.0000 | 1.0000 | PASS |
| 6 | `1 medium (118 g)` | 1 | serving | 1.0000 | 1.0000 | PASS |
| 7 | `1 medium (118 g)` | 59 | g | 0.5000 | 0.5000 | PASS |
| 8 | `1 large (50 g)` | 2 | serving | 2.0000 | 2.0000 | PASS |
| 9 | `1 piece` | 1 | serving | 1.0000 | 1.0000 | PASS |
| 10 | `1 piece` | 3 | tbsp | 0.1875 | 0.1875 | PASS |
| 11 | `0.5 cup (126 g)` | 1 | cup | 2.0000 | 2.0000 | PASS |

Coverage: 1 chicken breast, the motivating case (old code: 0.42) · 2 weight
above one serving · 3 olive oil, label unit matches (old code: 0.0625) · 4 same,
scaled · 5 cooked rice, where a naive 240 g/cup rule gives 1.29 · 6 serving
identity · 7 half a banana by weight · 8 two eggs · 9 no gram weight, serving
path · 10 no gram weight, `unitScale` fallback · 11 label says 0.5 cup, so one
cup is two servings.

Four more added after live browser testing found `1/2 cup` unparsed (read
210 kcal where 420 was correct). All pass:

| # | serving_label | qty | unit | expected | actual | result |
|---|---|---|---|---|---|---|
| 12 | `1/2 cup` | 1 | cup | 2.0000 | 2.0000 | PASS |
| 13 | `1/2 cup` | 1 | serving | 1.0000 | 1.0000 | PASS |
| 14 | `1/2 cup` | 0.5 | cup | 1.0000 | 1.0000 | PASS |
| 15 | `0.5 cup (126 g)` | 1 | cup | 2.0000 | 2.0000 | PASS |

End-to-end through `snapshotFromFood`:

```
100 g chicken breast -> 165 kcal   (correct; old code gave 69)
1 tbsp olive oil     -> 119 kcal   (correct; old code gave 7)
rescale 100g -> 200g -> 330 kcal   (expected 330)
Hummus 1 serving     -> 210 kcal
Hummus 1 cup         -> 420 kcal
```

The last two confirmed live in the browser by reading the DOM, not a
screenshot: `serving` gave 210 / 8g / 20g / 12g; `cup` gave 420 / 16g / 40g / 24g.

---

## 5. Current state

### Database repo — committed and pushed

`karim-atx/Database-Atraxia`, branch `develop`. Clean tree, in sync.

Commit `ab20aa6` — *Replace validation-batch seed.sql with real 92-row foods
migration -- corrects README claims about catalog seeding*

- `supabase/migrations/20260908121815_seed_food_catalog.sql` (new)
- `supabase/seed.sql` (8-row batch removed)
- `README.md` (5 edits, incl. new follow-up item 24)

### AI Web repo — nothing committed

`karim-atx/Website-Centium`, branch `main`, level with `origin/main`. All of
stage (b) is in the working tree.

Modified (10):

```
lib/supabase/database.types.ts
src/components/food/AIVoiceLogger.tsx
src/components/food/AddFoodSheet.tsx
src/components/food/EditFoodEntrySheet.tsx
src/context/AppContext.tsx
src/data/mockFoods.ts
src/pages/food/Food.tsx
src/services/nutrition/index.ts
src/types/index.ts
src/utils/dietaryRestrictions.ts
```

Untracked (1):

```
src/services/food/index.ts
```

401 insertions, 95 deletions across tracked files, plus the new service.

> This tree also holds two earlier uncommitted pieces: the `database.types.ts`
> regeneration, and the `mockFoods.ts` 4-entry deletion with its AppContext
> seed repointing. They touch the same files as stage (b), so committing means
> either one commit or a careful split.

### Verification

`tsc -b --force` exits 0 · oxlint clean on new and changed files · diary and
Add Food sheet render correctly with no live console errors.

### Known follow-ups

- `serving_label` is joined, not snapshotted (see 1g)
- `AddFoodSheet` still searches `mockFoods`, not `searchFoods` — the service is
  written and tested but not wired to any UI. That's stage (c).
- The seed migration is pushed; I have no direct confirmation it's applied
  beyond `is_verified` appearing in the regenerated types, which implies it was
  applied wherever those were generated.
