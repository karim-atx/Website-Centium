import React from "react";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";

/**
 * Website viewport v1, section 4 "Page header": a 64 bar with a bottom divider;
 * a 40 back button when the page is a child (chevron 20 #5B5349, hover
 * #F5F5F6); the H1 28/36 700 (-0.022em) with its kicker or line beside it
 * (13/20 #8C8378); actions at the end (buttons 40, the primary CTA 44).
 */
export const WebPageHeader: React.FC<{
  title: string;
  /** The supporting line beside the title (on its baseline). */
  sub?: string;
  /** The caps kicker before the title (13/20 700, 0.08em). */
  kicker?: string;
  /** Where the back button goes; no back button without it. "square": r12 with an ink chevron (Class rules). */
  back?: { to: string; label: string; square?: boolean; onClick?: () => void };
  actions?: React.ReactNode;
}> = ({ title, sub, kicker, back, actions }) => {
  const navigate = useNavigate();
  const { t } = useApp();
  return (
    <header
      className="shrink-0 flex items-center bg-cream"
      style={{ height: 64, boxSizing: "border-box", gap: back?.square ? 8 : 12, paddingInlineStart: back ? (back.square ? 22 : 20) : 32, paddingInlineEnd: 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
    >
      {back && (
        <button
          type="button"
          onClick={() => (back.onClick ? back.onClick() : navigate(back.to))}
          title={t(back.label)}
          aria-label={t(back.label)}
          className="shrink-0 flex items-center justify-center hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 40, height: 40, borderRadius: back.square ? 12 : 999 }}
        >
          <ChevronLeft size={20} strokeWidth={back.square ? 2.2 : 2} style={{ color: back.square ? "#241F1B" : "#5B5349" }} aria-hidden />
        </button>
      )}
      <div className="flex-1 min-w-0 flex items-baseline" style={{ gap: 12 }}>
        {kicker && (
          <span className="shrink-0 uppercase" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", color: "#71685E" }}>
            {kicker}
          </span>
        )}
        <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", color: "#241F1B" }}>
          {title}
        </h1>
        {sub && (
          <p title={sub} className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
            {sub}
          </p>
        )}
      </div>
      {actions && <div className="shrink-0 flex items-center" style={{ gap: 8 }}>{actions}</div>}
    </header>
  );
};
