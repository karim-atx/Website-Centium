import React from "react";
import { Sparkles } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { EmptyState } from "./EmptyState";
import { INK } from "./proInk";
import { t } from "../../i18n/core";
import { usePaneSpan } from "../web/paneFill";

/**
 * Release 3 · ComingSoon (HANDOVER a and l: "Where data or a backend doesn't
 * exist yet, render the specified empty or 'coming soon' state"). Never sample
 * data. Two shapes:
 * - ComingSoon: a section's state, in the EmptyState layout, titled "Coming
 *   soon" with the caller's line (COPY wording where the frame gives one).
 * - ComingSoonPill: the inline "Coming soon" tag beside a row (MO8 "Card in
 *   the app", CA23 sync): 10 / 700 uppercase, r9999, soft fill, text.faint.
 */
export const ComingSoon: React.FC<{ line?: string; children?: React.ReactNode }> = ({ line, children }) => (
  <EmptyState icon={Sparkles} title={t("Coming soon")} line={line}>
    {children}
  </EmptyState>
);

// Website viewport (ST Settings Web, a row's value): in a spanning More / Settings pane "Coming soon" is the plain
// 13/20 #8C8378 value text the frames draw, not a pill.
// web: the web Targets page (WP-NU-MP.4) draws a 12/16 700 #F0EDF9 pill, no caps.
export const ComingSoonPill: React.FC<{ web?: boolean }> = ({ web }) => {
  const span = usePaneSpan();
  return web ? (
    <span style={{ fontSize: 12, lineHeight: "16px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#F0EDF9", color: "#5F5093", whiteSpace: "nowrap" }}>{t("Coming soon")}</span>
  ) : span ? (
    <span style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378", whiteSpace: "nowrap" }}>{t("Coming soon")}</span>
  ) : (
  <span
    className="inline-flex items-center whitespace-nowrap rounded-full"
    style={{ fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", padding: "2px 8px", background: INK.soft, color: INK.chF }}
  >{t("Coming soon")}</span>
  );
};
