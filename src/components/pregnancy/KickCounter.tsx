import React, { useEffect, useState } from "react";
import { CapsLabel, CycleCard } from "../cycle/cycleUi";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import {
  formatDuration,
  getKickSessions,
  saveKickSession,
  startKickSession,
  type KickSession,
} from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";
import { appLocale } from "../../i18n/format";
import { t, tn } from "../../i18n/core";

// Counting movements.
//
// NO THRESHOLD, AND THAT IS THE DESIGN. "Ten kicks in two hours" is a rule
// some providers give and others do not, and an app that draws a progress bar
// towards ten teaches somebody to wait for a count to finish before calling.
// G.KICKS_CHANGE_NOTE says the opposite, in the place it is read.
//
// THE COUNT IS WRITTEN AS IT GOES, not only at the end: a session left open
// when the phone locks or the tab closes still has its taps. saveKickSession
// updates the row; the id comes back from the insert that started it.

export const KickCounter: React.FC<{ pregnancyId: string }> = ({ pregnancyId }) => {
  const { authUserId } = useApp();
  const [sessions, setSessions] = useState<KickSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [kicks, setKicks] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = React.useCallback(() => {
    if (!authUserId) return;
    void getKickSessions(authUserId, pregnancyId).then((r) => {
      if (r.ok) setSessions(r.value);
    });
  }, [authUserId, pregnancyId]);

  useEffect(() => reload(), [reload]);

  // The ticking clock runs ONLY while a session is open, so a page sitting in
  // the background with no session does not re-render once a second.
  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionId]);

  // The write is debounced, because a baby that is moving gets tapped a lot
  // and one request per tap would be a request per second.
  useEffect(() => {
    if (!sessionId || kicks === 0) return;
    const id = setTimeout(() => {
      void saveKickSession(sessionId, kicks, null);
    }, 1200);
    return () => clearTimeout(id);
  }, [sessionId, kicks]);

  const start = async () => {
    if (!authUserId) return;
    setBusy(true);
    setError(null);
    const at = new Date().toISOString();
    const result = await startKickSession(authUserId, pregnancyId, at);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSessionId(result.value);
    setStartedAt(at);
    setKicks(0);
    setNow(Date.now());
  };

  const stop = async () => {
    if (!sessionId) return;
    setBusy(true);
    const result = await saveKickSession(sessionId, kicks, new Date().toISOString());
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSessionId(null);
    setStartedAt(null);
    setKicks(0);
    reload();
  };

  const elapsed = startedAt ? Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000)) : 0;

  return (
    <CycleCard style={{ marginBottom: 12 }}>
      <CapsLabel>{G.KICKS_TITLE}</CapsLabel>
      <p className="mt-1 text-[11px] leading-relaxed text-charcoal-soft">{G.KICKS_EXPLAINER}</p>

      {sessionId ? (
        <div className="mt-3.5">
          <button
            onClick={() => setKicks((k) => k + 1)}
            aria-label={t("Count a movement")}
            className="tap w-full rounded-2xl py-7 text-center"
            style={{ background: "rgba(184,115,90,0.12)" }}
          >
            <span className="block text-[38px] font-extrabold tabular-nums leading-none text-charcoal">
              {kicks}
            </span>
            <span className="mt-1.5 block text-[11px] font-semibold text-charcoal-soft">
              {t("Tap each movement")}
            </span>
          </button>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[11px] text-charcoal-faint tabular-nums">
              {formatDuration(elapsed)}
            </span>
            <button
              onClick={() => void stop()}
              disabled={busy}
              className="tap text-[11.5px] font-semibold text-primary-dark disabled:opacity-40"
            >
              {t("Finish")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3.5">
          <Button fullWidth variant="secondary" disabled={busy || !authUserId} onClick={() => void start()}>
            {t("Start counting")}
          </Button>
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed font-semibold text-charcoal">
        {G.KICKS_CHANGE_NOTE}
      </p>

      {error && <p className="mt-2 text-[11px] font-semibold text-status-high">{t(error)}</p>}

      {sessions.length > 0 && (
        <div className="mt-3.5 border-t border-charcoal/8 pt-3 space-y-1.5">
          {sessions.slice(0, 5).map((s) => {
            const secs =
              s.endedAt !== null
                ? Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000)
                : null;
            return (
              <div key={s.id} className="flex items-center justify-between text-[11px]">
                <span className="text-charcoal-soft">
                  {new Date(s.startedAt).toLocaleDateString(appLocale("en-US"), {
                    month: "short",
                    day: "numeric",
                  })}
                  {" · "}
                  {new Date(s.startedAt).toLocaleTimeString(appLocale("en-US"), {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-charcoal font-semibold tabular-nums">
                  {tn(s.kicks, "{n} movement", "{n} movements")}
                  {secs !== null && ` · ${formatDuration(secs)}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </CycleCard>
  );
};
