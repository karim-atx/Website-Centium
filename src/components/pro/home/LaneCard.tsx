import React, { useState } from "react";
import { CalendarClock, ChevronDown, ChevronRight, ChevronUp, Send } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK, ICON_TILE_LIGHT, NO_ICON_SCALE } from "../proInk";
import type { ProLane } from "../subtypeLanes";
import { ComingSoonPill } from "../ComingSoon";
import { ProError } from "../states";
import { Initials } from "./ProTrendRing";
import { initialsOf } from "./initials";
import { t, tk, tn } from "../../../i18n/core";

/**
 * Release 3 · the one card under the hero, collapsed by default (CL1 v6,
 * gen/hub5.js plans5): header row only (tile 36 r11, title 14 / 600, line 12,
 * chevron), and when open a divider and the rows (avatar 32, "Name · item",
 * line 11), then See all. Card r20, card fill and border.
 * Full coaching: programmes ending in the next 14 days (W2). Nutrition: meal
 * plans ending in the next 14 days (W5, meal_plan_assignments). Clinical
 * overview (referrals and results) is wired by W6; until then Coming soon.
 */
export interface LaneCardRow {
  key: string;
  name: string;
  item: string;
  line: string;
  onOpen: () => void;
}

const TITLE: Record<ProLane, string> = {
  full_coaching: tk("Programmes ending soon"),
  nutrition: tk("Meal plans ending soon"),
  clinical_overview: tk("Referrals and results"),
};

export const LaneCard: React.FC<{
  lane: ProLane;
  /** null while loading; undefined when the lane's card isn't wired yet. */
  rows: LaneCardRow[] | null | undefined;
  error?: boolean;
  onRetry?: () => void;
  onSeeAll: () => void;
}> = ({ lane, rows, error, onRetry, onSeeAll }) => {
  const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const wired = rows !== undefined;
  const n = rows?.length ?? 0;
  const sub = !wired ? null : rows === null ? "" : n === 0 ? t("Nothing yet") : tn(n, "{n} ends in the next 14 days", "{n} end in the next 14 days");
  const Icon = lane === "clinical_overview" ? Send : CalendarClock;
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, overflow: "hidden" }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="tap w-full flex items-center text-start"
        style={{ gap: 12, padding: "14px 16px" }}
      >
        <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : ICON_TILE_LIGHT }}>
          <Icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent, ...NO_ICON_SCALE }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
            {t(TITLE[lane])}
          </span>
          {wired ? (
            <span className="block" style={{ fontSize: textPx(12), color: INK.chF, minHeight: 16 }}>
              {sub}
            </span>
          ) : (
            <span className="block" style={{ marginTop: 2 }}>
              <ComingSoonPill />
            </span>
          )}
        </span>
        {open ? <ChevronUp size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} /> : <ChevronDown size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />}
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${INK.b06}`, padding: "4px 16px 12px" }}>
          {error && onRetry ? (
            <div style={{ paddingTop: 10 }}>
              <ProError onRetry={onRetry} />
            </div>
          ) : !wired ? (
            <p style={{ fontSize: textPx(12), color: INK.chF, padding: "10px 0" }}>{t("Referrals awaiting a reply and results due will show here.")}</p>
          ) : n === 0 ? (
            <p style={{ fontSize: textPx(12), color: INK.chF, padding: "10px 0" }}>{t("Nothing ending yet. Plans show here two weeks before they end.")}</p>
          ) : (
            <>
              {rows!.map((r, i) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={r.onOpen}
                  className="tap w-full flex items-center text-start"
                  style={{ gap: 12, padding: "10px 0", borderBottom: i < n - 1 ? `1px solid ${INK.b06}` : "none" }}
                >
                  <Initials text={initialsOf(r.name)} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
                      {r.name} · <span style={{ fontWeight: 500, color: INK.chS }}>{r.item}</span>
                    </span>
                    <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
                      {r.line}
                    </span>
                  </span>
                  <ChevronRight size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />
                </button>
              ))}
              <button type="button" onClick={onSeeAll} className="tap flex items-center" style={{ gap: 2, paddingTop: 10, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
                {t("See all")}
                <ChevronRight size={12} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
