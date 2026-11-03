import React from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { t } from "../../../i18n/core";
import { useWebLayout } from "../../../components/web/useWebLayout";

// Website viewport v1 · WC-MO More Web v7: the parts the client More
// destinations share (My Profile, Calendar, Messages, Centium Premium). The
// page is one viewport tall: a 64 header (title 24/32 600 -0.6px, its line
// 13/20 #8C8378 on the baseline 14 after it, a 40 #9A8CD6 CTA at the end;
// side padding 32, 24 on the rail) over a body capped at 1280 with padding
// 24 32 (24 24 on the rail).

/** The page frame: header and a body that fills the rest of the viewport. */
export const MoPage: React.FC<{ title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; frame: string; onBack?: () => void }> = ({
  title,
  onBack,
  sub,
  action,
  children,
  frame,
}) => {
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  return (
    <div className="flex flex-col bg-white" style={{ height: "100dvh" }} data-web-mo={frame}>
      <header className="shrink-0 flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        {/* The back button (a child page): 36, margin-start -8, chevron 20 #5B5349, hover #F5F5F6. */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label={t("Back")}
            title={t("Back")}
            className="shrink-0 grid place-items-center hover:bg-[#F5F5F6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ width: 36, height: 36, marginInlineStart: -8, borderRadius: 999 }}
          >
            <ChevronLeft size={20} style={{ color: "#5B5349" }} aria-hidden />
          </button>
        )}
        <div className="flex-1 min-w-0 flex items-baseline" style={{ gap: 14 }}>
          <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
            {title}
          </h1>
          {sub && (
            <p title={sub} className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
              {sub}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className="flex-1 min-h-0">
        <div className="h-full mx-auto flex flex-col" style={{ maxWidth: 1280, boxSizing: "border-box", padding: `24px ${margin}px`, gap: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/** The header CTA: 40, padding 0 16, r12, #9A8CD6, 15/700 white, an 18 glyph 8 before the label. */
export const MoCta: React.FC<{ icon: LucideIcon; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 flex items-center whitespace-nowrap hover:scale-[0.98] active:scale-[0.96] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
    style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#9A8CD6", color: "#FFFFFF", gap: 8, fontSize: 15, fontWeight: 700 }}
  >
    <Icon size={18} aria-hidden />
    {label}
  </button>
);

/** A section label: h2 13/20 700 .14em caps #7D67D9 over a 1.5 #AEA1DC rule (padding-bottom 8). */
export const MoLabel: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <h2
    id={id}
    className="uppercase rtl:tracking-normal"
    style={{ margin: 0, paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".14em", color: "#7D67D9" }}
  >
    {children}
  </h2>
);

/** An outlined row card: r18, 1px rgba(36,31,27,0.08), padding 12 14, a 32 r10 #F0EDF9 tile with a 17 glyph, 15/600, chevron 16 #8C8378. */
export const MoLinkRow: React.FC<{ icon: LucideIcon; label: string; onClick: () => void }> = ({ icon: Icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="shrink-0 w-full flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ gap: 12, borderRadius: 18, border: "1px solid rgba(36,31,27,0.08)", padding: "12px 14px", background: "#FFFFFF" }}
  >
    <span className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: "#F0EDF9" }}>
      <Icon size={17} strokeWidth={1.75} style={{ color: "#7D6BB5" }} aria-hidden />
    </span>
    <span className="flex-1 min-w-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
      {label}
    </span>
    <ChevronRight size={16} className="shrink-0" style={{ color: "#8C8378" }} aria-hidden />
  </button>
);
