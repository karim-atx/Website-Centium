import type React from "react";
import { ChevronLeft, Plus } from "lucide-react";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t } from "../../../i18n/core";
import { COMMUNITY_WEB_CSS } from "./communityWebStyles";

/**
 * Website viewport v1, the Community pages' frame (WC-CO Community Web v3,
 * literal): a sticky 64 header with a bottom divider, padding 0 32 (24 with
 * the rail), gap 14: the 36 back button (ml -8, chevron 20 #5B5349) on a
 * child page, the title 24/32 600 (-0.6px), the line 13/20 500 #8C8378 (one
 * line, ellipsis) and the 40 CTA at the end (#AEA1DC, r12, 15/24 600, Plus
 * 18). Under it the content, at most 1280 wide and centred, 24 above and
 * below, its blocks 16 apart; with `tabs` the Forum · Courses segmented
 * control first (40: track #F3F3FD pad 5 r14, pills 30 r10, selected #A79AD5
 * white, idle #5B5349, 15/24 600, equal widths).
 */
export const CommunityFrameWeb: React.FC<{
  title: string;
  sub: string;
  onBack?: () => void;
  cta?: { label: string; onClick: () => void };
  tabs?: { active: "forum" | "courses"; onChange: (k: "forum" | "courses") => void };
  /** Stretch the content to the window (a centred message under the header). */
  fill?: boolean;
  children: React.ReactNode;
}> = ({ title, sub, onBack, cta, tabs, fill, children }) => {
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  return (
    <div data-web-community className="flex flex-col" style={{ minHeight: "100dvh", color: "#241F1B" }}>
      <style href="co-web" precedence="default">{COMMUNITY_WEB_CSS}</style>
      <header
        className="sticky top-0 flex items-center bg-cream"
        style={{ zIndex: 30, height: 64, flex: "none", boxSizing: "border-box", gap: 14, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
      >
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("Back")}
            title={t("Back")}
            className="co-web-back grid place-items-center"
            style={{ width: 36, height: 36, marginInlineStart: -8, borderRadius: 999, flex: "none" }}
          >
            <ChevronLeft size={20} color="#5B5349" aria-hidden />
          </button>
        )}
        <h1 className="whitespace-nowrap truncate" title={title} style={{ margin: 0, minWidth: 0, maxWidth: "60%", fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
          {title}
        </h1>
        <p className="truncate" style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "#71685E" }}>
          {sub}
        </p>
        {cta && (
          <button
            type="button"
            data-co-cta
            onClick={cta.onClick}
            className="co-web-press flex items-center whitespace-nowrap"
            style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#AEA1DC", color: "#FFFFFF", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, flex: "none" }}
          >
            <Plus size={18} color="#FFFFFF" aria-hidden />
            {cta.label}
          </button>
        )}
      </header>
      <div
        className="flex flex-col"
        style={{ width: "100%", maxWidth: 1280, margin: "0 auto", padding: `24px ${margin}px`, boxSizing: "border-box", gap: 16, ...(fill ? { flex: 1, minHeight: 0 } : null) }}
      >
        {tabs && (
          <div role="tablist" aria-label={t("Community")} data-co-tabs className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5, padding: 5, borderRadius: 14, background: "#F3F3FD", flex: "none" }}>
            {(["forum", "courses"] as const).map((k) => {
              const on = tabs.active === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => tabs.onChange(k)}
                  className="co-web-chip"
                  style={{ height: 30, borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
                >
                  {k === "forum" ? t("Forum") : t("Courses")}
                </button>
              );
            })}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

/** A centred line under the header (the adults-only and date-of-birth answers): a 56 r16 #F0EDF9 tile with Users 26 #7D6BB5, the line 15/24 #5B5349 at most 320 wide, 10 apart. */
export const CenteredNote: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex flex-col items-center justify-center text-center" style={{ flex: 1, gap: 10 }} data-co-note>
    <span className="grid place-items-center" style={{ width: 56, height: 56, borderRadius: 16, background: "#F0EDF9", color: "#7D6BB5" }} aria-hidden>
      {icon}
    </span>
    <div style={{ margin: 0, maxWidth: 320, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{children}</div>
  </div>
);
