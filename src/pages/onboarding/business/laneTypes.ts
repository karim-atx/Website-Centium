import type { BusinessLaneDraft } from "./draft";
import type { BizFlowKey } from "./bizLanes";

/** What the lane renderer hands every numbered step. */
export interface LaneStepProps {
  biz: BusinessLaneDraft;
  setBiz: (f: (b: BusinessLaneDraft) => BusinessLaneDraft) => void;
  /** This step's flow key (bar position, chip and "Step n of 6" come from the shell's LANES). */
  flowKey: BizFlowKey;
  /** Validated: the lane saves this step (server, B5) and moves on. */
  onContinue: () => void;
  onBack: () => void;
  /** "Save and exit" in the header (off on Review and when fixing after review). */
  saveExit: boolean;
  /** The lane's save of this step. */
  save: { busy: boolean; error: string | null; offline: boolean };
  uid: string | null;
  /** Review's Edit: jump to a step. */
  goTo: (k: BizFlowKey) => void;
  /** The account's date of birth (Policies and verification; DobStep moved here). */
  dob: string;
  setDob: (v: string) => void;
  /** Whether the date of birth is already stored (locked, ATX51). */
  dobLocked: boolean;
  online: boolean;
}
