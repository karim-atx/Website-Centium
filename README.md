# Sohati — Prototype (V1 & V2)

A high-fidelity, clickable prototype of **Sohati**, an all-in-one health & wellness app for
the Lebanese market. Built with React + TypeScript + Vite + Tailwind CSS. All data is mock
data held in local state (persisted to `localStorage`) — there is no backend, no real AI, and
no payment processing, by design.

## Versions

This repo is a git repository with two preserved versions:

| Version | Branch | Location | What it is |
|---|---|---|---|
| **V1** | `main` (tag `v1`) | `sohati-v1/` (a git worktree) | The original prototype, exactly as first built. Untouched. |
| **V2** | `sohati-v2` (current) | `sohati/` (this folder) | QA revision on top of V1 — see "What's new in V2" below. |

V1 is fully recoverable at any time: `git checkout main` (or `git checkout v1`) in this folder,
or just open the separate `sohati-v1/` worktree directory, which runs independently.

## Running it

Node.js wasn't installed on the machine this was built on, so a portable copy was downloaded
into `../.tools/node-v22.14.0-darwin-arm64` (a sibling of this folder). If that's still there:

```bash
export PATH="$(cd .. && pwd)/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev
```

Open the printed URL (typically http://localhost:5173). To also run V1 side-by-side:

```bash
cd ../sohati-v1
export PATH="$(cd ../.. && pwd)/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev -- --port 5180
```

If you have your own Node.js 20.19+/22+ installed, ignore the portable copy and just run
`npm install && npm run dev` in either folder.

To reset a version's demo data, open its browser console and run `localStorage.clear()`, then
refresh. V1 and V2 use different storage key prefixes so they never collide even on the same
port history.

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
