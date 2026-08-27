# Centium

A public marketing site and a customer portal prototype for **Centium**, a
health & wellness platform: one place for nutrition tracking, workout
logging, health tracking, AI-powered guidance, community, and a
marketplace connecting people with professionals and businesses.

Built with React + TypeScript + Vite + Tailwind CSS. The portal's data is
mock data held in local state (persisted to `localStorage`) — there is no
backend, no real AI, and no payment processing, by design. See
[SECURITY.md](SECURITY.md) for what that means for this being a public repo.

## Project structure

```
src/
  marketing/        public site — home, product, pricing, business, about,
                     contact, legal (privacy/terms), and the shared nav/
                     footer/illustrations it uses
  components/        reusable portal UI (navigation, dashboard, food,
                     workout, health, mind, profile, ui/*)
  pages/             one folder per portal route
  data/              mock food, workout, health metric, professional and
                     gym data
  services/          ai/ (mock voice + biomarker-image parsers), nutrition/
                     (TDEE & macros), workout/ (1RM, volume, RPE table),
                     geo/ (mock distance ranking)
  context/           AppContext — user profile, theme, food/workout logs,
                     routines, widgets, nutrition goals, journal,
                     biomarkers, water, habits, streaks
  types/             shared TypeScript types for the whole data model
```

The marketing site lives at `/` and the portal lives at `/app` — both are
part of the same single-page app (one `AppProvider` wraps both, so theme
and other shared state stay in sync across the two).

## Running it

```bash
npm install
npm run dev
```

Open the printed URL (typically http://localhost:5173). To reset the
portal's demo data, open its browser console and run `localStorage.clear()`,
then refresh.

## Building

```bash
npm run build
```

Type-checks with `tsc -b`, then builds a static bundle to `dist/` via Vite.
The build is configured with `base: '/centium/'` (see `vite.config.ts`) —
the site is meant to be reachable at `atraxia.org/centium/`, not at a
domain root. The dev server stays at `/` so local URLs don't need that
prefix.

## Deployment

This repo deploys to **GitHub Pages** via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which
builds and publishes `dist/` on every push to `main`. In the repo's GitHub
settings, **Settings → Pages → Source** needs to be set to **GitHub
Actions** for this to take effect.

That gives the site a GitHub Pages URL
(`https://karim-atx.github.io/Website-Centium/`). The build emits relative
asset paths (see `vite.config.ts`) and picks the right `<base>` at runtime
(see the inline script in `index.html`), so it renders correctly both raw
at that GitHub Pages URL and proxied at `atraxia.org/centium` below —
whichever prefix it was actually loaded under.

To make it reachable at **`atraxia.org/centium`**, `atraxia.org` is behind
Cloudflare, so a Cloudflare Worker reverse-proxies that subpath to the
GitHub Pages origin — see
[`deploy/cloudflare-worker.js`](deploy/cloudflare-worker.js) for the script
and exact setup steps. That same Worker also reverse-proxies `atraxia.org`'s
root to a small static "hub of apps" page — [`public/hub.html`](public/hub.html),
built and deployed by this same pipeline (fully self-contained, so it ships
as-is via Vite's `public/` dir, reachable at `.../hub.html` in the built
output) — listing Centium (linking to `/centium`) alongside a "coming soon"
placeholder for future apps. This repo has no Cloudflare credentials
configured, so someone with access to the `atraxia.org` Cloudflare account
needs to set that part up manually; no DNS record changes are needed for
it (Workers routes run in front of whatever already serves the domain).

There's no `CNAME` file in this repo — that's intentional. A `CNAME` tells
GitHub Pages to expect a custom domain pointed directly at it, which isn't
this setup (GitHub Pages stays reachable only at its own `github.io` URL;
the Cloudflare Worker is what stitches the subpath together).

## Environment variables

None are required yet — the app has no real backend. `.env.example`
documents the pattern for when real auth/backend integration is added (see
[SECURITY.md](SECURITY.md) for why only publishable/anon keys ever belong
in a `VITE_`-prefixed variable in a statically-deployed app like this one).

## Version history

This repo carries forward a prototype originally built under the working
name **Sohati**, through four iterative versions and several rounds of QA
feedback, before the product rebranded to Centium. That existing app —
health tracking, nutrition/workout logging, professional & business
dashboards, marketplace, onboarding — is what now lives under `/app`
(rebranded to the Centium palette/name; Lebanon-specific placeholder
content genericized). The version notes below predate the marketing site
and the Centium rebrand.

<details>
<summary>V1–V4 change notes (portal, pre-Centium-rebrand)</summary>

### V2

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

### V3

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
  themes (Centium/Ocean/Sunset/Berry) under Appearance; a two-tap-confirm Sign Out on Profile.
- **Explore/Marketplace**: gyms ranked by rating with live distance via geolocation (haversine).
- **Professional & Business UI**: `/professionals` and `/marketplace` now branch by account
  type into dedicated dashboards instead of a banner. Professionals get a client roster
  (add via generated code, view a read-only per-client detail sheet, remove), with
  dietitian-specific activity-level/type labeling vs. trainer-specific program assignment, plus
  food-template assignment — all scoped to what the client has toggled shareable (Food Diary,
  Workout Activity, Weight, Progress, Health Metrics). Businesses get a listing-management
  dashboard (active toggle, perk text, members-reached stat) and their own sign out.
- **Fixed**: a timezone bug where date-arithmetic mixed local-time parsing with UTC
  serialization, breaking day navigation in any UTC+ timezone; and a `localStorage`
  schema-migration gap where a field added to an already-persisted object stayed `undefined`
  for existing sessions — persisted object state now shallow-merges under current defaults on
  load.

### V4 and QA App 4.0–8.0

Icon system overhaul, onboarding physiotherapist step, Home widget fixes, Food diary rework,
Workout page overhaul (subfolders, custom exercise flow, 1RM tracking, History/Metrics rework),
Health page rework (auto-synced metrics, sleep/steps/weight/calories detail views),
Profile/Settings/Journal polish, and several rounds of QA-driven refinement.

</details>

## Security

This repo is public. Read [SECURITY.md](SECURITY.md) before adding
anything that touches real data, credentials, or a backend.
