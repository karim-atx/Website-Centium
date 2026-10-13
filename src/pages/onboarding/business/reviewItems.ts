import { BIZ_STEPS, type BizFlowKey } from "./bizLanes";
import { BIZ_STEP_KEYS, bizStepNames } from "./lanes";
import type { ReviewItem } from "../../../services/business-onboarding";

// "A few things to fix": which lane step each review item belongs to
// (business_verifications.items is an array of { step, field, problem, fix }).

/** Which step a review item is about: its step key, number or name, else guessed from the field. */
export function itemStep(item: ReviewItem, lane: "classes" | "gym" | "store"): BizFlowKey {
  const s = String(item.step ?? "").trim().toLowerCase();
  const byKey = BIZ_STEP_KEYS.indexOf(s as never);
  if (byKey >= 0) return BIZ_STEPS[byKey];
  const n = Number(s);
  if (s && Number.isInteger(n) && n >= 1 && n <= 6) return BIZ_STEPS[n - 1];
  const names = bizStepNames(lane);
  const hit = BIZ_STEP_KEYS.findIndex((k) => names[k].toLowerCase() === s);
  if (hit >= 0) return BIZ_STEPS[hit];
  const f = item.field.toLowerCase();
  if (/\bid\b|document|proof|waiver|terms|policy|rules|birth/.test(f)) return "bizPolicies";
  if (/plan|amenit|class|deliver|return|check-in/.test(f)) return "bizEssentials";
  if (/address|hours|pin|location/.test(f)) return "bizWhere";
  return "bizBusiness";
}

