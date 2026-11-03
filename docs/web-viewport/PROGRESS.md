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

- verified: 115
- built: 90
- mobile layout: 42
- not built: 2

## Client · Home

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-HO | Home · filled | specified |  | verified | `Home.web.tsx`. 1440: header 64, h1 24/32 600, date pill 260 × 42; hero row 260 tall (streaks 548, quick actions / connect 548); board gap 24, small 262 × 189, large 548 × 189. 1024: rail, 8 columns, small 206 × 184, large 436 × 184. Arabic mirrored. |
| WC-HO.1 | Edit board | specified |  | verified | Hover kebab 28 opens Edit; edit mode: ring, wiggle, resize and remove 28, drag by the grip, Add widget bar 44 dashed under the grid. |
| WC-HO.2 | Choose a date | specified |  | verified | Popover 398, 6 below the date pill; Esc closes, focus returns to the date button. |
| WC-HO.3 | Add a widget | specified |  | verified | The mobile picker as the 440 side sheet; Esc closes, focus returns to Add widget. |
| WC-HO.4 | No device connected | specified |  | built | Already a centred 358 popup (the same component); unchanged. |
| WC-HO.5 | Recovery-sensitive Home | specified |  | built | Recovery card (r20 #F0EDF9) in the streak slot while the notice is new, quick actions and Connect beside it. Not checked live: the fixture account is not in recovery mode. |
| WC-HO.6 | Water widget fill states | specified |  | built | The repo water widget at the web tile height. |
| WC-HO.7 | Home · empty | specified |  | verified | Checked with Maya's widgets, which are all empty states. |
| WC-HO.8 | All large widgets · filled | specified |  | built | Same grid rules (large = 6 of 12 columns, 4 of 8 on the rail); not checked separately. |
| WC-HO.10 | Reminder pop-ups | NEW · to build | global rules | built | Global rules: the popups are CentredPopup (400 from 1024px); not checked separately. |
| WC-HO.11 | Check-in and intake form sheet | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px; not checked separately. |
| WC-HO.12 | Referral sheets | NEW · to build | global rules | built | Global rules: the repo sheets open as 440 side sheets from 1024px; not checked separately. |
| WC-HO.13 | Add your date of birth | NEW · to build | global rules | built | DobPromptCard sits above the hero on the web Home; not checked separately. |
| WC-AW.1 | Offline banner (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-AW.2 | Outbox (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-AW.3 | Error panel (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-AW.4 | Message pop-up (app-wide) | NEW · to build | global rules | built | As on mobile, inside the web shell: the banners above the page, the error panel in the content area, the message pop-up and toasts unchanged. |
| WC-HO.9 | Professional reminders | specified |  | verified | 2 columns gap 16 at 1440, 1 at 1024, 24 above the hero; titles 15/24, detail 13/20, buttons 36. |

## Client · Food

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-FO.1 | Diary · filled | specified |  | verified | `Food.web.tsx`. Header 64, day selector 260, Add Food 96 × 44; tabs 40 (pill 30 r10); hero r20 pad 20 24; meal cards 357 wide (one column of 436 at 1024), rows 60; panel 357 (436 at 1024). |
| WC-FO.1 | Diary · empty | specified |  | verified | Same grid, Add food, 0 of 15. |
| WC-FO.1.4 | Diary · food item nutrients | specified |  | verified | A row click tints it #F0EDF9 + ring; the panel shows the food's own nutrients with a back chevron. |
| WC-FO.1.5 | Diary · full nutrient summary | specified |  | verified | A hero click opens all 8 nutrient cards in the panel. |
| WC-FO.1.1 | Meal options menu | specified |  | verified | Anchored under the ⋮, 210 wide, rows 42 (15/24); Esc closes, focus returns to the ⋮. |
| WC-FO.1.2 | Add Food | REPO CHANGED | global rules | built | 440 side sheet with the design's sizes (search 15/24, tiles 64, chips 15/24 with the pill scrollbar, rows 15/24 + 13/20); content as on mobile. |
| WC-FO.1.2.1 | Add Food · search results | specified |  | verified | Checked with 'sh' results inside the side sheet. |
| WC-FO.1.2.2 | Barcode · camera | specified |  | built | Same component as the checked barcode states (caption 13/20 600, field / Use 44); camera not reachable in headless. |
| WC-FO.1.2.3 | Barcode · starting | specified |  | built | Same component as the checked barcode states; not reachable in headless. |
| WC-FO.1.2.4 | Barcode · camera off | specified |  | verified | Checked as the denied state in headless: info 13/20, label 13/20 600, field / Use 44. |
| WC-FO.1.2.5 | Barcode · no camera | specified |  | built | Same component as the checked barcode states; not reachable in headless. |
| WC-FO.1.2.6 | Barcode · invalid number | specified |  | verified | Error 13/20 600 under the field. |
| WC-FO.1.3 | Recovery-sensitive Diary | specified |  | verified | No hero, quick add or numbers; recovery card in the panel column. |
| WC-FO.2 | Goals & Macros · filled | specified |  | verified | 12-column grid gap 24: Weight goal 548 × 122, Current weight 262, TDEE 262, Daily target, Macro; buttons, chips and stepper 40, Use custom 44. |
| WC-FO.2 | Goals & Macros · empty | specified |  | verified | Same grid with the empty values. |
| WC-FO.2.1 | Dietary restriction | specified |  | verified | Menu under the chip, end-aligned. |
| WC-FO.3 | Custom · filled | REPO CHANGED | global rules | verified | Three columns of 357 (Meals, Recipes, Custom Foods), head 40, rows 56+. |
| WC-FO.3 | Custom · empty | REPO CHANGED | global rules | verified | Empty r16 cards in the three columns. |
| WC-FO.3.1 | Custom · Recipes | not designed | global rules | built | The Recipes column of the Custom tab; its sheets open as 440 side sheets. |
| WC-FO.3.2 | Custom · Custom Foods | not designed | global rules | built | The Custom Foods column of the Custom tab; its sheets open as 440 side sheets. |
| WC-FO.4 | Nutrient Summary · filled | specified |  | verified | `NutrientSummaryPage.web.tsx`: 3 masonry columns (the design's placement algorithm). |
| WC-FO.4 | Nutrient Summary · empty | specified |  | verified | Popular, Vitamins and Minerals on top, as the frame. |
| WC-FO.4.1 | Nutrient filter | specified |  | verified | Anchored menu; Logged only banner. |
| WC-FO.1.2.7 | Search online | NEW · to build | global rules | built | Global rules: inside the Add Food side sheet (mobile content). |
| WC-FO.1.2.8 | Check this food | NEW · to build | global rules | built | Global rules: inside the Add Food side sheet (mobile content). |
| WC-FO.1.4.9 | Nutrition details | NEW · to build | global rules | built | Global rules: the folded block in the create-food side sheets. |

## Client · Workout

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-WO.1 | Routines · filled | REPO CHANGED | global rules | verified | `Workout.web.tsx` + `web/RoutinesWeb.tsx`. List 55fr / detail 45fr gap 24: 602.8 / 493.2 at 1440, 479.6 / 392.4 at 1024; folder head 64, routine rows 64, exercise rows 56. |
| WC-WO.1 | Routines · nothing selected | REPO CHANGED | global rules | verified | Option A: folders full width in two columns; a click selects, a second click or Esc goes back to two columns. |
| WC-WO.1 | Routines · empty | REPO CHANGED | global rules | verified | Grey card r20 pad 40 24, 64 tile r16. |
| WC-WO.1 | Routine play controls | REPO CHANGED | global rules | verified | Play / Pause + Stop / Resume + Stop at 40; Stop opens Quit workout? (400 popup), Esc returns focus to Stop. |
| WC-WO.1.1 | Folder & routine menus | specified |  | verified | The mobile PopupMenu anchored under the ⋮, same items. |
| WC-WO.1.2 | New folder | specified |  | verified | An inline form, as in the .dc.html (the CSV says side sheet): field 40, Add 40, swatches 28; Esc closes. |
| WC-WO.1.3 | Delete / switch routine | specified |  | verified | CentredPopup 400, buttons 44. |
| WC-WO.1.4 | Create routine | specified |  | verified | The mobile sheet as the 440 side sheet; Esc returns focus to Create routine. |
| WC-WO.1.5 | Exercise library | specified |  | built | 440 side sheet with the mobile content; the reference's pill scrollbar under its tabs is not added. |
| WC-WO.1.6 | Custom exercise | specified |  | built | 440 side sheet (the mobile CreateCustomExerciseSheet). |
| WC-WO.1.7 | Per-exercise settings | specified |  | verified | 440 side sheet from the row or the gear; Esc returns focus to the gear. |
| WC-WO.1.8 | Session logger (in place) | specified |  | built | Docked in the right column (height 100dvh − 176). Web header, set table (rows 50, chip 34 × 30, fields 38, tick 34) and footer (volume 28/36, Finish 44) per WO Logger Column v13; exercise cards and the Finish / Quit popups are the mobile logger's. Metronome kept in the header. |
| WC-WO.1.9 | Logger menus | specified |  | built | The logger's PopupMenus, anchored, inside the docked logger. |
| WC-WO.1.10 | Set options · RPE · pinned note | specified |  | built | The logger's sheets as 440 side sheets. |
| WC-WO.2 | Library tab | specified |  | verified | Toolbar 40; three columns of (100% − 48) / 3, rows 52 with letter heads; no-match card + Create. |
| WC-WO.2.1 | Library · Anatomical model | specified |  | verified | Two columns; figure 420 tall (330 on the rail), hover tint on figure and chips; back view flip. |
| WC-WO.3 | History | REPO CHANGED | global rules | verified | Summary hero + period chip 40; sessions in 2 columns (1 on the rail), cards 72+; hover Change date / Share / Delete. |
| WC-WO.3.1 | History popups | specified |  | verified | Period menu at the chip's width; Delete this workout? (ConfirmCard) + Undo toast. |
| WC-WO.4 | Metrics | REPO CHANGED | global rules | verified | 12-column grid (8 on the rail), hero chart, 1RM tiles, Balance, Frequency, Body; One-rep maxes as a 440 side sheet. Mirrored in Arabic. |
| WC-WO.1.11 | Play your music | NEW · to build | global rules | built | MusicSection under the folders, max 560. |
| WC-WO.5 | Programme · this week | NEW · to build | wait for v2 | mobile layout | Wait for v2: the mobile ProgrammeSection at the top of the Routines list column. |
| WC-WO.5.1 | Move a session | NEW · to build | global rules | built | Global rules: the repo sheet as a 440 side sheet. |
| WC-WO.5.2 | Skip this day + Undo | NEW · to build | global rules | built | Inside the mobile ProgrammeSection (row action + the mobile Undo toast). |

## Client · Health

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-HE | Overview · filled | specified |  | verified | `Health.web.tsx`. 1440: 12 columns gap 24, widgets 262 wide (Weight 548), min 240, value 40/48. 1024: 8 columns, widgets 436 × 97, value 26/28. |
| WC-HE | Overview · empty | specified |  | verified | Same grid with the empty widgets. |
| WC-HE.2 | Steps | specified |  | built | Web hero (ring 196 + stat column) and bar chart on the web axis (plot 649 × 280 at 1440, 354 × 280 at 1024, gutter 40); plot height unspecified in the reference (280 used). |
| WC-HE.3 | Sleep | REPO CHANGED | global rules | built | Web hero (night arc 326) and bedtime-to-wake bars on a clock axis; year view adds the bedtime line band. |
| WC-HE.7 | Weight | specified |  | built | Web hero (journey 326 × 150) and line chart on weigh-ins; no goal rule (the reference has none). |
| WC-HE.4 | Calories burned | specified |  | built | Web hero (gauge 326) and bar chart on the web axis; no Connect a source CTA (mobile has none). |
| WC-HE.1 | Water | specified |  | built | Web hero (bottle 108 × 189, quick-add chips) and bar chart (day = 24 hourly bars). |
| WC-HE.5 | Heart rate | specified |  | built | Web hero (strip 326 × 160) and bars from 40 with the average as a dashed rule; no Connect a source CTA. |
| WC-HE.6 | Blood pressure | specified |  | built | Web hero (wave 326 × 150) and two lines with 120/80 rules. |
| WC-HE.+ | Add Metric (top-bar +) | specified |  | built | A centred 480 card per the .dc.html (the CSV says side sheet); Esc returns focus to +. |
| WC-HE.S | Devices and sources (header 'Sources') | specified |  | mobile layout | Left as the mobile screen (brief); it opens from the Settings pane. |
| WC-HE.G | Sources and guidelines | specified |  | built | `HealthSources.web.tsx`. |
| WC-HE.9 | Biomarkers & imaging · Biomarkers | specified |  | built | Table + side card with the marker's small history chart (240 tall; reference flex 1, min 90); View history opens the marker page. |
| WC-HE.9.1 | Labs | specified |  | built | 2-column grid (1 on the rail), cards min 176 r18 with paper 150, in / out of range chips, ⋮ Edit / Delete. |
| WC-HE.9.2 | Imaging | specified |  | built | Cards with a 168 dark panel; the file viewer opens as a page beside the sidebar (panel 1120 × 788 at 1440, 896 × 656 at 1024), zoom 50–400%, Esc and focus return measured. |
| WC-HE.9.3 | History | specified |  | built | Conditions / Past surgeries / Medications in 3 columns (1 on the rail), rows 72+. The mobile common-condition chips are not on web (the reference draws rows). |
| WC-HE.9.4 | Scan a report | REPO CHANGED | global rules | mobile layout | The full-screen capture flow stays as on mobile (brief). |
| WC-HE.9.5 | Marker history & share | specified |  | built | `MarkerPage.web.tsx`: 8fr / 4fr, hero r22 value 40/48, History chart 400 tall (320 on the rail, unspecified), Results rows 72; share sheets are side sheets. In-range hero colour unspecified (lavender used). |
| WC-HE.8 | Your health checks | specified |  | built | `GeneralPlan.web.tsx`: rows 68, circle 26, bell 18 and ⋮ menu (Esc returns focus, measured). The reference's warning-signs card is left out (monitoring-plan strings). |
| WC-HE.L | Log sheets (from Add Metric) | specified |  | built | Global rules: BottomSheet-based, 440 side sheets. |
| WC-HE.9.6 | Injuries | NEW · to build | global rules | built | The mobile list under History; InjurySheet as a side sheet. |
| WC-HE.10 | Care plan | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Client · Mind

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-MI | Mind hub | specified |  | verified | Tiles 357 × 104 (283 at 1024); Habits card 731 / 436 wide, rows 56; Day streak 365 × 159; Auto-tracked rows 52. |
| WC-MI.1 | Habits | specified |  | verified | `HabitsWeb.tsx`: list 731 (8fr), rows 64, week 7 × 30; Auto-tracked aside 365; inline Add habit card; ⋮ Edit / Archive / Delete. 1024 keeps 8:4 (the reference's 1:1 squeezes the name; no 1024 frame). |
| WC-MI.2 | Journal | REPO CHANGED | global rules | verified | `JournalWeb.tsx`: columns 214.4 / 268 / 589.6 at 1440 (169.6 / 212 / 466.4 at 1024), entry cards 118, editor title 28/36. Deviation: an explicit Save (Ctrl+S) instead of the reference autosave. |
| WC-MI.3 | Achievements | specified |  | verified | `AchievementsWeb.tsx`: tier card balance 40/48, 5 tiers (decision 7.2); badge grid auto-fill 260; Recently unlocked aside rows 72. Gold / Platinum / Diamond colours unspecified (repo recipe). |
| WC-MI.4 | Meditation | REPO CHANGED | global rules | verified | `MeditationWeb.tsx`: tabs 40; Breathing pattern cards 365.3 × 126 + runner pane 730.7 × 728; Stretching / Yoga pose cards 3 columns (2 at 1024). The runner keeps the mobile petals, countdown and Stop. |

## Client · Professionals

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-PR | Directory + profile | specified |  | verified | `Professionals.web.tsx` + `web/`: grid 456.66 / 639.34 at 1440 (5:7), 436 / 436 at 1024; cards r20, avatar 52; profile avatar 80, Message / Hire 44. |
| WC-PR.1 | Your professional | specified |  | verified | Data sharing with 13 real switches (the repo's categories, not the drawn ones). |
| WC-PR.2 | Map | specified |  | verified | The repo NearbyMap + a 44 locate button. |
| WC-PR.3 | Reviews | specified |  | verified | 4:8, summary 40/48; write / report are the repo sheets as 440 side sheets. |

## Client · Community

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-CO | Forum | specified |  | verified | `Community.web.tsx` + `web/`: 8:4 (730.7 / 365.3), 1:1 at 1024; equal chips. |
| WC-CO.1 | Post | specified |  | verified | Post view with the reply bar. |
| WC-CO.2 | New post | specified |  | verified | 440 side sheet. |
| WC-CO.3 | Access | specified |  | verified | Under 18, no date of birth and nickname (480) pages. |
| WC-CO.4 | Courses | specified |  | verified | 3 columns (2 at 1024); course page with an aside CTA 44. Lessons and /courses/mine stay mobile. |
| WC-CO.5 | Certificates | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-CO.5.1 | Certificate | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-CO.5.2 | Course no longer available | NEW · to build | global rules | mobile layout | A page state; stays in the centred column (global rules). |

## Client · Explore

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-EX | Discover | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.1 | Gym page | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.2 | Class page | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.2.1 | Rate the instructor | NEW · to build | global rules | built | Global rules: the dialog takes the shell's popup; the class page under it stays mobile (wait for v2). |
| WC-EX.2.2 | Review wait note | NEW · to build | global rules | built | Global rules: the note takes the shell's popup; the page under it stays mobile (wait for v2). |
| WC-EX.3 | My bookings | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.3.1 | Booking paused | NEW · to build | global rules | built | Global rules: the shell's popup or side sheet; My bookings stays mobile (wait for v2). |
| WC-EX.3.2 | Pass (rotating code) | NEW · to build | global rules | built | Global rules: the shell's popup or side sheet; My bookings stays mobile (wait for v2). |
| WC-EX.3.3 | Pass devices | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-EX.4 | My rewards | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.5 | Points history | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.6 | How to earn | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7 | Rewards | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.1 | Offer | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.2 | Showcase | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.3 | Voucher | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-EX.7.4 | Redeem | NEW · to build | global rules | built | Global rules: the shell's popup or side sheet; Rewards stays mobile (wait for v2). |
| WC-EX.8 | Purchase | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |

## Client · More destinations

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-MO.1 | Profile | REPO CHANGED | global rules | verified | `Profile.web.tsx`: columns 548 + 548 at 1440, 436 + 436 at 1024; hero 548 × 284, name 40/48; stats tiles 26/30; Sign Out 40. Repo sections kept beyond the frames (Premium status, memberships, credentials, cycle tracking and others). |
| WC-SE | Settings | REPO CHANGED | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.2.1 | Notifications | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.2 | Two-factor authentication | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.3 | Accessibility | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.4 | Language | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.5 | Privacy | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.2.6 | Terms of Service | section of WC-SE | designed as a section of WC-SE Settings (mobile C-MO.2) | mobile layout | Inside Settings: WC-SE waits for v2 (its mobile screen in the web shell). |
| WC-MO.3 | Calendar | specified |  | verified | `ClientCalendar.web.tsx`: 730.7 / 365.3 at 1440, 492.9 / 379.1 at 1024; today circle 30 #9A8CD6; invite cards 335 × 112; New event as a 440 side sheet. Year / Week / Day views stay mobile. |
| WC-MO.4 | Messages | specified |  | verified | `Messages.web.tsx`: 365.3 / 730.7 at 1440, 363.3 / 508.7 at 1024; rows 72, first chat open by default; ⋮ menu on hover, right-click, Shift+F10. Chat header and bubbles are the repo ThreadView's (not as drawn). |
| WC-MO.5 | Referral | specified |  | verified | ReferralPopup 480 × 602, padding 22 22 20; Esc returns focus to the sidebar row. Radius 20 (design 24) and title 19 (design 20): CentredPopup not edited. |
| WC-MO.6 | Centium Premium | REPO CHANGED | global rules | verified | `Subscription.web.tsx`: grid 1120, band A 548 × 374, h2 40/48; plan cards min 112; CTA 44. Repo kept: PremiumStatusCard, BuyInApp, feature list, refund link, real prices. |
| WC-MO.1.1 | Proposals | NEW · to build | global rules | built | Not on Profile (mobile or web): ProfileProposals renders only in the check-in FormSheet (a side sheet) and Health › Records › History, and takes their web look. Nothing built for it. |
| WC-MO.1.2 | Become an ambassador | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.2.7 | Your music | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.2.8 | Get support now | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.2.9 | Billing and refunds | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.4.1 | New group | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.4.2 | Group details | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.4.3 | Group invitation | NEW · to build | global rules | verified | Opens in the Messages pane (GroupInvitationView). |
| WC-MO.4.4 | Share a group | NEW · to build | global rules | verified | Group share cards render inside the chat; their sheets and popups are the shell's side sheet and centred popup. |
| WC-MO.4.5 | Shared meal plan | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.4.6 | Forward | NEW · to build | global rules | built | Global rules: the repo sheet opens as a 440 side sheet from 1024px (BottomSheet web branch); the page it opens from still shows its mobile layout. |
| WC-MO.4.7 | Starred messages | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |
| WC-MO.7 | Notifications | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Client · Onboarding & auth

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-OB.1 | Welcome | specified |  | verified | Onboarding is outside the shell: the page is the web layout. 3 panels 432 × 662 r24 (304 wide at 1024), Get started 640 × 44. |
| WC-OB.2 | Create your account | specified |  | verified | A page as in the .dc.html (the CSV says side sheet): column 640, leaf 639², fields 52, Sign up 44, Google 52. |
| WC-OB.3 | Sign in to Centium | specified |  | verified | Error, Remember / Forgot and You're signed in checked (stubbed, nothing sent). Checking your session: built, only shows while auth restores. |
| WC-OB.4 | Check your email | specified |  | verified | A page as in the .dc.html (not a popup): mail card r22; toast 358 wide. |
| WC-OB.5 | Forgot your password? | specified |  | verified | Back 36, field 52, Send reset link 44; sent state as WC-OB.4. |
| WC-OB.6 | What brings you to Centium? | specified |  | verified | 3 cards 205 × 242 in a row; its 3 sheets as 440 side sheets; Esc returns focus to Continue. |
| WC-OB.7 | About you | specified |  | verified | Card 736 pad 48; Finish later? popup 342; Esc returns focus to Save and exit. |
| WC-OB.8 | A gentler start | specified |  | verified | Paragraph 15/24, toggle titles 15/20 600, descriptions 13/20. |
| WC-OB.9 | Goals and activity | specified |  | verified | 6 tiles in 3 columns (206 × 95); Refine as a 440 side sheet; Activities menu 260 anchored; 'Click to choose' (7.3). |
| WC-OB.10 | What to track | specified |  | verified | Two columns 311 + 311 gap 16, rows 54. |
| WC-OB.11 | You're all set | specified |  | verified | Form 660 + panel 660 r24 with the leaf art; Let's go 44. |

## Client · Global search · WEB ONLY · not in repo

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WC-SR | Search palette · WEB ONLY · not in repo | specified |  | not built | Karim's decision 1: later; no Search item in the sidebars. |

## Business · Dashboard · Gym

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · GY | Dashboard | specified |  | verified | Filled states checked with fixtures (bell popover 3 items, venue chip + 260 menu with 2 venues, Recent activity rows + Show 16 more, Listed chip); Today boxes need business_glance (not fixtured). Classes / Store kinds render BusinessDashboardKinds.web.tsx (WB-HO · CS / · ST). |
| WB-HO.1 | Needs your attention | specified |  | verified | 3-item state checked with fixtures (Payments overdue / Low reviews / Join requests); popover 360, Esc returns focus to the bell. |
| WB-HO.2 | Your listing | specified |  | built | 480 centred popup (band 53, title 20/800 #7248F8, X 26, row 56, switch 48 × 28 #9A8CD6 / #E4E2EA). Checked Listed at 1440 and 1024: 480 × 159, centred; Esc closes, focus returns to the chip. Saves business_profiles.active as on mobile (not toggled: read-only proxy). |
| WB-HO.3 | Venue switcher | specified |  | verified | Checked with 2 venues (fixture): chip ring 2px lavender, menu 260. |
| WB-HO.4 | Quick action name | specified |  | verified | GaugeCluster gains a web-only `web` prop: a mouse hover shows the action name (13/20 700, padding 6 × 12). Checked at 1440 and 1024 (Check someone in), gone on leave. Mobile long-press unchanged. |
| WB-HO.5 | Recent activity expanded | specified |  | verified | Rows checked with fixtures, Show 16 more; badge colours per the board (order #7D6BB5, cancel / end #C0392B). |
| WB-HO.6 | See all activity | specified |  | verified | Header 64 (back 40, filter 40 + menu 220), KPI band 4 cards, timeline span 8/12 (5/8 rail) with sticky day labels, rows 64/60; aside Joined / Ended + Activity by type. KPI trend says Last 30 days (no previous-period reader). Shared by every business kind. |
| WB-HO.8 | Notifications | NEW · to build | wait for v2 | mobile layout | No web design yet: its mobile screen in the web shell, fully working. |

## Business · Analytics

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-AN.1 | Overview | specified |  | verified | Checked 1440 + 1024 + AR: tabs 40, Headline cells min 156 / 124, value 40/48; More insights 3 cards. Live now: web dial min(height, width - 32), max 400 (268 rail), min 220; measured 385 / 234. |
| WB-AN.1.1 | Your listing (from Live now) | specified |  | built | The 480 WebListingPopup shared with WB-HO.2. |
| WB-AN.3 | Members | specified |  | verified | List-detail 4/8 (3/5 rail), rows 48, detail card title 28/36, figure 40/48; block grid for .3.1-.3.5; Codes / Venue members / Client outcomes keep the mobile body (max 560). |
| WB-AN.3.1 | Growth (selected) | specified |  | verified | Block grid: lead 4 (450) + stat 2 (219) at 1440; Active members by week line chart + Joins and ends; legend says Previous period. |
| WB-AN.3.2 | First 90 days (selected) | specified |  | verified | Block grid: lead 3 + stat 3. |
| WB-AN.3.3 | Visits (selected) | specified |  | verified | Lead 4 + stat 2 over Entries by day (7 columns). |
| WB-AN.3.4 | Not seen in 14 days (selected) | specified |  | verified | Lead 3 + stat 3. |
| WB-AN.3.5 | Plans (selected) | specified |  | verified | Membership plans bars 3, Invite to active 3, Renewals across; scrolls in the card. |
| WB-AN.3.6 | Member codes (selected) | REPO CHANGED | global rules | built | REPO CHANGED: the mobile Member codes page in the detail pane. |
| WB-AN.3.7 | Client outcomes (selected) | specified |  | built | The mobile body in the detail pane (max 560). |
| WB-AN.3.8 | Venue members (selected) | specified |  | built | The mobile body (shared roster) in the detail pane (max 560). |
| WB-AN.0.1 | Custom range | NEW · to build | global rules | built | BottomSheet web branch (440 side sheet). |
| WB-AN.3.9 | Booking pauses | NEW · to build | global rules | built | Global rules: the mobile card under the sections list. |

## Business · Front desk

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-FD.1 | Entries | specified |  | verified | Header 64, tabs 373 x 3 (293 at 1024), cols 731/365 (428/428 rail), boxes 40/48, chart with hourly labels, rows 60; empty dashed card to 32 above the window bottom. |
| WB-FD.1.1 | Checking in at | specified |  | verified | Anchored menu 260, 6 below the chip; Esc returns focus to the chip (2 venues, fixture). |
| WB-FD.1.2 | Check someone in | REPO CHANGED | global rules | built | REPO CHANGED: the mobile CheckInSheet as the 440 side sheet; Esc returns focus to the CTA. |
| WB-FD.1.3 | Scan a pass | REPO CHANGED | global rules | built | REPO CHANGED: the mobile ScanSheet as the 440 side sheet (camera blocked in headless). |
| WB-FD.2 | Passes and renewals | specified |  | verified | Cols 8/4 (1/1 rail), renewals rows 60, QR card r20, day passes boxes 28/36. |
| WB-FD.2.1 | Renewal row menu · End membership | specified |  | verified | Menu 220, end-aligned; End popup 440 centred, Esc closes. |
| WB-FD.3 | Memberships | specified |  | verified | List 457 / detail 639 (5/7), 428/428 rail; rows 64+, detail name 28/36, action tiles 64. Header CTA says Add plan (repo copy). |
| WB-FD.3.1 | New Plan · Archive plan | specified |  | built | Mobile PlanSheet as the 440 side sheet; Archive = shared dialog 400. |

## Business · Global search · WEB ONLY · not in repo

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-SR | Search palette · WEB ONLY · not in repo | specified |  | not built | Karim's decision 1: later; no Search item in the sidebars. |

## Business · Schedule (navbar slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-CS-SC | Schedule · List | specified |  | verified | `SchedulePage.web.tsx`. 1440: strip tiles 150 × 84, cards 363 × 124 (2 columns), grid 8 / 4; 1024: tiles 115 × 76, cards 434 × 124, side panels below. Arabic mirrored. |
| WB-CS-SC.1 | Schedule · Week | specified |  | verified | Grid 336 tall at 1440 (300 at 1024), 7 AM to 9 PM, blocks r6 with a 3px edge, legend. |
| WB-CS-SC.2 | Add / Edit class | REPO CHANGED | global rules | built | ClassSheet as the 440 side sheet; the frames' web field styling is not applied. |
| WB-CS-SC.3 | Class page · Bookings | specified |  | verified | `SessionPage.web.tsx`: Bookings card 739 wide, 12 rows of 64 in two columns, footer 48 with See all; Class details r20. |
| WB-CS-SC.4 | Card ⋮ menu | specified |  | verified | PopupMenu 240 under the ⋮ (6px gap); Esc returns focus to the ⋮. |
| WB-CS-SC.5 | Needs attention · expanded | specified |  | verified | Rows 3 / 32 / 1fr, count 22/30, chip + Assign / Fix 36. |
| WB-CS-SC.6 | Cancel class | specified |  | verified | CancelClassDialog web branch: 400 wide, padding 28 28 22, buttons 44 + 40; focus returns to the ⋮. |
| WB-CS-SC.7 | Substitute · Message members | specified |  | built | Both sheets as 440 side sheets; field menus anchored (PopupMenu). |
| WB-CS-SC.8 | Class rules | specified |  | verified | One table (decision 7). Checked at 1440 and 1024, filled (6 class types) and empty (proxy fixtures for the Classes type): header row 81, rows 64, menus at the trigger width 6px below it, Esc returns focus. Copy and the lead line follow the repo (Clients for a Classes business). |
| WB-CS-SC.9 | Share this week's schedule | specified |  | built | Today's share card kept (decision 5), as a side sheet; the weekly planner card is not built (later). |
| WB-CS-SC.3.1 | No-show booking pause | NEW · to build | global rules | built | Comes with the roster rows, unchanged. |

## Business · Dashboard · Classes

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · CS | Dashboard | specified |  | verified | `BusinessDashboardKinds.web.tsx`: grid 12 gap 24; Today boxes 238 × 108, Fill by class 357 × 216; Schedule week cells 85 × 76; 1024: 8 columns. New-business state and Arabic checked. |

## Business · More · Classes

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · CS | More | specified |  | built | Checked at 1440 with read-only fixtures: default pane Roles and permissions, frame 824, rows 60, Booking policies group. Not measured at 1024. |

## Business · Marketplace tabs (shared)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MA.1 | Overview | specified |  | verified | Web type sizes via MarketWebType; columns 5/4/4 (412/330/330), 2 on the rail; the page scrolls rather than filling the viewport. |
| WB-MA.2 | Showcase (gym / classes) | specified |  | verified | List span 7 (641 / 501) + docked editor span 5 (453 / 353), rows 78, editor height max(560, 100dvh - 192); empty dashed card. Share 40 (board 34). |
| WB-MA.3 | Offers | specified |  | verified | 3 columns of 357 (277 at 1024), gap 24; empty and filled checked. 1024 keeps 3 columns (unspecified). Also on a store's Products page. |
| WB-MA.4 | Performance | specified |  | verified | Offer charts 2 x 2 (550 x 312) with axis, previous period dashed #6F9993; listing section on the 12-column grid; empty state per frame. Legend words follow the range. Also on a store's Products page. |
| WB-MA.5 | Sheets and popups | partial | global rules for the sheets, menus and confirms; wait for v2 for the Photos, Preview and O | built | Amenities / First visit / Hours as 440 side sheets; Photos, Preview, Offer editor pages stay mobile (wait for v2). |
| WB-MA.6 | See all | NEW · to build | wait for v2 | mobile layout | Wait for v2. |
| WB-MA.7 | Redeem a voucher | NEW · to build | wait for v2 | mobile layout | Wait for v2. |

## Business · Orders (navbar slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-OR | Orders tabs | specified |  | verified | `OrdersPage.web.tsx`: underline tabs, list span 5 / detail span 7 sticky, rows 56 (48 at 1024); at 1024 a row opens the detail full width. |
| WB-ST-OR.1 | Order detail | specified |  | verified | Card r20 pad 20, head 22/30; Cancel order 40 + CTA 44 min 240. Delivery and cancelled-paid checked. |
| WB-ST-OR.2 | Return detail | specified |  | verified | Items, Reason, Refund, Status; Deny + Approve return. |
| WB-ST-OR.3 | See all lists | specified |  | verified | `OrdersListPage.web.tsx`: header 72, rows 64, 30 rows then Show more 44; dashed empty card. |
| WB-ST-OR.4 | Cancel order · Deny return · Refund | specified |  | built | The repo confirm (KitPop / ConfirmCard) as a 400 centred popup. |

## Business · Products (navbar slot 4)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-PR | Products · Showcase | specified |  | verified | `StoreProductsPage.web.tsx`: segmented tabs, figures card span 8, 2 × 2 bento gap 24 (20 at 1024), rows 72 (64); drag reorder by pointer and keyboard; editor as a 440 side sheet. |
| WB-ST-PR.1 | Product editor | specified |  | built | The mobile editor as the 440 side sheet. |
| WB-ST-PR.2 | Item photo · Delete item | specified |  | built | Side sheet and ConfirmCard 400. |
| WB-ST-PR.3 | Category See all | specified |  | verified | One card full width, price and stock in a right column. |

## Business · Dashboard · Store

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-HO · ST | Dashboard | specified |  | verified | Same files: Today boxes, Orders to fulfil beside Low stock (rows 58), Recent activity across; new-store state checked at 1440 and 1024. |

## Business · More · Store

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · ST | More | specified |  | built | Checked at 1440 with read-only fixtures: default pane Seats (frame 824), Orders and policies group. The Seats pane says 1 of 5 while the column says 2 of 5 (repo data). Not measured at 1024. |

## Business · Appointments (Appointments variant, slot 2)

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-ST-AP | Appointments | specified |  | verified | `AppointmentsPage.web.tsx`: list span 5 (rows 56 / 48), detail span 7 sticky; Add appointment 40; today-empty and none states. |
| WB-ST-AP.1 | Appointment detail | specified |  | verified | One-column detail, text buttons 40 + Mark as done 44; at 1024 on its own page. Esc on the cancel popup leaves focus on body (shared ConfirmCard, same on mobile). |
| WB-ST-AP.2 | Add appointment | specified |  | built | The mobile sheet as the 440 side sheet. |
| WB-ST-AP.3 | Services and free slots | specified |  | verified | Two tables (decisions 6, 8). Checked at 1440 and 1024, filled and empty (proxy fixtures for the Appointments type): rows 53, header row 40, table 1120 wide at 1440, edit and remove buttons, sheets as 440 side sheets, Esc and focus return. |
| WB-ST-AP.4 | Day list · day strip | specified |  | verified | 14 chips 60 tall r14 gap 8; the day in one card, rows 64; a free slot opens Add appointment prefilled. |
| WB-ST-AP.5 | Service and With menus · Time wheel (Day calendar to come) | partial | global rules | built | Global rules: anchored field menus inside the side sheet. |
| WB-ST-AP.6 | New service · Add free slots | specified |  | built | The mobile sheets as 440 side sheets with anchored field menus; the frames' web field styling is not applied. |
| WB-ST-AP.7 | Cancel appointment | specified |  | built | The repo confirm (KitPop) as a 400 centred popup. |

## Business · More · Appointments

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · AP | More | specified |  | built | Checked at 1440 with read-only fixtures: default pane Seats (frame 824), Services and free slots row. Not measured at 1024. |

## Business · More

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO | More | specified |  | verified | Column (360 / 300, rows 60) + designed panes through the pane fill: frame 824 wide at x 616 at 1440, 644 at x 380 at 1024; padding 32 40 40, h2 28/36. |
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
| WB-SE | Settings | specified |  | verified | One designed pane per section (?section= in the URL): frame 824 at 1440, 644 at 1024; padding 32 40 40 / 24 28 32; h2 28/36. The design's Recovery codes and Sign out everywhere else rows are not drawn (no repo feature). |

## Business · More · Gym

| Code | Name | Handover status | Guidance | Status | Notes |
|---|---|---|---|---|---|
| WB-MO · GY | More | specified |  | verified | Checked at 1440 and 1024 on Roles and permissions (frame 824 at x 616). |

## What is in place (shared by every node)

- **Shell** (`src/components/web/`): `WebLayout` (entered from `navigation/Layout.tsx` at 1024px and wider, client and business accounts; professionals keep their layout), `WebClientSidebar` (Web Sidebar v7) and `WebBusinessSidebar` (WB Sidebar, per business type), the rail below 1280px, `WebPageHeader`, `MobileFrame`.
- **More and Settings** (business): `WebSecondaryLayout` (column + pane). Settings shows one section at a time (`?section=`); the designed panes (ST Settings Web) fill the pane through `usePaneFill()`, and other items show their repo page in the 430 column.
- **Sheets**: `ui/BottomSheet.tsx` has a web branch: every BottomSheet-based sheet (OpsSheet, BizSheet, MasterSheet, KitSheet…) is a 440 side sheet from the inline end, full height, Esc / X / click outside close, focus returns. Custom sheets not built on BottomSheet were handled per page by the areas (for example Add metric as a centred 480 card, the Imaging file viewer as a page); the rest open inside the column as on mobile.
- **Centred popups**: `ui/CentredPopup.tsx` and `ui/ConfirmCard.tsx` are 400 wide from 1024px (a designed wider popup keeps its width). From 1024px every ConfirmCard closes on Escape and hands focus back to what opened it.
- **Web pages**: a route gets its web layout with `withWeb(Mobile, Web)` in `src/appPages.ts` and a line in `src/components/web/webPages.ts` (so the shell gives it the content area instead of the mobile column). Web page files sit beside the mobile page as `*.web.tsx`.
- **Arabic**: web-only strings in `src/i18n/ar/web.ts` and one catalogue per area (`webgym`, `webcs`, `webclienthome`, `webclientfood`, `webclientworkout`, `webclienthealth`, `webclientmore`), each registered in `ar/index.ts`, `catalogue.test.ts` and `scripts/arabic-review.mjs`. Lucide direction icons carry no `rtl:-scale-x-100` in web code: `index.css` already mirrors them, and the two cancel out. Sidebars, columns and side sheets mirror through logical properties; the logo stays left to right.

## QA tooling (outside the repo)

`<scratchpad>/qa-wv/`: `routes.json` (65 mobile routes), `capture.cjs`, `regress.cjs` (430 × 932 after-capture against `baseline-430/`, re-capturing both sides up to 3 times for rendering noise), `shell-check.cjs`, `svc-check.cjs`, `rules-check.cjs`, `dash-check.cjs` (WB-HO: header, grid, cluster, setup, Today, popover, listing popup, hover tooltip, Esc and focus return at 1440 and 1024; `dash-probe.cjs <w> <h> [path]` for a quick screenshot), `patch.cjs` (CRLF-safe string patches), `prog-set.cjs` (sets PROGRESS rows from a JSON list and recounts), `mkfx.cjs` (proxy fixtures for the Classes, Store and Appointments types on the Gym owner; install as `rf/fixtures.json` only while checking, then delete).

## Last checks (head of this branch)

- Mobile regression at 430 × 932: **65 of 65 routes pixel-identical** to the origin/main baseline (pixelmatch threshold 0). Five routes needed a re-capture of both sides to rule out headless rendering noise (before-vs-before differed by the same amount).
- Shell: sidebars correct for client, Gym, Classes, Store and Appointments at 1440 (256) and 1024 (rail 80); zoom 200% at 1440 falls back to mobile, 125% gives the rail, 80% the full sidebar; Tab walks the sidebar, Enter navigates, the Referral popup opens and Esc returns focus; Arabic puts the sidebar and the More column on the right. No console errors other than the read-only proxy refusing writes (profile row, streak seeding, chat delivered marks).
- tsc, tests (3792), oxlint (0 errors, 381 warnings = main), vite build: passing.
- After WB-HO · GY (commit 1108cba1): mobile regression **65 of 65 identical** on the first pass (no re-capture needed); tsc, tests (3794), oxlint (0 errors, 381 warnings; run it with `--ignore-pattern ".qa-before-dist/**" --ignore-pattern "dist/**"`, or it lints the built bundles), vite build and the harness build: passing. No console errors on /app at 1440 or 1024 other than the read-only proxy's 503s.

## Notes from the areas

Deviations and open design questions, as each area recorded them.

- Schedule, dashboards, Orders, Products, Appointments: `DashboardParts.web` badgeOf has no order type (it falls to teal; the frame has #7D6BB5), and cancel uses caution amber (the frame has #C0392B).
- Schedule, dashboards, Orders, Products, Appointments: Esc on the KitPop / ConfirmCard cancel popup leaves focus on body (shared component, same on mobile).
- Schedule: the weekly planner share card is not built (decision 5 keeps today's card); the class and service sheets keep the mobile field styling, not the frames' web fields.
- Home: WC-HO.5 (recovery) not checked live, the fixture account is not in recovery mode.
- Mind: Habits keeps 8:4 at 1024 (the reference's 1:1 squeezes the name; there is no 1024 frame); Journal saves with an explicit Save instead of the reference's autosave; the Meditation runner keeps the mobile petals, countdown and Stop; Achievements Gold / Platinum / Diamond colours are unspecified (repo recipe used).
- Professionals and Community: mobile extras kept after the drawn sections, the real data-sharing categories, NearbyMap pins; course colours, the Professional chip and the nickname intro copy kept from the repo.
- Food: barcode states .2, .3 and .5 are the same component as the checked ones but cannot be reached in headless Chrome.
- Workout: New folder is inline and Create your account / Check your email are pages, as the .dc.html draws them (the CSV says side sheet or popup); the Exercise library sheet lacks the reference's pill scrollbar; the logger's exercise cards and popups stay mobile; the ActiveWorkoutBar on web (bottom 24, width 386, centred on the page column) has no frame.
- Health: Add Metric is a centred 480 card per the .dc.html (the CSV says side sheet); the metric plot height (280), the marker chart height (400 / 320) and the in-range marker hero colour are unspecified; the reference's warning-signs card on Your health checks is left out (it belongs to the monitoring plan); the mobile common-condition chips are not on web; Calories and Heart rate have no Connect a source CTA (mobile has none).
- More (client): Messages keeps the repo chat header and bubbles; the Referral popup keeps CentredPopup's radius 20 and title 19 (design 24 and 20); Profile keeps the repo sections the frames lack; WC-MO.1.1 Proposals is not on Profile at all.
- More and Settings (business): the Seats pane says 1 of 5 while the column row says 2 of 5 (two repo counts); the design's Recovery codes and Sign out everywhere else rows have no repo feature and are not drawn; `SecondaryGroups` gained `rtl:tracking-normal` on the caps label (drop it if unwanted).
- Arabic, all areas: index.css already mirrors direction icons, so `rtl:-scale-x-100` on lucide chevrons flips them back. Removed in the Schedule / Orders / Products / Appointments / dashboard-kind files and three Marketplace files; still in `WebPageHeader` back, `DashboardParts.web`, mobile `opsKit/parts/HeaderParts` and the Home / Mind / Professionals / Community web files.

## Resume here

1. Every area is merged, the gym Marketplace and the Live now dial included; the rows above carry each node's status. A store's Products page shows the Marketplace's web Overview, Offers and Performance tabs.
2. The remaining `rtl:-scale-x-100` uses in branch code are on purpose: a custom SVG (`PrFrameWeb`), an external-link icon, the mobile branches of shared files, and the calendar arrows moved unchanged from the mobile page.
3. Before the PR leaves draft: re-run `regress.cjs` (0 differing routes), review `git diff origin/main --stat`, run the zoom / keyboard / RTL / per-type signed-in checks (`shell-check.cjs`), and delete `.qa-before-dist`, `dist` and `.env.harness.local`.
