import { useMemo, useState, type CSSProperties } from "react";
import { ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { BreathingRunner } from "../../../components/mind/BreathingRunner";
import type { Pose } from "../../../components/mind/PoseSequence";
import { usePoseSequence } from "../../../components/mind/usePoseSequence";
import { Toast } from "../../../components/ui/Toast";
import { MusicSection } from "../../../components/music/MusicSection";
import { MindLibraryEntry } from "../library/MindLibraryEntry";
import { breathingPatterns, stretchList, yogaPoses } from "../../../data/mockMindContent";
import { formatMeditationTime, isEmptySummary } from "../../../services/meditation/logic";
import { meditationPoseV2Urls } from "../../../utils/assetUrls";
import { t, tk, tn, tx } from "../../../i18n/core";
import { MindSectionWeb } from "./MindSectionWeb";
import { mindCaps } from "./mindWebStyles";
import { useLinkOnce } from "../../../hooks/useLinkOnce";

type SubTab = "breathing" | "stretching" | "yoga";
type Level = "beginner" | "intermediate" | "advanced";

const TABS: { key: SubTab; label: string }[] = [
  { key: "breathing", label: tk("Breathing") },
  { key: "stretching", label: tk("Stretching") },
  { key: "yoga", label: tk("Yoga") },
];

// The level pills (reference LV, literal): background and ink.
const LEVEL: Record<Level, [string, string]> = {
  beginner: ["#E3F3E9", "#3F9165"],
  intermediate: ["#FBF1DD", "#B08A2E"],
  advanced: ["#FBE7E4", "#C0392B"],
};
const LEVEL_LABEL: Record<Level, string> = { beginner: tk("Beginner"), intermediate: tk("Intermediate"), advanced: tk("Advanced") };

/** As MeditationPage: yoga poses have no durations (their timer reads "Hold"). */
const YOGA_SECONDS = 30;

type WebPose = Pose & { level?: Level };

const CSS = `
.med-web-tab:not([aria-selected="true"]):hover { background: #EDEAFE !important; }
.med-web-card { transition: background-color .15s; }
.med-web-card:hover { background: #FAFAFB; }
.med-web-tab:focus-visible, .med-web-card:focus-visible, .med-web-btn:focus-visible { outline: 2px solid #AEA1DC; outline-offset: 2px; }
`;

/**
 * Website viewport v1, WC-MI.4 Meditation (WC-MI Mind Web v5, screen
 * "meditation", literal values; REPO CHANGED, so built from today's mobile
 * page with the global rules). Under the header the Breathing / Stretching /
 * Yoga control (40: track #F3F3FD pad 5 r14, pills 30 r10, 15/24 600, active
 * #A79AD5 white, idle #F5F4FE #5B5349, equal widths).
 *
 * Breathing: a 4 : 8 grid (1 : 1 with the rail): the pattern cards (r16, pad
 * 14 16, the name 17/24 700, the line 13/20, the phases 13/700; selected
 * #A79AD5 with white ink, else #F5F4FE) and Play your music under them, beside
 * the runner pane (r24 #F7F9F9, centred) holding the mobile BreathingRunner
 * (its petals, rail, timer and session log; its Start / Reset row inline on
 * web) and the minutes line (13 #8C8378, 24 in, 18 up).
 *
 * Stretching and Yoga: the sequence row (the current pose, its timer and Next
 * / Finish: the mobile hero's controls, same rules and log through
 * usePoseSequence) over the pose cards, 3 columns (2 with the rail) filling
 * the window: r20, 0.5px border, the lavender media #ECE8F7 with the art at
 * 110% of its height (top -3.2%; rows at least 200, so with the sequence
 * row and the music the page scrolls at 1024 rather than squash the art), the level pill 12/700 at 12 12, the name
 * 17/24 700 and the meta 13/20 #8C8378 under it. A click on a card makes it
 * the current pose; the current card has a 1.5 #A79AD5 border. Play your
 * music under the cards.
 */
export default function MeditationWeb() {
  const [tab, setTab] = useState<SubTab>("breathing");
  const [patternId, setPatternId] = useState(breathingPatterns[0].id);
  const pattern = breathingPatterns.find((p) => p.id === patternId)!;
  // Round J · J-2b: ?start=1 starts a breathing run (MeditationPage has the same).
  const [startSignal, setStartSignal] = useState(0);
  useLinkOnce("start", "1", () => {
    setTab("breathing");
    setStartSignal((n) => n + 1);
  });
  const { meditationSummary } = useApp();
  const { rail } = useWebLayout();

  const stretches = useMemo<WebPose[]>(
    () =>
      stretchList.map((s) => ({
        id: s.id,
        name: s.name,
        meta: `${s.target} · ${s.type} · ${t("{n}s", { n: s.seconds })}`,
        seconds: s.seconds,
        instructions: s.instructions,
        art: s.art,
      })),
    []
  );
  const poses = useMemo<WebPose[]>(
    () =>
      yogaPoses.map((p) => ({
        id: p.id,
        name: p.name,
        meta: p.subtitle,
        seconds: YOGA_SECONDS,
        instructions: p.instructions,
        art: p.art,
        level: p.difficulty as Level,
      })),
    []
  );

  const medLine =
    meditationSummary && !isEmptySummary(meditationSummary)
      ? `${t("{time} today", { time: formatMeditationTime(meditationSummary.secondsToday) })} · ${t("{time} this week", { time: formatMeditationTime(meditationSummary.secondsThisWeek) })}`
      : t("No sessions yet");

  return (
    <MindSectionWeb title={t("Meditation")} sub={t("Breathing, stretching & yoga")} fill>
      <style href="med-web" precedence="default">{CSS}</style>
      <div role="tablist" aria-label={t("Meditation")} data-med-tabs className="grid" style={{ flex: "none", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5, padding: 5, borderRadius: 14, background: "#F3F3FD" }}>
        {TABS.map((x) => {
          const on = tab === x.key;
          return (
            <button
              key={x.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(x.key)}
              className="med-web-tab whitespace-nowrap"
              style={{ minWidth: 0, height: 30, padding: "0 12px", borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "#F5F4FE", color: on ? "#FFFFFF" : "#5B5349" }}
            >
              {t(x.label)}
            </button>
          );
        })}
      </div>

      {/* Round G3: the meditation library (nothing while the Premium switch is off), as on mobile. */}
      <MindLibraryEntry />

      {tab === "breathing" && (
        <div data-med-breath style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,4fr) minmax(0,8fr)", gridTemplateRows: "minmax(0,1fr)", gap: 24 }}>
          <aside className="flex flex-col" style={{ minWidth: 0, gap: 10 }}>
            {breathingPatterns.map((p) => {
              const on = p.id === patternId;
              const sub = on ? "rgba(255,255,255,0.88)" : "#5B5349";
              return (
                <button
                  key={p.id}
                  type="button"
                  data-med-pattern
                  aria-pressed={on}
                  onClick={() => setPatternId(p.id)}
                  className="med-web-btn block w-full text-start"
                  style={{ borderRadius: 16, padding: "14px 16px", boxSizing: "border-box", background: on ? "#A79AD5" : "#F5F4FE", border: `1px solid ${on ? "#A79AD5" : "transparent"}` }}
                >
                  <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: on ? "#FFFFFF" : "#241F1B" }}>{p.name}</span>
                  <span className="block" style={{ marginTop: 4, fontSize: 13, lineHeight: "20px", color: sub }}>{p.desc}</span>
                  <span className="block" style={{ marginTop: 8, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: sub, fontVariantNumeric: "tabular-nums" }}>
                    {p.phases.map((ph) => ph.seconds).join(" · ")}
                  </span>
                </button>
              );
            })}
            {/* Round E: Play your music (the member's Mind favourite, or their music app). */}
            <MusicSection moment="mind" style={{ marginTop: 14 }} />
          </aside>
          <section
            data-med-runner
            className="relative flex flex-col items-center justify-center"
            style={{ minWidth: 0, minHeight: 0, borderRadius: 24, background: "#F7F9F9", padding: "24px 24px 56px", boxSizing: "border-box" }}
          >
            {/* The mobile column's width, so the phase rail keeps its proportions. */}
            <div style={{ width: "100%", maxWidth: 358 }}>
              <BreathingRunner pattern={pattern} startSignal={startSignal} />
            </div>
            <p data-med-line className="absolute whitespace-nowrap" style={{ insetInlineStart: 24, bottom: 18, margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378", fontVariantNumeric: "tabular-nums" }}>
              {medLine}
            </p>
          </section>
        </div>
      )}
      {tab === "stretching" && <PosesWeb key="stretching" kind="stretching" poses={stretches} cols={rail ? 2 : 3} />}
      {tab === "yoga" && <PosesWeb key="yoga" kind="yoga" poses={poses} cols={rail ? 2 : 3} />}
    </MindSectionWeb>
  );
}

