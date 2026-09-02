import plugin from "tailwindcss/plugin";

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
      },
      colors: {
        cream: {
          DEFAULT: "rgb(var(--c-cream) / <alpha-value>)",
          soft: "rgb(var(--c-cream-soft) / <alpha-value>)",
          card: "rgb(var(--c-cream-card) / <alpha-value>)",
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
        },
        primary: {
          DEFAULT: "rgb(var(--c-primary) / <alpha-value>)",
          light: "rgb(var(--c-primary-light) / <alpha-value>)",
          pale: "rgb(var(--c-primary-pale) / <alpha-value>)",
          dark: "rgb(var(--c-primary-dark) / <alpha-value>)",
          // Text/glyph colour when sitting on a `primary-pale` wash.
          "deep-text": "rgb(var(--c-primary-deep-text) / <alpha-value>)",
        },
        teal: {
          DEFAULT: "rgb(var(--c-teal) / <alpha-value>)",
          light: "rgb(var(--c-teal-light) / <alpha-value>)",
          pale: "rgb(var(--c-teal-pale) / <alpha-value>)",
          dark: "rgb(var(--c-teal-dark) / <alpha-value>)",
          // Positive-trend text colour on a `teal-pale` (sage) wash.
          "deep-text": "rgb(var(--c-teal-deep-text) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--c-gold) / <alpha-value>)",
          pale: "rgb(var(--c-gold-pale) / <alpha-value>)",
        },
        sky: {
          DEFAULT: "rgb(var(--c-sky) / <alpha-value>)",
          pale: "rgb(var(--c-sky-pale) / <alpha-value>)",
        },
        berry: {
          DEFAULT: "rgb(var(--c-berry) / <alpha-value>)",
          pale: "rgb(var(--c-berry-pale) / <alpha-value>)",
        },
        // Design refinement: theme-aware status hues. An out-of-range
        // reading must not be decorative — these replace ad-hoc literal
        // hex classes so status colour actually adapts in dark mode.
        status: {
          good: "rgb(var(--c-status-good) / <alpha-value>)",
          "good-bg": "rgb(var(--c-status-good-bg) / <alpha-value>)",
          high: "rgb(var(--c-status-high) / <alpha-value>)",
          "high-bg": "rgb(var(--c-status-high-bg) / <alpha-value>)",
          low: "rgb(var(--c-status-low) / <alpha-value>)",
          "low-bg": "rgb(var(--c-status-low-bg) / <alpha-value>)",
          caution: "rgb(var(--c-status-caution) / <alpha-value>)",
          "caution-bg": "rgb(var(--c-status-caution-bg) / <alpha-value>)",
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
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)",
        card: "0 8px 30px rgb(0 0 0 / 0.10)",
        lift: "0 16px 40px rgb(0 0 0 / 0.20)",
        // Design refinement: shadow is reserved for things that genuinely
        // float (FAB, bottom sheets/modals) — in-page cards use a hairline
        // border instead. Theme-aware via the CSS var.
        fab: "var(--shadow-fab)",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
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
        // Design refinement §3a/3b (Welcome, handoff canvas frames): the
        // real mark blooms with a squash/overshoot while two brand-colour
        // rings expand behind it and a conic-gradient sweep masked to the
        // mark's own shape rotates across it — keyframes taken verbatim
        // from the canvas's embedded <style>.
        "cent-bloom": {
          "0%": { transform: "scale(1) rotate(0)" },
          "18%": { transform: "scale(0.93) rotate(-5deg)" },
          "52%": { transform: "scale(1.14) rotate(2deg)" },
          "100%": { transform: "scale(1.55) rotate(0)", opacity: 0 },
        },
        "cent-ring-a": {
          "0%": { transform: "scale(0.8)", opacity: 0.5 },
          "100%": { transform: "scale(3)", opacity: 0 },
        },
        "cent-ring-b": {
          "0%": { transform: "scale(0.8)", opacity: 0.38 },
          "100%": { transform: "scale(4.2)", opacity: 0 },
        },
        "cent-sweep": {
          "0%": { transform: "rotate(-30deg)", opacity: 0 },
          "22%": { opacity: 1 },
          "100%": { transform: "rotate(400deg)", opacity: 0 },
        },
        "cent-out": {
          "0%": { opacity: 1, transform: "translateY(0)" },
          "100%": { opacity: 0, transform: "translateY(14px)" },
        },
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
        "set-row-settle": {
          "0%": { backgroundColor: "#DED7F1" },
          "100%": { backgroundColor: "#EFECF8" },
        },
        // §7.2: streak-increase burst — the app's one emotional moment,
        // resolving in under 700ms and never looping.
        "streak-flame": {
          "0%": { transform: "scale(1) rotate(0deg)" },
          "22%": { transform: "scale(1.5) rotate(-6deg)" },
          "52%": { transform: "scale(0.94) rotate(4deg)" },
          "100%": { transform: "scale(1) rotate(0deg)" },
        },
        "streak-ember-ring": {
          "0%": { transform: "scale(0.4)", opacity: 0.65 },
          "100%": { transform: "scale(2.6)", opacity: 0 },
        },
        "streak-ember-particle": {
          "0%": { transform: "translateY(0) scale(1)", opacity: 1 },
          "100%": { transform: "translateY(-19px) scale(0.3)", opacity: 0 },
        },
        "streak-count-roll": {
          "0%": { transform: "translateY(14px)", opacity: 0 },
          "100%": { transform: "translateY(0)", opacity: 1 },
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
        "ekg-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-300px)" },
        },
        // QA 11.0: PR-set celebration confetti — each piece falls and
        // drifts sideways by its own per-piece CSS variable.
        "confetti-fall": {
          "0%": { transform: "translate(0, 0) rotate(0deg)", opacity: 1 },
          "100%": { transform: "translate(var(--confetti-drift), 100vh) rotate(var(--confetti-rotate))", opacity: 0.2 },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.3s ease both",
        "pop": "pop 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "drop-down": "drop-down 0.28s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0,0,0.2,1) infinite",
        "logo-launch": "logo-launch 0.8s cubic-bezier(0.34,1.56,0.64,1) both",
        "logo-launch-ring": "logo-launch-ring 0.85s cubic-bezier(0,0,0.2,1) both",
        "logo-launch-ring-2": "logo-launch-ring-2 0.95s cubic-bezier(0,0,0.2,1) 0.1s both",
        "welcome-fade-out": "welcome-fade-out 0.5s ease 0.15s both",
        "cent-bloom": "cent-bloom 0.95s cubic-bezier(0.34,1.4,0.64,1) both",
        "cent-ring-a": "cent-ring-a 0.9s cubic-bezier(0,0,0.2,1) both",
        "cent-ring-b": "cent-ring-b 1.05s cubic-bezier(0,0,0.2,1) 0.12s both",
        "cent-sweep": "cent-sweep 0.95s cubic-bezier(0.4,0,0.4,1) both",
        "cent-out": "cent-out 0.5s ease 0.2s both",
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
        "streak-flame": "streak-flame 0.6s cubic-bezier(0.22,1,0.36,1) both",
        "streak-ember-ring": "streak-ember-ring 0.62s cubic-bezier(0.22,1,0.36,1) both",
        "streak-count-roll": "streak-count-roll 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "water-crest": "water-crest 7s linear infinite",
        "water-crest-reverse": "water-crest-reverse 5s linear infinite",
        "water-crest-fast": "water-crest 2.1s linear infinite",
        "water-crest-fast-reverse": "water-crest-reverse 1.5s linear infinite",
        "water-bubble": "water-bubble 1s ease-out both",
        "water-swell": "water-swell 2.6s cubic-bezier(0.22,1,0.36,1) infinite",
        "water-drip": "water-drip 1.4s ease-in infinite",
        "calorie-flame": "calorie-flame 1.6s ease-in-out infinite",
        "calorie-glow": "calorie-glow 2.4s ease-out infinite",
        "ekg-scroll": "ekg-scroll 3s linear infinite",
        "confetti-fall": "confetti-fall 1.8s ease-in both",
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
