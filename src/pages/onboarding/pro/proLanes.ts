// The professional lanes' entries in the shell's LANES (shell/lanes.ts): chip,
// chip drawing and the six numbered steps, one lane per specialty so the chip
// reads the specialty (BizOnboardingV10 `chip` = PT[1]).
import type { LaneDef } from "../shell/lanes";
import { PRO_LABEL, PRO_STEP_KEYS, type ProKind } from "./proModel";
import { PRO_CHIP_VIS } from "./proVisuals";

export const proLaneId = (k: ProKind): string => `pro-${k}`;

export const PRO_LANES: Record<string, LaneDef> = Object.fromEntries(
  (["trainer", "physio", "diet", "other"] as ProKind[]).map((k) => [proLaneId(k), { chip: PRO_LABEL[k], vis: PRO_CHIP_VIS[k], steps: PRO_STEP_KEYS }])
);
