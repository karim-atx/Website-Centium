import React from "react";

// Website viewport (Professional handover v1, section 4; ST Settings Web): the
// header of a page shown in a spanning More / Settings pane. No back chevron
// (the column is the way back): the title 28/36 700, the line 13/20 #8C8378,
// 28 above the first block. The same values as the profile kit's SubPage.
export const PaneHeaderWeb: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode }> = ({ title, subtitle, right }) => (
  <header className="flex items-start justify-between" style={{ gap: 16, marginBottom: 28 }}>
    <div className="flex flex-col min-w-0" style={{ gap: 2 }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B", textWrap: "pretty" }}>{title}</h1>
      {subtitle && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378", textWrap: "pretty" }}>{subtitle}</p>}
    </div>
    {right}
  </header>
);
