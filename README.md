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

### The professional's client tiles are wired; two things behind them are not

**The data is real now.** Nutrition, weight, workouts, medical history, blood
work and imaging all reach the professional from the client's own account,
each gated on its own consent category and each read in one batched query per
roster rather than one per client. `workoutLoggedToday` is gone, replaced by a
`workout` object carrying the session date so an absence can be stated as a
fact rather than a verdict. Client identity is real too (via
`related_profile_summary`, not `public_profile_summary`, which excludes
customers by design).

What made that possible was the client-side write path, which is what the
original tile investigation split out as its task 4 and which is now complete:
`workout_sessions`, `health_metrics`, `medications`, `surgeries`,
`comorbidities`, `blood_panels`, `blood_markers` and `imaging_records` are all
written by the app rather than held in `localStorage`.

**`HealthDataPending` still renders in three places, and that is now correct
rather than a placeholder.** The dashboard's training summary, the meal
planner's weight-trend card and the client sheet's activity summary each show
it only when the client genuinely shares nothing renderable — not because the
plumbing is missing. Its meaning inverted: it used to stand in for data the app
could not fetch, and now states an absence of consent, which is what the rule
below asks for.

**What genuinely remains:**

- **`healthSummary` is never assigned.** Body fat, sleep average and steps
  average are still optional on `ProfessionalClient` and `undefined` on every
  real row — `HealthMetricsTab`'s "Auto-synced" grid and the client sheet's
  equivalent are the surfaces waiting on it. Unlike the fields above, these
  are device-synced metrics the app has no write path for at all, so this is
  blocked on health-integration work rather than on a read.
- **The demographics are undefined too:** `activityLevel`, `activityType`,
  `age`, `sex`, `heightCm` and `weightKg` on `ProfessionalClient`. `fetchRoster`
  does not select them, and `profiles` holds them — so unlike `healthSummary`
  this one is reachable today, and it is a question of whether a professional
  should see them rather than whether they exist.
- **Professional-side mutations are still in-memory only.**
  `updateProfessionalClientAccess`, `updateProfessionalClient`,
  `assignProgramToClient`, `assignFoodTemplateToClient` and
  `updateClientHealthNote` all call `setState` and nothing else. They update
  the UI and are lost on the next roster refetch. `client_health_notes` exists
  as a table with authoring-professional-only policies and is not written.

Consent is not a blocker and has not been for some time. `client_access_grants`
is real and enforced, and `has_client_access()` requires both an active grant
for the category *and* an undisconnected relationship.

The governing rule, which earned its keep repeatedly while the above was
built: **an absence must never render as a measurement.** "0 of 5 trained"
reads as a finding a professional could act on, not as missing data, and mock
numbers beside a real roster read as the client's own. This is not
hypothetical — the Food Diary card shipped printing a confident "0 kcal" for
clients whose intake had never been fetched, and the same instinct later caught
a trained-today denominator counting clients who had never shared a workout at
all.

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

### The diary loads from Supabase, but only the last 90 days

**Resolved.** `getDiaryEntries()` is now called from `AppContext` — not from
`Food.tsx`, because `foodLog` also feeds `HomeWidget`'s nutrition summary and
`AddFoodSheet`'s Recent strip, and hydrating in the page would leave those
stale. The diary previously rendered from `localStorage` alone, so entries
only *looked* durable: a reload preserved them because the browser remembered,
not because anything read them back, and the same account on another device
showed nothing. Verified by removing an entry from `localStorage` and
reloading — it came back, so it could only have come from the database.

**The caveat: the window is 90 days.** `DIARY_WINDOW_DAYS` in `AppContext` was
chosen so the auto-streaks, which walk backwards through every dated entry,
and copy-yesterday keep working on one read rather than a query per day. The
range always covers today and — if the user has navigated outside it — the
selected date, so paging back through history does fetch older entries. But
**nothing loads more than 90 days at once**, so a streak longer than that
would cap. Not reachable on an app with no real logging history yet; it will
be, and the fix is paging rather than a bigger constant.

Two details worth knowing before changing this. The hydration **replaces**
rather than merges, because rows carry real database ids and merging would
show an entry twice under two id shapes; and it deliberately preserves
entries that exist only locally (see the next item) plus any remote entry
outside the fetched range, since the read says nothing about those. A failed
read is also distinct from an empty one — `getDiaryEntries()` returns
`{ ok, entries }` precisely so a dropped connection keeps the cached entries
on screen instead of wiping the diary.

