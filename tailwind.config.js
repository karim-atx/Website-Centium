/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
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
        },
        sohati: {
          DEFAULT: "rgb(var(--c-sohati) / <alpha-value>)",
          light: "rgb(var(--c-sohati-light) / <alpha-value>)",
          pale: "rgb(var(--c-sohati-pale) / <alpha-value>)",
          dark: "rgb(var(--c-sohati-dark) / <alpha-value>)",
        },
        ember: {
          DEFAULT: "rgb(var(--c-ember) / <alpha-value>)",
          light: "rgb(var(--c-ember-light) / <alpha-value>)",
          pale: "rgb(var(--c-ember-pale) / <alpha-value>)",
          dark: "rgb(var(--c-ember-dark) / <alpha-value>)",
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
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04)",
        card: "0 8px 30px rgb(0 0 0 / 0.10)",
        lift: "0 16px 40px rgb(0 0 0 / 0.20)",
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
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: 0.8 },
          "100%": { transform: "scale(1.6)", opacity: 0 },
        },
        "fill-up": {
          "0%": { height: "0%" },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.45s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.3s ease both",
        "pop": "pop 0.4s cubic-bezier(0.22,1,0.36,1) both",
        "sheet-up": "sheet-up 0.35s cubic-bezier(0.22,1,0.36,1) both",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
}
