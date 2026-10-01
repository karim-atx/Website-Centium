import { createContext, useContext } from "react";
import type { Phase } from "../services/health-checks/guidance";
import type { TurnOnResult } from "../services/health-checks/setting";

// The shape behind HealthChecksProvider (./HealthChecksContext), kept apart so
// the provider file exports only a component.

export type CheckIn = { date: string; answers: number[] };

export type HealthChecksValue = {
  available: boolean;
  /** Available AND the account's setting read as on. */
  active: boolean;
  on: boolean | null;
  refresh: () => void;
  turnOn: () => Promise<TurnOnResult>;
  turnOff: () => Promise<boolean>;
  phase: Phase | null;
  setPhase: (p: Phase) => void;
  stoppedOn: string | null;
  checkIns: CheckIn[];
  addCheckIn: (c: CheckIn) => void;
};

export const HealthChecksCtx = createContext<HealthChecksValue | null>(null);

export function useHealthChecks(): HealthChecksValue {
  const v = useContext(HealthChecksCtx);
  if (!v) throw new Error("useHealthChecks outside HealthChecksProvider");
  return v;
}