### `isRemoteEntryId` is a shim that can go once old local entries are gone

**Resolved: every logging path now writes remotely.** AI Voice resolves each
parsed item to a real catalog row by name and falls back to a manual,
provenance-free write only when nothing matches; `logCustomMeal()` passes real
`custom_food_id` provenance for items whose food reached `custom_foods`, and
falls back to a manual write for ones created before those writes existed; and
copy-yesterday goes
through `copyDiaryEntry()`, which duplicates an existing row's snapshot,
quantity, unit and provenance verbatim rather than re-logging it. Every path
now produces rows with real database ids, consistent with `AddFoodSheet`,
diary hydration, and delete/edit.

**The caveat: `isRemoteEntryId()` is still load-bearing.** It exists to
tolerate a diary holding both real uuids and local-only ids like
`f1757352…`, and it is still used in two places — the hydration reconcile,
which preserves local-only entries rather than dropping them, and the
delete/edit branch, which routes them locally because sending one to Postgres
returns `invalid input syntax for type uuid`.

Nothing writes such ids any more, but **entries created before this change are
still sitting in real users' browsers**, so removing the shim now would break
them: their diary would try to delete rows that never existed. It can go once
there is confidence none remain — either after enough time has passed
post-deploy, or via a one-time cleanup that drops (or uploads) any entry whose
id is not a uuid. Not urgent, and not a correctness problem today; just dead
weight that should not become permanent by default.

### Client-scoped custom foods are still local only

A user's own custom foods are now written to `custom_foods` on create, so they
are searchable everywhere and give logged entries real `custom_food_id`
provenance. `addClientCustomFood` — the professional path, where a
professional authors a food *for* a named client while building their meal
plan — was deliberately left out of that change and still writes only to
`clientCustomFoods` in `localStorage`.

The blocker is an id mismatch, and it is the kind that fails loudly if fixed
carelessly. `custom_foods.scoped_to_client_id` is a foreign key to
`profiles(id)`, but `MealPlanBuilderTab` identifies clients by
`professionalClients[i].id`, which is the **relationship** id
(`professional_clients.id`). The client's actual profile id lives separately on
`ProfessionalClient.clientId`, as that type's own comment says. Writing the
former into that column would violate the foreign key.

So the fix is not "call `createCustomFood` with a `scoped_to_client_id`" — it
is threading the profile id through the meal-plan builder first, then writing.
That touches professional-side UI which has been out of scope, which is why it
was split out rather than done hastily.

Until then, a food a professional creates for a client exists on that
professional's browser only. The client cannot see it, and
`custom_foods_select_scoped_client` — the policy that exists precisely to let
them — has no row to select.

### `nutritionLine`'s not-shared branch is narrower than it reads

`utils/nutritionDisplay` documents four states, and its `not_shared` case
returns "Not sharing food diary". That string is far harder to reach than the
code suggests, and anyone reasoning about the four states from the source
alone will overestimate how often it renders.

When a client revokes their food diary, the surfaces that would show it
mostly do not render at all:

- The roster row checks whether the client shares **anything** first, so a
  client whose only grant was the food diary falls into "Not sharing any data
  yet" before `nutritionLine` is consulted.
- The client sheet's four nutrition surfaces — the Calories consumed card,
  the Food Diary card, the recovery-sensitive Meal rhythm card and the
  clinical panel — are each gated on `access.foodDiary` at the card level, so
  they disappear rather than render a message.

So `not_shared` only actually surfaces on the roster row, and only for a
client who shares some other category but specifically not their food diary.

**Not a defect.** Absence is the strongest possible form of "implies nothing
about whether they logged", which is the property that branch exists to
protect — verified on staging by revoking the grant and confirming no surface
mentions logging either way. The branch is also correct to keep: it is the
right answer for the case it does cover, and removing it would leave the
partial-consent client with nothing. This entry exists only so the next reader
does not assume the string appears wherever a diary is unshared.

### "Trained today" is approximate across timezones

The hardcoded `TODAY` this entry used to describe is gone: `todayLocal()`
derives the current day from the clock, in the user's own timezone, and every
date-keyed feature reduces instants to days the same way. What remains is
narrower, and is a data problem rather than a code one.

`workout_sessions.started_at` is a `timestamptz` — an instant, not a day — so
something has to decide which calendar day it fell on. `fetchClientWorkoutActivity`
uses the **reading professional's** local day, on both sides of the
comparison. That is exactly right when professional and client share a
timezone, which is the ordinary case, and it is strictly better than the UTC
day it replaced, which disagreed with the client's own app for every session
either side of a UTC midnight.

