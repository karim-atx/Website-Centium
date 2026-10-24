import plugin from "tailwindcss/plugin";
// Imported (not read with fs) so Tailwind reloads its config when the
// generator rewrites the list.
import THEME_COLORS from "./src/styles/theme-colors.json";

// R20 (batch D): every lavender or teal colour the app used as a literal is a
// `th-<hex>` colour now (bg-th-aea1dc, text-th-7d6bb5, ...), backed by
// --th-<hex> in styles/theme-palette.css: the literal itself in Centium, the
// mapped shade in the other themes. The list is written by the generator.
const th = Object.fromEntries(THEME_COLORS.map((h) => [h, `rgb(var(--th-${h}) / <alpha-value>)`]));
// Text takes each colour's ink twin: identical in Centium, and in the other
// themes the shade that reaches 4.5:1 on the page (D6, D8).
const thInk = Object.fromEntries(THEME_COLORS.map((h) => [h, `rgb(var(--thi-${h}) / <alpha-value>)`]));
const ink = (name) => `rgb(var(--c-${name}-ink) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // V5 (QA 5.0): all fonts unified to one face (was Roboto).
        // V7 (QA 7.0): switched that shared face to Manrope.
        display: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
        // Centium landing v29 (01_tokens font.mono). Namespaced: the app's own
        // font-mono stays Tailwind's default. JetBrains Mono is loaded by
        // MarketingLayout for the marketing routes only.
        "centium-mono": ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        // Centium landing v29 (handover 01_tokens/tokens.json), namespaced under
        // centium.* so nothing collides with the app's theme-aware names
        // (teal, primary, th, ...). Literal values, never theme tokens: the
        // marketing site stays light whatever the app theme on <html> is.
        centium: {
          white: "#FFFFFF",
          ink: "#221E1A",
          ink2: "#3B352D",
          body: "#5B5349",
          muted: "#7A7168",
          muted2: "#8C8378",
          hair: "#EDEAE4",
          lavender: {
            50: "#F4F1FB",
            100: "#EDE8FB",
            200: "#DED4F4",
            300: "#B9A9EE",
            500: "#7D67D9",
            600: "#6A54C4",
            700: "#5C48A8",
            800: "#4E3894",
            900: "#3E2C80",
            logo: "#9C7FF8",
            surface: "#F7F5FC",
            page: "#FAF9FE",
          },
          teal: {
            50: "#EDF4F3",
            100: "#DAEAE7",
            300: "#8FC3BA",
            500: "#5E9E95",
            700: "#3F726D",
            900: "#2F5F58",
            leaf: "#8AC4BA",
          },
        },
        cream: {
          DEFAULT: "rgb(var(--c-cream) / <alpha-value>)",
          soft: "rgb(var(--c-cream-soft) / <alpha-value>)",
          card: "rgb(var(--c-cream-card) / <alpha-value>)",
        },
        th,
        // Mobile v5.1 surface.raised: #FAFAFB, dark #262932. See index.css.
        surface: {
          raised: "rgb(var(--c-surface-raised) / <alpha-value>)",
        },
        charcoal: {
          DEFAULT: "rgb(var(--c-charcoal) / <alpha-value>)",
          soft: "rgb(var(--c-charcoal-soft) / <alpha-value>)",
          faint: "rgb(var(--c-charcoal-faint) / <alpha-value>)",
          // Design refinement: weakest metadata ("of 10,000 · 84%") and
          // disabled glyphs (inactive chevrons/arrows) each get their own
          // step instead of reusing `faint` for both.
          tertiary: "rgb(var(--c-charcoal-tertiary) / <alpha-value>)",
          disabled: "rgb(var(--c-charcoal-disabled) / <alpha-value>)",
          // Mobile v5.1 R3: the board's text.muted #8C8378, dark #B8B3C7.
          muted: "rgb(var(--c-charcoal-muted) / <alpha-value>)",
        },
        // Mobile v5.1 R3: border.option #E5E6EB, dark rgba(238,239,242,0.10).
        "border-option": "rgb(var(--c-border-option) / <alpha-value>)",
        primary: {
          DEFAULT: "rgb(var(--c-primary) / <alpha-value>)",
          light: "rgb(var(--c-primary-light) / <alpha-value>)",
          pale: "rgb(var(--c-primary-pale) / <alpha-value>)",
          dark: "rgb(var(--c-primary-dark) / <alpha-value>)",
          // Text/glyph colour when sitting on a `primary-pale` wash.
          "deep-text": "rgb(var(--c-primary-deep-text) / <alpha-value>)",
          // Mobile v5.1 (R1): the ground of a filled button with white ink,
          // 4.5:1 or better in every theme; and the row/tile glyph colour.
          fill: "rgb(var(--c-primary-fill) / <alpha-value>)",
          accent: "rgb(var(--c-primary-accent) / <alpha-value>)",
        },
        // The ink on a primary-fill button: white in light mode, near-black in
        // dark mode, where the fill is the lighter primary. See index.css.
        "on-primary-fill": "rgb(var(--c-on-primary-fill) / <alpha-value>)",
        // The white-text hero cards' light-mode gradient. See index.css.
        hero: {
          from: "rgb(var(--c-hero-from) / <alpha-value>)",
          to: "rgb(var(--c-hero-to) / <alpha-value>)",
        },
        // The sent message bubble only. Darker than `primary` because white ink
        // sits on it at 13px and below; `primary` stays the ground for every
        // button, FAB, toggle and chip, where nothing does. See index.css.
        bubble: {
          sent: "rgb(var(--c-bubble-sent) / <alpha-value>)",
        },
        // The read tick, named for the bubble it sits in. Which of the two is
        // the light green and which the dark one swaps between light and dark
        // mode, because both grounds swap with it — so these cannot be named
        // for their shade. See index.css.
        tick: {
          "read-sent": "rgb(var(--c-tick-read-sent) / <alpha-value>)",
          "read-received": "rgb(var(--c-tick-read-received) / <alpha-value>)",
        },
        teal: {
          DEFAULT: "rgb(var(--c-teal) / <alpha-value>)",
          light: "rgb(var(--c-teal-light) / <alpha-value>)",
          pale: "rgb(var(--c-teal-pale) / <alpha-value>)",
          dark: "rgb(var(--c-teal-dark) / <alpha-value>)",
          // Positive-trend text colour on a `teal-pale` (sage) wash.
          "deep-text": "rgb(var(--c-teal-deep-text) / <alpha-value>)",
          // Mobile v5.1 R2: a filled teal control's ground; ink is on-primary-fill.
          fill: "rgb(var(--c-teal-fill) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--c-gold) / <alpha-value>)",
          pale: "rgb(var(--c-gold-pale) / <alpha-value>)",
        },
        sky: {
          DEFAULT: "rgb(var(--c-sky) / <alpha-value>)",
          pale: "rgb(var(--c-sky-pale) / <alpha-value>)",
        },
        // Chart High/Low markers, which sit on the page rather than on a
        // pale wash. Their own values because teal-dark and sky are too
        // light on cream to clear AA; see the note in index.css.
        trend: {
          "high-text": "rgb(var(--c-trend-high-text) / <alpha-value>)",
          "low-text": "rgb(var(--c-trend-low-text) / <alpha-value>)",
        },
        berry: {
          DEFAULT: "rgb(var(--c-berry) / <alpha-value>)",
          pale: "rgb(var(--c-berry-pale) / <alpha-value>)",
        },
        // Iteration 6 "Team" bottom-nav brand accent — fixed lavender,
        // independent of the [data-accent] colour-theme picker. See the
        // comment on --c-team-nav-accent in index.css.
        team: {
          "nav-accent": "rgb(var(--c-team-nav-accent) / <alpha-value>)",
          "nav-idle": "rgb(var(--c-team-nav-idle) / <alpha-value>)",
          // The active label's ink: nav-accent itself is under 4.5:1 as text.
          "nav-accent-text": "rgb(var(--c-team-nav-accent-text) / <alpha-value>)",
          lavender: "rgb(var(--c-team-lavender) / <alpha-value>)",
          "lavender-deep": "rgb(var(--c-team-lavender-deep) / <alpha-value>)",
          "teal-ink": "rgb(var(--c-team-teal-ink) / <alpha-value>)",
          "teal-deep": "rgb(var(--c-team-teal-deep) / <alpha-value>)",
          "blue-light": "rgb(var(--c-team-blue-light) / <alpha-value>)",
          "blue-ink": "rgb(var(--c-team-blue-ink) / <alpha-value>)",
          "rose-ink": "rgb(var(--c-team-rose-ink) / <alpha-value>)",
          "gold-ink": "rgb(var(--c-team-gold-ink) / <alpha-value>)",
          "gold-deep": "rgb(var(--c-team-gold-deep) / <alpha-value>)",
        },
        // Design refinement: theme-aware status hues. An out-of-range
        // reading must not be decorative — these replace ad-hoc literal
        // hex classes so status colour actually adapts in dark mode.
        status: {
          good: "rgb(var(--c-status-good) / <alpha-value>)",
          "good-bg": "rgb(var(--c-status-good-bg) / <alpha-value>)",
          // "good-deep" is gone with --c-status-good-deep: it was the message
          // read tick under a name that described a shade, and the shade
          // inverts between light and dark mode. It lives as tick.read-* now.
          high: "rgb(var(--c-status-high) / <alpha-value>)",
          "high-bg": "rgb(var(--c-status-high-bg) / <alpha-value>)",
          low: "rgb(var(--c-status-low) / <alpha-value>)",
          "low-bg": "rgb(var(--c-status-low-bg) / <alpha-value>)",
          caution: "rgb(var(--c-status-caution) / <alpha-value>)",
          "caution-bg": "rgb(var(--c-status-caution-bg) / <alpha-value>)",
        },
        // ---- v6 tokens (Part B + Business UI). Values in index.css. ----
        // Filled controls drawn in their own lavender (V6-01): Part B pinned
        // CTA and the segmented control. Ink: on-primary-fill.
        fill: {
          pinned: "rgb(var(--c-fill-pinned) / <alpha-value>)",
        },
        seg: {
          track: "rgb(var(--c-seg-track) / <alpha-value>)",
          active: "rgb(var(--c-seg-active) / <alpha-value>)",
        },
        "on-destructive": "rgb(var(--c-on-destructive) / <alpha-value>)",
        range: {
          out: "rgb(var(--c-range-out) / <alpha-value>)",
          "out-bg": "rgb(var(--c-range-out-bg) / <alpha-value>)",
          in: "rgb(var(--c-range-in) / <alpha-value>)",
          "in-bg": "rgb(var(--c-range-in-bg) / <alpha-value>)",
        },
        destructive: {
          icon: "rgb(var(--c-destructive-icon) / <alpha-value>)",
          bg: "rgb(var(--c-destructive-bg) / <alpha-value>)",
        },
        // Health metric colours: fixed in every theme except weight (V6-60).
        metric: Object.fromEntries(
          ["water", "steps", "sleep", "calories", "heart-rate", "blood-pressure", "weight", "cycle"].map((m) => [
            m,
            Object.fromEntries(
              ["main", "tint", "accent", "ink", "pattern"]
                .concat(m === "sleep" ? ["night-hero", "stage-awake"] : m === "cycle" ? ["widget-ink"] : [])
                .map((k) => [k, `rgb(var(--metric-${m}-${k}) / <alpha-value>)`])
            ),
          ])
        ),
        // Home widget tints and inks (Part B).
        widget: Object.fromEntries(
          ["steps", "weight", "sleep", "workout", "heart-rate", "habits", "journal", "meditation"].map((w) => [
            w,
            { tint: `rgb(var(--c-widget-${w}-tint) / <alpha-value>)`, ink: `rgb(var(--c-widget-${w}-ink) / <alpha-value>)` },
          ])
        ),
        "widget-header-tile": "var(--widget-header-tile)",
        pose: {
          body: "rgb(var(--c-pose-body) / <alpha-value>)",
          "far-limbs": "rgb(var(--c-pose-far-limbs) / <alpha-value>)",
          "head-arms": "rgb(var(--c-pose-head-arms) / <alpha-value>)",
          leaf: "rgb(var(--c-pose-leaf) / <alpha-value>)",
        },
        // Hairlines (X-09); 30% of ink under High contrast.
        hair: {
          "08": "var(--hair-08)",
          10: "var(--hair-10)",
          11: "var(--hair-11)",
        },
        // Business UI.
        list: {
          DEFAULT: "var(--list-bg)",
          rule: "var(--list-rule)",
        },
        track: "rgb(var(--c-track) / <alpha-value>)",
        desc: "rgb(var(--c-desc) / <alpha-value>)",
        "teal-text": "rgb(var(--c-teal-text) / <alpha-value>)",
        "row-tile": "rgb(var(--c-row-tile) / <alpha-value>)",
        menu: {
          border: "var(--menu-border)",
          "row-on-border": "rgb(var(--c-menu-row-on-border) / <alpha-value>)",
          check: "rgb(var(--c-menu-check) / <alpha-value>)",
          backdrop: "var(--menu-backdrop)",
        },
        nav: {
          bg: "var(--nav-bg)",
          border: "var(--nav-border)",
          idle: "rgb(var(--c-nav-idle) / <alpha-value>)",
          "label-active": "rgb(var(--c-nav-label-active) / <alpha-value>)",
        },
        brand: {
          c: "rgb(var(--c-brand-c) / <alpha-value>)",
          leaf: "rgb(var(--c-brand-leaf) / <alpha-value>)",
        },
        "sheet-border-business": "var(--sheet-border-business)",
        // Release 3 · Professional UI (index.css --c-pro-*, design-tokens.json).
        pro: {
          "card-border": "var(--c-pro-card-border)",
          "ring-track": "var(--c-pro-ring-track)",
          "list-bg": "var(--c-pro-list-bg)",
          "list-rule": "var(--c-pro-list-rule)",
          "tab-idle": "var(--c-pro-tab-idle)",
          "tab-idle-ink": "var(--c-pro-tab-idle-ink)",
          "mint-hero": "var(--c-pro-mint-hero)",
          "mint-tile": "var(--c-pro-mint-tile)",
          "tile-icon": "var(--c-pro-tile-icon)",
          "tile-sub": "var(--c-pro-tile-sub)",
          "hero-title": "var(--c-pro-hero-title)",
          "hero-sub": "var(--c-pro-hero-sub)",
          "done-leaf": "var(--c-pro-done-leaf)",
        },
        "wheel-band-business": "var(--wheel-band-business)",
        type: {
          classes: "rgb(var(--c-type-classes) / <alpha-value>)",
          "classes-bg": "rgb(var(--c-type-classes-bg) / <alpha-value>)",
          gym: "rgb(var(--c-type-gym) / <alpha-value>)",
          "gym-bg": "rgb(var(--c-type-gym-bg) / <alpha-value>)",
          store: "rgb(var(--c-type-store) / <alpha-value>)",
          "store-bg": "rgb(var(--c-type-store-bg) / <alpha-value>)",
        },
        event: {
          class: "rgb(var(--c-event-class) / <alpha-value>)",
          event: "rgb(var(--c-event-event) / <alpha-value>)",
        },
        "star-business": "rgb(var(--c-star-business) / <alpha-value>)",
        caution: {
          text: "rgb(var(--c-caution-text) / <alpha-value>)",
          strong: "rgb(var(--c-caution-strong) / <alpha-value>)",
          deep: "rgb(var(--c-caution-deep) / <alpha-value>)",
        },
        "minute-hand": {
          DEFAULT: "rgb(var(--c-minute-hand) / <alpha-value>)",
          highlight: "rgb(var(--c-minute-hand-highlight) / <alpha-value>)",
        },
        // Marketing-site-only premium refinement tokens (fixed values, not
        // theme-reactive — the marketing site is intentionally a light site
        // with dark accent bands, independent of the app's user-controlled
        // light/dark toggle). Additive: nothing here renames or overrides
        // the shared --c-* tokens above, so the app / shared ui components
        // (Button, CentiumLogo, dashboards, etc.) are unaffected.
        mkt: {
          // Logo-only lavender (marketing site redesign) — distinct from
          // mkt.accent: the mark/wordmark use this slightly brighter tone,
          // buttons/active-states keep using mkt.accent as before.
          logo: "#9C7FF8",
          ink: "#221E1A",
          soft: "#5B5349",
          faint: "#8C8378",
          line: "#EDEAE4",
          wash: "#FBFAF8",
          wash2: "#FAF9F7",
          tint: "#F4F1FB",
          // v2 landing handoff: a darker lavender tint for small emphasis
          // blocks (e.g. the Problem section's resolved answer row) that
          // need to read a step stronger than mkt.tint's chip/card wash.
          "tint-deep": "#E6DFF7",
          capsule: "#F5F3F9",
          accent: "#7D67D9",
          "accent-hover": "#6A54C4",
          "accent-ring": "#C6B9EE",
          teal: "#4F8F8A",
          "teal-tint": "#EDF4F3",
          dark: "#0D0B1A",
          "dark-surface": "#17142A",
          "dark-line": "#241F3D",
          "dark-accent": "#A991FE",
          "dark-ink": "#F5F3FA",
          "dark-soft": "#B8B3C7",
        },
      },
      // Text utilities read the ink twins (see above). Background, border,
      // ring, fill and stroke keep the colour itself.
      textColor: {
        th: thInk,
        primary: {
          DEFAULT: ink("primary"),
          light: ink("primary-light"),
          dark: ink("primary-dark"),
          "deep-text": ink("primary-deep-text"),
          accent: ink("primary-accent"),
        },
        teal: { DEFAULT: ink("teal"), light: ink("teal-light"), dark: ink("teal-dark"), "deep-text": ink("teal-deep-text") },
        trend: { "high-text": ink("trend-high-text") },
        team: {
          "nav-accent": ink("team-nav-accent"),
          "nav-accent-text": ink("team-nav-accent-text"),
          lavender: ink("team-lavender"),
          "lavender-deep": ink("team-lavender-deep"),
          "teal-ink": ink("team-teal-ink"),
          "teal-deep": ink("team-teal-deep"),
        },
        // v6: theme-following text tokens read their ink twins too.
        "teal-text": ink("teal-text"),
        menu: { check: ink("menu-check") },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        // Centium landing v29 (01_tokens shadow.*). Prefixed: boxShadow.card is the app's.
        "centium-card": "0 1px 1px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.07),0 40px 80px rgba(92,72,168,.12)",
        "centium-card-mobile": "0 1px 2px rgba(72,58,130,.06),0 6px 14px rgba(72,58,130,.06)",
        "centium-nav-plate": "0 6px 22px rgba(72,58,130,.10)",
        soft: "0 2px 10px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)",
        card: "0 8px 30px rgb(0 0 0 / 0.10)",
        lift: "0 16px 40px rgb(0 0 0 / 0.20)",
        // Design refinement: shadow is reserved for things that genuinely
        // float (FAB, bottom sheets/modals) — in-page cards use a hairline
        // border instead. Theme-aware via the CSS var.
        fab: "var(--shadow-fab)",
        // v6 Business UI shadows (index.css).
        popup: "var(--shadow-popup)",
        menu: "var(--shadow-menu)",
        "card-selected": "var(--shadow-card-selected)",
        "focus-ring": "var(--shadow-focus-ring)",
        "primary-button": "var(--shadow-primary-button)",
        navbar: "var(--shadow-navbar)",
      },
      // Centium landing v29 (01_tokens motion.easeOut).
      transitionTimingFunction: {
        centium: "cubic-bezier(.22,1,.36,1)",
      },
      backgroundImage: {
        "approval-glow": "var(--gradient-approval-glow)",
      },
      keyframes: {
        // Part B motion.skeletonPulse: 1.2 s, static under Reduce motion
        // (index.css). Same frames as Tailwind's pulse.
        "skeleton-pulse": {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.5 },
        },
        "fade-slide-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        // motion.base for centred popups (Foundations 2.6): scale 0.96 to 1 + fade.
        "popup-in": {
          "0%": { opacity: 0, transform: "scale(0.96)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
        "pop": {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "60%": { transform: "scale(1.03)", opacity: 1 },
          "100%": { transform: "scale(1)" },
        },
        "sheet-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "drop-down": {
          "0%": { opacity: 0, transform: "translateY(-12px) scale(0.98)" },
          "100%": { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: 0.8 },
          "100%": { transform: "scale(1.6)", opacity: 0 },
        },
        // V8 (QA 8.0): "an animation that involves the logo when pressing
        // get started" — the logo punches forward while a ring pulses out
        // from behind it, then the rest of the screen fades to make room
        // for the next onboarding step.
        // V9 (QA 9.0): "I would like the animation to be more animated and
        // noticeable" — bigger squash-and-stretch swing, a longer runway,
        // and a second, wider ring so the launch reads clearly instead of
        // being a quick subtle blip.
        "logo-launch": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "20%": { transform: "scale(0.85) rotate(-4deg)" },
          "55%": { transform: "scale(1.45) rotate(3deg)" },
          "100%": { transform: "scale(1.9) rotate(0deg)", opacity: 0 },
        },
        "logo-launch-ring": {
          "0%": { transform: "scale(0.9)", opacity: 0.8 },
          "100%": { transform: "scale(3.2)", opacity: 0 },
        },
        "logo-launch-ring-2": {
          "0%": { transform: "scale(0.9)", opacity: 0.6 },
          "100%": { transform: "scale(4.2)", opacity: 0 },
        },
        "welcome-fade-out": {
          "0%": { opacity: 1 },
          "100%": { opacity: 0 },
        },
        // The v6 Welcome (BU1 OB-033…050) replaced the launch rings, bloom,
        // sweep and fade-out; only the breathing pulse stays (marketing NotFound).
        "cent-breathe": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.035)" },
        },
        "fill-up": {
          "0%": { height: "0%" },
        },
        // Design refinement §7.1: set-completion tick — a 420ms
        // squash-then-overshoot instead of a bare colour swap.
        "set-tick": {
          "0%": { transform: "scale(1)" },
          "32%": { transform: "scale(0.82)" },
          "62%": { transform: "scale(1.14)" },
          "100%": { transform: "scale(1)" },
        },
        "set-tick-ring": {
          "0%": { transform: "scale(0.55)", opacity: 0.7 },
          "100%": { transform: "scale(2.1)", opacity: 0 },
        },
        "set-tick-check": {
          "0%": { transform: "scale(0.3)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        // THE END FRAME IS THE ROW'S OWN COLOUR, not a fixed purple. The
        // fill mode is `both`, so whatever this lands on overrides the
        // inline background for as long as the class is applied — with the
        // completed tint hard-coded here, a failed set and a personal record
        // both settled into looking completed, which is the one thing they
        // are not. The caller supplies both ends.
        "set-row-settle": {
          "0%": { backgroundColor: "var(--settle-from, #DED7F1)" },
          "100%": { backgroundColor: "var(--settle-to, #EFECF8)" },
        },
        // §7.3: idle water-fill crests — alive without asking for attention.
        "water-crest": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "water-crest-reverse": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "water-bubble": {
          "0%": { transform: "translateY(0)", opacity: 0.7 },
          "100%": { transform: "translateY(-38px)", opacity: 0 },
        },
        "water-swell": {
          "0%": { height: "100%" },
          "50%": { height: "104%" },
          "100%": { height: "100%" },
        },
        "water-drip": {
          "0%": { transform: "translateY(0)", opacity: 0.8 },
          "100%": { transform: "translateY(26px)", opacity: 0 },
        },
        "calorie-flame": {
          "0%": { transform: "scale(0.96) rotate(-3deg)" },
          "50%": { transform: "scale(1.10) rotate(3deg)" },
          "100%": { transform: "scale(0.96) rotate(-3deg)" },
        },
        "calorie-glow": {
          "0%": { transform: "scale(0.85)", opacity: 0.5 },
          "100%": { transform: "scale(1.35)", opacity: 0 },
        },
        // QA 11.0: PR-set celebration confetti — each piece falls and
        // drifts sideways by its own per-piece CSS variable.
        "confetti-fall": {
          "0%": { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          "100%": { transform: "translate(var(--confetti-drift), 100vh) rotate(var(--confetti-rotate))", opacity: 0.2 },
        },
        // v2 Centium landing handoff: the two drifting decorative orbs (the
        // marketing NotFound page uses them).
        "mkt-drift-a": {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(26px,-34px,0)" },
        },
        "mkt-drift-b": {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(-30px,26px,0)" },
        },
      },
      animation: {
        "skeleton-pulse": "skeleton-pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-slide-up": "fade-slide-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.3s ease both",
        "popup-in": "popup-in 0.25s cubic-bezier(0.22,1,0.36,1) both",
        "pop": "pop 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "drop-down": "drop-down 0.28s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0,0,0.2,1) infinite",
        "logo-launch": "logo-launch 0.8s cubic-bezier(0.34,1.56,0.64,1) both",
        "logo-launch-ring": "logo-launch-ring 0.85s cubic-bezier(0,0,0.2,1) both",
        "logo-launch-ring-2": "logo-launch-ring-2 0.95s cubic-bezier(0,0,0.2,1) 0.1s both",
        "welcome-fade-out": "welcome-fade-out 0.5s ease 0.15s both",
        "cent-breathe": "cent-breathe 5s ease-in-out infinite",
        // QA 12.0: "the animation in reaching the [water] goal is
        // distracting, please reduce frequency substantially" — same pulse,
        // scoped to water only so the shared 1.6s pulse-ring (voice logger,
        // messages, professional detail) is untouched.
        "pulse-ring-slow": "pulse-ring 6s cubic-bezier(0,0,0.2,1) infinite",
        "set-tick": "set-tick 0.42s cubic-bezier(0.22,1,0.36,1) both",
        "set-tick-ring": "set-tick-ring 0.55s cubic-bezier(0.22,1,0.36,1) both",
        "set-tick-check": "set-tick-check 0.34s cubic-bezier(0.22,1,0.36,1) 60ms both",
        "set-row-settle": "set-row-settle 0.55s ease-out both",
        "water-crest": "water-crest 7s linear infinite",
        "water-crest-reverse": "water-crest-reverse 5s linear infinite",
        "water-crest-fast": "water-crest 2.1s linear infinite",
        "water-crest-fast-reverse": "water-crest-reverse 1.5s linear infinite",
        "water-bubble": "water-bubble 1s ease-out both",
        "water-swell": "water-swell 2.6s cubic-bezier(0.22,1,0.36,1) infinite",
        "water-drip": "water-drip 1.4s ease-in infinite",
        "calorie-flame": "calorie-flame 1.6s ease-in-out infinite",
        "calorie-glow": "calorie-glow 2.4s ease-out infinite",
        "confetti-fall": "confetti-fall 1.8s ease-in both",
        "mkt-drift-a": "mkt-drift-a 22s ease-in-out infinite",
        "mkt-drift-b": "mkt-drift-b 27s ease-in-out infinite",
      },
    },
  },
  plugins: [
    // Fix: Tailwind's default `hover:` variant maps straight to `:hover`,
    // which touch browsers synthesize on tap and then leave "stuck" on
    // that element until the next tap elsewhere. Scoping `hover:` to
    // devices that report genuine hover+fine-pointer support makes it
    // behave like real desktop hover only — no visual change for
    // mouse/trackpad users (the portal's primary input), and it also
    // means this portal behaves correctly if ever opened on a touchscreen
    // laptop/tablet.
    plugin(({ addVariant }) => {
      addVariant("hover", "@media (hover: hover) and (pointer: fine) { &:hover }");
    }),
  ],
}
