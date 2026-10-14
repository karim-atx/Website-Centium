import type { InkTone, Tone } from "./classesModel";

// The AN3 colour rules (AN3-001 rows 24a / 24b) as theme variables from classes.css.

export const TONE: Record<Tone | "pdark" | "full", string> = {
  high: "var(--k-high)",
  caution: "var(--k-caution-bar)",
  primary: "var(--k-primary)",
  deep: "var(--k-deep)",
  pdark: "var(--k-pdark)",
  full: "var(--k-full)",
};
export const INK: Record<InkTone, string> = { high: "var(--k-high)", caution: "var(--k-caution)", ink: "var(--k-ink)" };

export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