It is still an approximation when they do not. A client in Tokyo who trains at
09:00 their Thursday is at 00:00 UTC Thursday, and their trainer in Los
Angeles reads that as Wednesday evening — so "trained today" answers the
professional's question about their own day, not the client's. Nothing stores
the client's timezone, so nothing can currently do better.

The fix, if this ever matters, is a timezone on the profile (IANA name, not an
offset — offsets change twice a year) written from `Intl.DateTimeFormat().resolvedOptions().timeZone`
at sign-up, and reducing `started_at` in that zone rather than the reader's.
That is a Database change, so it is recorded here rather than worked around in
the client.

### `ProfessionalType` and `professional_subtype` are unreconciled

The app's `ProfessionalType` has four values — trainer, dietitian,
physiotherapist, doctor. The database's `professional_subtype` has five: the
same four plus **`other`**, and a real account can hold it.

This already caused one crash. A listed professional whose subtype was `other`
reached `ProfessionalDetail`, which indexed `professionalTypeIcon` — a
four-entry map — got `undefined`, and rendered it as a component. React
answered with *"Element type is invalid"* and blanked the page. The cast
`as ProfessionalType` is what kept the compiler quiet about it.

That site is now guarded by `iconFor()`, and the Explore filters were keyed on
the database enum from the start, so an `other` professional is reachable
there. **The mismatch itself is untouched.** The remaining consumers of
`professional.type` on that page survive it by accident rather than design:

- `specialtyLimited.has(type)` — a `Set` lookup, so an unknown value is simply
  false
- `specialtyLabel[type]` — an index returning `undefined`, which renders as
  nothing

Both are one refactor away from being a crash, and the next field keyed on
`professional.type` gets no such luck. Two ways out, either fine: widen
`ProfessionalType` to five values so the compiler enforces exhaustiveness, or
add an explicit mapping layer at the service boundary that narrows the DB enum
to the app's vocabulary and decides once what `other` becomes. What should not
continue is a cast that asserts an equivalence which does not hold.

### `iconFor` and `listingIcon` duplicate the same fallback

`ProfessionalDetail.tsx` has `iconFor` and `Professionals.tsx` has
`listingIcon`. Same three lines: look the subtype up in `professionalTypeIcon`,
fall back to `UserCheck` when it is missing. They exist separately because the
second was written while fixing the crash above, after the first had already
been reviewed, and widening that change into a shared module was not worth
doing unreviewed.

Worth hoisting into `utils/icons` next to the map it guards — that is where a
reader would look for it, and one copy cannot drift from the other. Not urgent:
both are correct today, and the mismatch entry above is the more useful fix.

### The hire-request inbox is a local mock, so requesters have no names

A professional reviewing incoming hire requests sees whatever the mock put
there, because the inbox never touches the database. `pendingClientRequests`
is `usePersistentState` in `AppContext`, and `acceptClientRequest` /
`rejectClientRequest` mutate that local array — they do not call the
`accept_client_request` / `reject_client_request` RPCs, which exist and work.
Nothing in the repo queries `pending_client_requests` at all.

This was deliberately **not** folded into the `related_profile_summary` swap.
That change moved two existing lookups onto the right view; this is a surface
that has to be built rather than repointed:

- Fetch real `pending_client_requests` rows for the signed-in professional.
- Resolve requester names through `related_profile_summary`, which already
  covers pending relationships and not only active ones.
- Wire accept and reject to `accept_client_request` /
  `reject_client_request`, which promote a request to a roster row in one
  transaction rather than leaving the client to redeem a code.
- Delete the local simulation once the real path works, rather than leaving
  both — a mock kept alongside a real implementation is how a professional
  ends up accepting a request that never existed.

Until then a real hire request is invisible to the professional it was sent
to, and the only route onto a roster is a redeemed client code.

### The re-consent notice names its categories in hardcoded prose

`DataSharingSection`'s split notice opens with "that one switch also covered
your lab results and your medical history" — those two categories written out
by name, not derived from the categories actually awaiting an answer. That is
correct for the split it was written for (Database follow-up 33, the
`health_metrics` split) and it is the only split that exists, so nothing is
wrong today. Only the trailing clause adapts, switching between the two- and
one-category wordings.

If a future migration ever splits another category, the notice will appear
above the new categories while still naming lab results and medical history.
Generalizing it means deriving the whole sentence from the unanswered
categories' labels — which was deliberately not done up front, because the
approved copy is specific on purpose and a generic version reads worse for the
case that actually exists.

