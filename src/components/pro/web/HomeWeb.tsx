import React from "react";
import { Bell, CalendarClock, ChevronRight, ChevronUp, ChevronDown, Send } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../web/useWebLayout";
import type { ProLane } from "../subtypeLanes";
import type { LaneCardRow } from "../home/LaneCard";
import { initialsOf } from "../home/initials";
import { ProError } from "../states";
import { t, tk, tn } from "../../../i18n/core";

// Professional handover v1, WP-HO · FC / · NU / · CO (WP-HO Home Web v2): Home
// from 1024px. A 64 page header (greeting 28/36 and the date beside it, the
// bell 40 and the avatar 44), then a 12-column grid (8 on the rail): the trend
// card 7 (5) and the lane card 5 (3); with no clients yet, Get set up and Ways
// to add take the right column. The parts inside the trend card (ProTrendRing,
// the client strip) are the repo's. Mobile keeps its own Home.

export const HomeHeaderWeb: React.FC<{
  title: string;
  date: string;
  unread: number;
  hubOpen: boolean;
  onBell: (el: HTMLElement) => void;
  avatar: React.ReactNode;
}> = ({ title, date, unread, hubOpen, onBell, avatar }) => {
  const { rail } = useWebLayout();
  return (
    <header
      data-pro-web="home-header"
      className="flex items-center"
      style={{ height: 64, boxSizing: "border-box", gap: 12, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
    >
      <div className="flex-1 min-w-0 flex items-baseline" style={{ gap: 14 }}>
        <h1 className="truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>
          {title}
        </h1>
        <p className="shrink-0" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E", whiteSpace: "nowrap" }}>
          {date}
        </p>
      </div>
      <div className="flex items-center shrink-0" style={{ gap: 10 }}>
        <button
          type="button"
          onClick={(e) => onBell(e.currentTarget)}
          aria-label={unread > 0 ? t("Notifications, {n} unread", { n: unread }) : t("Notifications")}
          aria-expanded={hubOpen}
          aria-haspopup="dialog"
          className="relative flex items-center justify-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 999, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.11)" }}
        >
          <Bell size={20} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
          {unread > 0 && (
            <span
              aria-hidden
              className="absolute flex items-center justify-center"
              style={{ top: -4, insetInlineEnd: -4, minWidth: 20, height: 20, padding: "0 5px", boxSizing: "border-box", borderRadius: 999, background: "#C0392B", color: "#FFFFFF", fontSize: 11, fontWeight: 700 }}
            >
              {unread}
            </span>
          )}
        </button>
        {avatar}
      </div>
    </header>
  );
};

/** The grid under the header: max width per 2.1, 32 (24) margins, 24 gaps; left 7 (5), right 5 (3). */
export const HomeGridWeb: React.FC<{ left: React.ReactNode; right: React.ReactNode }> = ({ left, right }) => {
  const { rail } = useWebLayout();
  const cols = rail ? 8 : 12;
  const spanL = rail ? 5 : 7;
  return (
    <div data-pro-web="home" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: `32px ${rail ? 24 : 32}px` }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, columnGap: 24, rowGap: 24, alignItems: "start" }}>
        <div style={{ gridColumn: `span ${spanL}`, minWidth: 0 }}>{left}</div>
        <div style={{ gridColumn: `span ${cols - spanL}`, minWidth: 0, display: "flex", flexDirection: "column", gap: 24 }}>{right}</div>
      </div>
    </div>
  );
};

const LANE_TITLE: Record<ProLane, string> = {
  full_coaching: tk("Programmes ending soon"),
  nutrition: tk("Meal plans ending soon"),
  clinical_overview: tk("Referrals and results"),
};

/**
 * The lane card, open on web (header 20/24 padding, tile 44 r12, title 17/24
 * 600, line 13/20; rows 68 with a 44 avatar, 15/22 name · item, 13/20 line;
 * See all 15/24 600 after the last row). The header still folds it.
 */
