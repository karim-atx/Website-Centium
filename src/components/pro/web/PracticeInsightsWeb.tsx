import React from "react";
import { ArrowDown, ArrowUp, ChartLine, ChevronRight, UserPlus, type LucideIcon } from "lucide-react";
import { Spark, type NumBoxData } from "../forms/moKit";
import { OfflineLine } from "../states";
import type { PageRange } from "../insights/panelProps";
import { useWebLayout, WEB_READING_MAX } from "../../web/useWebLayout";
import { t } from "../../../i18n/core";

// Professional handover v1 · WP-MO.9 Practice insights (WP-MO Practice
// Insights Web): the 64 header (title 28/36 with the line 15/24 on its
// baseline, the Today / Week / Month track 300 × 40, 264 on the rail); the
// Milestone + three number boxes in one row of 4 (16 apart); the groups list
// (64 rows) and Latest reviews in a 360 column (300 on the rail) beside the
// open group's card (header 40 tile, 22/30 title; its charts at 300 high).
// The data, the charts and the share flows are PracticeInsightsScreen's.

const BORDER = "1px solid rgba(36,31,27,0.08)";

export const PracticeHeaderWeb: React.FC<{ range?: PageRange; onRange?: (r: PageRange) => void }> = ({ range, onRange }) => {
  const { rail } = useWebLayout();
  const items: { k: PageRange; label: string }[] = [
    { k: "today", label: t("Today") },
    { k: "week", label: t("Week") },
    { k: "month", label: t("Month") },
  ];
  return (
    <header className="flex items-center" style={{ height: 64, flex: "none", boxSizing: "border-box", gap: 16, padding: `0 ${rail ? 24 : 32}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
      <div className="flex-1 min-w-0 flex items-baseline" style={{ gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", whiteSpace: "nowrap", color: "#241F1B" }}>{t("Practice insights")}</h1>
        <span className="min-w-0 truncate" style={{ fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("How your practice is doing")}</span>
      </div>
      {range && onRange && (
        <div role="tablist" aria-label={t("Range")} className="grid shrink-0" style={{ width: rail ? 264 : 300, height: 40, boxSizing: "border-box", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 4, padding: 4, borderRadius: 12, background: "#F5F5F6" }}>
          {items.map((r) => {
            const on = r.k === range;
            return (
              <button
                key={r.k}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onRange(r.k)}
                className="flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                style={{ borderRadius: 9, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#FFFFFF" : "transparent", color: on ? "#5F5093" : "#5B5349", boxShadow: on ? "0 1px 2px rgba(0,0,0,0.08)" : "none" }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

export const PracticeShellWeb: React.FC<{ header: React.ReactNode; children: React.ReactNode }> = ({ header, children }) => {
  const { rail } = useWebLayout();
  return (
    <div className="flex flex-col" style={{ minHeight: "100%" }}>
      {header}
      <div style={{ maxWidth: WEB_READING_MAX, width: "100%", boxSizing: "border-box", padding: rail ? "24px 24px 24px" : "32px 32px 24px", display: "flex", flexDirection: "column", gap: 24 }}>{children}</div>
    </div>
  );
};

export const PracticeEmptyWeb: React.FC<{ onAdd: () => void }> = ({ onAdd }) => (
  <div className="flex justify-center">
    <div className="flex flex-col items-center text-center" style={{ width: "100%", maxWidth: 520, marginTop: 48, border: BORDER, borderRadius: 20, padding: "40px 32px", boxSizing: "border-box" }}>
      <span className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: "#F0EDF9", marginBottom: 16 }}>
        <ChartLine size={26} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
      </span>
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#241F1B" }}>{t("Insights appear with your first clients")}</h2>
      <p style={{ margin: "8px 0 24px", fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{t("Active clients, sessions, retention and reviews fill in as you work.")}</p>
      <button type="button" onClick={onAdd} className="flex items-center hover:bg-[#F0EDF9]" style={{ height: 40, padding: "0 18px", boxSizing: "border-box", borderRadius: 14, border: "1px solid rgba(143,104,246,0.35)", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093" }}>
        <UserPlus size={18} aria-hidden />
        {t("Add a client")}
      </button>
    </div>
  </div>
);

const BoxWeb: React.FC<{ b: NumBoxData }> = ({ b }) => {
  const dc = b.dir === "up" ? "#3F9165" : b.dir === "down" ? "#B3261E" : "#8C8378";
  const Arrow = b.dir === "down" ? ArrowDown : ArrowUp;
  return (
    <div style={{ border: BORDER, borderRadius: 16, padding: "16px 20px", boxSizing: "border-box", minWidth: 0, flex: "1 1 0" }}>
      <p className="truncate" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378" }}>{b.label}</p>
      <div className="flex items-end justify-between" style={{ marginTop: 4, gap: 8 }}>
        <p className="flex flex-wrap items-baseline" style={{ margin: 0, gap: "2px 8px" }}>
          <span style={{ fontSize: 32, lineHeight: "40px", fontWeight: 800, letterSpacing: "-0.03em", color: b.value === "–" ? "#B9B3C9" : "#241F1B", fontVariantNumeric: "tabular-nums" }}>
            {b.value}
            {b.unit && <span style={{ fontSize: 15, fontWeight: 700, color: "#8C8378", marginInlineStart: 2 }}>{b.unit}</span>}
          </span>
          {b.delta && (
            <span className="inline-flex items-center" style={{ gap: 2, fontSize: 13, lineHeight: "20px", fontWeight: 800, color: dc }}>
              {b.dir && <Arrow size={13} strokeWidth={2.6} aria-hidden />}
              {b.delta}
            </span>
          )}
        </p>
        {b.spark && (
          <span style={{ marginBottom: 6, display: "flex" }}>
            <Spark values={b.spark} drawW={72} drawH={26} />
          </span>
        )}
      </div>
      <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{b.line}</p>
    </div>
  );
};

export interface PracticeGroupWeb {
  id: string;
  icon: LucideIcon;
  title: string;
  line: string;
  body: React.ReactNode;
}

export const PracticeInsightsWeb: React.FC<{
  header: React.ReactNode;
  offline: boolean;
  milestone: React.ReactNode;
  boxes: NumBoxData[];
  note: React.ReactNode;
  groups: PracticeGroupWeb[];
  open: string;
  onOpen: (id: string) => void;
  reviews: React.ReactNode;
  outLine: string;
}> = ({ header, offline, milestone, boxes, note, groups, open, onOpen, reviews, outLine }) => {
  const { rail } = useWebLayout();
  const cur = groups.find((g) => g.id === open) ?? groups[0];
  const Icon = cur.icon;
  return (
    <PracticeShellWeb header={header}>
      {offline && <OfflineLine />}
      {/* Milestone + three boxes as one row of four, 16 apart; without a milestone yet the three boxes share the row. */}
      <div className="flex" style={{ gap: 16 }}>
        {milestone}
        {boxes.map((b) => (
          <BoxWeb key={b.label} b={b} />
        ))}
      </div>
      {note}
      <div className="grid" style={{ gridTemplateColumns: rail ? "300px minmax(0,1fr)" : "360px minmax(0,1fr)", gap: 24, alignItems: "start" }}>
        <div className="flex flex-col" style={{ gap: 16, minWidth: 0 }}>
          <div role="tablist" aria-orientation="vertical" aria-label={t("Practice insights")} style={{ border: BORDER, borderRadius: 16, padding: "4px 0", overflow: "hidden" }}>
            {groups.map((g, i) => {
              const on = g.id === cur.id;
              const GI = g.icon;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls="practice-open-group"
                  onClick={() => onOpen(g.id)}
                  onKeyDown={(e) => {
                    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                    e.preventDefault();
                    const next = groups[(i + (e.key === "ArrowDown" ? 1 : groups.length - 1)) % groups.length];
                    onOpen(next.id);
                    (e.currentTarget.parentElement?.children[groups.indexOf(next)] as HTMLElement | undefined)?.focus();
                  }}
                  tabIndex={on ? 0 : -1}
                  className={`w-full flex items-center text-start focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#AEA1DC] ${on ? "" : "hover:bg-[#FAFAFB]"}`}
                  style={{ minHeight: 64, boxSizing: "border-box", gap: 12, padding: "8px 16px", borderTop: i ? "1px solid rgba(36,31,27,0.06)" : "none", background: on ? "#F0EDF9" : "transparent" }}
                >
                  <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: on ? "#FFFFFF" : "#F0EDF9" }}>
                    <GI size={18} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: on ? "#5F5093" : "#241F1B" }}>{g.title}</span>
                    <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{g.line}</span>
                  </span>
                  <ChevronRight size={18} aria-hidden style={{ color: on ? "#7D67D9" : "#9A94B3" }} />
                </button>
              );
            })}
          </div>
          {reviews}
        </div>
        <section id="practice-open-group" aria-label={cur.title} className="flex flex-col" style={{ minWidth: 0, border: BORDER, borderRadius: 16, padding: "20px 24px", boxSizing: "border-box", gap: 16 }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: "#F0EDF9" }}>
              <Icon size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
            </span>
            <div className="min-w-0">
              <h2 style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.02em", color: "#241F1B" }}>{cur.title}</h2>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{cur.line}</p>
            </div>
          </div>
          {cur.id === "out" ? (
            <div className="flex items-start" style={{ borderRadius: 16, background: "#F7F7FC", padding: 20, gap: 12 }}>
              <span className="flex items-center shrink-0" style={{ height: 24, padding: "0 10px", borderRadius: 999, background: "#F0EDF9", fontSize: 11, lineHeight: "16px", fontWeight: 800, color: "#5F5093" }}>{t("Coming soon")}</span>
              <span style={{ fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{outLine}</span>
            </div>
          ) : (
            <div style={{ borderTop: "1px solid rgba(36,31,27,0.06)", paddingTop: 16 }}>
              {cur.body}
            </div>
          )}
        </section>
      </div>
    </PracticeShellWeb>
  );
};