### The meal-plan builder still interpolates a client's weight history

Weight is now stored in `health_metrics` and the roster tiles read it for
real, but `MealPlanBuilderTab.weightHistoryFor` was not converted with them.
It still builds a seven-point series by interpolating between
`lastWeightKg - weightTrend` and `lastWeightKg`, which is a straight line
through two real endpoints rather than the readings that actually exist. Its
own comment — "a professional's client has no real logged weight-history in
this prototype" — is now out of date.

Deliberately left, because it is a different query rather than a different
mapping. The roster needs one latest value per client and gets it in a single
batched read; this chart needs the whole series for ONE client, which is a
per-client read with its own loading and not-shared states, and it belongs
with the professional-side charting work rather than bolted onto the client
write path.

Nothing is misreported in the meantime: both endpoints are real, so the chart
starts and ends in the right place. Only the shape between them is invented,
and it will read as a smooth trend even for a client whose weight moved
unevenly.

### `surgery_date` and `imaging_date` cannot say "I don't remember exactly when"

**Database repo change, requested — two columns, one request.**
`surgeries.surgery_date` and `imaging_records.imaging_date` are both
`date NOT NULL`, so a surgery or a scan with no known date has nowhere to be
stored. The app used to keep a `"Not dated"` sentinel string locally at both
sites; that could not be written, and the three alternatives were worse — a
placeholder date writes a false fact into a medical record, keeping undated
entries local-only rebuilds the two-id-space problem the workout log refused,
and dropping them silently is not an option.

So the form now requires a date and explains why. That is a workaround, not a
fix. "Sometime in 2019" is an ordinary and honest answer about a surgery, and
`<input type="date">` demands day precision, so requiring it pressures a user
into inventing a specific day — moving the fabrication from the code to the
person, which is not an improvement.

The fix is to make both columns nullable. When it lands, the guards in
`addSurgeryRemote` and `addImagingRecordRemote` and the `disabled` on both
forms relax, and nothing else changes. A precision flag (`day` / `month` /
`year`) would be better still, but nullable alone would remove the pressure to
guess.

### There is no manual biomarker entry, and three things are waiting on it

Blood markers can only arrive through `BiomarkerCaptureFlow`, whose
`ExtractedBiomarker` is `{name, value, unit, selected}` — no reference range,
no date. The Biomarkers tab is read-only: tap to open, tap to share. So the app
has no way to type in a result, and no way to supply a range for one.

Three consequences, all currently unreachable and all reachable the moment that
entry path is built:

**`parseRange` has no producer.** It is the correct mapping layer for
`range_low`/`range_high`, and it is tested — en, em and figure dashes, `<`,
`<=`, `>`, `>=`, negatives on both bounds, reversed ranges refused rather than
silently swapped. But every write this app makes today stores both bounds null,
so only `formatRange`, the read direction, has a live caller. Its own doc
comment says so; this entry exists so the gap is findable from outside the file.

**Newest-wins applies to range and status, not just value.** `getBloodMarkers`
groups by marker name across panels and lets the newest panel set the headline
figures. A marker measured in an older panel *with* a range and again in a
newer one *without* loses the range — HbA1c went from `4 – 5.6` to `—` in
testing. That is defensible: a reference range belongs to the lab that issued
it, and pairing an old range with a new value from a different lab would be
worse than showing none. Recorded because a test surfaced it rather than the
design anticipating it, and because manual entry is what makes it happen.

**The display string is normalised, not preserved.** `"< 1.90"` round-trips to
`"< 1.9"`. `numeric(12,4)` stores `1.9000` but nothing can recover the trailing
zero as *display* precision, and in lab reporting significant figures carry
meaning. Preserving it would need a column for the original string.

### A panel saved without a report file cannot be deleted

Blood panels are now deletable, which closes the gap where a client could
upload a lab report and never remove it. `deleteLabPanel` takes the panel row
first and the object second — markers follow the panel by `ON DELETE CASCADE`,
and the file is removed explicitly because Storage does not cascade. The
control lives on each entry in the Lab reports list.

**That list is the whole delete surface, and it does not hold every panel.**
`getLabReports` filters to panels whose `source_image_url` is non-null, because
a panel with no file has nothing to open and a View control on it would promise
a document that does not exist. A panel saved from a capture where no file was
attached is therefore invisible there — and the Biomarkers tab beneath it
cannot host the control either, because those rows are grouped by marker name
across every panel, so a row does not correspond to a panel and often draws its
history from several.

