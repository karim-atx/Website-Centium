import React from "react";
import { Plus } from "lucide-react";
import { linePx, textPx } from "../../theme/textSize";
import { useLibraryInk } from "./LibraryParts";
import { t } from "../../i18n/core";

/**
 * "+ Create exercise", handover 2026-09-29 WO2.1 / v6 WO2 #12-#13 (the
 * Library tab's header row): a #AEA1DC rounded rectangle, 34 high, radius 12,
 * padding 0 16, white 12.5/700 label with a 13px plus 8 from it (dark #0D0B1A
 * on #A991FE; the plus is drawn #FFFFFF in dark, V6-02 keeps it #0D0B1A).
 *
 * `compact` (v6 WO1.3 #65-#66, the Exercise Library sheet): "Create" beside
 * the search field, 42 tall, r14, padding 0 12, 12.5/18.8 700 #7D6BB5 on
 * #F0EDF9 (dark #C3B3FB on #303141), the plus 13 four from the label.
 *
 * One component for every place a custom exercise is started, so they cannot
 * drift apart again.
 */
export const CreateExerciseButton: React.FC<{ onClick: () => void; compact?: boolean; disabled?: boolean }> = ({ onClick, compact, disabled }) => {
  const ink = useLibraryInk();
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="tap flex items-center shrink-0 bg-th-f0edf9 dark:bg-th-303141 disabled:opacity-50"
        style={{ height: 42, borderRadius: 14, padding: "0 12px", gap: 4, color: ink, fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 700 }}
      >
        <Plus size={13} strokeWidth={2.4} /> {t("Create")}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap flex items-center shrink-0 disabled:opacity-50"
      style={{ height: 34, borderRadius: 12, padding: "0 16px", gap: 8, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 700 }}
    >
      <Plus size={13} strokeWidth={2.4} /> {t("Create exercise")}
    </button>
  );
};
