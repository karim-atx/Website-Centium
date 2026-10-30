import type { Shape } from "./visuals";
import { LANE_CHIP_VIS } from "./visuals";
import { PRO_LANES } from "../pro/proLanes";
import { BIZ_LANES } from "../business/bizLanes";
import { tk } from "../../../i18n/core";

/**
 * The numbered steps of each onboarding lane, by name, in order. The lane
 * chip, the "Step n of N" eyebrow and the progress bar all read this, so a
 * lane's count is its own steps only (V6-155: numbered steps use lane counts).
 *
 * OWNED BY THE SHELL; LANES ADD ONLY. Batch 3 builds the client lane; the
 * professional lane (OB-B) and the business lanes (OB-C) add their entries
 * here without changing the client one.
 */
export interface LaneDef {
  /** Chip label (BizOnboardingV10 `chip`): "Personal", "Gym", "Personal Trainer"… */
  chip: string;
  /** 20×20 chip drawing (BizOnboardingV10 VIS[lane]). */
  vis: Shape[];
  /** Numbered step keys, in order. */
  steps: readonly string[];
}

export const LANES: Record<string, LaneDef> = {
  client: { chip: tk("Personal"), vis: LANE_CHIP_VIS.client, steps: ["about", "gentle", "goals", "track"] },
  // Professional lanes (OB-B): pro-trainer, pro-physio, pro-diet, pro-other.
  ...PRO_LANES,
  // Business lanes (OB-C): biz-classes, biz-gym, biz-store.
  ...BIZ_LANES,
};

/** "Step n of N" and the bar position for a step, or null when the step is not numbered. */
export function laneProgress(lane: string, step: string): { index: number; count: number } | null {
  const def = LANES[lane];
  if (!def) return null;
  const index = def.steps.indexOf(step);
  return index < 0 ? null : { index, count: def.steps.length };
}
