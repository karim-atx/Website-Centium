# Website viewport v1: progress

Handover: `handoff-webview-v1` (Client UI and Business UI, 2026-11-02), section 7.5 (Arabic) from the v2.0 copy of the written spec. Branch `feat/web-viewport-v1`, one draft PR into main.

Statuses: **not started** · **built** (web layout in place) · **verified** (checked against the reference file and frames at 1440 × 900 and 1024 × 768, every state the CSV lists) · **mobile layout** (no web design yet, or "wait for v2": the current mobile screen shown centred in the web shell, fully working) · **skipped** (needs a backend change; reason in the notes) · **not built** (Karim's decision: later).

## Rules kept throughout

- Web layouts apply only at `min-width: 1024px` (`useWebLayout()` in `src/components/web/`). Below that every screen renders exactly as on main, 431 to 1023px included.
- Web-only code lives in `src/components/web/` (shell, sidebars, page header, More / Settings layout) and in `*.web.tsx` files beside the pages they adapt. A shared file only gains a branch that is taken at 1024 and wider.
- Every page without a web layout of its own (and every "wait for v2" node) renders its mobile screen in a centred column inside the web shell (`MobileFrame`).
- Mobile regression: 65 routes captured at 430 × 932 from origin/main before any change (headless Chrome, fixed clock, reduced motion, network idle); re-captured at the end and compared with pixelmatch.

## Karim's decisions as applied

1. Global search: not built; no Search item in either sidebar.
2. More + Settings secondary-sidebar layout: built (`WebSecondaryLayout`).
3. Settings is a sidebar entry above More.
4. Items with their own sidebar entry are left out of the web More list.
5. Share schedule card: today's share card is kept on web.
6. HandHeart for Appointments services, web only.
7, 8, 9. Class rules and Services tables, inline / docked editors: approved; built where marked below.
7.2. Achievements keep the repo's 5 tiers; Routines "nothing selected" uses Option A.
7.3. Web-only copy says "Click" where the handover lists it; mobile copy unchanged.
7.6. Mock data in the reference files is not used; pages read real data.

## Where to resume

See "Resume here" at the end of this file.


## Counts

- not started: 176
- built: 30
- mobile layout: 39
- not built: 2
- verified: 2

## Client · Home

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-HO | Home · filled | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.1 | Edit board | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.2 | Choose a date | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.3 | Add a widget | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.4 | No device connected | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.5 | Recovery-sensitive Home | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.6 | Water widget fill states | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.7 | Home · empty | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.8 | All large widgets · filled | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.10 | Reminder pop-ups | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HO.11 | Check-in and intake form sheet | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-HO.12 | Referral sheets | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-HO.13 | Add your date of birth | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-AW.1 | Offline banner (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-AW.2 | Outbox (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-AW.3 | Error panel (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-AW.4 | Message pop-up (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-HO.9 | Professional reminders | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Food

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-FO.1 | Diary · filled | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1 | Diary · empty | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.4 | Diary · food item nutrients | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.5 | Diary · full nutrient summary | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.1 | Meal options menu | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2 | Add Food | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.1 | Add Food · search results | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.2 | Barcode · camera | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.3 | Barcode · starting | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.4 | Barcode · camera off | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.5 | Barcode · no camera | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.6 | Barcode · invalid number | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.3 | Recovery-sensitive Diary | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.2 | Goals & Macros · filled | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.2 | Goals & Macros · empty | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.2.1 | Dietary restriction | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.3 | Custom · filled | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.3 | Custom · empty | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.3.1 | Custom · Recipes | not designed | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.3.2 | Custom · Custom Foods | not designed | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.4 | Nutrient Summary · filled | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.4 | Nutrient Summary · empty | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.4.1 | Nutrient filter | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.7 | Search online | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.2.8 | Check this food | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-FO.1.4.9 | Nutrition details | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Workout

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-WO.1 | Routines · filled | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1 | Routines · nothing selected | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1 | Routines · empty | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1 | Routine play controls | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.1 | Folder & routine menus | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.2 | New folder | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.3 | Delete / switch routine | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.4 | Create routine | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.5 | Exercise library | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.6 | Custom exercise | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.7 | Per-exercise settings | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.8 | Session logger (in place) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.9 | Logger menus | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.10 | Set options · RPE · pinned note | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.2 | Library tab | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.2.1 | Library · Anatomical model | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.3 | History | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.3.1 | History popups | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.4 | Metrics | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.1.11 | Play your music | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-WO.5 | Programme · this week | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-WO.5.1 | Move a session | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-WO.5.2 | Skip this day + Undo | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Health

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-HE | Overview · filled | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE | Overview · empty | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.2 | Steps | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.3 | Sleep | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.7 | Weight | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.4 | Calories burned | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.1 | Water | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.5 | Heart rate | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.6 | Blood pressure | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.+ | Add Metric (top-bar +) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.S | Devices and sources (header 'Sources') | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.G | Sources and guidelines | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9 | Biomarkers & imaging · Biomarkers | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9.1 | Labs | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9.2 | Imaging | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9.3 | History | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9.4 | Scan a report | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9.5 | Marker history & share | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.8 | Your health checks | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.L | Log sheets (from Add Metric) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.9.6 | Injuries | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-HE.10 | Care plan | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Client · Mind

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-MI | Mind hub | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MI.1 | Habits | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MI.2 | Journal | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MI.3 | Achievements | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MI.4 | Meditation | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Professionals

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-PR | Directory + profile | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-PR.1 | Your professional | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-PR.2 | Map | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-PR.3 | Reviews | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Community

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-CO | Forum | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-CO.1 | Post | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-CO.2 | New post | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-CO.3 | Access | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-CO.4 | Courses | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-CO.5 | Certificates | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-CO.5.1 | Certificate | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-CO.5.2 | Course no longer available | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Explore

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-EX | Discover | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.1 | Gym page | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.2 | Class page | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.2.1 | Rate the instructor | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-EX.2.2 | Review wait note | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-EX.3 | My bookings | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.3.1 | Booking paused | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-EX.3.2 | Pass (rotating code) | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-EX.3.3 | Pass devices | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-EX.4 | My rewards | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.5 | Points history | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.6 | How to earn | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7 | Rewards | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.1 | Offer | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.2 | Showcase | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.3 | Voucher | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.4 | Redeem | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-EX.8 | Purchase | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |

## Client · More destinations

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-MO.1 | Profile | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-SE | Settings | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.2.1 | Notifications | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.2 | Two-factor authentication | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.3 | Accessibility | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.4 | Language | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.5 | Privacy | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.6 | Terms of Service | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.3 | Calendar | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.4 | Messages | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.5 | Referral | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.6 | Centium Premium | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.1.1 | Proposals | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.1.2 | Become an ambassador | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.2.7 | Your music | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.2.8 | Get support now | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.2.9 | Billing and refunds | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.4.1 | New group | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.4.2 | Group details | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.4.3 | Group invitation | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.4.4 | Share a group | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-MO.4.5 | Shared meal plan | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.4.6 | Forward | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.4.7 | Starred messages | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.7 | Notifications | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Client · Onboarding & auth

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-OB.1 | Welcome | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.2 | Create your account | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.3 | Sign in to Centium | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.4 | Check your email | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.5 | Forgot your password? | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.6 | What brings you to Centium? | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.7 | About you | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.8 | A gentler start | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.9 | Goals and activity | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.10 | What to track | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WC-OB.11 | You're all set | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Client · Global search · WEB ONLY · not in repo

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-SR | Search palette · WEB ONLY · not in repo | specified |  | not built | Karim's decision 1: later; no Search item in the sidebars. |

## Business · Dashboard · Gym

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · GY | Dashboard | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.1 | Needs your attention | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.2 | Your listing | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.3 | Venue switcher | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.4 | Quick action name | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.5 | Recent activity expanded | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.6 | See all activity | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-HO.8 | Notifications | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Business · Analytics

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-AN.1 | Overview | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.1.1 | Your listing (from Live now) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3 | Members | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.1 | Growth (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.2 | First 90 days (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.3 | Visits (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.4 | Not seen in 14 days (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.5 | Plans (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.6 | Member codes (selected) | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.7 | Client outcomes (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.3.8 | Venue members (selected) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-AN.0.1 | Custom range | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WB-AN.3.9 | Booking pauses | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Business · Front desk

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-FD.1 | Entries | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.1.1 | Checking in at | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.1.2 | Check someone in | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.1.3 | Scan a pass | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.2 | Passes and renewals | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.2.1 | Renewal row menu · End membership | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.3 | Memberships | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-FD.3.1 | New Plan · Archive plan | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Business · Global search · WEB ONLY · not in repo

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-SR | Search palette · WEB ONLY · not in repo | specified |  | not built | Karim's decision 1: later; no Search item in the sidebars. |

## Business · Schedule (navbar slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-CS-SC | Schedule · List | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.1 | Schedule · Week | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.2 | Add / Edit class | REPO CHANGED | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.3 | Class page · Bookings | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.4 | Card ⋮ menu | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.5 | Needs attention · expanded | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.6 | Cancel class | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.7 | Substitute · Message members | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.8 | Class rules | specified |  | verified | One table (decision 7). Checked at 1440 and 1024, filled (6 class types) and empty (proxy fixtures for the Classes type): header row 81, rows 64, menus at the trigger width 6px below it, Esc returns focus. Copy and the lead line follow the repo (Clients for a Classes business). |
| WB-CS-SC.9 | Share this week's schedule | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-CS-SC.3.1 | No-show booking pause | NEW · to build | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Business · Dashboard · Classes

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · CS | Dashboard | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Business · More · Classes

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · CS | More | specified |  | built | Secondary column per section 4 (groups, rows 60, tiles, live lines, Join requests badge, plan card), first item opens by default. The pane shows the repo page for the item (the designed pane layouts are not built yet). |

## Business · Marketplace tabs (shared)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MA.1 | Overview | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-MA.2 | Showcase (gym / classes) | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-MA.3 | Offers | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-MA.4 | Performance | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-MA.5 | Sheets and popups | partial | global rules for the sheets, menus and confirms; wait for v2 for the Photos, Preview and O | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-MA.6 | See all | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-MA.7 | Redeem a voucher | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Business · Orders (navbar slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-OR | Orders tabs | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-OR.1 | Order detail | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-OR.2 | Return detail | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-OR.3 | See all lists | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-OR.4 | Cancel order · Deny return · Refund | specified |  | built | The repo confirm (KitPop / ConfirmCard) as a 400 centred popup from 1024px; the page under it still shows its mobile layout. |

## Business · Products (navbar slot 4)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-PR | Products · Showcase | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-PR.1 | Product editor | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-PR.2 | Item photo · Delete item | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-PR.3 | Category See all | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Business · Dashboard · Store

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · ST | Dashboard | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |

## Business · More · Store

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · ST | More | specified |  | built | Secondary column per section 4 (groups, rows 60, tiles, live lines, Join requests badge, plan card), first item opens by default. The pane shows the repo page for the item (the designed pane layouts are not built yet). |

## Business · Appointments (Appointments variant, slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-AP | Appointments | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-AP.1 | Appointment detail | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-AP.2 | Add appointment | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-AP.3 | Services and free slots | specified |  | verified | Two tables (decisions 6, 8). Checked at 1440 and 1024, filled and empty (proxy fixtures for the Appointments type): rows 53, header row 40, table 1120 wide at 1440, edit and remove buttons, sheets as 440 side sheets, Esc and focus return. |
| WB-ST-AP.4 | Day list · day strip | specified |  | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-AP.5 | Service and With menus · Time wheel (Day calendar to come) | partial | global rules | not started | Meanwhile its mobile screen shows in the web shell (sheets open as 440 side sheets). |
| WB-ST-AP.6 | New service · Add free slots | specified |  | built | The mobile New / Edit service and Add free slots sheets as 440 side sheets with their field menus anchored under each field. Web field styling of the frames not applied (content as on mobile). |
| WB-ST-AP.7 | Cancel appointment | specified |  | built | The repo confirm (KitPop / ConfirmCard) as a 400 centred popup from 1024px; the page under it still shows its mobile layout. |

## Business · More · Appointments

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · AP | More | specified |  | built | Secondary column per section 4 (groups, rows 60, tiles, live lines, Join requests badge, plan card), first item opens by default. The pane shows the repo page for the item (the designed pane layouts are not built yet). |

## Business · More

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO | More | specified |  | built | Secondary column per section 4 (groups, rows 60, tiles, live lines, Join requests badge, plan card), first item opens by default. The pane shows the repo page for the item (the designed pane layouts are not built yet). |
| WB-TE | Team | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-TE.1 | Person | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-TE.2 | Join requests | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-MO.1 | Billing | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-MO.2 | Locations | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-SE.1 | Two-factor | NEW · to build | global rules | built | Two-factor opens in the Settings pane (repo screen); its sheets are side sheets. |
| WB-SE.2 | Close the business | NEW · to build | global rules | built | Close the business: the repo sheet as a 440 side sheet, from Settings › Data & account. |
| WB-BP | Business profile | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-CA | Calendar | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-OB | Business onboarding | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WB-SH.1 | Held share card | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WB-AW.1 | Offline banner (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WB-AW.2 | Outbox (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WB-AW.3 | Error panel (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WB-AW.4 | Message pop-up (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |

## Business · Settings

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-SE | Settings | specified |  | built | Secondary column (Appearance, Permissions, Security, Data & account, General); the pane is the repo Settings page, scrolled to the chosen section; its sub-pages open in the pane. |

## Business · More · Gym

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · GY | More | specified |  | built | Secondary column per section 4 (groups, rows 60, tiles, live lines, Join requests badge, plan card), first item opens by default. The pane shows the repo page for the item (the designed pane layouts are not built yet). |

## What is in place (shared by every node)

- **Shell** (`src/components/web/`): `WebLayout` (entered from `navigation/Layout.tsx` at 1024px and wider, client and business accounts; professionals keep their layout), `WebClientSidebar` (Web Sidebar v7) and `WebBusinessSidebar` (WB Sidebar, per business type), the rail below 1280px, `WebPageHeader`, `MobileFrame`.
- **More and Settings** (business): `WebSecondaryLayout` (column + pane). The pane shows the repo page of the selected item, centred, with its own scroll; the designed pane layouts (ST Settings Web panes) are not built yet.
- **Sheets**: `ui/BottomSheet.tsx` has a web branch: every BottomSheet-based sheet (OpsSheet, BizSheet, MasterSheet, KitSheet…) is a 440 side sheet from the inline end, full height, Esc / X / click outside close, focus returns. Custom sheets not built on BottomSheet (CalendarPickerSheet, NoDeviceSheet, AddMetricSheet, BiomarkerCaptureFlow, FileViewerSheet, FolderParts, FilterPopup…) still open as bottom sheets inside the column: to do per page.
- **Centred popups**: `ui/CentredPopup.tsx` and `ui/ConfirmCard.tsx` are 400 wide from 1024px (a designed wider popup keeps its width).
- **Web pages**: a route gets its web layout with `withWeb(Mobile, Web)` in `src/appPages.ts` and a line in `src/components/web/webPages.ts` (so the shell gives it the content area instead of the mobile column). Web page files sit beside the mobile page as `*.web.tsx`.
- **Arabic**: web-only strings in `src/i18n/ar/web.ts` (area `web`, registered in `ar/index.ts`, `catalogue.test.ts`, `scripts/arabic-review.mjs`). Sidebars, columns and side sheets mirror through logical properties; the logo stays left to right.

## QA tooling (outside the repo)

`<scratchpad>/qa-wv/`: `routes.json` (65 mobile routes), `capture.cjs`, `regress.cjs` (430 × 932 after-capture against `baseline-430/`, re-capturing both sides up to 3 times for rendering noise), `shell-check.cjs`, `svc-check.cjs`, `rules-check.cjs`, `mkfx.cjs` (proxy fixtures for the Classes, Store and Appointments types on the Gym owner; install as `rf/fixtures.json` only while checking, then delete).

## Last checks (head of this branch)

- Mobile regression at 430 × 932: **65 of 65 routes pixel-identical** to the origin/main baseline (pixelmatch threshold 0). Five routes needed a re-capture of both sides to rule out headless rendering noise (before-vs-before differed by the same amount).
- Shell: sidebars correct for client, Gym, Classes, Store and Appointments at 1440 (256) and 1024 (rail 80); zoom 200% at 1440 falls back to mobile, 125% gives the rail, 80% the full sidebar; Tab walks the sidebar, Enter navigates, the Referral popup opens and Esc returns focus; Arabic puts the sidebar and the More column on the right. No console errors other than the read-only proxy refusing writes (profile row, streak seeding, chat delivered marks).
- tsc, tests (3792), oxlint (0 errors, 381 warnings = main), vite build: passing.

## Resume here

1. Business pages next, in this order (each: reference file + frames in INDEX.md, `*.web.tsx` beside the mobile page, `withWeb` + `webPages.ts`, verify at 1440 and 1024 with DOM measurements): WB-HO · GY Dashboard (WB-HO Dashboard Web v4), WB-FD Front desk (v4), WB-AN Analytics (v5), WB-MA Marketplace (v2) + Listing sheets, WB-CS-SC Schedule (v2) + Session (v2) + Sheets (v2), WB-HO · CS and · ST dashboards, WB-ST-OR Orders (v2) + Store Extras, WB-ST-PR Products (v2) + Product editor, WB-ST-AP Appointments (v2) + Add appointment (+ menus).
2. The designed More / Settings panes (ST Settings Web: Roles and permissions, policies, payments, notifications, export, subscription; Settings Appearance / Permissions / Security / Data & account / General) in place of the repo pages in the pane.
3. Client pages: WC-HO Home (v12), WC-FO Food (v8), WC-WO Workout (v13, Routines "nothing selected" = Option A), WC-HE Health (v5) and Records (v3), WC-MI Mind (v5; Achievements keep 5 tiers), WC-PR (v3), WC-CO (v3), WC-MO More (v7: Profile list-detail, Calendar, Messages, Referral page, Premium), WC-OB Onboarding (v4). The client More column (decision 4) is not built: on web, /app/more still shows the mobile More.
4. Before the PR leaves draft: re-run `regress.cjs` (0 differing routes), `git diff origin/main --stat` review, zoom / keyboard / RTL / per-type signed-in checks (`shell-check.cjs`), and delete `.qa-before-dist`, `dist`, `.env.harness.local`.
