import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  MapPin,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK, NO_ICON_SCALE } from "../proInk";
import type { ProLane } from "../subtypeLanes";
import { minutesOfDay, range12, time12 } from "../../../utils/time12";
import { DAY_LETTERS, DAY_SHORT, mondayIndex } from "../../../utils/week";
import type { RangeSession } from "../../../services/pro/home";
import { initialsOf } from "./initials";
import { G, LEAF_D, actionSectors, arc, barLayout, barMid, barStart, hourAngle, pol, polarOf, sector } from "./ringGeometry";
import { DAY_FIRST_HOUR, DAY_LAST_HOUR, TODAY_LEGEND, type HubRange, type RingModel } from "./trendModel";
import { hourLabel12 } from "../../../utils/time12";

/**
 * Release 3 · ProTrendRing (HANDOVER e, CL1 v6; source gen/hub5.js
 * heroTrend5, ringData5, centre5, legend5, range5, picker5 with hub4.js G4).
 *
 * Centre r 86: the headline for the range and focus, its delta, and the next
 * session (links to Calendar). Trend ring r 97 to 129: one bar per hour, day
 * or date; today deeper lavender, future slots dashed, the previous period as
 * the teal dashed ghost. Calendar track r 143: ticks and labels, filled to now
 * with the Centium leaf; sessions are points (teal done, filled next, hollow
 * later), tap one to preview it. Drag sideways along the ring to scrub (the
 * page still scrolls vertically: touch-action pan-y); arrow keys scrub too.
 * Actions: four lower sectors, the first filled.
 */

export interface RingAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}


export interface TrendRingProps {
  lane: ProLane;
  range: HubRange;
  onRange: (r: HubRange) => void;
  /** The picker's label and accessible name ("All clients" or the client). */
  focusLabel: string;
  focusInitials: string | null;
  onPicker: (anchor: HTMLElement) => void;
  /** null while loading. */
  model: RingModel | null;
  empty: boolean;
  /** Bucket dates (week, month) for labels and the scrub tooltip. */
  days: string[];
  todayIso: string;
  now: Date;
  sessions: RangeSession[];
  next: RangeSession | null;
  onNext: () => void;
  actions: RingAction[];
  onSession: (s: RangeSession, action: "open" | "reschedule" | "message") => void;
  /** The period word for the ghost legend and the scrub line: "last week". */
  prevWord: string;
  /** "vs last week", "vs September". */
  vsLabel: string;
  monthShort: string;
  children?: React.ReactNode;
  emptyCta?: React.ReactNode;
}

type Point = { key: string; angle: number; status: "done" | "next" | ""; r?: number; session: RangeSession; count?: number };

const MONTH_TICKS = [1, 8, 15, 22, 29];

