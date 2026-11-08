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

## Left for later, with reasons

- **Colour contrast (2907 nodes): a design question, not changed here.** These are the handover's
  own colours, for example #8C8378 muted text on white (3.6:1), #9A94B3 idle nav and labels on
  white, #7D67D9 and #8F68F6 on white, white on #A79AD5 / #AEA1DC fills. Changing them changes every
  screen. The in-app High contrast mode is the existing answer; whether it reaches AA everywhere is
  checked in the PR.
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
3. the contrast decision from Karim.
