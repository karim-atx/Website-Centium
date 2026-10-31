import React, { useRef } from "react";
import { Check } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { StatusRing } from "./StatusRing";
import type { ProLane } from "./subtypeLanes";
import { INK, NO_ICON_SCALE } from "./proInk";

/**
 * Release 3 · ClientRow (HANDOVER e; CL3 v6, source gen/r8.js row8 with the
 * r12 ring). CL3 rows and the client pickers.
 *
 * Card: min-height 76, pad 14, gap 12, r20, card fill, 1px card border; a
 * Needs attention row (in the All list) takes a red border (status.high at
 * 22%, dark 30%). Avatar 40 (Larger text 44), tone by status: Onboarding sky,
 * Needs attention and Requests gold, the rest lavender. Name 15 / 700, line
 * 1.3, wraps (never truncates). Status dot 8, its status colour, beside the
 * name. One line under it, 12 / 1.4 text.faint: "{status} · {plan} · {last
 * activity}", the status 600 text.soft, or 700 status.high when it needs
 * attention. In a single status tab the status word and dot are left out.
 * StatusRing at the end. Long-press (500 ms) opens the preview (W3).
 */
export type ClientStatusTone = "req" | "onb" | "act" | "att" | "pau" | "done";

export interface ClientRowProps {
  name: string;
  avatarUrl?: string | null;
  /** The status word ("Active", "Needs attention"...) and its tone. */
  status: { label: string; tone: ClientStatusTone };
  /** The rest of the secondary line (plan · last activity), already composed. */
  line?: string | null;
  ring: number | null;
  lane: ProLane;
  /** Inside a single status tab: no status word, no dot, no attention border. */
  single?: boolean;
  /** Multi-select: the check circle, and whether this row is picked. */
  selecting?: boolean;
  picked?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
}

const DOT: Record<ClientStatusTone, string> = {
  req: INK.gold,
  onb: INK.sky,
  act: INK.good,
  att: INK.hi,
  pau: INK.chT,
  done: INK.teal,
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export const ClientRow: React.FC<ClientRowProps> = ({ name, avatarUrl, status, line, ring, lane, single, selecting, picked, onClick, onLongPress }) => {
  const { accessibility, theme } = useApp();
  const dark = theme === "dark";
  // Larger text: the frame's 120% check (k 1.2; the avatar stops at 1.1).
  const k = accessibility.largerText ? 1.2 : 1;
  const att = status.tone === "att";
  const avatar = Math.round(40 * Math.min(k, 1.1));
  const tone = status.tone === "onb" ? "sky" : status.tone === "att" || status.tone === "req" ? "gold" : "pr";
  const avatarBg = tone === "sky" ? INK.skyPale : tone === "gold" ? INK.goldPale : INK.prPale;
  const avatarInk = tone === "sky" ? INK.sky : tone === "gold" ? INK.goldInk : INK.prDeep;

  const timer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const clear = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  const border = picked
    ? INK.pr
    : att && !single
      ? dark
        ? "rgba(240,154,142,0.30)"
        : "rgba(192,57,43,0.22)"
      : INK.bCard;

  return (
    <button
      type="button"
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        onClick?.();
      }}
      onPointerDown={() => {
        if (!onLongPress) return;
        longPressed.current = false;
        clear();
        timer.current = window.setTimeout(() => {
          longPressed.current = true;
          onLongPress();
        }, 500);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => {
        if (onLongPress) e.preventDefault();
      }}
      aria-pressed={selecting ? !!picked : undefined}
      className="tap w-full text-start flex items-center"
      style={{
        gap: 12,
        minHeight: 76,
        padding: 14,
        borderRadius: 20,
        background: picked ? (dark ? "#2B2C3A" : "#F7F5FB") : INK.card,
        border: `1px solid ${border}`,
      }}
    >
      {selecting && (
        <span
          aria-hidden
          className="flex items-center justify-center shrink-0 rounded-full"
          style={{
            width: 24,
            height: 24,
            ...(picked ? { background: INK.fill } : { border: `1.5px solid ${dark ? "#9A8CD6" : "#D1CAEB"}` }),
          }}
        >
          {picked && <Check size={14} strokeWidth={2.8} style={{ color: INK.onFill, ...NO_ICON_SCALE }} />}
        </span>
      )}
      <span
        aria-hidden
        className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
        style={{ width: avatar, height: avatar, background: avatarBg, color: avatarInk, fontSize: Math.round(avatar * 0.33), fontWeight: 800 }}
      >
        {avatarUrl ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" /> : initialsOf(name)}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-start" style={{ gap: 7 }}>
          <span style={{ fontSize: 15 * k, fontWeight: 700, lineHeight: 1.3, color: INK.ch, overflowWrap: "anywhere" }}>{name}</span>
          {!single && (
            <span aria-hidden className="rounded-full shrink-0" style={{ width: 8, height: 8, background: DOT[status.tone], marginTop: Math.round(7 * k) }} />
          )}
        </span>
        <span className="block" style={{ fontSize: 12 * k, lineHeight: 1.4, color: INK.chF, marginTop: 3 }}>
          {!single && (
            <>
              <span style={{ fontWeight: att ? 700 : 600, color: att ? INK.hi : INK.chS }}>{status.label}</span>
              {line ? " · " : ""}
            </>
          )}
          {line}
        </span>
      </span>
      <StatusRing value={ring} lane={lane} scale={1} />
    </button>
  );
};