So the missing piece is a listing of panels *as panels*, independent of whether
one carries a file — which is a feature rather than an addition to this one. It
is also what manual biomarker entry would need, and manual entry is what will
make fileless panels common: today they only appear when someone completes a
capture without attaching anything, which is the uncommon path. The two are
worth building together.

Nothing is orphaned in the meantime. A fileless panel holds no Storage object
by definition, so what persists is table rows, not bucket growth.

### A consent toggle has three times failed to persist, cause still unknown

Three sightings now, all on this repo's staging, all unexplained.

The first was investigated at the time and closed as *"not reproducible,
mechanism verified sound, cause unproven"*. The second happened while verifying
medical history: the `medical_history` toggle was switched on, and the row
afterwards read `granted: false` with **`granted_at: null`** — never stamped at
all, still carrying the previous day's `revoked_at`.

**The third failed in the opposite direction, which this entry previously said
had never been seen.** `lab_results` was switched OFF to set up a Storage
consent test; the row afterwards still read `granted: true`. A retry minutes
later wrote correctly — `granted: false`, `revoked_at` stamped, and `granted_at`
preserved from the original grant, which is exactly the withdrawal behaviour
`stamp_client_access_grant` is supposed to produce.

So the failure is not specific to granting. A client can believe they have
shared something they have not, **and** believe they have revoked something a
professional can still see. The second is much the worse of the two: a grant
that silently fails to apply leaks nothing, while a revocation that silently
fails to apply leaves clinical data readable by someone the client has decided
should no longer see it.

What is known: the write path is sound when it runs, `stamp_client_access_grant`
stamps correctly, and the professional side reads the result accurately in both
states. Every failure has been silent — no error text, no thrown exception, and
the row simply unchanged.

**The cheapest useful observation is whether the "Saved" checkmark appears
during a failure**, and it has not been captured in any of the three. The
dedicated investigation established that the checkmark cannot appear without a
successful write: forcing every consent `PATCH` to `403` produced no checkmark,
a reverted switch and a visible error, sampled across 2.8 seconds. That makes it
a real discriminator —

- **checkmark seen during a failure** → the confirmation is lying, which would
  be a serious regression on a security-relevant control and a genuinely new
  finding;
- **no checkmark** → the click never reached the handler, which matches what
  earlier instrumentation suggested and points away from the write path
  entirely.

Not fixable from the aftermath: an unchanged row leaves nothing to inspect. It
needs a reproduction with the network tab open, or an instrumented write that
logs the PostgREST response alongside the affected row count.

**The toggle path is now instrumented, so the next sighting leaves evidence.**
Every attempt logs to the console under `[consent-toggle]` — an `attempt` line
and a matching `outcome` line paired by id, plus `skipped` when the in-flight
guard declines one. Between them they carry the timestamp, category, requested
and previous values, the write's status and message, whether the checkmark was
shown, and timing: milliseconds since the sheet opened, since the previous
attempt, and for the write itself.

**What to look for if it happens again:**

- **No `[consent-toggle]` line at all** — the click never reached the handler.
  That is the leading hypothesis and nothing else in the log would say so;
  success is logged precisely so that an absence is readable.
- **Two attempts about 1ms apart with DIVERGENT outcomes** — the first real
  evidence of an actual bug. Worth capturing in full.
- **Two attempts about 1ms apart with MATCHING outcomes** — the already-known
  same-tick race, and harmless. It happens because `saving` is React state and
  `setSaving` has not updated the closure by the time the second click runs, so
  the guard does not catch it. Confirmed still present and still idempotent
  when the logging was added; not a lead.
- **An `attempt` with no `outcome`** — the request never settled, which is a
  different fault from one that resolved with an error.

`console.info` rather than warn or error, and rather than debug: a successful
toggle is not a problem, and debug is hidden by default in most consoles, which
would defeat the point. It logs nothing until a toggle is actually used.

### `HealthMetricsTab`'s row summary names only what it renders

The collapsed client row read "Not sharing health data" from
`access.healthMetrics` alone, which became wrong once medical history carried
real data: a client sharing their medications appeared to be sharing nothing,
with the medications one tap away. It now says "Sharing medical history" when
that is what is shared.

