import React from "react";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t } from "../../../i18n/core";

/** The page frame: the 64 header and the full-height grid. */
export const PrFrameWeb: React.FC<{ title: string; sub: string; subInk: string; back?: () => void; lFr: number; rFr: number; children: React.ReactNode }> = ({ title, sub, subInk, back, lFr, rFr, children }) => {
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  return (
    <div data-web-pr className="flex flex-col" style={{ height: "100dvh", minHeight: 480, lineHeight: "normal" }}>
      <header className="flex items-center bg-cream" style={{ height: 64, flex: "none", boxSizing: "border-box", gap: 14, padding: `0 ${margin}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        {back && (
          <button type="button" onClick={back} aria-label={t("Back")} title={t("Back")} className="pr-web-back grid place-items-center" style={{ width: 36, height: 36, marginInlineStart: -8, borderRadius: 999, flex: "none" }}>
            <ChevronLeftIcon />
          </button>
        )}
        <h1 className="whitespace-nowrap" style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>
          {title}
        </h1>
        <p title={sub} className="truncate" style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13, lineHeight: "20px", color: subInk }}>
          {sub}
        </p>
      </header>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div data-pr-grid style={{ maxWidth: 1280, height: "100%", margin: "0 auto", padding: `24px ${margin}px`, boxSizing: "border-box", display: "grid", gridTemplateColumns: `minmax(0,${lFr}fr) minmax(0,${rFr}fr)`, gap: 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

const ChevronLeftIcon: React.FC = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#5B5349" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="rtl:-scale-x-100">
    <path d="m15 18-6-6 6-6" />
  </svg>
);
