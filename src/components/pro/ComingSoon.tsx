import React from "react";
import { Sparkles } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { EmptyState } from "./EmptyState";
import { INK } from "./proInk";
import { t } from "../../i18n/core";

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

export const ComingSoonPill: React.FC = () => (
  <span
    className="inline-flex items-center whitespace-nowrap rounded-full"
    style={{ fontSize: textPx(10), fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.025em", padding: "2px 8px", background: INK.soft, color: INK.chF }}
  >{t("Coming soon")}</span>
);
