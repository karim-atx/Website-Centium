/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          DEFAULT: "#FBF6EE",
          soft: "#F5EEE1",
          card: "#FFFFFF",
        },
        charcoal: {
          DEFAULT: "#241F1B",
          soft: "#5B5349",
          faint: "#8C8378",
        },
        sohati: {
          DEFAULT: "#1B6B52",
          light: "#2E9977",
          pale: "#DCEFE5",
          dark: "#134F3D",
        },
        ember: {
          DEFAULT: "#E97452",
          light: "#F2A488",
          pale: "#FCE6DD",
          dark: "#C6532F",
        },
        gold: {
          DEFAULT: "#D9A441",
          pale: "#F6E9C9",
        },
        sky: {
          DEFAULT: "#4C8FD1",
          pale: "#DCEAF8",
        },
        berry: {
          DEFAULT: "#9C4F7C",
          pale: "#F1E0EB",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(36, 31, 27, 0.06), 0 1px 2px rgba(36, 31, 27, 0.04)",
        card: "0 8px 30px rgba(36, 31, 27, 0.08)",
        lift: "0 16px 40px rgba(36, 31, 27, 0.14)",
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
