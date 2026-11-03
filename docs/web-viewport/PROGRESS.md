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

- not started: 249

## Client · Home

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-HO | Home · filled | specified |  | not started |  |
| WC-HO.1 | Edit board | specified |  | not started |  |
| WC-HO.2 | Choose a date | specified |  | not started |  |
| WC-HO.3 | Add a widget | specified |  | not started |  |
| WC-HO.4 | No device connected | specified |  | not started |  |
| WC-HO.5 | Recovery-sensitive Home | specified |  | not started |  |
| WC-HO.6 | Water widget fill states | specified |  | not started |  |
| WC-HO.7 | Home · empty | specified |  | not started |  |
| WC-HO.8 | All large widgets · filled | specified |  | not started |  |
| WC-HO.10 | Reminder pop-ups | NEW · to build | global rules | not started |  |
| WC-HO.11 | Check-in and intake form sheet | NEW · to build | global rules | not started |  |
| WC-HO.12 | Referral sheets | NEW · to build | global rules | not started |  |
| WC-HO.13 | Add your date of birth | NEW · to build | global rules | not started |  |
| WC-AW.1 | Offline banner (app-wide) | NEW · to build | global rules | not started |  |
| WC-AW.2 | Outbox (app-wide) | NEW · to build | global rules | not started |  |
| WC-AW.3 | Error panel (app-wide) | NEW · to build | global rules | not started |  |
| WC-AW.4 | Message pop-up (app-wide) | NEW · to build | global rules | not started |  |
| WC-HO.9 | Professional reminders | specified |  | not started |  |

## Client · Food

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-FO.1 | Diary · filled | specified |  | not started |  |
| WC-FO.1 | Diary · empty | specified |  | not started |  |
| WC-FO.1.4 | Diary · food item nutrients | specified |  | not started |  |
| WC-FO.1.5 | Diary · full nutrient summary | specified |  | not started |  |
| WC-FO.1.1 | Meal options menu | specified |  | not started |  |
| WC-FO.1.2 | Add Food | REPO CHANGED | global rules | not started |  |
| WC-FO.1.2.1 | Add Food · search results | specified |  | not started |  |
| WC-FO.1.2.2 | Barcode · camera | specified |  | not started |  |
| WC-FO.1.2.3 | Barcode · starting | specified |  | not started |  |
| WC-FO.1.2.4 | Barcode · camera off | specified |  | not started |  |
| WC-FO.1.2.5 | Barcode · no camera | specified |  | not started |  |
| WC-FO.1.2.6 | Barcode · invalid number | specified |  | not started |  |
| WC-FO.1.3 | Recovery-sensitive Diary | specified |  | not started |  |
| WC-FO.2 | Goals & Macros · filled | specified |  | not started |  |
| WC-FO.2 | Goals & Macros · empty | specified |  | not started |  |
| WC-FO.2.1 | Dietary restriction | specified |  | not started |  |
| WC-FO.3 | Custom · filled | REPO CHANGED | global rules | not started |  |
| WC-FO.3 | Custom · empty | REPO CHANGED | global rules | not started |  |
| WC-FO.3.1 | Custom · Recipes | not designed | global rules | not started |  |
| WC-FO.3.2 | Custom · Custom Foods | not designed | global rules | not started |  |
| WC-FO.4 | Nutrient Summary · filled | specified |  | not started |  |
| WC-FO.4 | Nutrient Summary · empty | specified |  | not started |  |
| WC-FO.4.1 | Nutrient filter | specified |  | not started |  |
| WC-FO.1.2.7 | Search online | NEW · to build | global rules | not started |  |
| WC-FO.1.2.8 | Check this food | NEW · to build | global rules | not started |  |
| WC-FO.1.4.9 | Nutrition details | NEW · to build | global rules | not started |  |

