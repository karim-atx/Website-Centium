# Website viewport · Professional v1 (+ Addendum A, wide-screen rule): progress

Handover: `handoff-webview-pro-v1` (C:\Users\11User\Downloads\handoff-webview-pro-v1, Professional UI v1 of 2026-11-05 with Addendum A of 2026-11-06). Branch `feat/web-viewport-pro-v1` from main fd08a94b, one PR into main. Web layouts apply only from 1024px (`useWebLayout()`); below that every screen is main's.

Statuses: **not started** · **built** (web layout in place) · **verified** (checked against the reference file and frames at 1440 × 900 and 1024 × 768, and 1920 × 1080 for the wide-screen rule, in the CSV's states) · **mobile layout** (no web design yet, or "wait for v2": the current mobile screen, fully working, in the web shell's centred column) · **skipped** (needs a backend change; reason in the notes).

## Counts

- built: 17
- not started: 113
- not built: 1

## Decisions as applied

- Section 6 items 1 to 14, 16 and 17 approved (17: secondary actions in side sheets kept as drawn). The side-sheet standard (item 1) is the shared BottomSheet's web branch from the Client + Business build: every professional bottom sheet already opens as the 440 side sheet from 1024px.
- Item 2, 3, 4: More and Settings are secondary columns; Settings sits above More in the sidebar; Messages, Explore, Community, Practice insights and Businesses are left out of the web More list (they are sidebar pages). Profile is pinned in the sidebar, so it is not in the More list either.
- Item 6: the meal-plan week builder opens in Week view on web, Day | Week toggles, saving stays per day (not built yet; see the Meal plans rows).
- Item 15 (Global search): later. Not built, no backend work, no Search item in the sidebar.
- Item 16 / section 2.1: the web content caps grow from 1280 to 1600 (WEB_CONTENT_MAX) on the Client, Business and Professional web pages; text-heavy panes (Settings, Account, More panes) keep 1280 (WEB_READING_MAX). At 1440 and 1024 the content area is narrower than both caps, so the designed frames are unchanged.
- 7.2 Explore in the Professional sidebar opens /app/pro/marketplace (as More › Explore does in the app).
- 7.2 Messages: ProMessages is rendered by the shared /app/messages route (App.tsx `<Route path="/app/messages" element={<Messages />} />`); the sidebar's Messages links there.
- 7.2 Business billing (WP-MO.11) stays a section of the Subscription pane, for a professional with a business base plan, as in the app.
- 7.3: web-only copy says Click where the handover lists it; the setting name "Bigger tap targets" is unchanged; mobile copy unchanged.
- Settings sections follow the repo Settings page for clients and professionals alike (Help, Appearance, Permissions, Connected devices for clients only as in the repo, Security, Practice for professionals between Security and Data & account as in the repo and section 4, Data & account, General, Legal). The ST Settings model's pro list leaves out Help, Your music, Crisis lines, Billing and refunds and the Legal rows; they are kept because the repo shows them to professionals (lane gating stays as the repo has it).
- No Database, Admin or App change.

## Mobile regression

