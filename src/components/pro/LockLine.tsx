import React from "react";
import { Lock } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { INK } from "./proInk";
import { lockLineText } from "./proRules";

/**
 * Release 3 · LockLine (HANDOVER e, k: "Not shared: the section is hidden and
 * the LockLine says so"; source gen/r6b.js, the CL2 "Shared with you" lock
 * row). Every gated section renders this instead of its content when
 * useClientAccess says the category is off; nothing behind it is fetched.
 *
 * Row: lock 13 / 2 text.faint, gap 8, r14, soft fill, pad 10 12; line 11.5 /
 * 1.5 text.soft. Copy (COPY CL2): "{What} not shared, so hidden.
 * {client_first_name} can change this any time." An optional action sits at
 * the end (W3: "Ask to share", DB-2 request_client_access).
 */
export interface LockLineProps {
  /** What isn't shared, as the sentence starts: "Sleep and Vitals", "Lab results". */
  what: string;
  clientFirstName: string;
  action?: React.ReactNode;
  className?: string;
}

export const LockLine: React.FC<LockLineProps> = ({ what, clientFirstName, action, className }) => (
  <div className={`flex items-start ${className ?? ""}`} style={{ gap: 8, borderRadius: 14, background: INK.soft, padding: "10px 12px" }}>
    <Lock size={13} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0, marginTop: 3 }} />
    <p className="flex-1 min-w-0" style={{ fontSize: textPx(11.5), lineHeight: 1.5, color: INK.chS }}>
      {lockLineText(what, clientFirstName)}
    </p>
    {action}
  </div>
);
