# Sohati — Prototype (V1, V2 & V3)

A high-fidelity, clickable prototype of **Sohati**, an all-in-one health & wellness app for
the Lebanese market. Built with React + TypeScript + Vite + Tailwind CSS. All data is mock
data held in local state (persisted to `localStorage`) — there is no backend, no real AI, and
no payment processing, by design.

## Versions

This repo is a git repository with three preserved versions:

| Version | Branch | Location | What it is |
|---|---|---|---|
| **V1** | `main` (tag `v1`) | `sohati-v1/` (a git worktree) | The original prototype, exactly as first built. Untouched. |
| **V2** | `sohati-v2` (tag `v2`) | `sohati-v2/` (a git worktree) | QA revision on top of V1 — see "What's new in V2" below. Untouched. |
| **V3** | `sohati-v3` (current) | `sohati/` (this folder) | QA App 2.0 revision on top of V2 — see "What's new in V3" below. |

V1 and V2 are both fully recoverable at any time: open their separate worktree directories
(`sohati-v1/`, `sohati-v2/`), which run independently on their own ports, or `git checkout main`
/ `git checkout sohati-v2` in this folder.

## Running it

Node.js wasn't installed on the machine this was built on, so a portable copy was downloaded
into `../.tools/node-v22.14.0-darwin-arm64` (a sibling of this folder). If that's still there:

```bash
export PATH="$(cd .. && pwd)/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev
```

