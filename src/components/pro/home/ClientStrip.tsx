import React from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronRight, Plus } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { INK, NO_ICON_SCALE } from "../proInk";
import type { Trend } from "../../../services/pro/home";
import { Initials } from "./ProTrendRing";
import { initialsOf } from "./initials";
import { stripCounts } from "./trendModel";

/**
 * Release 3 · CL1 client strip (gen/hub5.js strip5): only clients who share.
 * Avatars 30 (gap 6) with a 15 pt trend badge; up teal, down gold, otherwise
 * lavender; "+n" for the rest; the counts line on the right (10.5 / 600).
 * Tapping a face opens that client's page. Single-client focus shows the
 * client's row instead (avatar 32, name, line, Profile).
 */
export interface StripEntry {
  clientId: string;
  name: string;
  trend: Trend | null;
}

const SHOWN = 5;

export const ClientStrip: React.FC<{ entries: StripEntry[]; noun: string; onOpen: (clientId: string) => void }> = ({ entries, noun, onOpen }) => {
  if (entries.length === 0) return null;
  const shown = entries.slice(0, SHOWN);
  const rest = entries.length - shown.length;
  const allNew = entries.every((e) => e.trend === "new");
  return (
    <div className="flex items-center" style={{ gap: 10, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${INK.b06}` }}>
      <div className="flex" style={{ gap: 6 }}>
        {shown.map((e) => {
          const t = e.trend;
          const c = t === "up" ? INK.good : t === "down" ? INK.hi : INK.chT;
          const Icon = t === "up" ? ArrowUpRight : t === "down" ? ArrowDownRight : t === "new" ? Plus : ArrowRight;
          const word = t === "up" ? "up" : t === "down" ? "down" : t === "new" ? "new" : t === "flat" ? "flat" : null;
          return (
            <button
              key={e.clientId}
              type="button"
              onClick={() => onOpen(e.clientId)}
              aria-label={`${e.name}${word ? `, trend ${word}` : ""}. Open profile`}
              className="tap relative shrink-0"
              style={{ width: 30, height: 30, minHeight: 30 }}
            >
              <Initials text={initialsOf(e.name)} size={30} tone={t === "down" ? "gold" : t === "up" ? "teal" : "pr"} />
              {t && (
                <span
                  aria-hidden
                  className="absolute flex items-center justify-center"
                  style={{ right: -3, bottom: -3, width: 15, height: 15, borderRadius: 9999, background: INK.card, boxShadow: `0 0 0 1px ${INK.b10}` }}
                >
                  <Icon size={10} strokeWidth={2.6} style={{ color: c, ...NO_ICON_SCALE }} />
                </span>
              )}
            </button>
          );
        })}
        {rest > 0 && !allNew && (
          <span
            className="flex items-center justify-center"
            style={{ width: 30, height: 30, borderRadius: 9999, background: INK.soft, color: INK.chS, fontSize: textPx(10), fontWeight: 800 }}
          >
            +{rest}
          </span>
        )}
      </div>
      <span className="flex-1 min-w-0 text-right" style={{ fontSize: textPx(10.5), fontWeight: 600, color: INK.chF, lineHeight: 1.35 }}>
        {stripCounts(
          entries.map((e) => e.trend),
          noun
        )}
      </span>
    </div>
  );
};

export const FocusRow: React.FC<{ name: string; line: string; onOpen: () => void }> = ({ name, line, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className="tap w-full flex items-center text-left"
    style={{ gap: 10, marginTop: 10, padding: "10px 12px", borderRadius: 14, background: INK.soft }}
  >
    <Initials text={initialsOf(name)} size={32} />
    <span className="flex-1 min-w-0">
      <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>
        {name}
      </span>
      <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>
        {line}
      </span>
    </span>
    <span className="flex items-center" style={{ gap: 2, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
      Profile
      <ChevronRight size={12} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
    </span>
  </button>
);