const btn40: CSSProperties = { height: 40, borderRadius: 12, display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", fontSize: 15, lineHeight: "24px", fontWeight: 600, flex: "none" };

/** Stretching / Yoga: the sequence row over the pose cards (see MeditationWeb). */
function PosesWeb({ poses, kind, cols }: { poses: WebPose[]; kind: "stretching" | "yoga"; cols: number }) {
  const { timed, idx, pose, next, running, started, complete, toast, setToast, toggleTimer, restart, select, goTo, finish, leftS, timerLabel } = usePoseSequence(poses, kind);

  return (
    <>
      {/* The sequence row (the mobile hero's controls): #F0EDF9 r16, pad 12 16. */}
      <div data-med-seq className="flex items-center" role={complete ? "status" : undefined} style={{ flex: "none", minHeight: 64, boxSizing: "border-box", gap: 16, padding: "12px 16px", borderRadius: 16, background: "#F0EDF9" }}>
        {complete ? (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...mindCaps, color: "#7D6BB5" }}>{t("Sequence complete")}</p>
              <p className="truncate" style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>
                {t("Nice work")}
                <span style={{ fontWeight: 400, color: "#5B5349" }}>
                  {" · "}
                  {timed
                    ? tn(poses.length, "{n} stretch · {time}", "{n} stretches · {time}", { time: formatMeditationTime(complete.shown) })
                    : tn(poses.length, "{n} pose · {time}", "{n} poses · {time}", { time: formatMeditationTime(complete.shown) })}
                  {complete.save !== "hidden" && ` · ${complete.save === "saving" ? t("Saving…") : complete.save === "saved" ? t("Saved to your practice") : t("Too short to save.")}`}
                </span>
              </p>
            </div>
            <button type="button" onClick={restart} className="med-web-btn" style={{ ...btn40, padding: "0 16px", background: "#FFFFFF", color: "#5F5093" }}>
              <RotateCcw size={16} aria-hidden />
              {t("Start from pose 1")}
            </button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ ...mindCaps, color: "#7D6BB5" }}>{t("Pose {n} of {total}", { n: idx + 1, total: poses.length })}</p>
              <p className="truncate" title={pose.instructions} style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>
                {pose.name}
                <span style={{ fontWeight: 400, color: "#5B5349" }}>
                  {" · "}
                  {pose.instructions}
                </span>
              </p>
            </div>
            {timed ? (
              <button
                type="button"
                data-med-timer
                onClick={toggleTimer}
                aria-label={timerLabel}
                title={timerLabel}
                className="med-web-btn justify-center"
                style={{ ...btn40, minWidth: 96, padding: "0 16px", background: running ? "#4F7F78" : "#9A8CD6", color: "#FFFFFF", fontVariantNumeric: "tabular-nums" }}
              >
                {running ? <Pause size={16} fill="#FFFFFF" aria-hidden /> : <Play size={16} fill="#FFFFFF" aria-hidden />}
                {started || running ? t("{n}s", { n: leftS }) : t("{n}s", { n: pose.seconds })}
              </button>
            ) : (
              <span style={{ ...btn40, padding: "0 16px", background: "#FFFFFF", color: "#5F5093" }}>{t("Hold")}</span>
            )}
            <button
              type="button"
              data-med-next
              onClick={next ? () => goTo(idx + 1) : finish}
              className="med-web-btn"
              style={{ ...btn40, maxWidth: 320, padding: "0 12px 0 16px", background: "#FFFFFF", color: "#5F5093" }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#8C8378" }}>{t("Next")}</span>
              <span className="truncate" style={{ minWidth: 0 }}>{next ? next.name : tx("Finish", "button")}</span>
              <ChevronRight size={16} aria-hidden />
            </button>
          </>
        )}
      </div>

      <div data-med-poses style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: `repeat(${cols},minmax(260px,1fr))`, gridAutoRows: "minmax(200px,1fr)", gap: 24 }}>
        {poses.map((p, i) => {
          const current = !complete && i === idx;
          const lvl = p.level ? LEVEL[p.level] : null;
          return (
            <button
              key={p.id}
              type="button"
              data-med-pose
              aria-current={current ? "step" : undefined}
              onClick={() => {
                // As mobile: clicking the current pose does nothing.
                if (!current) select(i);
              }}
              className="med-web-card flex flex-col overflow-hidden text-start"
              style={{ minHeight: 0, borderRadius: 20, boxSizing: "border-box", border: current ? "1.5px solid #A79AD5" : "0.5px solid rgba(36,31,27,0.1)", background: "#FFFFFF" }}
            >
              <span data-pose="media" className="relative block w-full overflow-hidden" style={{ flex: 1, minHeight: 0, background: "#ECE8F7" }}>
                <img
                  data-pose="art"
                  src={meditationPoseV2Urls(p.art).still}
                  alt={p.name}
                  className="absolute block"
                  style={{ left: "50%", top: "-3.2%", height: "110%", width: "auto", maxWidth: "none", transform: "translateX(-50%)" }}
                />
                {lvl && p.level && (
                  <span className="absolute" style={{ zIndex: 1, insetInlineStart: 12, top: 12, borderRadius: 999, padding: "3px 10px", fontSize: 12, lineHeight: "18px", fontWeight: 700, background: lvl[0], color: lvl[1] }}>
                    {t(LEVEL_LABEL[p.level])}
                  </span>
                )}
              </span>
              <span className="block" style={{ flex: "none", padding: "12px 16px" }}>
                <span className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{p.name}</span>
                <span className="block truncate" style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{p.meta}</span>
              </span>
            </button>
          );
        })}
      </div>
      <MusicSection moment="mind" />
      <Toast open={!!toast} message={toast ? t(toast) : ""} tone="error" onExpire={() => setToast(null)} />
    </>
  );
}
