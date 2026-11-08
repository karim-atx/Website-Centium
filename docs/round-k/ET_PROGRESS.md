# Round K · ET: accessibility on the app's screens (website side)

Plan: `design-handover/round-k/PLAN.md` §5, decisions 12 and 13. Scope: every `/app` route at phone
width (430 × 932), as the client, one professional per lane (coach, dietitian, doctor) and the gym
business account, in English and Arabic. Desktop web layouts are out of scope. Branch
`feat/round-k-accessibility` from `8744ed49`.

## How it was checked

- **Harness:** builds of main (`8744ed49`) and of the branch, served side by side, signed in with
  locally signed tokens through the read-only proxy (54399; every bundle checked for 54399 and no
  54321). 233 routes (`routes.json` from the web viewport batch: 58 client, 49 coach, 51 dietitian,
  51 doctor, 23 gym, 1 signed out).
- **axe-core 4.x** (WCAG 2 A and AA rules), run from the test tools outside the repo, on every route.
- **Text at 200%:** a harness-only stand-in for Android WebView `textZoom`. Every text element's
  computed font-size is multiplied by 2 and kept up to date by a MutationObserver. A px line-height
  is left alone, matching the App session's measurement on the emulator (16 px body text becomes
  32 px at 2.0; line-height follows only where it is normal or unitless). The run then looks for
  sideways page scroll, clipped text (overflow hidden, ellipsis, line clamp, a clipping parent),
  text spilling out of its box, and wrapped lines whose px line-height is smaller than the text.
