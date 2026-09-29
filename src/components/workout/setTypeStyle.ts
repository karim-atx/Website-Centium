import type { HandoverSetType } from "../../services/workout/stats";

/**
 * How each set type looks, shared by the WO8 logger (rows, set-type dropdown)
 * and the WO10 Set options popup (Type buttons), as 03 asks: "the set-type
 * dropdown and the Set options popup share one set-type definition".
 *
 * Normal has no entry: it takes the routine's folder shades instead.
 *
 * Warm up, Failed, Skipped and PR are measured from the WO8 frame's "One
 * example row per type". DROP SET IS ROSE, per the handover's own precedence
 * (02 token rose #C97B84 and WO8's text "soft rose" outrank the frame's
 * berry): `dot` is the token, and row / field / border / ink are DERIVED from
 * it with the same steps the other types use (10% / 18% / 35% of the token on
 * white, ink = token 30% toward black). The handover gives no rose tints.
 */
export type TypeStyle = { row: string; field: string; border: string; ink: string; label: string; dot: string; short: string };

export const TYPE_STYLE: Record<Exclude<HandoverSetType, "normal">, TypeStyle> = {
  warmup: { row: "#F0F5FA", field: "#E2EDF8", border: "#C5D6E6", ink: "#3F6E93", label: "#3F6E93", dot: "#6FA0CF", short: "Warm" },
  failed: { row: "#FBEDEB", field: "#F6E2DF", border: "#E8C2BC", ink: "#8E3325", label: "#B0402F", dot: "#C0392B", short: "Fail" },
  skipped: { row: "transparent", field: "#F1F1F3", border: "#E1E1E2", ink: "#A39D95", label: "#8C8378", dot: "#A39D95", short: "Skip" },
  pr: { row: "#F8F1E4", field: "#F5E6C6", border: "#E9D09E", ink: "#8A6318", label: "#8A6318", dot: "#C8912B", short: "PR" },
  drop: { row: "#FAF2F3", field: "#F5E7E9", border: "#ECD1D4", ink: "#8D565D", label: "#8D565D", dot: "#C97B84", short: "DS" },
};

/** The PR row's gold accent bar. */
export const PR_BAR = "#C8912B";