## Client · Workout

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-WO.1 | Routines · filled | REPO CHANGED | global rules | not started |  |
| WC-WO.1 | Routines · nothing selected | REPO CHANGED | global rules | not started |  |
| WC-WO.1 | Routines · empty | REPO CHANGED | global rules | not started |  |
| WC-WO.1 | Routine play controls | REPO CHANGED | global rules | not started |  |
| WC-WO.1.1 | Folder & routine menus | specified |  | not started |  |
| WC-WO.1.2 | New folder | specified |  | not started |  |
| WC-WO.1.3 | Delete / switch routine | specified |  | not started |  |
| WC-WO.1.4 | Create routine | specified |  | not started |  |
| WC-WO.1.5 | Exercise library | specified |  | not started |  |
| WC-WO.1.6 | Custom exercise | specified |  | not started |  |
| WC-WO.1.7 | Per-exercise settings | specified |  | not started |  |
| WC-WO.1.8 | Session logger (in place) | specified |  | not started |  |
| WC-WO.1.9 | Logger menus | specified |  | not started |  |
| WC-WO.1.10 | Set options · RPE · pinned note | specified |  | not started |  |
| WC-WO.2 | Library tab | specified |  | not started |  |
| WC-WO.2.1 | Library · Anatomical model | specified |  | not started |  |
| WC-WO.3 | History | REPO CHANGED | global rules | not started |  |
| WC-WO.3.1 | History popups | specified |  | not started |  |
| WC-WO.4 | Metrics | REPO CHANGED | global rules | not started |  |
| WC-WO.1.11 | Play your music | NEW · to build | global rules | not started |  |
| WC-WO.5 | Programme · this week | NEW · to build | wait for v2 | not started |  |
| WC-WO.5.1 | Move a session | NEW · to build | global rules | not started |  |
| WC-WO.5.2 | Skip this day + Undo | NEW · to build | global rules | not started |  |

## Client · Health

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-HE | Overview · filled | specified |  | not started |  |
| WC-HE | Overview · empty | specified |  | not started |  |
| WC-HE.2 | Steps | specified |  | not started |  |
| WC-HE.3 | Sleep | REPO CHANGED | global rules | not started |  |
| WC-HE.7 | Weight | specified |  | not started |  |
| WC-HE.4 | Calories burned | specified |  | not started |  |
| WC-HE.1 | Water | specified |  | not started |  |
| WC-HE.5 | Heart rate | specified |  | not started |  |
| WC-HE.6 | Blood pressure | specified |  | not started |  |
| WC-HE.+ | Add Metric (top-bar +) | specified |  | not started |  |
| WC-HE.S | Devices and sources (header 'Sources') | specified |  | not started |  |
| WC-HE.G | Sources and guidelines | specified |  | not started |  |
| WC-HE.9 | Biomarkers & imaging · Biomarkers | specified |  | not started |  |
| WC-HE.9.1 | Labs | specified |  | not started |  |
| WC-HE.9.2 | Imaging | specified |  | not started |  |
| WC-HE.9.3 | History | specified |  | not started |  |
| WC-HE.9.4 | Scan a report | REPO CHANGED | global rules | not started |  |
| WC-HE.9.5 | Marker history & share | specified |  | not started |  |
| WC-HE.8 | Your health checks | specified |  | not started |  |
| WC-HE.L | Log sheets (from Add Metric) | specified |  | not started |  |
| WC-HE.9.6 | Injuries | NEW · to build | global rules | not started |  |
| WC-HE.10 | Care plan | NEW · to build | wait for v2 | not started |  |

## Client · Mind

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-MI | Mind hub | specified |  | not started |  |
| WC-MI.1 | Habits | specified |  | not started |  |
| WC-MI.2 | Journal | REPO CHANGED | global rules | not started |  |
| WC-MI.3 | Achievements | specified |  | not started |  |
| WC-MI.4 | Meditation | REPO CHANGED | global rules | not started |  |

## Client · Professionals

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-PR | Directory + profile | specified |  | not started |  |
| WC-PR.1 | Your professional | specified |  | not started |  |
| WC-PR.2 | Map | specified |  | not started |  |
| WC-PR.3 | Reviews | specified |  | not started |  |

