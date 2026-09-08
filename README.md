# Centium

A public marketing site and a customer portal prototype for **Centium**, a
health & wellness platform: one place for nutrition tracking, workout
logging, health tracking, AI-powered guidance, community, and a
marketplace connecting people with professionals and businesses.

Built with React + TypeScript + Vite + Tailwind CSS, on a real Supabase
backend that the app is **partway** through adopting — be precise about
which half you are looking at:

- **Real and remote.** Authentication (email/password with required email
  confirmation, plus Google OAuth) creates genuine Supabase sessions, and
  `profiles` is both written and read — the row is created the moment a
  session exists, filled in when onboarding completes, and read back on
  every account change, so `profiles.onboarded` (not `localStorage`) decides
  whether someone is sent through onboarding. Also real: client-code
  redemption and generation, referral redemption, the professional's client
  roster, disconnecting a client, and the `client_access_grants` consent
  system that gates what a professional may see.
- **Still local mock state.** The data itself. Nutrition and food logging,
  workouts and routines, health metrics and biomarkers, habits, streaks and
  journal, plus the marketplace, messaging, forum and the business
  dashboard, all read and write mock data held in React state and persisted
  to `localStorage`. So a client can genuinely grant a professional access
  to their food diary — and there is not yet a real food diary behind it.

