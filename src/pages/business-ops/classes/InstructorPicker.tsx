import React, { useState } from "react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { MarketAvatar } from "../../../components/market/ProfessionalCard";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { linePx, textPx } from "../../../theme/textSize";
import { useMarketColours } from "./parts";
import { INSTRUCTOR_NOTE, NO_INSTRUCTOR, type PickerPerson } from "./instructorTeam";

// Market + Share 3.0 · W4 · B-MA.6 "Instructor picker · Team only" and "No one
// on the Team yet" (Business Hiring Screens `instrPicker` / `instrNoTeam`,
// markup lines 280–302, script `fPerson`, `fNote`, the `isInline` card).
// - the MasterSheet "Instructor" (the app BottomSheet: band --sband, 1px
//   --sborder, radius 32, 53 title bar 20 / 800 --stitle, 26 close ring; body
//   --sbody radius 22 padding 20; footer padding 8 20 34 under 1px --srule);
// - the body's two-column grid, gap 8, every field span 2 (one column);
// - a person row: padding 10 12, radius 14, --sgrey, border 1.5px (--fill
//   when chosen, else transparent), gap 12; the 40 avatar (13 / 800); the name
//   14 / 700; the line 11.5 (--tealink for a Centium hire, --faint muted); the
//   20 radio (border-box; 6px --fill chosen, 1.5px --border not);
// - "No instructor named" / "Clients see Instructor not listed": the "–"
//   avatar on --soft / --faint, muted;
// - the note: --pale radius 14 padding 12 14, gap 10, the 16 ticket (stroke 2
//   --pdark, margin-top 1), 12.5 / 18 700 --pdark "Only your Team can be named.
//   Add people through Hiring.";
// - no Team: the "No instructor named" row chosen, then the --cautionbg card
//   (radius 14, padding 12 14): "No one on your team yet" 13 / 18 700 --ink,
//   the line 12 / 17 --ink2 (margin-top 4), "Post an opening" (margin-top 10,
//   40 tall, radius 12, --fill / --onfill, padding 0 16, 13 / 800);
// - the CTA: 50, radius 16, --fill, 15 / 700 --onfill: "Done", or "Go to
//   Hiring" with no Team.
// The choice is applied with Done; the close X keeps the field as it was.
//
// SOURCE (lead decision, D-35): the Team (my_team, DB8) when it answers.
// awaiting DB stage DB8 (my_team) / DB9 (instructor_not_on_team): until then
// the rows are the live instructors (fetchInstructors, the accepted
// business_employees the sheet used), which DB8 backfills as existing_team
// members; their line is the live "{n} classes this week" (muted: no hire is
// known, so no "Hired via Centium").

const TICKET = "M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z";