## Client · Community

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-CO | Forum | specified |  | not started |  |
| WC-CO.1 | Post | specified |  | not started |  |
| WC-CO.2 | New post | specified |  | not started |  |
| WC-CO.3 | Access | specified |  | not started |  |
| WC-CO.4 | Courses | specified |  | not started |  |
| WC-CO.5 | Certificates | NEW · to build | wait for v2 | not started |  |
| WC-CO.5.1 | Certificate | NEW · to build | wait for v2 | not started |  |
| WC-CO.5.2 | Course no longer available | NEW · to build | global rules | not started |  |

## Client · Explore

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-EX | Discover | REPO CHANGED | wait for v2 | not started |  |
| WC-EX.1 | Gym page | REPO CHANGED | wait for v2 | not started |  |
| WC-EX.2 | Class page | REPO CHANGED | wait for v2 | not started |  |
| WC-EX.2.1 | Rate the instructor | NEW · to build | global rules | not started |  |
| WC-EX.2.2 | Review wait note | NEW · to build | global rules | not started |  |
| WC-EX.3 | My bookings | NEW · to build | wait for v2 | not started |  |
| WC-EX.3.1 | Booking paused | NEW · to build | global rules | not started |  |
| WC-EX.3.2 | Pass (rotating code) | NEW · to build | global rules | not started |  |
| WC-EX.3.3 | Pass devices | NEW · to build | global rules | not started |  |
| WC-EX.4 | My rewards | NEW · to build | wait for v2 | not started |  |
| WC-EX.5 | Points history | NEW · to build | wait for v2 | not started |  |
| WC-EX.6 | How to earn | NEW · to build | wait for v2 | not started |  |
| WC-EX.7 | Rewards | NEW · to build | wait for v2 | not started |  |
| WC-EX.7.1 | Offer | NEW · to build | wait for v2 | not started |  |
| WC-EX.7.2 | Showcase | NEW · to build | wait for v2 | not started |  |
| WC-EX.7.3 | Voucher | NEW · to build | wait for v2 | not started |  |
| WC-EX.7.4 | Redeem | NEW · to build | global rules | not started |  |
| WC-EX.8 | Purchase | NEW · to build | global rules | not started |  |

## Client · More destinations

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-MO.1 | Profile | REPO CHANGED | global rules | not started |  |
| WC-SE | Settings | REPO CHANGED | wait for v2 | not started |  |
| WC-MO.2.1 | Notifications | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | not started |  |
| WC-MO.2.2 | Two-factor authentication | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | not started |  |
| WC-MO.2.3 | Accessibility | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | not started |  |
| WC-MO.2.4 | Language | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | not started |  |
| WC-MO.2.5 | Privacy | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | not started |  |
| WC-MO.2.6 | Terms of Service | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | not started |  |
| WC-MO.3 | Calendar | specified |  | not started |  |
| WC-MO.4 | Messages | specified |  | not started |  |
| WC-MO.5 | Referral | specified |  | not started |  |
| WC-MO.6 | Centium Premium | REPO CHANGED | global rules | not started |  |
| WC-MO.1.1 | Proposals | NEW · to build | global rules | not started |  |
| WC-MO.1.2 | Become an ambassador | NEW · to build | global rules | not started |  |
| WC-MO.2.7 | Your music | NEW · to build | wait for v2 | not started |  |
| WC-MO.2.8 | Get support now | NEW · to build | wait for v2 | not started |  |
| WC-MO.2.9 | Billing and refunds | NEW · to build | wait for v2 | not started |  |
| WC-MO.4.1 | New group | NEW · to build | wait for v2 | not started |  |
| WC-MO.4.2 | Group details | NEW · to build | global rules | not started |  |
| WC-MO.4.3 | Group invitation | NEW · to build | global rules | not started |  |
| WC-MO.4.4 | Share a group | NEW · to build | global rules | not started |  |
| WC-MO.4.5 | Shared meal plan | NEW · to build | global rules | not started |  |
| WC-MO.4.6 | Forward | NEW · to build | global rules | not started |  |
| WC-MO.4.7 | Starred messages | NEW · to build | wait for v2 | not started |  |
| WC-MO.7 | Notifications | NEW · to build | wait for v2 | not started |  |

