import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import { Toast } from "../../../components/ui/Toast";
import { useApp } from "../../../context/AppContext";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { logMeditationSession } from "../../../services/meditation";
import { MAX_SESSION_SECONDS, MIN_SESSION_SECONDS } from "../../../services/meditation/logic";
import { OFFLINE_MESSAGE } from "../../../services/network-error";
import { libraryKind, minutesLabel, scriptSteps, stepAt } from "../../../services/premium/g3";
import { t } from "../../../i18n/core";
import { sessionElapsedMs, sessions, useLockedSession } from "../../../platform/sessions";

// undrawn (Round G, no handover)
// Round G3 · a guided meditation from the library: its script step by step
// (its sentences, each with its share of the session's minutes), timed by the
// wall clock like the breathing runner (a backgrounded tab still counts).
//
// LOGGED AS THE APP LOGS MEDITATION TODAY (services/meditation): once, when
// the session reaches its end, as completed, with the time actually spent,
// plus the library's content_id. Stopping before the end writes nothing, as
// an unfinished pose sequence writes nothing. Under Reduce motion the
// progress bar doesn't animate; the text and time still update.
//
// In the app the phone keeps the session going with the screen locked, with a
// bell to begin and end and the step on the lock screen (App-Centium
// ROUND_J.md §7); its clock is the one counted, and the result is saved here
// exactly as in a browser.

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ScriptRunner({ slug, contentId, title, script, minutes }: { slug: string; contentId: string; title: string; script: string; minutes: number }) {
  const { authUserId, refreshMeditationSummary, refreshAchievements } = useApp();
  const reduced = useReducedMotion();
  const steps = useMemo(() => scriptSteps(script, minutes), [script, minutes]);
  const total = steps.reduce((a, s) => a + s.seconds, 0);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Wall clock: when this stretch started, and what earlier stretches added up to.
  const run = useRef<{ since: number | null; banked: number; startedAt: number | null; saved: boolean }>({ since: null, banked: 0, startedAt: null, saved: false });

  const resultKey = `script:${contentId}`;
  const locked = useLockedSession(resultKey);
  const lockedState = locked.state;
  const lockedRef = useRef(lockedState);
  useEffect(() => {
    lockedRef.current = lockedState;
  });

  const now = () => {
    const s = lockedRef.current;
    if (s) return sessionElapsedMs(s, Date.now()) / 1000;
    return run.current.banked + (run.current.since === null ? 0 : (Date.now() - run.current.since) / 1000);
  };

  const save = (seconds: number) => {
    if (run.current.saved || !authUserId || run.current.startedAt === null) return;
    run.current.saved = true;
    const spent = Math.min(MAX_SESSION_SECONDS, Math.max(MIN_SESSION_SECONDS, Math.round(seconds)));
    void logMeditationSession({ userId: authUserId, startedAt: new Date(run.current.startedAt), durationSeconds: spent, kind: libraryKind(slug), completed: true, contentId }).then((r) => {
      if (!r.ok) {
        run.current.saved = false;
        setToast(r.message === OFFLINE_MESSAGE ? r.message : t("Couldn't save. Try again."));
        return;
      }
      setNote(t("Saved · {time}", { time: minutesLabel(Math.max(1, Math.round(spent / 60))) }));
      void refreshMeditationSummary();
      refreshAchievements();
    });
  };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const e = now();
      if (e >= total) {
        run.current.banked = total;
        run.current.since = null;
        setElapsed(total);
        setRunning(false);
        save(total);
        return;
      }
      setElapsed(e);
    }, 250);
    return () => window.clearInterval(id);
    // save and now read refs; the interval restarts only with running.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, total]);

  const start = () => {
    if (elapsed >= total) {
      run.current = { since: null, banked: 0, startedAt: null, saved: false };
      setElapsed(0);
    }
    const fresh = run.current.startedAt === null;
    if (fresh) run.current.startedAt = Date.now();
    run.current.since = Date.now();
    setNote(null);
    setRunning(true);
    if (!locked.native) return;
    if (fresh) {
      void sessions.start({
        kind: libraryKind(slug),
        title,
        phases: steps.map((s) => ({ label: s.text, seconds: s.seconds, cue: "none" as const })),
        repeat: 1,
        resultKey,
      });
    } else {
      void sessions.resume();
    }
  };
  const pause = () => {
    run.current.banked = now();
    run.current.since = null;
    setRunning(false);
    if (locked.native) void sessions.pause();
  };
  const stop = () => {
    run.current = { since: null, banked: 0, startedAt: null, saved: false };
    setRunning(false);
    setElapsed(0);
    setNote(t("Finish the session to save it."));
    if (locked.native) void sessions.stop().then(() => sessions.clear());
  };

  // The phone's side (in the app only): a pause, a stop or the end that
  // happened on the lock screen, or a session that went on while the page was away.
  useEffect(() => {
    if (!lockedState) return;
    if (lockedState.active) {
      if (run.current.startedAt === null) run.current.startedAt = lockedState.startedAt;
      setRunning(!lockedState.paused);
      setElapsed(Math.min(total, sessionElapsedMs(lockedState, Date.now()) / 1000));
      return;
    }
    if (lockedState.completed) {
      if (run.current.startedAt === null) run.current.startedAt = lockedState.startedAt;
      run.current = { ...run.current, since: null, banked: total };
      setElapsed(total);
      setRunning(false);
      save(total);
    } else if (run.current.startedAt !== null) {
      run.current = { since: null, banked: 0, startedAt: null, saved: false };
      setRunning(false);
      setElapsed(0);
      setNote(t("Finish the session to save it."));
    }
    void sessions.clear();
    // save and total are read at the moment the phone reports.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedState]);

  if (steps.length === 0) return null;
  const at = stepAt(steps, elapsed);
  const finished = elapsed >= total;
  const started = run.current.startedAt !== null;

  return (
    <div data-g3="script-runner">
      <div className="rounded-2xl bg-cream-card shadow-soft px-4 py-5">
        <p className="text-[11px] font-bold text-charcoal-faint">{t("Step {n} of {total}", { n: at.index + 1, total: steps.length })}</p>
        <p aria-live="polite" className="mt-2 min-h-[96px] text-[17px] leading-[26px] font-semibold text-charcoal [overflow-wrap:anywhere]">
          {steps[at.index].text}
        </p>
        <div className="mt-4 h-1.5 rounded-full bg-charcoal/[0.07] overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(elapsed)} aria-label={t("Session progress")}>
          <div className="h-full rounded-full bg-primary-dark" style={{ width: `${(elapsed / total) * 100}%`, transition: reduced ? "none" : "width 0.25s linear" }} />
        </div>
        <p className="mt-2 text-[11.5px] tabular-nums text-charcoal-faint">{t("{left} left", { left: clock(Math.max(0, total - elapsed)) })}</p>
      </div>
      <div className="mt-4 flex gap-2">
        {running ? (
          <Button variant="primary" size="lg" fullWidth onClick={pause} className="flex items-center justify-center gap-2">
            <Pause size={15} aria-hidden /> {t("Pause")}
          </Button>
        ) : (
          <Button variant="primary" size="lg" fullWidth onClick={start} className="flex items-center justify-center gap-2">
            <Play size={15} aria-hidden /> {finished ? t("Start again") : started ? t("Resume") : t("Begin")}
          </Button>
        )}
        {started && !finished && (
          <Button variant="secondary" size="lg" onClick={stop} aria-label={t("Stop")} className="flex items-center justify-center">
            <Square size={15} aria-hidden />
          </Button>
        )}
      </div>
      {note && (
        <p role="status" className="mt-2 text-center text-[11.5px] font-semibold text-charcoal-soft">
          {note}
        </p>
      )}
      <Toast open={!!toast} message={toast ?? ""} tone="error" onExpire={() => setToast(null)} />
    </div>
  );
}
