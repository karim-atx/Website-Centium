import React from "react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";

// Professional handover v1, section 4 "Page header": a 64 bar with the bottom
// divider, the H1 28/36 700 (−0.022em) and the page's actions on the right;
// the page content starts 32 below it (24 on the rail), capped per 2.1.
// Shared by the professional web pages that have a plain title (Library,
// Meal plans, Insights, Care network).

export const ProPageHeaderWeb: React.FC<{ title: string; kicker?: string; actions?: React.ReactNode }> = ({ title, kicker, actions }) => {
  const { rail } = useWebLayout();
  return (
    <header className="flex items-center" style={{ minHeight: 64, boxSizing: "border-box", gap: 12, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <div className="flex-1 min-w-0">
        {kicker && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>{kicker}</p>}
        <h1 className="truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", color: "#241F1B" }}>
          {title}
        </h1>
      </div>
      {actions && <div className="flex items-center shrink-0" style={{ gap: 10 }}>{actions}</div>}
    </header>
  );
};

export const ProPageBodyWeb: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rail } = useWebLayout();
  return (
    <div data-pro-web="page" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: rail ? 24 : 32 }}>
      {children}
    </div>
  );
};
