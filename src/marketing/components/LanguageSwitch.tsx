import React from "react";
import { useApp } from "../../context/AppContext";

// Round F (AV, undrawn): the landing page's language switch. It names the
// other language in that language ("العربية" on the English page, "English"
// on the Arabic one), in the nav's own link style, and sets the same choice as
// Settings › Language, so a visitor who signs up keeps it. Arabic carries
// "Beta" until every area of the app is translated (F7).
export const LanguageSwitch: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { language, setLanguage } = useApp();
  const toArabic = language !== "ar";
  return (
    <button
      type="button"
      lang={toArabic ? "ar" : "en"}
      onClick={() => setLanguage(toArabic ? "ar" : "en")}
      aria-label={toArabic ? "العربية (تجريبية)" : "English"}
      className="cl-hc"
      style={
        {
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13.5px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          color: "#5B5349",
          background: "none",
          border: 0,
          padding: "9px 4px",
          cursor: "pointer",
          "--hc": "#221E1A",
          ...style,
        } as React.CSSProperties
      }
    >
      {toArabic ? "العربية" : "English"}
      {toArabic && (
        <span style={{ fontSize: "10.5px", fontWeight: 700, padding: "1px 7px", borderRadius: "999px", background: "#F1EDFB", color: "#5B45C2" }}>تجريبية</span>
      )}
    </button>
  );
};
