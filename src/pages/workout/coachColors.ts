/**
 * Release 3 · W7 (CU1 v4) "From your coach", as [light, dark]: the Updated
 * badge and banner (the handover's prDeep #5F5093 / #C3B3FB on prPale
 * #F0EDF9 / #303141), the coach's role line and secondary text (chF #8C8378 /
 * #B8B3C7) and the Past programmes row (soft #F5F5F6 / #242730).
 */
const COACH_COLORS = {
  deep: ["rgb(var(--th-5f5093))", "#C3B3FB"],
  pale: ["rgb(var(--th-f0edf9))", "#303141"],
  faint: ["#8C8378", "#B8B3C7"],
  soft: ["#F5F5F6", "#242730"],
} as const;

export const coachColor = (key: keyof typeof COACH_COLORS, dark: boolean): string => COACH_COLORS[key][dark ? 1 : 0];

/** The coach programmes' folder colours, by coach: the handover's sky, then clay (the Blue and Terracotta swatches). */
export const COACH_FOLDER_COLORS = ["#4C8FD1", "#B8683F"] as const;

/** Teal, gold, teal… for a coach's avatar, by the coach's place in the list (CU1 v4 "two professionals"). */
export const coachTone = (index: number): "teal" | "gold" => (index % 2 === 0 ? "teal" : "gold");