export function InstructorPicker({
  open,
  people,
  loading,
  error,
  selected,
  onClose,
  onDone,
  onRetry,
  onGoToHiring,
}: {
  open: boolean;
  /** The rows (Team, or the live instructors until my_team answers). */
  people: PickerPerson[];
  loading: boolean;
  error: { offline: boolean } | null;
  /** The field's instructor ("" = none). */
  selected: string;
  onClose: () => void;
  onDone: (professionalId: string) => void;
  onRetry: () => void;
  onGoToHiring: () => void;
}) {
  const m = useMarketColours();
  const [pick, setPick] = useState(selected);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setPick(selected);
  }
  const noTeam = !loading && !error && people.length === 0;

  const ids = [...people.map((p) => p.id), ""];
  const firstKey = people[0]?.id ?? "none";
  const radio = (on: boolean): React.CSSProperties => ({ width: 20, height: 20, borderRadius: 999, boxSizing: "border-box", border: on ? `6px solid ${m.fill}` : `1.5px solid ${m.border}`, flexShrink: 0 });
  const row = (key: string, on: boolean, avatar: React.ReactNode, name: string, sub: string, muted: boolean, onPick?: () => void) => (
    <button
      key={key}
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={`${name}. ${sub}`}
      onClick={onPick}
      tabIndex={onPick && (on || (key === firstKey && !ids.includes(pick))) ? 0 : -1}
      className="market-focus flex items-center text-left w-full"
      style={{ gap: 12, padding: "10px 12px", borderRadius: 14, background: m.sgrey, border: `1.5px solid ${on ? m.fill : "transparent"}`, color: m.ink, cursor: onPick ? "pointer" : "default", lineHeight: "normal", fontFamily: "inherit" }}
    >
      {avatar}
      <span className="flex-1 min-w-0 block">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: 700 }}>
          {name}
        </span>
        <span className="block" style={{ fontSize: textPx(11.5), color: muted ? m.faint : m.tealink }}>
          {sub}
        </span>
      </span>
      <span aria-hidden style={radio(on)} />
    </button>
  );
  const dash = (
    <span aria-hidden className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 999, background: m.soft, color: m.faint, fontSize: textPx(13), fontWeight: 800 }}>
      –
    </span>
  );

  // Arrow keys move the radio choice (one tab stop, as a radio group).
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (noTeam) return;
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = Math.max(0, ids.indexOf(pick));
    const next = ids[(i + d + ids.length) % ids.length];
    setPick(next);
    const el = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[(i + d + ids.length) % ids.length];
    el?.focus();
  };

  const footer = (
    <button
      type="button"
      onClick={() => (noTeam ? onGoToHiring() : onDone(pick))}
      disabled={loading || !!error}
      className="market-focus w-full flex items-center justify-center disabled:opacity-40"
      style={{ height: 50, borderRadius: 16, background: m.fill, color: m.onfill, fontSize: textPx(15), fontWeight: 700, border: 0, fontFamily: "inherit" }}
    >
      {noTeam ? "Go to Hiring" : "Done"}
    </button>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Instructor" footer={footer} footerRule titleWrap>
      <style>{FOCUS_CSS}</style>
      {loading ? (
        <MarketSkeleton radius={18} rows={2} count={3} gap={8} label="Loading your team" />
      ) : error ? (
        error.offline ? <MarketOffline loaded={false} onRetry={onRetry} force /> : <MarketError thing="your team" onRetry={onRetry} />
      ) : (
        <div role="radiogroup" aria-label="Instructor" onKeyDown={onKey} className="flex flex-col" style={{ gap: 8 }}>
          {people.map((p) =>
            row(p.id, pick === p.id, <MarketAvatar id={p.id} name={p.name} photoUrl={p.photoUrl} size={40} fontSize={13} />, p.name, p.sub, p.muted, () => setPick(p.id))
          )}
          {row("none", noTeam || pick === "", dash, NO_INSTRUCTOR, "Clients see Instructor not listed", true, noTeam ? undefined : () => setPick(""))}
          {noTeam ? (
            <div style={{ borderRadius: 14, background: m.cautionbg, padding: "12px 14px", lineHeight: "normal" }}>
              <p style={{ margin: 0, fontSize: textPx(13), lineHeight: linePx(18), fontWeight: 700, color: m.ink }}>No one on your team yet</p>
              <p style={{ margin: "4px 0 0", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>
                Hire a professional through Hiring to name them as this class&apos;s instructor. Their photo and profile then show to clients.
              </p>
              <button
                type="button"
                onClick={onGoToHiring}
                className="market-focus hit inline-flex items-center"
                style={{ marginTop: 10, height: 40, borderRadius: 12, background: m.fill, color: m.onfill, padding: "0 16px", fontSize: textPx(13), fontWeight: 800, border: 0, fontFamily: "inherit" }}
              >
                Post an opening
              </button>
            </div>
          ) : (
            <div className="flex items-start" style={{ gap: 10, borderRadius: 14, background: m.pale, padding: "12px 14px" }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={m.pdark} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", marginTop: 1, ...NO_ICON_SCALE }}>
                <path d={TICKET} />
                <path d="M13 5v2" />
                <path d="M13 17v2" />
                <path d="M13 11v2" />
              </svg>
              <span style={{ fontSize: textPx(12.5), lineHeight: linePx(18), fontWeight: 700, color: m.pdark }}>{INSTRUCTOR_NOTE}</span>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  );
}
