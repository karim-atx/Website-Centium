import type { CSSProperties } from "react";
import { REFUND_POLICY_LABEL, REFUND_POLICY_PATH } from "../../marketing/legal/refund";

/**
 * Round F (DN, F6): the Refund and cancellation policy link every plan screen
 * carries, in that screen's own fine print (size and colour are inherited).
 * A new tab, so a sheet, dialog or sign-up step keeps its place.
 */
export function RefundPolicyLink({ style }: { style?: CSSProperties }) {
  return (
    <a
      href={REFUND_POLICY_PATH}
      target="_blank"
      rel="noopener noreferrer"
      data-refund-policy-link
      style={{ color: "inherit", fontWeight: 700, textDecoration: "underline", textUnderlineOffset: "2px", ...style }}
    >
      {REFUND_POLICY_LABEL}
    </a>
  );
}
