import type React from "react";

// WP-LI.4 (WP-LI Builders Web v2): the template editor page's field styles,
// shared by RoutinePageWeb and the "For your clients" column (TemplateEditor).

const INK = "#241F1B";
const INK2 = "#5B5349";
const FAINT = "#71685E";
const FIELD = "#F5F5F6";
const LINE = "1px solid rgba(36,31,27,0.10)";

/** The 13/20 600 label over a field. */
export const routineLabel: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 13,
  lineHeight: "20px",
  fontWeight: 600,
  color: INK2,
};

/** Web field styles for the "For your clients" column (WP-LI Builders Web v2). */
export const clientsColumn = {
  caps: {
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    lineHeight: "20px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: ".08em",
    color: FAINT,
  } as React.CSSProperties,
  pick: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: 44,
    boxSizing: "border-box",
    borderRadius: 16,
    background: FIELD,
    border: LINE,
    padding: "0 16px",
    fontSize: 15,
    lineHeight: "24px",
    textAlign: "start",
  } as React.CSSProperties,
  switchRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 16,
    background: FIELD,
    padding: "12px 16px",
  } as React.CSSProperties,
  weeks: {
    width: 120,
    height: 48,
    boxSizing: "border-box",
    borderRadius: 16,
    background: FIELD,
    border: LINE,
    padding: "0 16px",
    fontSize: 15,
    color: INK,
  } as React.CSSProperties,
  note: {
    flex: 1,
    minHeight: 120,
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 16,
    background: FIELD,
    border: LINE,
    padding: "12px 16px",
    fontSize: 15,
    lineHeight: "24px",
    color: INK,
    resize: "none",
  } as React.CSSProperties,
  folder: (on: boolean): React.CSSProperties => ({
    height: 40,
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${on ? "#9A8CD6" : "transparent"}`,
    background: on ? "#9A8CD6" : FIELD,
    color: on ? "#FFFFFF" : INK2,
    padding: "0 8px",
  }),
  focus:
    "focus:outline-none focus:border-[#AEA1DC] focus:shadow-[0_0_0_3px_rgba(174,161,220,0.25)]",
};