`lab_results` is deliberately **not** named there, even though it is a
health-data category the client can grant. This row renders vitals, medical
history and clinical notes — no lab content at all — so naming lab results
would send someone to open a row that shows them nothing, which is the same
mismatch this fixed, pointing the other way. If task 4 gives lab results a
block here, add the branch at the same time and not before.

### Chat attachments: video removed, and nothing is uploaded either way

**Resolved.** `MessagesTab` and `ProfessionalDetail` both offered
`accept="image/*,video/*"` and re-checked with `/^(image|video)\//`, admitting
a type no bucket accepts — `message-attachments` allows JPEG, PNG and WebP plus
five audio types, and the word "video" appears in no migration. Both now offer
the bucket's three image types and check `/^image\//`. Verified by exercising
the predicate directly: every image type still passes, both video types are
refused, audio and PDF are unchanged.

**The evidence that settled it**, since "remove it" and "build it" were both
live options. The QA line these surfaces came from asks for *"voice notes and
attach files/pictures as well as video/voice call"* — where **video/voice
*call*** is calling, implemented separately as `setCallMode`, not attaching a
video file. The instruction directly above the input says the opposite
outright: *"By no means should you be able to upload anything besides that."*
And the bucket's audio types line up exactly with `voice_note_seconds`, so
audio has an origin video never had.

**This was a UI promise, not a security hole, and the difference matters for
what to do next.** Neither surface uploads anything today: both
`sendAttachment` functions store `file.name` and nothing else, and
`sendProfessionalMessage` is a `setState` into `localStorage`. A video produced
no error, graceful or otherwise — just a message bubble showing a filename.
There was no server call to refuse it and none to secure.

So the regex is not a guard and should not be mistaken for one. It still
matches any `image/` type, including a GIF the bucket rejects, and tightening
it was deliberately skipped — it would guard nothing while implying the surface
is validated. **When these get wired to real Storage, the check belongs in the
upload path**, the way `validateFileFor` covers `lab-reports` and
`medical-imaging`: called once at pick time for a fast answer and again inside
the upload, where no caller can skip it. Audio will need adding there too if
voice notes ever become picked files rather than recorded durations.

Audio is still not offered in the picker for that reason — `toggleRecording`
stores a duration, not a file, so listing the bucket's audio types would invent
a path that does not exist.

### The storage cap is real, and the app calls it a connection problem

**The aggregate cap now exists**, so the gap this entry originally described is
closed. `20260910110653_storage_usage_cap.sql` adds
`profiles.storage_bytes_used`, keeps it in step with `storage.objects` by
trigger, and rejects an upload that would take the account past
`storage_cap_bytes()` — 2 GiB for everyone today. Per-object
`file_size_limit`s still bound any single file on top of that.

**What is left is on this side, and it is a wrong message rather than a missing
bound.** `uploadPrivateFile` maps every failed upload to the same sentence:

> That file couldn't be uploaded. Check your connection and try again.

The cap raises `storage cap exceeded: this upload needs N bytes, M of C are
already used`. A user who is out of space is therefore told to check their
connection, and retrying — which is what that sentence asks for — fails
identically every time with no hint why. Distinguishing the two means matching
on the raised message, since it arrives as a generic storage error rather than
a typed code.

**Nothing shows remaining space either.** The migration ships
`storage_usage()`, returning `used_bytes`, `cap_bytes` and `remaining_bytes`
for the caller, and no code in this repo calls it. So there is no surface where
someone can see they are near the limit before an upload fails, which is what
would make the failure comprehensible rather than surprising.

Worth keeping the shape of the risk in view: this was never a correctness
problem. Every object is reachable only by its owner and a consented
professional, and account deletion purges all of it (migration
`20260908175534`). It was a missing bound, the bound is now there, and what
remains is telling the truth about it.

*Recorded first as "nothing caps how much one user can store", which was
accurate when written and stopped being so about an hour later when the cap
landed in the Database repo. Both halves above are now built — the accurate
message and the Settings reading — leaving only the verification gap below.*

### ATX04 has now been triggered for real, and the named risk is what happened

**Closed.** This entry used to say no cap violation had ever occurred and that
detection rested on a simulation. One has since been triggered on staging, and
the out-of-space message is confirmed end to end.

**The specific risk this entry named is exactly what the real error did.** It
warned that an *unrecognised* SQLSTATE might be handled differently from an RLS
violation, with the Storage API swallowing the Postgres message rather than
forwarding it — and that if so, detection would find neither the code nor the
prefix. The first half happened: the Storage API **discards** the trigger's
message and substitutes its own, `database error, code: ATX04`.

