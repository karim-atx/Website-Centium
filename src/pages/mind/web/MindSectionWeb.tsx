import type React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Plus } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../../components/web/useWebLayout";
import { t } from "../../../i18n/core";
import { MIND_WEB_CSS, mindPrimary } from "./mindWebStyles";

/**
 * Website viewport v1, the Mind sections' frame (WC-MI Mind Web v5, literal):
 * a sticky 64 header with the 36 back button (chevron 20 #5B5349, hover
 * #F5F5F6), the title 24/32 600 (-0.6px) with its line 13/20 #8C8378 on the
 * baseline and the 40 CTA at the end (#9A8CD6, Plus 18); under it the content
 * centred at most 1280 wide, 24 above and below, 32 at the sides (24 with
 * the rail), its blocks 20 apart. `fill` stretches the content to the
 * window's height (the Journal and Meditation panes).
 */
export const MindSectionWeb: React.FC<{
  title: string;
  sub: string;
  cta?: { label: string; onClick: () => void; disabled?: boolean };
  fill?: boolean;
  children: React.ReactNode;
}> = ({ title, sub, cta, fill, children }) => {
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  return (
    <div data-web-mind-section className={fill ? "flex flex-col" : undefined} style={fill ? { width: "100%", minHeight: "100dvh" } : undefined}>
      <style href="mind-web-section" precedence="default">{MIND_WEB_CSS}</style>
      <header className="sticky top-0 flex items-center bg-cream" style={{ zIndex: 30, height: 64, flex: "none", boxSizing: "border-box", gap: 12, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <button
          type="button"
          onClick={() => navigate("/app/mind")}
          aria-label={t("Back")}
          title={t("Back")}
          className="mind-web-back grid place-items-center"
          style={{ width: 36, height: 36, marginInlineStart: -8, borderRadius: 999, flex: "none" }}
        >
          <ChevronLeft size={20} color="#5B5349" aria-hidden />
        </button>
        <div className="flex items-baseline" style={{ flex: 1, minWidth: 0, gap: 14 }}>
          <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
            {title}
          </h1>
          <p className="truncate" style={{ margin: 0, minWidth: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
            {sub}
          </p>
        </div>
        {cta && (
          <button type="button" data-mind-cta onClick={cta.onClick} disabled={cta.disabled} className="mind-web-press" style={{ ...mindPrimary, opacity: cta.disabled ? 0.5 : 1 }}>
            <Plus size={18} color="#FFFFFF" aria-hidden />
            {cta.label}
          </button>
        )}
      </header>
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: WEB_CONTENT_MAX, margin: "0 auto", padding: `24px ${margin}px`, boxSizing: "border-box", gap: 20, ...(fill ? { flex: 1, minHeight: 0 } : null) }}
      >
        {children}
      </div>
    </div>
  );
};