## Client · Onboarding & auth

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-OB.1 | Welcome | specified |  | not started |  |
| WC-OB.2 | Create your account | specified |  | not started |  |
| WC-OB.3 | Sign in to Centium | specified |  | not started |  |
| WC-OB.4 | Check your email | specified |  | not started |  |
| WC-OB.5 | Forgot your password? | specified |  | not started |  |
| WC-OB.6 | What brings you to Centium? | specified |  | not started |  |
| WC-OB.7 | About you | specified |  | not started |  |
| WC-OB.8 | A gentler start | specified |  | not started |  |
| WC-OB.9 | Goals and activity | specified |  | not started |  |
| WC-OB.10 | What to track | specified |  | not started |  |
| WC-OB.11 | You're all set | specified |  | not started |  |

## Client · Global search · WEB ONLY · not in repo

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-SR | Search palette · WEB ONLY · not in repo | specified |  | not started |  |

## Business · Dashboard · Gym

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · GY | Dashboard | specified |  | not started |  |
| WB-HO.1 | Needs your attention | specified |  | not started |  |
| WB-HO.2 | Your listing | specified |  | not started |  |
| WB-HO.3 | Venue switcher | specified |  | not started |  |
| WB-HO.4 | Quick action name | specified |  | not started |  |
| WB-HO.5 | Recent activity expanded | specified |  | not started |  |
| WB-HO.6 | See all activity | specified |  | not started |  |
| WB-HO.8 | Notifications | NEW · to build | wait for v2 | not started |  |

## Business · Analytics

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-AN.1 | Overview | specified |  | not started |  |
| WB-AN.1.1 | Your listing (from Live now) | specified |  | not started |  |
| WB-AN.3 | Members | specified |  | not started |  |
| WB-AN.3.1 | Growth (selected) | specified |  | not started |  |
| WB-AN.3.2 | First 90 days (selected) | specified |  | not started |  |
| WB-AN.3.3 | Visits (selected) | specified |  | not started |  |
| WB-AN.3.4 | Not seen in 14 days (selected) | specified |  | not started |  |
| WB-AN.3.5 | Plans (selected) | specified |  | not started |  |
| WB-AN.3.6 | Member codes (selected) | REPO CHANGED | global rules | not started |  |
| WB-AN.3.7 | Client outcomes (selected) | specified |  | not started |  |
| WB-AN.3.8 | Venue members (selected) | specified |  | not started |  |
| WB-AN.0.1 | Custom range | NEW · to build | global rules | not started |  |
| WB-AN.3.9 | Booking pauses | NEW · to build | global rules | not started |  |

## Business · Front desk

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-FD.1 | Entries | specified |  | not started |  |
| WB-FD.1.1 | Checking in at | specified |  | not started |  |
| WB-FD.1.2 | Check someone in | REPO CHANGED | global rules | not started |  |
| WB-FD.1.3 | Scan a pass | REPO CHANGED | global rules | not started |  |
| WB-FD.2 | Passes and renewals | specified |  | not started |  |
| WB-FD.2.1 | Renewal row menu · End membership | specified |  | not started |  |
| WB-FD.3 | Memberships | specified |  | not started |  |
| WB-FD.3.1 | New Plan · Archive plan | specified |  | not started |  |

## Business · Global search · WEB ONLY · not in repo

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-SR | Search palette · WEB ONLY · not in repo | specified |  | not started |  |

## Business · Schedule (navbar slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-CS-SC | Schedule · List | specified |  | not started |  |
| WB-CS-SC.1 | Schedule · Week | specified |  | not started |  |
| WB-CS-SC.2 | Add / Edit class | REPO CHANGED | global rules | not started |  |
| WB-CS-SC.3 | Class page · Bookings | specified |  | not started |  |
| WB-CS-SC.4 | Card ⋮ menu | specified |  | not started |  |
| WB-CS-SC.5 | Needs attention · expanded | specified |  | not started |  |
| WB-CS-SC.6 | Cancel class | specified |  | not started |  |
| WB-CS-SC.7 | Substitute · Message members | specified |  | not started |  |
| WB-CS-SC.8 | Class rules | specified |  | not started |  |
| WB-CS-SC.9 | Share this week's schedule | specified |  | not started |  |
| WB-CS-SC.3.1 | No-show booking pause | NEW · to build | global rules | not started |  |