The second half did not, and only because of a hedge. That substituted text
carries the code as plain text, so `message.includes("ATX04")` matched — a
branch added on the reasoning that a code might turn up somewhere unanticipated,
not because anyone predicted this particular shape. Had detection been narrowed
to the two branches that looked most principled at the time — the `code` field
and the message prefix — it would have failed, and a user out of space would
have been told to check their connection.

**Two things this corrects for anyone reading the surrounding code.** The
message prefix `storage cap exceeded` is unreachable: the trigger's own wording
never survives the substitution. And the earlier reasoning that the SQLSTATE
cannot appear in the message was right about Postgres and wrong about the
result, because the Storage API writes the code into its own text. Both are now
described accurately in `isCapViolation`'s comment, which previously argued
against the branch that turned out to be load-bearing.

The general lesson is worth more than the specific fix: an RLS violation
through this same API forwards its Postgres message verbatim, so probing that
case suggests messages pass through unchanged. They do not, uniformly.
Recognised and unrecognised errors take different paths, and probing one tells
you little about the other.

### Two Storage cleanup gaps, both waiting on surfaces that are not wired

Neither is a live defect today, and both become one the moment the surfaces
behind them start writing real files. Recorded now because that wiring is the
point at which they are cheapest to handle and easiest to forget.

**Abandoned message-attachment uploads have no sweeper.** The storage migration
gives `message-attachments` no UPDATE or DELETE policy at all, deliberately,
matching `messages` itself — a sent attachment is meant to be as permanent as
the message carrying it. Its own comment names the cost: a failed or abandoned
upload is *orphaned until something sweeps it up*. Nothing sweeps it up. Any
such job must go through the Storage API rather than SQL, because Supabase's
`protect_objects_delete` trigger rejects direct DELETE against
`storage.objects` for every role including `service_role`.

**Avatar and certification replacement has no old-object deletion.** Both use
a stable `<uid>/<file>` path, so replacing one either overwrites the previous
object or strands it depending on the filename chosen — and no code decides
which, because no code uploads them yet.

That is the precondition both share: **`avatars`, `certifications` and
`message-attachments` are not wired to Storage.** Avatars and certifications
read the file with `readAsDataURL` and hand the data URL to `updateProfile`,
which is `setUser` and nothing more — no code anywhere writes `avatar_url` or
`certification_url`. Message attachments store `file.name` and never read the
bytes at all. So there is nothing in any of those three buckets to orphan.

Two things to carry into that work when it happens. The data URLs are held in
React state today; pointing them at a column instead of at Storage would put
base64 roughly a third larger than the original into Postgres, which is the
wrong fix reached for by accident. And `avatars` is the one **public** bucket —
its objects are served over an unauthenticated URL to anyone holding the link,
policy or no policy — so a replaced avatar that is merely unreferenced rather
than deleted stays world-readable indefinitely.

### Settings now offers a working support control and a fake one, side by side

**Report a bug writes to `bug_reports` and works.** Directly above it in the
same card, **Contact us does nothing at all** — `ContactUsSheet` is three
buttons with no handlers (Live Chat, Call us, Email at `support@centium.app`)
and a footer reading *"Prototype only — these don't connect to a real support
channel yet."*

The mock predates the bug report and was harmless while nothing near it worked.
It is less harmless now: two adjacent rows in one card, both looking like ways
to reach the team, one of which silently is not. A user who tries Contact us
first has no way to tell the difference, and the footer only appears after they
have opened it.

This was left alone deliberately rather than overlooked. Fixing it means
answering product questions that belong to whoever runs support — is there a
phone line, is there a chat provider, does `support@centium.app` receive mail
— and deleting the rows would discard intent someone may still act on. The
options are roughly: make the channels real, remove the ones that are not, or
fold support into the bug report, and each is a different product decision.

**Two things to know before deciding.** `support@centium.app` has never been
verified to exist; it appears only in mock content, so anything built on it
(a `mailto:` in particular) could route real reports into nothing, which is
worse than an obviously dead button. And **a filed bug report notifies nobody**
— there is no mail provider, queue or webhook in this project, so reports wait
in the table until someone queries it. The sheet's copy is written to match
that, saying the team reads reports rather than promising a reply, and it
should keep saying so until something actually delivers them.

### Offline is handled, and the sign-in screen it can still show is not a bug

**Losing connectivity mid-session was audited and is sound.** Reads keep
working from already-hydrated state, nothing crashed across 52 blocked
requests, and **no write path gives false success** — every one is remote-first,
and consent's optimistic toggle correctly reverts. The gaps were copy, not
architecture: an offline banner and four raw `TypeError: Failed to fetch`
messages, all fixed.

