import React from "react";
import { Plus } from "lucide-react";

/**
 * "+ Create exercise", handover 2026-09-29 WO2.1 (assets/WO2.1.png, the
 * Library List header row): a #AEA1DC rounded rectangle, 34 high, radius 12,
 * white 12.5px/700 label with a 13px plus. One component for every place a
 * custom exercise is started (the Library tab and the Exercise Library sheet),
 * so they cannot drift apart again.
 */
export const CreateExerciseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="tap flex items-center shrink-0"
    style={{ height: 34, borderRadius: 12, padding: "0 16px", gap: 8, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 12.5, fontWeight: 700 }}
  >
    <Plus size={13} strokeWidth={2.4} /> Create exercise
  </button>
);
