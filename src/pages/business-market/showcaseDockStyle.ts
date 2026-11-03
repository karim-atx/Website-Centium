import type React from "react";

// Website viewport v1 · WB-MA.2: the docked "Edit item" field and Save sizes (ShowcaseDock.web).

/** The field inside a DockBox: white, radius 10, padding 9 13, 15/22. */
export function dockField(invalid?: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    background: "#FFFFFF",
    borderRadius: 10,
    padding: "9px 13px",
    fontSize: 15,
    lineHeight: "22px",
    color: "#241F1B",
    border: 0,
    boxShadow: invalid ? "inset 0 0 0 1px #C0392B" : undefined,
    outline: "none",
    fontFamily: "inherit",
    fontWeight: 400,
  };
}

/** Save in the docked footer: 44 tall, radius 14, #AEA1DC, 15/24 600 white; 0.4 while it can't save. */
export const DOCK_SAVE: React.CSSProperties = { height: 44, borderRadius: 14, background: "#AEA1DC", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600 };