Baseline: 233 routes captured at 430 × 932 before any code change, from a harness build of origin/main fd08a94b (headless Chrome, fixed clock 2026-11-06 10:00 +02:00, reduced motion, animations zeroed, network idle), through the read-only proxy, signed in as the local fixture accounts: client, gym (business), and one professional per lane (coach_instructor = Full coaching, dietitian = Nutrition, doctor = Clinical overview). Routes: every mobile route in the CSV per lane (client ids resolved to each lane account's first client), the 65 Client and Business routes of the previous build, and the Addendum's Client Settings and Explore routes. Result after each stage: see the PR.

## Professional · COMMON

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WP-NAV | Home · Sidebar · Home icon | specified | every /app/pro route | built | WebProSidebar: rows 44 (40 in the rail), MORE caps label, slot 4 per lane, Settings then More, Profile pinned, no Search (decision 15). Checked live per lane at 1440 and 1024. |
| WP-HO.1 | Home · Invite clients | specified | /app/pro/invite | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-HO.2 | Home · Notifications hub | specified | /app/pro (header bell) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-HO.3 | Home · Trend ring interactions | specified | /app/pro | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-HO.4 | Home · Requests | specified | /app/pro (Requests in the hub) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL | Clients · Clients | specified | /app/pro/clients | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.1 | Clients · Client page · Overview | specified | /app/pro/clients/:id/overview | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.2 | Clients · Client page · Plan | specified | /app/pro/clients/:id/plan | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.3 | Clients · Client page · Progress | specified | /app/pro/clients/:id/progress | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.4 | Clients · Client page · Sessions | specified | /app/pro/clients/:id/sessions | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.5 | Clients · Client page · Notes | specified | /app/pro/clients/:id/notes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.6 | Clients · Client page · Files | specified | /app/pro/clients/:id/files | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.2 | Clients · History sheet | specified | /app/pro/clients/:id (⋮ Change history) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.3 | Clients · Add client flows | specified | /app/pro/clients (Add client) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.4 | Clients · Requests | specified | /app/pro/clients (Requests segment) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.5 | Clients · Roster controls | specified | /app/pro/clients | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.6 | Clients · Row menu and sheets | specified | /app/pro/clients | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.1 | Calendar · Month | specified | /app/pro/calendar | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.2 | Calendar · Week | specified | /app/pro/calendar | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.3 | Calendar · Day | specified | /app/pro/calendar | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.4 | Calendar · Year | specified | /app/pro/calendar | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.5 | Calendar · Availability | specified | /app/pro/calendar/availability | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.6 | Calendar · Add session | specified | /app/pro/calendar (New session) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.7 | Calendar · Session sheet | specified | /app/pro/calendar (session tap) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.8 | Calendar · Session types and time off | specified | /app/pro/calendar/availability | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CA.9 | Calendar · Bookings and events | specified | /app/pro/calendar/availability · /app/pro/calendar | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO | More · More hub | specified | /app/more | built | The More column (360 / 300) with the repo's groups per lane, descriptions from fetchMoreSummary, Verified chip, stars, care-network count; ↗ rows open their own pages; plan card pinned. The first item (Credentials) opens by default. |
| WP-MO.1 | More · Businesses | specified | /app/more/businesses · /app/more/businesses/:id | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.2 | More · Care network | specified | /app/more/care-network | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.3 | More · Consent | specified | /app/more/consent | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.4 | More · Credentials | specified | /app/more/credentials | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.5 | More · Edit profile | specified | /app/more/edit-profile | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.6 | More · Forms | specified | /app/more/forms | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.7 | More · Note templates | specified | /app/more/note-templates | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.8 | More · Payments | specified | /app/more/payments | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.9 | More · Practice insights | specified | /app/more/practice-insights | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.10 | More · Practice settings | specified | /app/more/practice/* (Settings › Practice) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.11 | More · Business billing | specified | /app/subscription (section of ProSubscription) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.12 | More · Subscription | specified | /app/subscription | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.13 | More · Public profile | specified | /app/more/public-profile | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.14 | More · Reviews | specified | /app/more/reviews | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.15 | More · Services | specified | /app/more/services | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.16 | More · Templates | specified | /app/more/templates | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.17 | More · Where you work | specified | /app/more/where-you-work | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO.18 | More · Messages | specified | /app/messages (own route; path from the More routes comment) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-SE | Settings · Settings | specified | /app/settings/* | built | Shared Settings column; one section per pane (?section=), reading width 1280. |
| WP-SR | Global search · WEB ONLY · not in repo · Search palette · WEB ONLY · not in repo | specified | none (web only, no mobile route) | not built | Karim's decision: later. |

## Professional · FULL COACHING

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WP-LI.1 | Library · Programmes | specified | /app/pro/library/programmes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.2 | Library · Meal plans | specified | /app/pro/library/meal-plans | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.3 | Library · Programme detail | specified | /app/pro/library/programmes (programme open, search params) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.3.1 | Library · Progress | specified | /app/pro/library/programmes (programme › Progress) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.3.2 | Library · Client's copy | specified | /app/pro/library/programmes (client's copy) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.3.3 | Library · Workout log | specified | /app/pro/library/programmes (workout log) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.4 | Library · Templates and editor | partial | /app/pro/library/programmes (template editor) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.5 | Library · Assign and targets | specified | /app/pro/library/programmes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.6 | Library · Workouts and Exercises chips | specified | /app/pro/library/programmes (chips) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.7 | Library · Meal plan screens | specified | /app/pro/library/meal-plans (plan open: ?plan=, ?day=) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-LI.7.3 | Library · Meal plan · week builder | specified | web only (proposed: the PlanBuilder route with a week view, e.g. ?view=week) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-HO · FC | Home · Full coaching · Home | specified | /app/pro | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO · FC | More · Full coaching · More | specified | /app/more | built | Programme and meal-plan templates ↗ Library. |

## Professional · NUTRITION

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WP-NU-MP.1 | Meal plans · Plans | specified | /app/pro/meal-plans/plans | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.2 | Meal plans · Journals | specified | /app/pro/meal-plans/journals | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.2.1 | Meal plans · Date picker | specified | /app/pro/meal-plans/journals | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.3 | Meal plans · Recipes | specified | /app/pro/meal-plans/recipes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.3.1 | Meal plans · Recipe detail | specified | /app/pro/meal-plans/recipes (recipe open) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.3.2 | Meal plans · New recipe · creating | specified | /app/pro/meal-plans/recipes (New recipe) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.4 | Meal plans · Targets | specified | /app/pro/meal-plans/targets | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.5 | Meal plans · New meal plan sheet | specified | /app/pro/meal-plans/plans (New meal plan) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.6 | Meal plans · Assign sheet | specified | /app/pro/meal-plans/plans (template ⋮ Assign) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.7 | Meal plans · Plan builder | specified | /app/pro/meal-plans/plans (plan open: ?plan=, ?client=, ?day=) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.8 | Meal plans · Journal feedback sheets | specified | /app/pro/meal-plans/journals (entry open) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.9 | Meal plans · Recipe sheets | specified | /app/pro/meal-plans/recipes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-NU-MP.10 | Meal plans · Menus and confirm | specified | /app/pro/meal-plans/plans · /recipes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-HO · NU | Home · Nutrition · Home | specified | /app/pro | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO · NU | More · Nutrition · More | specified | /app/more | built | Meal-plan templates ↗ Meal plans; Note templates. |
| WP-CL.1.1 · NU | Client page · Nutrition · Overview | specified | /app/pro/clients/:id/overview | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.2 · NU | Client page · Nutrition · Plan | specified | /app/pro/clients/:id/plan | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.3 · NU | Client page · Nutrition · Progress | specified | /app/pro/clients/:id/progress | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CL.1.5 · NU | Client page · Nutrition · Notes | specified | /app/pro/clients/:id/notes | not started | Meanwhile its mobile screen works in the web shell's centred column. |

## Professional · CLINICAL OVERVIEW

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WP-CO-IN.1 | Insights · Activity | specified | /app/pro/insights/activity | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.2 | Insights · Nutrition | specified | /app/pro/insights/nutrition | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.3 | Insights · Vitals | specified | /app/pro/insights/vitals | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.4 | Insights · Biomarkers | specified | /app/pro/insights/biomarkers | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.5 | Insights · All patients roster | specified | /app/pro/insights/nutrition (picker: All patients) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.6 | Insights · Nutrient analysis | specified | /app/pro/insights/nutrition (Nutrient analysis) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.7 | Insights · Nutrition targets · read only | specified | /app/pro/insights/nutrition (Nutrition targets) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.8 | Insights · Vitals sub-views | specified | /app/pro/insights/vitals (chip) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.9 | Insights · Ask to share sheet | specified | /app/pro/insights/biomarkers (No lab results shared) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-IN.10 | Insights · Picker and menus | specified | /app/pro/insights/* | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CL.1.1 | Patient page · Overview | specified | /app/pro/clients/:id/overview | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CL.1.2 | Patient page · Care plan | specified | /app/pro/clients/:id/care-plan | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CL.1.3 | Patient page · Health records | specified | /app/pro/clients/:id/health-records | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CL.1.4 | Patient page · Trends | specified | /app/pro/clients/:id/trends | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CL.1.5 | Patient page · Appointments | specified | /app/pro/clients/:id/appointments | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CL.1.6 | Patient page · Notes | specified | /app/pro/clients/:id/notes | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CN | Care network · Care network | specified | /app/more/care-network | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CN.1 | Care network · Refer a client | specified | /app/more/care-network (Refer) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CN.2 | Care network · Decline / Withdraw / Ask support | specified | /app/more/care-network (referral open) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-CO-CN.3 | Care network · Add a colleague | specified | /app/more/care-network (Add a colleague) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-HO · CO | Home · Clinical overview · Home | specified | /app/pro | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WP-MO · CO | More · Clinical overview · More | specified | /app/more | built | Registration and licence; Patients and forms; Clinical note and Referral templates. |
| WP-CL · CO | Patients (Clients page) · Patients list | specified | /app/pro/clients | not started | Meanwhile its mobile screen works in the web shell's centred column. |

## Client · Settings

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WC-SE | Settings | specified | /app/settings (Help: /app/settings/help; Devices and sources: /app/settings/devices) | built | Help first (opens /app/settings/help in the pane); sections as panes; Contact us / Report a bug / Rate this app as centred popups; Change password and Delete account as 440 side sheets from Data & account; refund policy opens the Legal page's refund section in a new tab; Community guidelines pane with the real text. |
| WC-SE | Notifications | specified | /app/settings/notifications | built | In the pane with Permissions lit; Health-check reminders too. Pane body is the repo page in the pane's centred column. |
| WC-SE | Two-factor authentication | specified | /app/settings/two-factor (setup: /app/settings/two-factor/setup) | built | In the pane with Security lit; repo page in the pane's column. |
| WC-SE | Accessibility | specified | /app/settings/accessibility | built | In the pane; repo page in the pane's column. |
| WC-SE | Language | specified | /app/settings/language | built | In the pane; repo page in the pane's column. |
| WC-SE | Privacy | specified | /app/settings/privacy | built | In the pane; repo page in the pane's column. |
| WC-SE | Terms of Service | specified | /app/settings/terms | built | In the pane; repo page in the pane's column. |
| WC-SE | Your music | specified | /app/settings/music | built | In the pane; repo page in the pane's column. |
| WC-SE | Get support now (Crisis lines) | specified | /app/get-support | built | Opens in the pane (the design draws a centred popup over Settings; not yet). |
| WC-SE | Billing and refunds | specified | /app/settings/help/billing-and-refunds | built | In the pane with Billing and refunds lit. |

## Client · Explore

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WC-EX | Discover | specified | /app/marketplace (?tab=gyms/classes/rewards) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.7 | Rewards | specified | /app/marketplace?tab=rewards | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.1 | Gym page | specified | /app/marketplace/gym?id=… (MarketplaceCategoryPage renders GymPage) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.3.2 | Pass (rotating code) | specified | opened from the gym page and My bookings (Show pass) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.2 | Class page | specified | /app/marketplace/class?id=… (MarketplaceCategoryPage renders ClassPage; ?booked=1 after Book a class) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.3 | My bookings | specified | /app/marketplace/bookings (?tab=memberships/upcoming/past) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.3.1 | Booking paused note | specified | class page booking panel | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.3.3 | Pass devices | specified | from the pass (Your devices) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.4 | My rewards | specified | /app/marketplace/rewards/mine (?tab=active/used/expired) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.5 | Points history | specified | /app/marketplace/points/history | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.6 | How to earn | specified | /app/marketplace/points/earn | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.7.1 | Offer | specified | /app/marketplace/rewards/:offerId | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.7.2 | Showcase | specified | /app/marketplace/business?id=… | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.7.3 | Voucher | specified | /app/marketplace/vouchers/:id (?new=1) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.7.4 | Redeem dialogs | specified | over the offer page | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.2.1 | Rate the instructor | specified | from My bookings › Past (Review stub) | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.2.2 | Review wait note | specified | instructor dialog and gym Reviews | not started | Meanwhile its mobile screen works in the web shell's centred column. |
| WC-EX.8 | Purchase sheet | specified | from the gym page (Join) and the class page (Book) | not started | Meanwhile its mobile screen works in the web shell's centred column. |

## Professional · COMMON + Client · Settings

| Code | Name | Handover status | Mobile route | Status | Notes |
|---|---|---|---|---|---|
| WP-SE / WC-SE | Settings › Data & account › Account (first name, sign-in email) | REPO CHANGED | /app/settings/account | built | Account pane (see Outside the CSV). |

## Outside the CSV

- Account (/app/settings/account): a pane of the Settings layout in the Client, Professional and Business Settings (Data & account lit), same logic. Built.
- Wide-screen rule (2.1) on the Client and Business web pages already on main: caps raised (built); widget grids that are fixed 3-across keep their columns and stretch (adding a 4th column at 1920 is not done yet).
- WP-SR Global search: not built (Karim: later).

## Resume here

1. Pages are built in this order: WP-CL (Clients list-detail), WP-HO (Home per lane), WP-CA (Calendar), the client page tabs, Library / Meal plans / Insights, the More panes, Addendum A Explore. Each row above says where it stands.
2. Tooling (scratchpad wvp/): capture.cjs and routes.json (baseline-430/), shot.cjs for signed-in checks on the after build (port 4316), the read-only proxy on 54399.
