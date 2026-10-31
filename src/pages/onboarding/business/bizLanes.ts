import { CI, LF, OB, RC, type Shape } from "../shell/visuals";
import type { LaneDef } from "../shell/lanes";
import { BIZ_STEPS, type BizFlowKey, type BizLane } from "./lanes";
import { tk } from "../../../i18n/core";

export { BIZ_STEPS, type BizFlowKey };

// The business lanes' entries for the shell's LANES (shell/lanes.ts): chip,
// 20×20 chip drawing (BizOnboardingV10 VIS) and the six numbered steps by
// their flow keys (onboardingSteps.ts BIZ_FLOW_STEPS after the type step).

export const BIZ_VIS: Record<BizLane, Shape[]> = {
  classes: [RC(14, 80, 72, 2, 1, OB.lav, { o: 0.7 }), LF(26, 79, 0.075, -45, OB.leaf), LF(50, 79, 0.1, -45, OB.brand), LF(74, 79, 0.075, -45, OB.lav)],
  gym: [
    RC(12, 80, 76, 2, 1, OB.lav, { o: 0.7 }),
    RC(14, 62, 72, 3.5, 1.75, OB.lav),
    RC(20, 52, 7, 24, 2.5, OB.brand),
    RC(73, 52, 7, 24, 2.5, OB.brand),
    RC(28, 56, 4, 16, 1.5, OB.lav),
    RC(68, 56, 4, 16, 1.5, OB.lav),
    LF(50, 62, 0.085, -45, OB.leaf),
  ],
  store: [
    RC(14, 48, 72, 2.5, 1.25, OB.lav),
    RC(14, 80, 72, 2.5, 1.25, OB.lav),
    RC(22, 31, 13, 17, 3.5, OB.brand, { o: 0.85 }),
    RC(39, 36, 11, 12, 3, OB.lav),
    RC(56, 66, 14, 14, 3.5, OB.brand, { o: 0.6 }),
    LF(64, 48, 0.055, -45, OB.leaf),
    LF(30, 80, 0.06, -45, OB.leaf),
  ],
};

/** The shell lane id of a business lane. */
export const bizLaneId = (lane: BizLane) => `biz-${lane}`;

export const BIZ_LANES: Record<string, LaneDef> = {
  "biz-classes": { chip: tk("Classes"), vis: BIZ_VIS.classes, steps: BIZ_STEPS },
  "biz-gym": { chip: tk("Gym"), vis: BIZ_VIS.gym, steps: BIZ_STEPS },
  "biz-store": { chip: tk("Store"), vis: BIZ_VIS.store, steps: BIZ_STEPS },
};

/** The status screens' drawings (BizOnboardingV10 after submitting). */
export const STATUS_SUBMITTED_VIS: Shape[] = [LF(50, 82, 0.13, -45, OB.leaf), CI(50, 50, 40, "none", { s: OB.lav, sw: 1.5, o: 0.6 })];
export const STATUS_REJECTED_VIS: Shape[] = [LF(50, 82, 0.13, -45, OB.leaf, 0.5), CI(50, 50, 40, "none", { s: OB.high, sw: 1.5, o: 0.5 })];
export const statusFan = (v: number): Shape[] => [LF(50, 80, 0.12, 0, OB.leaf), LF(50, 80, 0.12, -45 * v, OB.lav), LF(50, 80, 0.12, -90 * v, OB.brand)];