export const ProTrendRing: React.FC<TrendRingProps> = (p) => {
  const dark = useIsDark();
  const hostRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(320);
  const [scrub, setScrub] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tip, setTip] = useState<number | null>(null);
  const tipTimer = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setW(Math.min(320, Math.max(240, el.clientWidth)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const k = Math.min(1, (W / 330) * 1.04);
  const model = p.model;
  const n = p.range === "today" ? DAY_LAST_HOUR - DAY_FIRST_HOUR + 1 : p.range === "week" ? 7 : Math.max(28, p.days.length);
  const { seg } = barLayout(n);
  const todayIdx = model?.todayIdx ?? -1;
  const nowMin = p.now.getHours() * 60 + p.now.getMinutes();
  const nowA =
    p.range === "today"
      ? hourAngle(nowMin)
      : -G.span + ((Math.max(0, p.days.indexOf(p.todayIso)) + nowMin / 1440) / n) * 2 * G.span;

  const points: Point[] = useMemo(() => {
    const nowKey = `${p.todayIso} ${String(Math.floor(nowMin / 60)).padStart(2, "0")}:${String(nowMin % 60).padStart(2, "0")}`;
    const status = (s: RangeSession): Point["status"] =>
      `${s.date} ${s.endTime ?? s.startTime}` < nowKey ? "done" : p.next && s.key === p.next.key ? "next" : "";
    if (p.range === "today") {
      return p.sessions.map((s) => ({ key: s.key, angle: hourAngle(minutesOfDay(s.startTime) ?? 0), status: status(s), session: s }));
    }
    const byDay = new Map<string, RangeSession[]>();
    for (const s of p.sessions) byDay.set(s.date, [...(byDay.get(s.date) ?? []), s]);
    const out: Point[] = [];
    if (p.range === "week") {
      const dw = (2 * G.span) / 7;
      p.days.forEach((d, i) => {
        const list = byDay.get(d) ?? [];
        list.forEach((s, j) => out.push({ key: s.key, angle: -G.span + i * dw + (dw * (j + 1)) / (list.length + 1), status: status(s), session: s }));
      });
    } else {
      p.days.forEach((d, i) => {
        const list = byDay.get(d) ?? [];
        if (!list.length) return;
        const st = list.some((s) => p.next && s.key === p.next.key) ? "next" : list.every((s) => status(s) === "done") ? "done" : "";
        out.push({ key: `${d}`, angle: -G.span + ((i + 0.5) / n) * 2 * G.span, status: st, r: 1.6 + list.length * 0.45, session: list[0], count: list.length });
      });
    }
    return out;
  }, [p.sessions, p.range, p.days, p.todayIso, p.next, nowMin, n]);

  // ---- colours (lib.js P.L / P.D, as the app's tokens where one exists) ----
  const trackFill = dark ? "rgba(245,243,250,0.06)" : "rgba(36,31,27,0.05)";
  const dashed = dark ? "rgba(245,243,250,0.16)" : "rgba(36,31,27,0.14)";
  const thin = dark ? "rgba(245,243,250,0.18)" : "rgba(36,31,27,0.14)";
  const calTrack = dark ? "rgba(245,243,250,0.12)" : "rgba(36,31,27,0.10)";
  const todayBar = dark ? "#C3B3FB" : "#7D6BB5";
  const nextFill = dark ? INK.fill : "#7D6BB5";
  const hollow = dark ? "#C3B3FB" : "#7D6BB5";
  const sectorIdle = dark ? "rgba(174,161,220,0.14)" : "#F0EDF9";

  // ---- svg ----
  const svg: React.ReactNode[] = [];
  svg.push(<circle key="disc" cx={G.c} cy={G.c} r={G.rDisc} fill={dark ? "#262932" : "#FAFAFB"} />);
  svg.push(<path key="track" d={sector(G.r0, G.rM, -G.span, G.span)} fill={trackFill} />);
  const bars = model?.bars ?? [];
  for (let j = 0; j < n; j++) {
    const a0 = barStart(j, n);
    const a1 = a0 + seg;
    const b = bars[j];
    const v = p.empty ? null : b?.value ?? null;
    if (v === null) {
      if (p.empty || !model || j > todayIdx || model.headline.early)
        svg.push(<path key={`b${j}`} d={sector(G.r0 + 1, G.rM - 1, a0, a1)} fill="none" stroke={dashed} strokeWidth={0.8} strokeDasharray="2 2" />);
      continue;
    }
    if (p.range === "today" && v === 0) {
      svg.push(<path key={`b${j}`} d={arc(G.r0 + 1.5, a0, a1)} fill="none" stroke={thin} strokeWidth={1.5} />);
      continue;
    }
    const f = Math.max(0.06, Math.min(1, v / (model?.max || 100)));
    svg.push(
      <path
        key={`b${j}`}
        d={sector(G.r0, G.r0 + f * (G.rM - G.r0), a0, a1)}
        fill={j === todayIdx ? todayBar : INK.pr}
        className="animate-fade-in"
        style={{ animationDelay: `${120 + j * (n > 14 ? 18 : 60)}ms` }}
      />
    );
  }
  if (model && !p.empty && !model.headline.early && p.range !== "today") {
    const ghost = bars
      .map((b, j) => (b.ghost === null ? null : pol(G.r0 + Math.max(0, Math.min(1, b.ghost / 100)) * (G.rM - G.r0), barMid(j, n))))
      .filter((x): x is [number, number] => !!x);
    if (ghost.length > 1)
      svg.push(
        <path
          key="ghost"
          d={`M${ghost.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L")}`}
          fill="none"
          stroke={INK.tealDark}
          strokeWidth={1.6}
          strokeDasharray="3 2.5"
          strokeLinecap="round"
        />
      );
  }
  // calendar track, ticks and labels
  svg.push(<path key="cal" d={arc(G.rDay, -G.span, G.span)} fill="none" stroke={calTrack} strokeWidth={2.5} strokeLinecap="round" />);
  const labels: { a: number; text: string; bold?: boolean }[] = [];
  const tick = (key: string, a: number, outer: number, ink: string, op: number, w: number) => {
    const q1 = pol(G.rTi, a);
    const q2 = pol(outer, a);
    svg.push(<line key={key} x1={q1[0].toFixed(1)} y1={q1[1].toFixed(1)} x2={q2[0].toFixed(1)} y2={q2[1].toFixed(1)} stroke={ink} strokeOpacity={op} strokeWidth={w} strokeLinecap="round" />);
  };
  if (p.range === "today") {
    for (let h = DAY_FIRST_HOUR; h <= DAY_LAST_HOUR; h++) {
      const ag = -G.span + ((h - DAY_FIRST_HOUR) / 13) * 2 * G.span;
      const major = h === 7 || h === 12 || h === 20;
      tick(`t${h}`, ag, major ? G.rTm : G.rTo, major ? INK.chF : INK.chT, major ? 0.9 : 0.5, major ? 1.4 : 1);
      if (major) labels.push({ a: ag, text: hourLabel12(h) });
    }
  } else if (p.range === "week") {
    for (let d = 0; d <= 7; d++) {
      const ad = -G.span + d * ((2 * G.span) / 7);
      tick(`t${d}`, ad, G.rTm, INK.chT, 0.6, 1);
      if (d < 7) labels.push({ a: ad + G.span / 7, text: DAY_LETTERS[d], bold: p.days[d] === p.todayIso });
    }
  } else {
    for (let m = 1; m <= n; m++) {
      const am = -G.span + ((m - 1) / n) * 2 * G.span + G.span / n;
      const major = MONTH_TICKS.includes(m);
      tick(`t${m}`, am, major ? G.rTm : G.rTo, major ? INK.chF : INK.chT, major ? 0.9 : 0.4, 1);
      if (major) labels.push({ a: am, text: `${m} ${p.monthShort}` });
    }
  }
  labels.forEach((l, i) => {
    const q = pol(G.rHr, l.a);
    svg.push(
      <text key={`l${i}`} x={q[0].toFixed(1)} y={(q[1] + 3).toFixed(1)} textAnchor="middle" fontSize={8.5} fontWeight={l.bold ? 800 : 700} fill={l.bold ? INK.ch : INK.chT}>
        {l.text}
      </text>
    );
  });
  if (!p.empty) svg.push(<path key="now" d={arc(G.rDay, -G.span, nowA)} fill="none" stroke={INK.pr} strokeWidth={4} strokeLinecap="round" />);
  points.forEach((e) => {
    const q = pol(G.rDay, e.angle);
    const [cx, cy] = [q[0].toFixed(1), q[1].toFixed(1)];
    if (e.status === "next")
      svg.push(
        <g key={e.key}>
          <circle cx={cx} cy={cy} r={12} fill={INK.pr} fillOpacity={0.24} />
          <circle cx={cx} cy={cy} r={7} fill={nextFill} />
          <circle cx={cx} cy={cy} r={2.4} fill={INK.card} />
        </g>
      );
    else if (e.status === "done") svg.push(<circle key={e.key} cx={cx} cy={cy} r={e.r ?? 4.5} fill={INK.tealDark} />);
    else svg.push(<circle key={e.key} cx={cx} cy={cy} r={e.r ?? 4.5} fill={INK.card} stroke={hollow} strokeWidth={e.r ? 1.2 : 1.8} />);
  });
  if (!p.empty) {
    const np = pol(G.rDay, nowA);
    svg.push(
      <path
        key="leaf"
        d={LEAF_D}
        transform={`translate(${np[0].toFixed(1)} ${np[1].toFixed(1)}) rotate(${nowA.toFixed(1)}) translate(0 -3) scale(0.019) translate(-245 -915)`}
        fill="#8F68F6"
      />
    );
  }
  // action sectors
  const sectors = actionSectors();
  sectors.forEach((s, j) => {
    const fill = j === 0 ? INK.fill : sectorIdle;
    svg.push(
      <path
        key={`a${j}`}
        d={sector(G.rA0 + 3, G.rA1 - 3, s.a0 + s.ins, s.a1 - s.ins)}
        fill={fill}
        stroke={fill}
        strokeWidth={6}
        strokeLinejoin="round"
        style={p.empty && j > 0 ? { opacity: 0.45 } : undefined}
      />
    );
  });
  if (scrub !== null && !p.empty) {
    const a = barMid(scrub, n);
    const q0 = pol(G.rDisc, a);
    const q1 = pol(G.rTm + 2, a);
    svg.push(<line key="scrub" x1={q0[0].toFixed(1)} y1={q0[1].toFixed(1)} x2={q1[0].toFixed(1)} y2={q1[1].toFixed(1)} stroke={INK.ch} strokeWidth={1.2} strokeDasharray="2 2" />);
    svg.push(<circle key="scrubdot" cx={q1[0].toFixed(1)} cy={q1[1].toFixed(1)} r={5} fill={INK.ch} />);
  }

  // ---- interaction ----
  const scale = W / G.vb;
  const toBox = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };
  const idxAt = (a: number) => {
    if (Math.abs(a) > G.span) return null;
    return Math.max(0, Math.min(n - 1, Math.floor(((a + G.span) / (2 * G.span)) * n)));
  };
  const dragging = useRef(false);
  const onDown = (e: React.PointerEvent) => {
    const { x, y } = toBox(e);
    const { a, r } = polarOf(x, y);
    // A session point: tap to preview.
    const hit = points.find((pt) => {
      const q = pol(G.rDay, pt.angle);
      return Math.hypot(q[0] - x, q[1] - y) <= 14;
    });
    if (hit) {
      setScrub(null);
      setPreview(hit.key);
      return;
    }
    if (r >= G.r0 - 10 && r <= G.rTm + 12 && idxAt(a) !== null && !p.empty) {
      dragging.current = true;
      setPreview(null);
      setScrub(idxAt(a));
    }
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const { x, y } = toBox(e);
    const i = idxAt(polarOf(x, y).a);
    if (i !== null) setScrub(i);
  };
  const onUp = () => {
    dragging.current = false;
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (p.empty) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setScrub((s) => Math.max(0, Math.min(n - 1, (s ?? (todayIdx >= 0 ? todayIdx : 0)) + d)));
    } else if (e.key === "Escape") setScrub(null);
  };

  // ---- centre ----
  const h = model?.headline;
  const big = p.empty ? "0" : h?.big ?? "–";
  const bigSize = big.length > 4 ? 38 : 50;
  const caption = p.empty ? (p.lane === "clinical_overview" ? "patients yet" : "clients yet") : h?.caption ?? "";
  const prevSession = p.next;

  // ---- scrub tooltip text ----
  let tooltip: { title: string; line: string; sub: string; sessions: string } | null = null;
  if (scrub !== null && model) {
    const b = model.bars[scrub];
    const sessOf =
      p.range === "today"
        ? p.sessions.filter((s) => Math.floor((minutesOfDay(s.startTime) ?? 0) / 60) === DAY_FIRST_HOUR + scrub)
        : p.sessions.filter((s) => s.date === p.days[scrub]);
    const title = p.range === "today" ? hourLabel12(DAY_FIRST_HOUR + scrub) : dayTitle(p.days[scrub]);
    const word = p.lane === "clinical_overview" ? "appointment" : "session";
    const sessions = sessOf.length
      ? `${sessOf.length} ${word}${sessOf.length === 1 ? "" : "s"}: ${sessOf
          .slice(0, 3)
          .map((s) => `${s.client?.name ?? s.title} ${time12(s.startTime)}`)
          .join(", ")}`
      : `No ${word}s`;
    if (p.range === "today") {
      tooltip = { title, line: b?.value === null || b === undefined ? "Nothing yet" : `${b.value} logged`, sub: "", sessions };
    } else {
      const cur = b?.value ?? null;
      const prev = b?.ghost ?? null;
      const line = cur === null ? "No shared data" : `${cur}% on plan${prev !== null ? ` · ${p.prevWord} ${prev}%` : ""}`;
      const d = cur !== null && prev !== null ? cur - prev : null;
      const sub = d === null ? "" : d === 0 ? "No change" : `${d > 0 ? "Up" : "Down"} ${Math.abs(d)} point${Math.abs(d) === 1 ? "" : "s"}`;
      tooltip = { title, line, sub, sessions };
    }
  }

  const prevPoint = points.find((x) => x.key === preview) ?? null;
  const pv = prevPoint?.session ?? null;

  const ringActions = p.actions.slice(0, 4);

  return (
    <div
      className="relative"
      style={{ borderRadius: 24, background: INK.card, border: `1px solid rgba(143,104,246,${dark ? 0.28 : 0.16})`, padding: "16px 16px 14px", marginBottom: 24 }}
    >
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-label={`Client focus, ${p.focusLabel}`}
          onClick={(e) => p.onPicker(e.currentTarget)}
          className="tap inline-flex items-center shrink-0 min-w-0"
          style={{
            gap: 6,
            height: 32,
            padding: `0 10px 0 ${p.focusInitials ? 4 : 10}px`,
            borderRadius: 9999,
            background: INK.soft,
            border: `1px solid ${INK.b10}`,
            fontSize: textPx(12),
            fontWeight: 700,
            color: INK.ch,
            whiteSpace: "nowrap",
            maxWidth: "48%",
          }}
        >
          {p.focusInitials ? <Initials text={p.focusInitials} size={24} /> : <Users size={13} strokeWidth={2} style={{ color: INK.chS, ...NO_ICON_SCALE }} aria-hidden />}
          <span className="truncate">{p.focusLabel}</span>
          <ChevronDown size={13} strokeWidth={2} style={{ color: INK.chF, ...NO_ICON_SCALE }} aria-hidden />
        </button>
        <div role="tablist" aria-label="Range" className="flex items-center ml-auto" style={{ gap: 3, padding: 3, borderRadius: 12, background: dark ? "#242730" : "#F3F3FD" }}>
          {(["today", "week", "month"] as HubRange[]).map((r) => {
            const on = r === p.range;
            return (
              <button
                key={r}
                role="tab"
                type="button"
                aria-selected={on}
                onClick={() => {
                  setScrub(null);
                  setPreview(null);
                  p.onRange(r);
                }}
                className="tap flex items-center"
                style={{
                  height: 26,
                  minHeight: 26,
                  padding: "0 10px",
                  borderRadius: 9,
                  fontSize: textPx(11.5),
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  background: on ? (dark ? INK.fill : "#A79AD5") : dark ? "#2B2C3A" : "#F5F4FE",
                  color: on ? (dark ? INK.onFill : "#FFFFFF") : dark ? "#B7ABDE" : "#6D50D3",
                }}
              >
                {r === "today" ? "Today" : r === "week" ? "Week" : "Month"}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={hostRef} className="w-full">
        <div
          className="relative"
          style={{ width: W, height: W, margin: "6px auto 0", touchAction: "pan-y" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        >
          <svg viewBox={`0 0 ${G.vb} ${G.vb}`} width={W} height={W} style={{ display: "block", overflow: "visible" }} aria-hidden>
            {svg}
          </svg>
          {/* The scrubbable trend, for the keyboard and screen readers. */}
          <div
            role="slider"
            tabIndex={p.empty ? -1 : 0}
            aria-label="Trend, use the arrow keys to move through the range"
            aria-valuemin={0}
            aria-valuemax={n - 1}
            aria-valuenow={scrub ?? Math.max(0, todayIdx)}
            aria-valuetext={tooltip ? `${tooltip.title}, ${tooltip.line}` : undefined}
            onKeyDown={onKey}
            onBlur={() => setScrub(null)}
            className="absolute rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{ inset: `${((G.c - G.rTm) / G.vb) * 100}%`, pointerEvents: "none" }}
          />
          <div
            className="absolute flex flex-col items-center text-center"
            style={{ left: "50%", top: "47%", transform: "translate(-50%, -50%)", width: "64%", pointerEvents: "none" }}
          >
            <span style={{ fontSize: Math.round(bigSize * k), fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: INK.ch, whiteSpace: "nowrap" }}>{big}</span>
            <span style={{ fontSize: textPx(12 * k), fontWeight: 700, color: INK.chS, marginTop: 5 * k, lineHeight: 1.25 }}>{caption}</span>
            {!p.empty && h && (h.delta !== null || h.line) && (
              <span className="inline-flex items-center" style={{ gap: 4, marginTop: 2, whiteSpace: "nowrap" }}>
                {h.delta !== null ? (
                  <>
                    <Delta value={h.delta} />
                    <span style={{ fontSize: textPx(10.5 * k), fontWeight: 600, color: INK.chF }}>{p.vsLabel}</span>
                  </>
                ) : (
                  <span style={{ fontSize: textPx(11 * k), fontWeight: 800, color: INK.chS }}>{h.line}</span>
                )}
              </span>
            )}
            {!p.empty && prevSession && (
              <button
                type="button"
                aria-label="Next session, open Calendar"
                onClick={p.onNext}
                className="tap inline-flex items-center"
                style={{ pointerEvents: "auto", marginTop: 7 * k, gap: 3, fontSize: textPx(10.5 * k), fontWeight: 700, color: INK.prDeep, whiteSpace: "nowrap", minHeight: 24 }}
              >
                <CalendarDays size={Math.round(11 * k)} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
                Next {time12(prevSession.startTime)} · {prevSession.client?.name ?? prevSession.title}
                <ChevronRight size={Math.round(11 * k)} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
              </button>
            )}
          </div>
          {ringActions.map((act, j) => {
            const s = sectors[j];
            const q = pol((G.rA0 + G.rA1) / 2, s.mid);
            const dim = p.empty && j > 0;
            const Icon = act.icon;
            return (
              <button
                key={act.label}
                type="button"
                aria-label={act.label}
                title={act.label}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  tipTimer.current = window.setTimeout(() => setTip(j), 500);
                }}
                onPointerUp={() => {
                  if (tipTimer.current) window.clearTimeout(tipTimer.current);
                  window.setTimeout(() => setTip((t) => (t === j ? null : t)), 1200);
                }}
                onPointerLeave={() => tipTimer.current && window.clearTimeout(tipTimer.current)}
                onContextMenu={(e) => e.preventDefault()}
                onClick={act.onClick}
                className="tap absolute flex items-center justify-center"
                style={{ left: `${((q[0] / G.vb) * 100).toFixed(2)}%`, top: `${((q[1] / G.vb) * 100).toFixed(2)}%`, width: 48, height: 48, margin: "-24px 0 0 -24px", opacity: dim ? 0.45 : 1 }}
              >
                <Icon size={20} strokeWidth={1.75} aria-hidden style={{ color: j === 0 ? INK.onFill : INK.prAccent, ...NO_ICON_SCALE }} />
                {tip === j && (
                  <span
                    role="tooltip"
                    className="absolute"
                    style={{
                      bottom: 50,
                      left: "50%",
                      transform: "translateX(-50%)",
                      whiteSpace: "nowrap",
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: dark ? "#F5F3FA" : "#241F1B",
                      color: dark ? "#121317" : "#FFFFFF",
                      fontSize: textPx(11.5),
                      fontWeight: 700,
                      boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
                    }}
                  >
                    {act.label}
                  </span>
                )}
              </button>
            );
          })}
          {tooltip && (
            <div
              role="tooltip"
              className="absolute"
              style={{
                left: "2%",
                top: -46,
                width: "56%",
                zIndex: 5,
                borderRadius: 14,
                background: dark ? "#F5F3FA" : "#241F1B",
                color: dark ? "#121317" : "#FFFFFF",
                padding: "10px 12px",
                boxShadow: "0 10px 24px rgba(0,0,0,0.22)",
                pointerEvents: "none",
              }}
            >
              <p style={{ fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7 }}>{tooltip.title}</p>
              <p style={{ fontSize: textPx(13), fontWeight: 800, marginTop: 2 }}>{tooltip.line}</p>
              {tooltip.sub && <p style={{ fontSize: textPx(11), fontWeight: 600, opacity: 0.8 }}>{tooltip.sub}</p>}
              <p style={{ fontSize: textPx(11), marginTop: 6, paddingTop: 6, borderTop: `1px solid ${dark ? "rgba(18,19,23,0.12)" : "rgba(255,255,255,0.16)"}`, lineHeight: 1.4 }}>{tooltip.sessions}</p>
            </div>
          )}
          {pv && (
            <div
              role="dialog"
              aria-label="Session preview"
              className="absolute"
              style={{ left: "-2%", right: "-2%", top: "22%", zIndex: 6, borderRadius: 18, background: INK.card, border: "1px solid rgba(143,104,246,0.22)", boxShadow: "0 16px 40px rgba(0,0,0,0.22)", padding: 14 }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div className="flex items-center" style={{ gap: 10 }}>
                <Initials text={initialsOf(pv.client?.name ?? pv.title)} size={40} />
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch }}>{pv.client?.name ?? pv.title}</p>
                  <p style={{ fontSize: textPx(12), color: INK.chS }}>
                    {pv.endTime ? range12(pv.startTime, pv.endTime) : time12(pv.startTime)}
                    {pv.client ? ` · ${pv.title}` : ""}
                    {prevPoint?.count && prevPoint.count > 1 ? ` · +${prevPoint.count - 1}` : ""}
                  </p>
                  {(pv.location || pv.url) && (
                    <p className="flex items-center" style={{ gap: 4, fontSize: textPx(11.5), color: INK.chF }}>
                      {pv.url ? <Video size={11} strokeWidth={2} aria-hidden /> : <MapPin size={11} strokeWidth={2} aria-hidden />}
                      {pv.url ? "Online video call" : pv.location}
                    </p>
                  )}
                </div>
                {p.next?.key === pv.key && (
                  <span style={{ fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: INK.prDeep }}>Next</span>
                )}
              </div>
              <div className="flex" style={{ gap: 6, marginTop: 12 }}>
                <PreviewBtn label="Open" onClick={() => p.onSession(pv, "open")} />
                <PreviewBtn label="Reschedule" onClick={() => p.onSession(pv, "reschedule")} />
                {pv.client && <PreviewBtn label="Message" primary icon onClick={() => p.onSession(pv, "message")} />}
              </div>
              <button type="button" aria-label="Close preview" onClick={() => setPreview(null)} className="sr-only focus:not-sr-only">
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <Legend lane={p.lane} range={p.range} prevWord={p.prevWord} />
      {p.children}
      {p.emptyCta}
    </div>
  );
};

const PreviewBtn: React.FC<{ label: string; onClick: () => void; primary?: boolean; icon?: boolean }> = ({ label, onClick, primary, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={clsx("tap flex-1 inline-flex items-center justify-center rounded-xl font-bold", primary ? "bg-primary-fill text-on-primary-fill" : "bg-primary-pale text-primary-deep-text")}
    style={{ height: 36, gap: 6, fontSize: textPx(13) }}
  >
    {icon && <MessageCircle size={14} strokeWidth={2} aria-hidden />}
    {label}
  </button>
);

const Delta: React.FC<{ value: number }> = ({ value }) => {
  const good = value >= 0;
  const c = good ? INK.good : INK.hi;
  const Icon = good ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center" style={{ gap: 2, fontSize: textPx(11), fontWeight: 800, color: c, whiteSpace: "nowrap" }}>
      <Icon size={11} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
      {value > 0 ? `+${value}` : value < 0 ? `-${Math.abs(value)}` : "0"}
    </span>
  );
};

const Legend: React.FC<{ lane: ProLane; range: HubRange; prevWord: string }> = ({ lane, range, prevWord }) => {
  const dark = useIsDark();
  const items: [React.ReactNode, string][] = [
    [<span key="a" style={{ width: 9, height: 9, borderRadius: 2, background: INK.pr }} />, range === "today" ? TODAY_LEGEND[lane] : "Adherence"],
  ];
  if (range !== "today") items.push([<span key="g" style={{ width: 12, height: 0, borderTop: `1.6px dashed ${INK.tealDark}` }} />, prevWord.charAt(0).toUpperCase() + prevWord.slice(1)]);
  items.push([<span key="d" style={{ width: 8, height: 8, borderRadius: 9999, background: INK.tealDark }} />, "Done"]);
  items.push([<span key="s" style={{ width: 8, height: 8, borderRadius: 9999, border: `1.6px solid ${dark ? "#C3B3FB" : "#7D6BB5"}` }} />, lane === "clinical_overview" ? "Appointments" : "Sessions"]);
  return (
    <div className="flex flex-wrap justify-center" style={{ gap: "4px 12px", marginTop: 4 }}>
      {items.map(([mark, label]) => (
        <span key={label} className="inline-flex items-center" style={{ gap: 5, fontSize: textPx(10.5), fontWeight: 600, color: INK.chS, whiteSpace: "nowrap" }}>
          {mark}
          {label}
        </span>
      ))}
    </div>
  );
};

export const Initials: React.FC<{ text: string; size: number; tone?: "pr" | "gold" | "teal" }> = ({ text, size, tone = "pr" }) => {
  const bg = tone === "teal" ? INK.tealPale : tone === "gold" ? INK.goldPale : INK.prPale;
  const ink = tone === "teal" ? "rgb(var(--c-team-teal-ink))" : tone === "gold" ? INK.goldInk : INK.prDeep;
  return (
    <span
      aria-hidden
      className="flex items-center justify-center shrink-0"
      style={{ width: size, height: size, borderRadius: 9999, background: bg, color: ink, fontSize: Math.round(size * 0.33), fontWeight: 800 }}
    >
      {text}
    </span>
  );
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dayTitle(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return `${DAY_SHORT[mondayIndex(d.getDay())]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
