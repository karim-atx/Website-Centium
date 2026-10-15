import type React from "react";
import type { ProfessionalSubtype } from "../../../types";
import type { ProKind, ProLaneDraft, ProStepKey } from "./proModel";

/** The onboarding draft fields the professional lane reads and writes. */
export interface ProShared {
  firstName: string;
  dateOfBirth: string;
  professionalSubtype: ProfessionalSubtype | null;
  /** The certificate's storage path (certifications bucket), read back from the server. */
  certificationFile: string | null;
}

export interface ProStepProps {
  kind: ProKind;
  shared: ProShared;
  setShared: (patch: Partial<ProShared>) => void;
  pro: ProLaneDraft;
  setPro: React.Dispatch<React.SetStateAction<ProLaneDraft>>;
  userId: string | null;
  onNext: () => void;
  onBack: () => void;
  /** Review's Edit: open a step; its Continue comes back to Review. */
  goTo: (step: ProStepKey) => void;
}
