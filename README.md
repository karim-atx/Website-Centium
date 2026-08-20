# Sohati — First Prototype

A high-fidelity, clickable prototype of **Sohati**, an all-in-one health & wellness app for
the Lebanese market. Built with React + TypeScript + Vite + Tailwind CSS. All data is mock
data held in local state (persisted to `localStorage` so your demo data survives a refresh) —
there is no backend, no real AI, and no payment processing, by design (see the original brief).

## Running it

This machine didn't have Node.js installed, so a portable copy was downloaded into
`../.tools/node-v22.14.0-darwin-arm64` (a sibling of this folder, not inside it). If that's
still there, run:

```bash
export PATH="$(cd .. && pwd)/.tools/node-v22.14.0-darwin-arm64/bin:$PATH"
npm run dev
```

Then open the URL it prints (typically http://localhost:5173).

If you have your own Node.js 20.19+ / 22+ installed already, you can ignore the portable copy
and just run `npm install && npm run dev` normally.

To reset the demo back to a fresh install (clears onboarding + logged food/workouts), open
the browser console on the app and run `localStorage.clear()`, then refresh.

## What's here

- **Onboarding** — 6-screen flow (welcome → about you → goal → activity → what to track → ready)
- **Home dashboard** — the "Today" screen: nutrition ring, steps, workout status, weight trend,
  sleep, water, streaks, quick actions
- **AI voice food logging** — tap the mic, see a simulated transcript → AI parse → confirm →
  add to diary (mocked, see `src/services/ai/parseFoodInput.ts` for the swap-in point for a
  real model later)
- **Food** — diary by meal, search/AI/scan/barcode add flow, Lebanese food database
- **Workout** — today's workout, previous sessions, program templates by category
- **Health** — weight/body fat/steps/sleep trends with sparklines, BMI, blood work panel
- **Mind** — habits, water tracker, streaks, journal, meditation (stub)
- **Professionals** — trainers/dietitians/physios/doctors, a connected "My Dietitian" dashboard
  with access-permission toggles, and a mocked in-app chat
- **Explore / Marketplace** — gyms, categories, streak-unlocked rewards (all "coming soon")
- **Profile & Sohati+** — account sections and a premium upsell screen

## Project structure

```
src/
  components/   reusable UI (navigation, dashboard, food, workout, health, mind, ui/*)
  pages/        one folder per top-level route
  data/         mock foods, workouts, health data, professionals, gyms
  services/     ai/parseFoodInput.ts (mock AI), nutrition/ (totals + targets)
  context/      AppContext — user profile, food/workout logs, water, habits
  types/        shared TypeScript types for the whole data model
```

Swapping in a real backend later means replacing what's in `data/` and `services/` — the
components and pages consume typed data, not the mock source directly.
