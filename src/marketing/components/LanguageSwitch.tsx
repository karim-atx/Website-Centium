import React from "react";
import { useApp } from "../../context/AppContext";

// Round F (AV, undrawn): the landing page's language switch. It names the
// other language in that language ("العربية" on the English page, "English"
// on the Arabic one), in the nav's own link style, and sets the same choice as
// Settings › Language, so a visitor who signs up keeps it.
export const LanguageSwitch: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
  const { language, setLanguage } = useApp();
  const toArabic = language !== "ar";
  return (
    <button
      type="button"
      lang={toArabic ? "ar" : "en"}
      onClick={() => setLanguage(toArabic ? "ar" : "en")}
      className="cl-hc"
      style={
        {
          display: "inline-flex",
          alignItems: "center",
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
    </button>
  );
};
