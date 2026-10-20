import React from "react";
import { ShieldAlert } from "lucide-react";
import { textPx } from "../../theme/textSize";

/** Karim's answer 1: the words shown wherever a professional's licence isn't verified. */
export const LICENCE_NOT_VERIFIED = "Licence not verified yet";

/**
 * Release 3 · W7 (Karim's answer 1): "Licence not verified yet" on the invite
 * page and the client's Connected professionals row, from
 * preview_invite_link / connected_professional_summary .licence_verified.
 * No frame draws it: a neutral line in the profile's own small type (11.5 /
 * 600, charcoal-soft) with ShieldAlert 12, so it reads as information, not
 * as an error or a warning about the person.
 */
export const LicencePendingTag: React.FC<{ className?: string; size?: number }> = ({ className, size = 11.5 }) => (
  <span className={`inline-flex items-center gap-1 font-semibold text-charcoal-soft ${className ?? ""}`} style={{ fontSize: textPx(size) }}>
    <ShieldAlert size={12} strokeWidth={2} aria-hidden className="shrink-0" />
    {LICENCE_NOT_VERIFIED}
  </span>
);