## Business · Dashboard · Classes

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · CS | Dashboard | specified |  | not started |  |

## Business · More · Classes

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · CS | More | specified |  | not started |  |

## Business · Marketplace tabs (shared)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MA.1 | Overview | specified |  | not started |  |
| WB-MA.2 | Showcase (gym / classes) | specified |  | not started |  |
| WB-MA.3 | Offers | specified |  | not started |  |
| WB-MA.4 | Performance | specified |  | not started |  |
| WB-MA.5 | Sheets and popups | partial | global rules for the sheets, menus and confirms; wait for v2 for the Photos, Preview and O | not started |  |
| WB-MA.6 | See all | NEW · to build | wait for v2 | not started |  |
| WB-MA.7 | Redeem a voucher | NEW · to build | wait for v2 | not started |  |

## Business · Orders (navbar slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-OR | Orders tabs | specified |  | not started |  |
| WB-ST-OR.1 | Order detail | specified |  | not started |  |
| WB-ST-OR.2 | Return detail | specified |  | not started |  |
| WB-ST-OR.3 | See all lists | specified |  | not started |  |
| WB-ST-OR.4 | Cancel order · Deny return · Refund | specified |  | not started |  |

## Business · Products (navbar slot 4)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-PR | Products · Showcase | specified |  | not started |  |
| WB-ST-PR.1 | Product editor | specified |  | not started |  |
| WB-ST-PR.2 | Item photo · Delete item | specified |  | not started |  |
| WB-ST-PR.3 | Category See all | specified |  | not started |  |

## Business · Dashboard · Store

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · ST | Dashboard | specified |  | not started |  |

## Business · More · Store

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · ST | More | specified |  | not started |  |

## Business · Appointments (Appointments variant, slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-AP | Appointments | specified |  | not started |  |
| WB-ST-AP.1 | Appointment detail | specified |  | not started |  |
| WB-ST-AP.2 | Add appointment | specified |  | not started |  |
| WB-ST-AP.3 | Services and free slots | specified |  | not started |  |
| WB-ST-AP.4 | Day list · day strip | specified |  | not started |  |
| WB-ST-AP.5 | Service and With menus · Time wheel (Day calendar to come) | partial | global rules | not started |  |
| WB-ST-AP.6 | New service · Add free slots | specified |  | not started |  |
| WB-ST-AP.7 | Cancel appointment | specified |  | not started |  |

## Business · More · Appointments

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · AP | More | specified |  | not started |  |

## Business · More

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO | More | specified |  | not started |  |
| WB-TE | Team | NEW · to build | wait for v2 | not started |  |
| WB-TE.1 | Person | NEW · to build | wait for v2 | not started |  |
| WB-TE.2 | Join requests | NEW · to build | wait for v2 | not started |  |
| WB-MO.1 | Billing | NEW · to build | wait for v2 | not started |  |
| WB-MO.2 | Locations | NEW · to build | wait for v2 | not started |  |
| WB-SE.1 | Two-factor | NEW · to build | global rules | not started |  |
| WB-SE.2 | Close the business | NEW · to build | global rules | not started |  |
| WB-BP | Business profile | NEW · to build | wait for v2 | not started |  |
| WB-CA | Calendar | NEW · to build | wait for v2 | not started |  |
| WB-OB | Business onboarding | NEW · to build | wait for v2 | not started |  |
| WB-SH.1 | Held share card | NEW · to build | global rules | not started |  |
| WB-AW.1 | Offline banner (app-wide) | NEW · to build | global rules | not started |  |
| WB-AW.2 | Outbox (app-wide) | NEW · to build | global rules | not started |  |
| WB-AW.3 | Error panel (app-wide) | NEW · to build | global rules | not started |  |
| WB-AW.4 | Message pop-up (app-wide) | NEW · to build | global rules | not started |  |

## Business · Settings

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-SE | Settings | specified |  | not started |  |

## Business · More · Gym

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · GY | More | specified |  | not started |  |

## Resume here

- Shell not built yet. Next: the web shell (sidebars, rail, page header, MobileFrame).