Open the printed URL (typically http://localhost:5173). To also run V1/V2 side-by-side:

```bash
cd ../sohati-v1
export PATH="$(cd ../.. && pwd)/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev -- --port 5180

cd ../sohati-v2
export PATH="$(cd ../.. && pwd)/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev -- --port 5181
```

If you have your own Node.js 20.19+/22+ installed, ignore the portable copy and just run
`npm install && npm run dev` in either folder. The `.claude/launch.json` in the parent folder
also has all three pre-wired (`sohati` → 5173, `sohati-v1` → 5180, `sohati-v2` → 5181).

To reset a version's demo data, open its browser console and run `localStorage.clear()`, then
refresh. V1, V2, and V3 use different storage key prefixes (`sohati-prototype-state-v1`,
`sohati-v2-state`, `sohati-v3-state`) so they never collide even on the same port history.

## What's new in V2

Implemented against a QA pass over V1. Highlights:

- **Branding**: "Sohati+" → "Sohati" throughout.
- **Onboarding**: new account-type step — Customer (client/regular/athlete/general),
  Professional (trainer/dietitian/other), or Business.
- **Dark mode**: full CSS-variable-based light/dark theme, toggled in Settings, applies
  everywhere.
- **Home**: Apple-style widget board (add/remove/reorder/resize, small vs. large), a
  goal-based default layout, an animated water-fill widget, prev/next date navigation, Streaks
  moved to the top and made prominent, and a real microphone-permission request wired into AI
  voice logging.
- **Food**: a Goals & Macros tab (TDEE via Mifflin-St Jeor, editable macro-split sliders that
  always re-balance to 100%, weight-goal + weekly-rate, custom/existing plan toggle) and a Meal
  Prep tab.
- **Workout**: routine folders (create/rename/delete), routine creation with draggable
  exercises, per-exercise settings (min/max sets & reps, intensity %, rep max + update mode,
  rest, RPE, tempo), and a full session logger — editable sets/reps/weight, a running
  start-time/elapsed timer, live total volume, a Web-Audio metronome, and an RPE calculator.
  A volume-progression chart lives under History.
- **Health**: Steps across Daily/Weekly/Monthly/Yearly with averages; Weight/Body Fat/Steps are
  now tap-to-edit inline (no "+" required); mock Apple Health/Android Health integration
  toggles; camera-based biomarker capture (take/select a photo → mock AI extraction → pick
  which results to import → added to history), per-marker history, and a canvas-rendered
  shareable result card (download or Web Share).
- **Mind**: Habits and Water removed from the general overview; Habits is now its own tab
  (add/rename/remove); Streaks are editable/configurable (goal days, add/remove). Journal has
  folders (Personal/Training/Nutrition/General + custom), and entries auto-save their date.
- **Profile**: weight/height/age/goals are directly editable and flow into Health/Home.
- **B2B/B2C**: professional/business accounts see a tailored Home banner and relevant CTAs on
  Professionals/Explore — light architectural groundwork, not a full B2B backend.

## What's new in V3

Implemented against "QA - App 2.0", a second QA pass over V2. Highlights:

- **Onboarding**: account-type step trimmed to General User / Client of Professional (in that
  order); choosing "Client of Professional" requires a professional-generated User ID code
  before continuing (unique, collision-free codes via `generateClientCode`); switching account
  type later is explicitly called out as adjustable in Settings.
- **Home**: the black "Your Health Today" summary card removed; order is now
  Calendar → Streaks → Quick Actions → Your Health Today (widget board); the calendar is fixed
  at the top (non-reorderable) and its arrows jump exactly one day; tapping the date opens a
  full month-grid picker (`CalendarPickerSheet`) that also allows jumping to future days;
  Habits, Journal, and Meditation are now addable Home widgets.
- **Food**: copy-yesterday's-food via swipe-right gesture (with a fallback button), and a
  custom-food/custom-macro creation flow in the Add Food sheet.
- **Workout**: the "Today" tab removed; routine folders are collapsible; exercises are
  renamable inline; History shows a small notes header per expanded session; Create Routine
  gained inline search plus a full searchable/categorized exercise library sheet (with custom
  exercise add) replacing the old suggestion chips; per-set "..." menu for classification
  (warm-up/failure/drop set), notes, and RPE.
- **Health**: tapping any metric opens a detail sheet with a 7-day trend (sleep gets a
  REM/deep/light/awake breakdown + sleep score); all editable metrics show their edit affordance
  in the card's corner instead of a separate "+".
- **More/Settings**: Profile moved to the first position; Apple/Android Health integration
  moved out of Health and into Settings; a Help → Contact Us sheet (chat/phone/email); color
  themes (Sohati/Ocean/Sunset/Berry) under Appearance; a two-tap-confirm Sign Out on Profile.
- **Explore/Marketplace**: gyms ranked by rating with live distance via geolocation (haversine,
  Beirut-center fallback when permission is denied).
- **Professional & Business UI**: `/professionals` and `/marketplace` now branch by account
  type into dedicated dashboards instead of a banner. Professionals get a client roster
  (add via generated code, view a read-only per-client detail sheet, remove), with
  dietitian-specific activity-level/type labeling vs. trainer-specific program assignment, plus
  food-template assignment — all scoped to what the client has toggled shareable (Food Diary,
  Workout Activity, Weight, Progress, Health Metrics). Businesses get a listing-management
  dashboard (active toggle, perk text, members-reached stat) and their own sign out.
- **Fixed**: a timezone bug where date-arithmetic (`shiftDate`, the calendar picker's date
  formatting) mixed local-time parsing with UTC serialization, breaking day navigation and
  "copy yesterday" in any UTC+ timezone including Lebanon's; and a `localStorage`
  schema-migration gap where a field added to an already-persisted object (e.g. `metricValues`
  gaining `sleepHours`/`caloriesBurned`) stayed `undefined` for existing sessions — persisted
  object state now shallow-merges under current defaults on load.
- **Deferred**: "customized icons instead of emojis" (asked for in two places in the QA) was
  intentionally left unimplemented — swapping the app's emoji usage (Lebanese food emojis,
  streak/habit icons, etc.) for a custom icon set is a larger visual-identity decision better
  made deliberately than as a blanket pass; flagged for a follow-up scoping conversation instead.

## Project structure

```
src/
  components/   reusable UI (navigation, dashboard, food, workout, health, mind, profile, ui/*)
  pages/        one folder per top-level route
  data/         mock Lebanese foods, workouts, health metrics, blood panel, professionals, gyms
  services/     ai/ (mock voice + biomarker-image parsers), nutrition/ (TDEE & macros),
                workout/ (1RM, volume, RPE table)
  context/      AppContext — user profile, theme, food/workout logs, routines, widgets,
                nutrition goals, journal, biomarkers, water, habits, streaks
  types/        shared TypeScript types for the whole data model
```