- **Reduced motion:** every route with `prefers-reduced-motion: reduce` emulated, and again with the
  in-app switch on (the account's `device_presentation_settings` row given as a fixture). Running
  animations are listed after load.
- **Keyboard:** a Tab walk on 12 main screens (focus order, invisible stops), and Tab or Shift+Tab
  25 times inside an opened sheet (does focus leave it, and where does Esc return it).
- **Mobile visual rule:** 430 × 932 full-page screenshots of all 233 routes from main's build and the
  branch's build, captured side by side under the same data and clock, compared pixel for pixel
  (up to three rounds per route).

## Before (main, `8744ed49`)

**axe, English, 233 routes:**

| Rule | Nodes |
| --- | --- |
| color-contrast | 2907 |
| scrollable-region-focusable | 6 |
| nested-interactive | 5 |
| aria-prohibited-attr | 3 |

No route failed to load. There were no button-name, link-name, image-alt, label, aria-*-attr or
dialog-name findings: the shared components already name their controls.

**Focus:** sheets and popups move focus in, return it on close and close on Escape. But **Tab left
an open sheet**: with "Add client" open, Tab reached the search box, the filters and the tabs
behind it, and Esc then left focus on "Needs attention".

**Text at 200% (first run, line-heights also scaled):** 13 routes scrolled sideways; 227 distinct
clipped-text patterns, mostly call-to-action labels cut off at a fixed height (46 routes) and
segmented tab labels spilling out of their tab (37 routes).

**Reduced motion:** with the operating-system setting, only the Home water card still moves. It is
deliberately slowed to 40 s per cycle, not stopped (`HomeWidget.tsx`). With the in-app switch on,
it stops.

## Fixed (all at phone width; desktop untouched unless the component is shared)

**Shared components**
- `focusTrap.ts` (new) with `BottomSheet` and `CentredPopup`: Tab and Shift+Tab stay inside the top
  dialog. A popup or menu stacked on a sheet keeps its own focus. Focus still returns to the opener
  on close.
- `CtaButton` (`PinnedCta.tsx`):
  - the label wraps instead of truncating;
  - the button keeps its height but may grow past it (`min-height: fit-content`) only when the text
    needs it;
  - the label keeps `overflow: hidden`, so glyph edges render exactly as before.
- `SegmentedTabs`: a minimum height instead of a fixed one, and labels that wrap at spaces (rows
  that scroll sideways keep `nowrap`).
- The pro `SettingsRow` subtitle wraps long unbroken text (the profile link).

**Pages**
- **Food:** each meal header was a `div role="button"` holding the meal menu's button. The row stays
  clickable; the keyboard and screen readers use a real button on the meal's name, with
  `aria-expanded`.
- **Home:** the streaks board was a `div role="button"` holding two buttons, and Enter did nothing.
  The board stays clickable; a real button on the streak count opens Mind ("{n} day streak. Open
  Mind"; Arabic «فتح العقل»).
- **Loading placeholders:** 29 labelled `aria-busy` divs with no role (business operations, orders,
  appointments, analytics, two-factor, care plan, onboarding and others) get `role="status"`.
- **Subscription (professional):** the plan carousel is a labelled region ("Plans") the keyboard
  can reach and scroll.
- **Clients roster:** the count and Select row wraps instead of scrolling the page.
- **Rewards:** the Sort and Affordable now row wraps.
- **Nutrient Summary:** the title wraps.
- **Invite clients:** the message wraps its link.
- **The in-app push banner** (`PushBanner.tsx`, #95; app only, checked statically): it already has
  a polite live region, a named button ("Notification: {title}. {line}. Open"), Enter to open and
  Escape to dismiss. **Fixed:** it no longer disappears on its timer while it has keyboard or
  screen-reader focus (WCAG 2.2.1).

## After (branch)

**axe, English, 233 routes**, on the build of the first code commit (`5cf2af35`). The status
roles came in the second commit (`244fe804`):

| Rule | Before | After |
| --- | --- | --- |
| color-contrast | 2907 | 2907 |
| scrollable-region-focusable | 6 | 0 |
| nested-interactive | 5 | 0 |
| aria-prohibited-attr | 3 | 3, then 0 after `244fe804` |

**On the final build:**
- **Arabic (58 routes, every fourth):** before, contrast 127, scrollable-region-focusable 2,
  nested-interactive 1, aria-prohibited-attr 1. After, contrast 127 and nothing else.
- **High contrast mode on (39 routes, every sixth):** contrast 12 (the default look would give
  about 486 on those routes). The 12 left:
  - the onboarding button (#FFFFFF on #AEA1DC);
  - the water chart's goal label;
  - Payment methods labels (#848487 on #F7F7FC);
  - Premium passes and the client Progress chips (#3F9165 on #E3F3E9);
  - one active tab (#FFFFFF on #A79AD5);
  - two small green labels (#3F9165 / #6F9993 on white).

**Focus:** with "Add client" open, 25 Tab and Shift+Tab presses never leave the sheet, and Esc
returns focus to "Add client", in English and in Arabic («إضافة عميل»). Focus order on the 12 main
screens is unchanged from main; the quirks are listed below.

**Reduced motion:**
- **In-app switch on (all 233 routes):** no animation runs on any route.
- **Operating-system setting:** only the Home water card, slowed to 40 s per cycle by design.

**Text at 200% (phone-accurate run):** sideways scroll on 9 routes (was 13). The causes on 4 of
them (Availability, Edit profile, Invite, Nutrient Summary) are fixed after that run. Clipped text
patterns: 59 distinct. Most remaining "spill" hits are tabs inside rows that scroll sideways (by
design).

**Mobile visual rule (final build, all 233 routes):** 232 of 233 are pixel-identical to main. **One intended difference:**
on the doctor's patient Care plan, "Add recommendation" was cut off at the default size
("Add recommendati…") in a half-width button. It now shows in full on two lines inside the same
48 px button.

## Colour contrast to WCAG AA (Karim's decision, 2026-11-08)

The decision: text reaches AA (4.5:1, or 3:1 at 24 px / 18.66 px bold) with the smallest colour
changes. Method:
- the 2901 color-contrast nodes on the PR head (233 routes, English, light) grouped by
  foreground/background pair and traced to the token, CSS variable or literal they come from;
- each colour moved in **OKLCH lightness only** (hue and chroma held) until it just clears 4.55:1
  against **every** ground it was found on, then rounded to a hex that passes;
- a token changed once rather than per component. Where the colour is also a fill, border or
  chart stroke, its existing **text twin** (`--c-*-ink` / `--thi-*`, which Tailwind's `text-*`
  utilities and the explicit ink reads use) changes instead, so fills and lines keep the board's
  value;
- Centium only, light and dark, outside High contrast (its own values are unchanged). The greys
  are fixed in every colour theme, so the grey tokens change for all of them; the theme-colour
  twins change only for Centium (`html[data-accent="centium"]:not(.dark):not(.high-contrast)` and
  its `.dark` twin in `index.css`). Nothing under `src/marketing/` is touched (it uses its own
  `centium.*` literals, which already have AA values).

**The changes** (ΔL is the OKLCH lightness shift; ratios on white, then on the weakest ground the
colour was found on):

| Token / colour | Old | New | Old → new ratio | ΔL | Where it's used |
| --- | --- | --- | --- | --- | --- |
| `--c-charcoal-faint`, `--c-charcoal-muted`, literal `#8C8378` (530 code uses) | #8C8378 | #71685E | 3.73 → 5.46; 3.13 → 4.59 on #FBE7E4 | −0.092 | muted text everywhere: subtitles, meta, captions |
| `--c-charcoal-tertiary`, literal `#A79E93` (56) | #A79E93 | #776E64 | 2.64 → 5.00; 2.42 → 4.58 on #F5F4FB | −0.160 | weakest metadata, macro grams |
| `--c-team-nav-idle` (Centium light) | #9A94B3 | #726C8A | 2.89 → 4.97; 2.65 → 4.56 on #F5F5F6 | −0.134 | bottom-bar idle labels and glyphs, date strip |
| `--thi-9a94b3` + the phone's literal `#9A94B3` caps labels (3) | #9A94B3 | #726C8A | same | −0.134 | section labels (Home, Health), BU descriptions (`--c-desc`) |
| `--c-team-nav-accent-text` (Centium light) | #8F68F6 | #7F56E3 | 3.83 → 4.84; 3.64 → 4.60 on the bar over #FBF9F4 | −0.055 | active bottom-bar label |
| `--c-team-nav-accent-ink` (Centium light) | #8F68F6 | #7D54E0 | 3.83 → 4.98; 3.52 → 4.57 on #F5F5F6 | −0.063 | `text-team-nav-accent` links |
| `--c-primary-accent-ink` (Centium light) | #7D67D9 | #7159CA | 4.36 → 5.27; 3.78 → 4.56 on #F0EDF9 | −0.045 | `text-primary-accent`: Settings headings, links |
| `--c-primary-dark-ink`, `--thi-7d6bb5` (Centium light) | #7D6BB5 | #715EA7 | 4.52 → 5.44; 3.80 → 4.57 on #FBE7E4 | −0.043 | `text-primary-dark` on tints, Retry |
| Market `pdark` / `accent` (`marketTokens.ts`, light) | #7D6BB5 / #7D67D9 | #715EA7 / #7159CA | as the two rows above | −0.043 / −0.045 | marketplace text (133 / 52 uses); 3 small `accent` fills |
| `--c-primary-ink` (Centium light) | #AEA1DC | #74679E | 2.35 → 5.03; 2.15 → 4.60 on #F5F4FB | −0.193 | `text-primary` (17 uses: units, small links, check glyphs); the cycle phase pill text |
| `--c-status-good`, literal `#3F9165` (46) | #3F9165 | #1D744A | 3.85 → 5.75; 3.06 → 4.57 on #D9E9E0 | −0.096 | Live / Active / good-status text and chips |
| `--c-teal-dark-ink` via new `INK.tealDarkInk` (Centium light) | #6F9993 | #4C7570 | 3.16 → 5.14; 2.81 → 4.58 on #EAF4F2 | −0.120 | pro chips, "From you", chart labels (lines and dots keep #6F9993) |
| `--thi-8a9796` (Centium light) | #8A9796 | #647170 | 3.02 → 5.08; 2.72 → 4.56 on #EBF5F2 | −0.128 | More hub tile captions |
| `--thi-869595` (Centium light) + pro More literal (2) | #869595 | #637171 | 3.11 → 5.08; 2.80 → 4.57 on #EBF5F2 | −0.121 | More hub mint hero caption |
| `--c-team-gold-ink` | #8A6A3E | #836337 | 4.99 → 5.52; 4.14 → 4.58 on #F6E9C9 | −0.024 | gold pills (care network) |
| `--metric-water-ink` | #4A6AA3 | #44639C | 5.41 → 5.98; 4.12 → 4.56 on #DBE1ED | −0.023 | Water hero pill text (the accent keeps #4A6AA3) |
| Dark: `--c-primary-accent-ink` (Centium dark) | #9A8CD6 | #9F91DB | 4.32 → 4.60 on #303141 | +0.016 | Settings status lines on the lavender wash |
| Dark: `--c-teal-dark-ink` (Centium dark) | #4F8F8A | #64A59F | 3.89 → 5.14 on #262932 | +0.071 | pro chips in dark |
| Dark: `--thi-3c6b65` (Centium dark) | #3C6B65 | #73A39C | 2.14 → 4.58 on #293339 | +0.187 | the client "Completed" status pill (it had no dark value) |

**Per component (an alpha, or a band no token value can serve):**
- small caps labels at `charcoal/0.42` → **0.63** (2.57 → 4.65:1 on #F5F5F6): Quick actions,
  calendar day headings, the pro calendar eyebrow, habit sheet labels, the number placeholder;
- Home's Food labels at `primary-deep-text/0.68` → **0.88** (3.07 → 4.58:1 on #F0EDF9);
- the gym Live card's "· Change" at opacity 0.8 → **0.95** (4.58:1 on the green chip);
- the Habits week band (#CEC7EA): weekday letters `charcoal-faint` → `charcoal-soft` (2.30 →
  4.67:1), today's letter #7D67D9 → **#593FAD** (2.60 → 4.57:1, Centium light only); in dark,
  weekday letters `charcoal-faint` → `charcoal` (2.54 → 4.71:1 on #7163A8).

**Exempt, not changed** (WCAG exempts inactive controls and decoration):
- Two-factor: the Authenticator and Recovery codes sections are drawn at 40% until two-factor is
  on (28 nodes, light and dark);
- the gym's unavailable payment methods ("Soon") and the locked "Always on for safety"
  notification row (rows at 50%).

**White text on the lavender and teal fills: dark ink (Karim's decision, 2026-11-08).** The fills
stay exactly as drawn; the text on them (and the glyphs, dots and progress marks that share its
colour) takes #241F1B, which passes on every one of them:

| Fill | Nodes (light, EN) | White | #241F1B |
| --- | --- | --- | --- |
| `--c-seg-active` #A79AD5 (segmented tabs, active) | 96 | 2.55 | 6.39 |
| `--c-primary-fill` #AEA1DC (primary buttons, onboarding, "Current" badge) | 59 | 2.35 | 6.94 |
| `--c-fill-pinned` #9A8CD6 (pinned CTA, pro buttons) | 11 | 2.96 | 5.51 |
| Plan badge #C0B6E4 (white 22% over the fill) / teal #A2C8C2 | 6 | 1.90 / 1.81 | 8.59 / 9.00 |
| `--c-fill-cta` #A198DF (Food sheets, Professionals tabs) | 4 | 2.60 | 6.27 |
| Food quick-add tiles #BEB4E6 / #B1A5DF / #B1A5E0 / #9284C4 | 4 | 1.93 to 3.32 | 8.44 / 7.24 / 7.25 / 4.91 |
| Meal prep teal #79A8A1 (teal sub-tabs) | 1 | 2.65 | 6.16 |
| Also: #A092E0 chips 5.97, #A299DE 6.33, #AB9ED7 6.69, Discover's selected day #8F7FCB 4.71, the #8E7FD0 hover 4.74 | | | |

How:
- **One shared variable:** `--c-on-primary-fill` (the ink every filled control already reads,
  `text-on-primary-fill`, the onboarding `--ob-on-fill`, `INK.onFill`) is #241F1B in light. Each
  other colour theme sets its own (white on its AA fills), dark keeps #0D0B1A, and High contrast
  keeps white on its #5B48B8 fills (`v6Tokens.test.ts` checks both).
- **The marketplace palette:** `onfill` #241F1B in light; a new `onhigh` keeps white on the red
  and green fills (Cancel, End, the destructive confirm), and High contrast keeps `onfill` white.
- **Where a control painted white itself:** `SegmentedTabs` (teal variant), the Food quick-add
  tiles (label and icon), the plan badges, Professionals' tabs, the pro Home range tabs and pro
  Messages tabs, the booking sheet's selected time, MembershipPass, the client share chips, and
  21 buttons drawn in a literal lavender (a scripted swap of `color: "#FFFFFF"` only where the
  same style object paints one of the lavender/teal fills; phone files only). Icons inside follow
  through `currentColor`; the ones given their own white (the Food tiles, Discover's day dot) were
  switched with them.
- **Dark:** the same pattern failed in three places, now with #0D0B1A as the other dark fills: the
  plan badges (#BCA9FE / #A991FE, 9.49 / 7.56:1) and the Messages teal tab, which keeps the literal
  #79A8A1 in dark (new `activeInkDark`, 7.34:1).
- **Not dark ink:** the professional profile's About tab #7D67D9, where #241F1B is only 3.74:1. It
  keeps white, and its fill moves to #7964D2 (4.36 → 4.60:1, ΔL −0.013) through the strip's own
  `darkenForWhite`, now applied in light too at 4.55:1.
- **Left as it is:** High contrast's "−n%" plan badge (white 22% over #5B48B8 = #7F70C8): white
  4.15:1, #241F1B 3.93:1. Neither passes; it's High contrast's own fill, so it isn't changed.

Also flagged: in dark, today's letter on the Habits band (#9F91DB on #7768B1, 1.61:1) needs
near-white to pass, which loses the "today" accent.

**axe re-run** (same 233 routes, same accounts, same harness). Columns: the PR head before the
contrast work (`73967052`), the token pass (`521a6681`), and the dark-ink pass (this change):

| Mode | Routes | `73967052` | `521a6681` | now | needs review (now) |
| --- | --- | --- | --- | --- | --- |
| English, light | 233 | 2901 | 225 | 41 | 289 |
| English, dark | 233 | 73 | 55 | 42 | 265 |
| Arabic, light | 59 (every 4th; 22 in RTL, see below) | 495 | 28 | 0 | 26 |
| Arabic, dark | 59 | 0 | 0 | 0 | 19 |
| High contrast, light | 39 (every 6th) | 11 | 6 | 5 | 36 |
| High contrast, dark | 39 | 8 | 7 | 5 | 36 |

Every other rule stays at 0 in every mode. (The 2907 above was measured on the first code
commit's build; the PR head before the contrast work measures 2901.)

**What remains:**
- **Light (41):** 33 inactive (exempt: the two-factor sections at 40%, the gym's "Soon" payment
  rows and the locked notification row), and 8 on the Water, Blood pressure and Weight heroes,
  where axe reads the hero art (wave, chart bars) as the background; on screen the ink sits on
  the pale metric tint (checked visually).
- **Dark (42):** 31 inactive, 10 hero-art reads, 1 Habits today letter (flagged above).
- **Arabic:** none.
- **High contrast (5 / 5):** light: 3 inactive rows, 1 hero-art read, the "−n%" badge above;
  dark: 1 inactive row, 4 hero-art reads.

**Arabic:** the language is set on the device. The signed-out route and the client stay in Arabic
(22 routes in RTL); the professional and gym accounts settle back to their saved language
(English). The colours don't depend on the language.

**Visual check (430 × 932, light and dark).** Token pass against `73967052`, 12 main screens:
every text box's position and size is identical on all 24 captures; only colours change. Dark-ink
pass against `521a6681`, 12 affected screens (Food, Workout, Water, Messages, Professionals, a gym
page, Subscription, pro Home, pro Messages, pro Subscription, the public profile, the gym
marketplace): again identical boxes on all 24; the changed pixels are the labels and glyphs on the
fills, and the About tab's fill.

## Left for later, with reasons

- **Dark: today's letter on the Habits band** (1.61:1) and High contrast's "−n%" plan badge
  (4.15:1): see the contrast section.
- **Pixel line-heights at 200% (needs the App's `nativeTextZoom()`, Website #100):** WebView
  textZoom scales font sizes but not px line-heights (App measurement), and most text uses px line
  heights (`linePx()`). Wrapped text at 200% will draw its lines too close or overlapping. The clean
  fix: once #100 lands, the website sets the zoom as a CSS variable and `linePx()` multiplies by it.
  "Larger text" on top of the phone size, capped at 200% (D-ET1), belongs to the same change.
- **Sideways scroll at 200% still on:** gym Classes (+1), Marketplace (+7) and Products (+7) (the
  Performance tab row).
- **Focus order quirks (not wrong, but not top-to-bottom):**
  - the pinned CTAs are portalled after the bottom bar, so Tab reaches the bar before "Browse
    starter programs" or "Create routine";
  - the dismiss X on a Home reminder card comes after its main button;
  - the gym Home's quick actions follow the grid's DOM order.
- **Arabic:** the new accessible names have Arabic. A full Arabic axe pass and an Arabic Tab walk
  are in the PR's checks if done; otherwise they're listed there.

## Resume here

All of the above is committed. Next steps, if continued:
1. the three gym pages' Performance tab row at 200%;
2. the line-height zoom variable, once Website #100 (`nativeTextZoom()`) is merged;
3. the two contrast items under "Left for later", if Karim wants them changed.
