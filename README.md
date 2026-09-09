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

### The professional dashboard's client-health tiles are partly wired

**Nutrition is done** (`2c0ed52`). A professional who has been granted
`food_diary` sees their client's real food logs — totals for the client's
most recently logged day, with the date, across the roster row and all four
client-sheet surfaces. `services/professional-client` batches one query for
the whole roster; `utils/nutritionDisplay` owns the wording so the surfaces
cannot drift apart. Client identity on the roster is real too (`299523a`,
via `related_profile_summary` — not `public_profile_summary`, which excludes
customers by design and is why every client used to render as "Client").

**Weight, workouts and medical history are not.** Still optional on
`ProfessionalClient` and `undefined` on every real row: `lastWeightKg`,
`weightTrend`, `workoutLoggedToday`, `healthSummary`, `medicalHistory`,
plus the demographics `activityLevel`, `activityType`, `age`, `sex`,
`heightCm` and `weightKg`. Three surfaces still render `HealthDataPending`
("coming soon") in their place: the dashboard's "N of M trained" hero, the
meal planner's weight-trend card, and the client sheet's activity summary —
that last one now only when the client shares nothing renderable at all.

**What blocks them is the client's own write path, not the professional's
read path.** `workout_sessions`, `health_metrics`, `medications`,
`surgeries`, `comorbidities` and the rest already carry
`*_select_granted_professional` policies built on `has_client_access()`, so
the professional side is waiting on data that does not exist: the client's
app still keeps weight, workouts, sleep and steps in `localStorage` and
never writes those tables. Wiring them is a client-side project of its own —
much larger than these tiles — and it is what the original tile
investigation split out as its task 4.

Consent is not a blocker and has not been for some time. `client_access_grants`
is real and enforced, and since the consent split `has_client_access()`
requires both an active grant for the category *and* an undisconnected
relationship.

The governing rule for whatever gets wired next: **an absence must never
render as a measurement.** "0 of 5 trained" reads as a finding a
professional could act on, not as missing data, and mock numbers beside a
real roster read as the client's own. This is not hypothetical — the Food
Diary card shipped printing a confident "0 kcal" for clients whose intake
had never been fetched, which is exactly what `2c0ed52` removed.

Related: professional-side mutations (`updateProfessionalClientAccess`,
`updateProfessionalClient`, `assignProgramToClient`,
`assignFoodTemplateToClient`, and `clientHealthNotes`) still write to
in-memory state only. They update the UI and are lost on the next roster
refetch.

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

### Files can be uploaded but not opened

`services/storage` uploads to `lab-reports` and `medical-imaging`, and
`signedUrlFor` mints working short-lived links — verified by fetching one. But
**nothing calls it.** There is no view affordance anywhere:

- The client's imaging list shows type, date and note. A record with a file
  looks identical to one typed by hand; the scan is stored and unreachable.
- The professional side has no lab or imaging surface at all — that is task 4c,
  and `ProfessionalClient` carries no field for either.

So a user can attach a scan to a record and then never see it again from
inside the app. That is a real gap rather than a deferred nicety, and it is
listed here because "the upload works" reads as finished and is not.

Whatever adds the viewer has to sign at the moment of opening rather than at
load: a URL minted when the list renders would spend most of its short life
unused and be dead by the time anyone tapped it. `filePath` on `ImagingRecord`
holds the object path for exactly that reason.

One more thing that viewer must not assume: `medical-imaging` accepts PDFs as
well as images, so it cannot simply render an `<img>`.

### A consent toggle has twice failed to persist, cause still unknown

Two sightings now, both on this repo's staging, both unexplained.

The first was investigated at the time and closed as *"not reproducible,
mechanism verified sound, cause unproven"*. The second happened while verifying
medical history: the `medical_history` toggle was switched on, and the row
afterwards read `granted: false` with **`granted_at: null`** — never stamped at
all, still carrying the previous day's `revoked_at`. A second attempt minutes
later wrote correctly and survived a reload.

What is known: the write path is sound when it runs, `stamp_client_access_grant`
stamps correctly, and the professional side reads the result accurately in both
states. What is not known is why the first write produced no row change and no
visible error.

This matters more than a normal flake. The failure is silent and the toggle is
the client's only control over disclosure, so the shape of the bug is a client
believing they have shared something they have not — or, if it can fail in the
other direction, believing they have revoked something still visible. Only the
first direction has been observed.

Not fixable from the aftermath: `granted_at` being null means there is nothing
to inspect. It needs a reproduction with the network tab open, or an
instrumented write that logs the PostgREST response alongside the row count.

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