There is also no real AI and no payment processing, by design. See
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
The build emits relative asset paths (`base: './'` in `vite.config.ts`) and
picks the right `<base>` at runtime instead of hardcoding one at build
time — see [Deployment](#deployment) below for why. The dev server stays
at `/` so local URLs don't need any prefix.

## Deployment

This repo deploys to **GitHub Pages** via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which
builds and publishes `dist/` on every push to `main`. In the repo's GitHub
settings, **Settings → Pages → Source** needs to be set to **GitHub
Actions** for this to take effect.

That gives the site a GitHub Pages URL
(`https://karim-atx.github.io/Website-Centium/`) — but the workflow
reorganizes `dist/` after building it: the Centium app itself (built from
`index.html`/`src/`) moves into a `/centium` subfolder, and
[`public/hub.html`](public/hub.html) — a small static "hub of apps" page,
fully self-contained so it ships as-is via Vite's `public/` dir — takes
over the true root. That mirrors the public URL structure one level down:
Centium's raw GitHub Pages URL is `.../Website-Centium/centium/`, and the
hub is `.../Website-Centium/`.

The Centium app's build emits relative asset paths (see `vite.config.ts`)
and picks the right `<base>` at runtime (see the inline script in
`index.html`), so it renders correctly both raw at that nested GitHub
Pages path and proxied at `atraxia.org/centium` below — whichever prefix
it was actually loaded under.

To make it reachable at **`atraxia.org`** (hub) and **`atraxia.org/centium`**
(Centium app), `atraxia.org` is behind Cloudflare, so a Cloudflare Worker
reverse-proxies both straight through to the matching path on the GitHub
Pages origin above — see
[`deploy/cloudflare-worker.js`](deploy/cloudflare-worker.js) for the script
and exact setup steps. This repo has no Cloudflare credentials configured,
so someone with access to the `atraxia.org` Cloudflare account needs to set
that part up manually; no DNS record changes are needed for it (Workers
routes run in front of whatever already serves the domain).

There's no `CNAME` file in this repo — that's intentional. A `CNAME` tells
GitHub Pages to expect a custom domain pointed directly at it, which isn't
this setup (GitHub Pages stays reachable only at its own `github.io` URL;
the Cloudflare Worker is what stitches the subpath together).

## Environment variables

**A `.env.local` is now required to run the app at all.** Copy
`.env.example` to `.env.local` and fill in all four Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL_STAGING=
NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING=
NEXT_PUBLIC_SUPABASE_URL_PROD=
NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD=
NEXT_PUBLIC_APP_ENV=staging        # "staging" (default) or "prod"
```

Values come from the Supabase dashboard: Project Settings → API → Project
URL + anon/public key. `NEXT_PUBLIC_APP_ENV` selects which pair is used.

This is not optional or lazily checked. `getSupabaseConfig()`
(`lib/supabase/config.ts`) **throws on load** if the URL or anon key for
the selected environment is missing, and `AppContext` imports the Supabase
client at startup — so a missing or misnamed variable white-screens the
entire app rather than degrading quietly. The thrown message names the
exact variable it wanted.

Both `VITE_`-prefixed and `NEXT_PUBLIC_`-prefixed variables are compiled
into the public bundle (see `envPrefix` in `vite.config.ts`), so only
publishable/anon keys ever belong in either — never a service-role or
secret key. See [SECURITY.md](SECURITY.md).

## Known follow-ups

Deliberate gaps carried by the current code. Each is a real correctness or
compliance issue rather than a style preference, and each is flagged in the
source at the point it matters.

### `date_of_birth` is real going forward, but old rows are still approximate

**Resolved for new data.** Onboarding's `AboutYouStep` now collects an actual
date via a native date picker, and it can be corrected later from the Profile
tab, which writes `profiles.date_of_birth` directly through
`updateDateOfBirth()`. `approximateDateOfBirth()` — which used to derive the
column as January 1st of the implied birth year — is **deleted**. `age` is no
longer stored as the source of truth: it is derived from the date on every
profile hydration (`ageFromDateOfBirth` in `src/utils/date.ts`), so it stays
correct as birthdays pass instead of freezing at whatever was typed at
sign-up. Both editors share one bound and one validation rule, so a minimum
age enforced in one is enforced in the other.

**The caveat, and it matters: nothing backfills historical rows.** Any
profile created before this change still holds the old approximation —
January 1st of the implied birth year, wrong by up to ~364 days. Every
account from today's testing is in that state; one of them stores
`1998-01-01`, which is the artifact, not a real birthday.

There is no marker distinguishing an approximated date from a collected one.
A `01-01` date is *suggestive* but proves nothing — people are born on
January 1st. So **anything precision-sensitive reading this column on an
older account must treat the value as possibly approximate**: age-gating,
clinical or medical calculations, cohort analytics, and birthday features
all included. Same caution as before, now scoped to old rows rather than all
of them.

Two ways to close it properly, neither done: prompt existing users to confirm
their date of birth (the Profile editor already exists, so this is a nudge
rather than new UI), or add a column recording whether the value was
collected or derived, so consumers can tell the difference instead of
guessing.

### `deleteAccount` does not delete the account

`deleteAccount` (`src/context/AppContext.tsx`) clears every
`centium-state:*` key from `localStorage` and resets the in-memory user.
That is all it does. It does **not** delete the `auth.users` entry, the
`profiles` row, or any other row owned by that user — all of it remains
intact server-side.

It is presented in Settings as "Delete account". Now that accounts are
real, a user tapping it is told their data is gone when it is not, which is
a data-erasure compliance problem (GDPR/CCPA), not merely a UX
inconsistency.

A real deletion path needs to run server-side — an RPC or edge function
performing the cascade — because `auth.users` cannot be deleted with an
anon key. This should be resolved before the app reaches anyone holding a
real account.

### Client codes carry no profile prefill, so "skip About You" is gone

The V7 prototype let a client redeeming a valid professional's code skip
the About You step entirely: the professional had pre-entered their name,
age, sex, height and weight when generating the code, and onboarding read
them straight off it.

That has no backend equivalent. The real `client_codes` table stores only
`code`, `professional_id`, `expires_at`, and the redemption bookkeeping —
no client-profile columns — and `preview_client_code` returns only the
professional's own name, avatar, subtype, expiry and redeemed flag. With
nothing to prefill from, keeping the skip would have silently defaulted
every coded client to "Friend", 28 years old, 170cm, 70kg.

So the skip was removed and **every client now fills in About You
themselves**. `stepsFor(accountType, skipAboutYou)` in
`src/pages/onboarding/Onboarding.tsx` keeps its `skipAboutYou` parameter,
currently hardcoded `false`, as a one-line hook for restoring the
behaviour later.

Restoring it is a **product design question, not a schema patch** — adding
prefill columns and wiring them up would be the easy part and the wrong
place to start. It needs decisions first: which fields a professional may
pre-fill on someone else's behalf, whether the client reviews and confirms
those values before they are committed, what happens when they disagree
with them, and how that interacts with the health data the profile feeds.
Design that before touching the table.

### The professional dashboard's client-health tiles are not wired

The roster is real — `active_professional_clients` joined to
`public_profile_summary`, with consent from `client_access_grants`. The
**client health and training figures are not**, and are deliberately hidden
rather than shown empty or left on mock data.

Affected: `workoutLoggedToday`, `lastWeightKg`, `weightTrend`,
`lastCaloriesKcal`, `healthSummary`, `medicalHistory`, `activityLevel` and
`activityType`. They are optional on `ProfessionalClient` and `undefined`
on every real row. Where a panel depends on them it renders
`HealthDataPending` ("coming soon") instead — the dashboard's "N of M
trained" hero, the client sheet's activity/nutrition summary, and the meal
planner's weight-trend card.

This was a deliberate call. Zeros would have been worse than blanks: "0 of
5 trained" reads as a measurement, not an absence, and a professional could
act on it. Leaving the old mock numbers beside a real roster would be worse
still — a professional would read demo figures as their own client's.

**Consent is no longer the blocker.** `client_access_grants` is real and
enforced: the client grants and revokes per category from either the
Professionals tab or the Profile tab, the professional reads those rows,
and RLS was verified against staging — a professional attempting to write
another party's grant affects zero rows (see the RLS failure-signature
note below for why that shows up as silence rather than an error).

**One thing gates fixing this now: the health tables are still mock.**
Weight, nutrition, workout and biomarker data all live in `localStorage`,
so a granted toggle has nothing real to unlock. Wiring one of those tables
end-to-end — food logs being the obvious first — is what turns the first
of these tiles on, and `has_client_access()` is already there to gate it.

Related: professional-side mutations (`updateProfessionalClientAccess`,
`updateProfessionalClient`, `assignProgramToClient`,
`assignFoodTemplateToClient`, and `clientHealthNotes`) still write to
in-memory state only. They update the UI and are lost on the next roster
refetch. The hire inbox (`pendingClientRequests`) is also still a local
simulation; accepting a request now only clears it, since a real
relationship can only come from a redeemed code.

### RLS rejects UPDATEs silently — `if (error)` is not a security check

Not a gap in the code, but a property of the schema that has already cost
debugging time twice, and that anyone writing or testing against these
tables needs to know. The two ways a write gets refused look completely
different:

| Refusal | What you get back |
|---|---|
| **Row-level policy** (updating a row you don't own) | **No error.** `error` is null, and `data` is an empty array — zero rows affected |
| **Column privilege** (writing a column your role isn't granted) | **`42501`** `permission denied for table ...` |

The silent case is standard Postgres, not a misconfiguration: rows that
fail a policy's `USING` clause are simply invisible to the statement, so
the UPDATE matches nothing and succeeds against zero rows. Only `INSERT`
raises on a policy violation, because a failing `WITH CHECK` has an actual
row to reject.

**Consequences, both of which have bitten:**

- **Testing.** A check written as `if (error) { /* blocked */ }` concludes
  an unauthorized UPDATE was *allowed* when RLS actually stopped it. Assert
  on the affected-row count instead — `.select()` the update and check the
  returned array is empty. This is how the professional-write-to-consent
  test has to be written.
- **Debugging.** The inverse also misleads. `client_access_grants` grants
  column-scoped `UPDATE (granted)` — deliberately, so a client can flip
  their own switch and nothing else — and a `.upsert()` there failed with
  `42501` because PostgREST's upsert sets *every* payload column on the
  conflict path. Postgres' own hint suggested `GRANT UPDATE ON ... TO
  authenticated`, which would have "fixed" it by letting clients rewrite
  `client_id`, `professional_id`, `category` and the trigger-managed audit
  timestamps. The right fix was update-then-insert in the app
  (`src/services/consent/index.ts`). **Treat a 42501 hint as a description
  of the check that failed, not as advice.**

### `CalendarTab` matches invitees by name, not id

`CalendarTab` resolves event invitees by comparing against `client.name`
(`invitees?.includes(c.name)`). With a real roster that is fragile: names
come from `profiles.first_name`, are not unique, and can change — after
which an event silently stops matching its invitee.

Left exactly as-is in the roster pass. Fixing it means migrating
`CalendarEvent.invitees` from names to client ids, which touches calendar
state already persisted in `localStorage` and so needs a migration path of
its own rather than being folded into a data-source swap.

### The hub's sized PNG icons still lack the rounded-square backdrop

`hub/favicon.svg` was updated to the white `rx=22` rounded-square treatment
matching Centium's, but the sized PNG fallback set —
`hub/icons/favicon-16/32/48/192.png`, `apple-touch-icon.png` and
`site.webmanifest` — still shows the bare mark with no backdrop. Browser
tabs are fine (they prefer the SVG); this affects iOS home-screen icons
and PWA installs. Fixing it needs real image-editing tooling to regenerate
the set, not a code change.

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
