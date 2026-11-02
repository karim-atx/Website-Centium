import React, { useCallback, useEffect, useState } from "react";
import { CapsLabel, CycleCard } from "../cycle/cycleUi";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import {
  contractionDurationSeconds,
  contractionSpacingSeconds,
  endContraction,
  formatDuration,
  getContractions,
  startContraction,
  type Contraction,
} from "../../services/pregnancy";
import * as G from "../../services/pregnancy/guidance";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// Timing contractions.
//
// TWO NUMBERS, AND NO THIRD. How long each one lasts, and how far apart they
// are — start to start, which is what "five minutes apart" means and what
// contractionSpacingSeconds computes. There is deliberately no "time to go in"
// banner and no 5-1-1 rule: that threshold belongs to the person's provider,
// varies with the pregnancy, and an app getting it wrong sends somebody to
// hospital too early or keeps them home too late.
//
// THE ROW IS WRITTEN AT THE START, not at the end, so a contraction that is
// still running is already recorded. Its ended_at fills in on stop.

export const ContractionTimer: React.FC<{ pregnancyId: string }> = ({ pregnancyId }) => {
  const { authUserId } = useApp();
  const [rows, setRows] = useState<Contraction[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningFrom, setRunningFrom] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!authUserId) return;
    void getContractions(authUserId, pregnancyId).then((r) => {
      if (!r.ok) return;
      setRows(r.value);
      // A CONTRACTION LEFT RUNNING IS PICKED BACK UP. Closing the tab
      // mid-contraction is ordinary; coming back to a stuck "start" button
      // and a half-written row is not.
      const open = r.value.find((c) => c.endedAt === null);
      if (open) {
        setRunningId(open.id);
        setRunningFrom(open.startedAt);
      }
    });
  }, [authUserId, pregnancyId]);

  useEffect(() => reload(), [reload]);

  useEffect(() => {
    if (!runningId) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [runningId]);

  const start = async () => {
    if (!authUserId) return;
    setBusy(true);
    setError(null);
    const at = new Date().toISOString();
    const result = await startContraction(authUserId, pregnancyId, at);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRunningId(result.value);
    setRunningFrom(at);
    setNow(Date.now());
  };

  const stop = async () => {
    if (!runningId) return;
    setBusy(true);
    const result = await endContraction(runningId, new Date().toISOString());
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setRunningId(null);
    setRunningFrom(null);
    reload();
  };

  const running = runningFrom
    ? Math.max(0, Math.round((now - new Date(runningFrom).getTime()) / 1000))
    : 0;

  const finished = rows.filter((c) => c.endedAt !== null);

  return (
    <CycleCard style={{ marginBottom: 12 }}>
      <CapsLabel>{t(G.CONTRACTIONS_TITLE)}</CapsLabel>
      <p className="mt-1 text-[11px] leading-relaxed text-charcoal-soft">
        {G.CONTRACTIONS_EXPLAINER}
      </p>

      <div className="mt-3.5">
        {runningId ? (
          <>
            <div
              className="rounded-2xl py-6 text-center"
              style={{ background: "rgba(184,115,90,0.12)" }}
            >
              <span className="block text-[34px] font-extrabold tabular-nums leading-none text-charcoal">
                {formatDuration(running)}
              </span>
              <span className="mt-1.5 block text-[11px] font-semibold text-charcoal-soft">
                {t("Contraction in progress")}
              </span>
            </div>
            <Button fullWidth className="mt-2.5" disabled={busy} onClick={() => void stop()}>
              {t("Stop")}
            </Button>
          </>
        ) : (
          <Button fullWidth variant="secondary" disabled={busy || !authUserId} onClick={() => void start()}>
            {t("Start a contraction")}
          </Button>
        )}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed font-semibold text-charcoal">
        {G.CONTRACTIONS_NO_RULE}
      </p>

      {error && <p className="mt-2 text-[11px] font-semibold text-status-high">{t(error)}</p>}

      {finished.length > 0 && (
        <div className="mt-3.5 border-t border-charcoal/8 pt-3">
          <div className="flex text-[9.5px] font-semibold text-charcoal-faint pb-1.5">
            <span className="flex-1">{t("Started")}</span>
            <span className="w-[74px] text-end">{t("Lasted")}</span>
            <span className="w-[86px] text-end">{t("Apart")}</span>
          </div>
          {finished.slice(0, 8).map((c, i) => {
            // The rows are newest first, so the PREVIOUS contraction is the
            // next one in the list — spacing is this start minus that start.
            const previous = finished[i + 1];
            const spacing = previous
              ? contractionSpacingSeconds(c.startedAt, previous.startedAt)
              : null;
            const lasted = contractionDurationSeconds(c.startedAt, c.endedAt);
            return (
              <div key={c.id} className="flex text-[11px] py-1">
                <span className="flex-1 text-charcoal-soft">
                  {new Date(c.startedAt).toLocaleTimeString(appLocale("en-US"), {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                <span className="w-[74px] text-end text-charcoal font-semibold tabular-nums">
                  {lasted !== null ? formatDuration(lasted) : "–"}
                </span>
                <span className="w-[86px] text-end text-charcoal font-semibold tabular-nums">
                  {spacing !== null ? formatDuration(spacing) : "–"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </CycleCard>
  );
};