export const LaneCardWeb: React.FC<{
  lane: ProLane;
  rows: LaneCardRow[] | null | undefined;
  error?: boolean;
  onRetry?: () => void;
  onSeeAll: () => void;
}> = ({ lane, rows, error, onRetry, onSeeAll }) => {
  const [open, setOpen] = React.useState(true);
  const wired = rows !== undefined;
  const n = rows?.length ?? 0;
  const sub = !wired ? null : rows === null ? "" : n === 0 ? t("Nothing yet") : tn(n, "{n} ends in the next 14 days", "{n} end in the next 14 days");
  const Icon = lane === "clinical_overview" ? Send : CalendarClock;
  const divider = "1px solid rgba(36,31,27,0.06)";
  return (
    <section aria-label={t(LANE_TITLE[lane])} className="flex flex-col" style={{ boxSizing: "border-box", borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", overflow: "hidden" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ gap: 14, padding: "20px 24px" }}
      >
        <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "#F0EDF9" }}>
          <Icon size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
            {t(LANE_TITLE[lane])}
          </span>
          {wired ? (
            <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E", minHeight: 20 }}>
              {sub}
            </span>
          ) : (
            <span className="inline-block" style={{ marginTop: 2, fontSize: 12, lineHeight: "16px", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#F0EDF9", color: "#5F5093" }}>
              {t("Coming soon")}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={20} strokeWidth={2} aria-hidden style={{ color: "#71685E" }} /> : <ChevronDown size={20} strokeWidth={2} aria-hidden style={{ color: "#71685E" }} />}
      </button>
      {open &&
        (error && onRetry ? (
          <div style={{ borderTop: divider, padding: 24 }}>
            <ProError onRetry={onRetry} />
          </div>
        ) : !wired || n === 0 ? (
          <div className="flex items-center justify-center text-center" style={{ borderTop: divider, padding: 24 }}>
            <p style={{ margin: 0, maxWidth: 280, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>
              {!wired ? t("Referrals awaiting a reply and results due will show here.") : t("Nothing ending yet. Plans show here two weeks before they end.")}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col" style={{ borderTop: divider, padding: "0 24px" }}>
              {rows!.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={r.onOpen}
                  className="flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                  style={{ minHeight: 68, padding: "8px 0", boxSizing: "border-box", gap: 14, borderBottom: i < n - 1 ? divider : "none" }}
                >
                  <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 999, background: "#F0EDF9", color: "#5F5093", fontSize: 15, fontWeight: 800 }}>
                    {initialsOf(r.name)}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B", textWrap: "pretty" } as React.CSSProperties}>
                      {r.name} · <span style={{ fontWeight: 500, color: "#5B5349" }}>{r.item}</span>
                    </span>
                    <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                      {r.line}
                    </span>
                  </span>
                  <ChevronRight size={16} strokeWidth={2} aria-hidden style={{ color: "#71685E" }} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onSeeAll}
              className="flex items-center hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ gap: 2, padding: "16px 24px 20px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093", borderTop: divider }}
            >
              {t("See all")}
              <ChevronRight size={16} strokeWidth={2.4} aria-hidden />
            </button>
          </>
        ))}
    </section>
  );
};

export interface WayRow {
  key: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean; style?: React.CSSProperties }>;
  title: string;
  line: string;
  onOpen?: () => void;
}

/** Ways to add (empty): caps label 13/20 with the 1.5 lavender rule, rows with a 44 tile, 15/22 title, 13/20 line. */
export const WaysToAddWeb: React.FC<{ rows: WayRow[] }> = ({ rows }) => (
  <section aria-label={t("Ways to add")} className="flex flex-col">
    <h2 style={{ margin: 0, paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7D67D9" }}>
      {t("Ways to add")}
    </h2>
    {rows.map((x, i) => {
      const Icon = x.icon;
      return (
        <button
          key={x.key}
          type="button"
          disabled={!x.onOpen}
          onClick={x.onOpen}
          className="flex items-center text-start enabled:hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
          style={{ gap: 12, padding: "14px 0", borderBottom: i < rows.length - 1 ? "1px solid rgba(36,31,27,0.06)" : "none", opacity: x.onOpen ? 1 : 0.6 }}
        >
          <span className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 12, background: "#F0EDF9" }}>
            <Icon size={20} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
              {x.title}
            </span>
            <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
              {x.line}
            </span>
          </span>
          {x.onOpen && <ChevronRight size={16} strokeWidth={1.75} aria-hidden style={{ color: "#71685E" }} />}
        </button>
      );
    })}
  </section>
);
