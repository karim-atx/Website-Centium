import type React from "react";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

/** ui.js field box: 40 high, r12, soft fill, 1px 10% border (primary when focused), pad 0 12, 14 text.primary. */
export const fieldBox = (focus = false): React.CSSProperties => ({
  width: "100%",
  minHeight: 40,
  borderRadius: 12,
  background: INK.soft,
  border: `1px solid ${focus ? INK.pr : INK.b10}`,
  padding: "0 12px",
  fontSize: textPx(14),
  color: INK.ch,
});