**Starting offline was the untested case, and it was hiding a real bug.** This
entry used to describe that as a guess. It was tested, the guess was right, and
the cause has been fixed — the detail is kept because the shape of it is worth
knowing.

Two cases, and only one was broken. With a **valid** access token a cold
offline start works correctly: the session restores from the cookie with no
network at all, and the cache survives. With an **expired** one, `getSession()`
attempts a refresh, fails, and returns `null` — indistinguishable, from the
cache-clearing effect, from a signed-out visitor. It wiped all 63
`centium-state:*` keys and the route guard showed the sign-in screen to someone
who had never signed out.

That is the ordinary case, not an edge one: access tokens last an hour, so any
offline open more than an hour after last use hit it.

`hasStoredSessionToken()` now answers the question the effect actually needed —
whether there is a token to restore, rather than whether it can be verified
right now. It withholds a destructive action and never grants access: it cannot
tell a valid refresh token from a revoked one, so it is not evidence of
authorisation, and the worst it can do is keep a cache one page load too long.
A genuinely signed-out browser is still wiped, which was re-tested rather than
assumed.

**What remains is deliberate.** Opening the app offline with an expired token
still shows the sign-in screen, and that is not being papered over. The route
guard genuinely has no session; manufacturing one to hide it would cross an
authorisation boundary to fix a display problem. The data now survives and the
account signs itself back in on reconnect, which was the part doing harm. An
offline-aware guard state is a real design decision and would need its own.

**One thing about reconnection worth not misreading.** It restores the session
and rehydrates the cache, so it looks like full recovery — but rehydration
comes *from the server*. Habits, streaks, journal, routines, calendar events,
custom foods and widgets have no server copy, so in the original bug they were
gone for good. Any future change in this area should assume "it recovers on
reconnect" is true only of server-backed data.

### `professionalBio` is a dead field, and a landmine for the next bio surface

**There are two things called "bio" and only one of them is real.**

| | `user.professionalBio` | `professional_profiles.bio` |
| --- | --- | --- |
| Lives in | `localStorage`, via `updateProfile` (`setUser`) | The database |
| Written by | **nothing, as of `a317522`** | `saveMyProfile` |
| Read by | **nothing, ever** | Explore listing, `connected_professional_summary` |

The Profile tab's bio field used to write the first one. It saved on every
keystroke, had no save control, and its placeholder said *"This will appear to
clients on your Explore listing"* — which it could not, because nothing has
ever read `professionalBio`. A professional could write a bio, watch it survive
reloads, and have no client ever see it. That field now writes
`professional_profiles.bio` like the public listing sheet does, so the two are
one bio with two entry points.

**Why the type wasn't deleted.** `professionalBio` is still declared on
`UserProfile`, unread and unwritten. Removing it is tempting and would be
wrong: it is persisted inside `centium-state:user`, so real values may sit in
the browsers of anyone who used the old field. Deleting the declaration
orphans that text — still on disk, no longer reachable by any code that could
migrate or display it. It stays as an inert field until either someone writes
a migration that reads it into `professional_profiles.bio` on next sign-in, or
enough time passes that nobody's local copy matters.

**Decided: let it lapse.** No real user population exists yet to recover for —
pre-promotion, no production data — so client-side recovery logic would be
ongoing complexity for a value almost certainly empty or placeholder across the
realistic population. Revisit only if real evidence surfaces that a genuine
professional used this field before the fix.

**The landmine, stated plainly for whoever adds the next bio-editing
surface:** `professionalBio` is still there, still typed, still autocompletes,
and binding a new textarea to it through `updateProfile` will look exactly like
the surrounding code and work perfectly in local testing. It will persist
across reloads. It will simply never reach the database or any reader. **A bio
editor must call `saveMyProfile`**, and the same applies to specialty and
location, which live on the same row.

Worth knowing how this was found, because the symptom pointed somewhere else
entirely: a bio edit "silently failed to save", which read as a write failure
and sent an investigation into `saveMyProfile` looking for a missing row-count
check. There wasn't one — `saveMyProfile` uses update-then-insert and checks
the row count, verified against the database, including that a non-owner UPDATE
returns zero rows with `error: null` and the INSERT fall-through then surfaces
`42501` visibly. Nothing was failing. The write went exactly where the code
sent it, which was nowhere.

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
