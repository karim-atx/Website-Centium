import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, Image as ImageIcon } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ProChart } from "../ProChart";
import { ListCard } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { ProCardSkeleton, ProError } from "../states";
import { RangeTrack } from "./moKit";
import { SafetyBanner } from "./ResponseScreen";
import { photoAnswers, seriesOverTime, type PositionedQuestion } from "./reviewModel";
import { fetchQuestions, fetchResponses, type FormResponse } from "../../../services/pro/forms";
import { FORMS_PATH } from "./formsList";

export interface CheckIns {
  responses: FormResponse[];
  questions: Record<string, PositionedQuestion[]>;
}

/** One client's submitted check-ins to me (newest first) and their forms' questions. undefined while loading, null on error. */
export function useClientCheckIns(clientId: string, enabled: boolean, nonce = 0): CheckIns | null | undefined {
  const { authUserId } = useApp();
  const [data, setData] = useState<CheckIns | null | undefined>(undefined);
  useEffect(() => {
    if (!authUserId || !enabled) return;
    let live = true;
    void fetchResponses(authUserId, { clientId }).then(async (r) => {
      if (!live) return;
      if (!r.ok) return setData(null);
      const responses = r.data.filter((x) => x.formKind === "check_in");
      const q = await fetchQuestions([...new Set(responses.map((x) => x.formId))]);
      if (live) setData(q.ok ? { responses, questions: q.data } : null);
    });
    return () => {
      live = false;
    };
  }, [authUserId, clientId, enabled, nonce]);
  return data;
}

/** The group's one line: "{n} check-ins · last {date}", or the flag first. */
export function checkInsSummary(c: CheckIns | null | undefined): string {
  if (c === undefined) return "Loading…";
  if (c === null) return "Couldn't load";
  if (!c.responses.length) return "No check-ins yet";
  const last = c.responses[0];
  return `${last.safetyFlag ? "Flagged · " : ""}${c.responses.length} check-in${c.responses.length === 1 ? "" : "s"} · last ${fmtDay(last.submittedAt)}`;
}

type Span = "6W" | "3M" | "All";

/**
 * Release 3 · CL11 Progress › check-in answers over time (gen/r18.js
 * checkCharts18), inside the client page's Check-ins group: a chart per
 * number or scale question across the client's check-ins (cc16: the
 * question, 6W / 3M / All, W1… labels, the pin tooltip "Week {n}"), the
 * photos line ("{n} sets · {date}"), and the check-ins themselves (open HO20).
 * The newest flagged check-in shows the safety banner (FINAL_PLAN 3 §6.2).
 * Decision 6: answers sent in a check-in are read for that check-in only;
 * nothing here reads health_metrics.
 */
export const CheckInsProgress: React.FC<{ data: CheckIns | null | undefined; firstName: string; onRetry: () => void }> = ({ data, firstName, onRetry }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const [span, setSpan] = useState<Span>("6W");
  const allQuestions = useMemo(() => (data ? Object.values(data.questions).flat() : []), [data]);
  const shown = useMemo(() => {
    if (!data) return [];
    const n = span === "6W" ? 6 : span === "3M" ? 13 : data.responses.length;
    return data.responses.slice(0, n);
  }, [data, span]);
  const series = useMemo(() => seriesOverTime(allQuestions, shown), [allQuestions, shown]);

  if (data === undefined) return <ProCardSkeleton lines={3} />;
  if (data === null) return <ProError onRetry={onRetry} />;
  if (!data.responses.length) return <p style={{ fontSize: textPx(12), color: INK.chF }}>{`${firstName} hasn't sent a check-in yet.`}</p>;

  const latest = data.responses[0];
  const withPhotos = data.responses.filter((r) => photoAnswers(data.questions[r.formId] ?? [], r).length > 0);
  const total = data.responses.length;
  const offset = total - shown.length;
  const colours = [dark ? "#C3B3FB" : "#5F5093", INK.tealDark, INK.gold];

  return (
    <div>
      {latest.safetyFlag && <SafetyBanner topics={latest.safetyTopics} firstName={firstName} />}
      {total < 2 && <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 10 }}>Charts start after the second check-in.</p>}
      {(total < 2 ? [] : series.slice(0, 3)).map((s, si) => {
        const vals = s.points.map((p) => p.value);
        const nums = vals.filter((v): v is number => v != null);
        const lo = s.max != null ? 0 : Math.floor(Math.min(...nums) - 1);
        const hi = s.max != null ? s.max : Math.ceil(Math.max(...nums) + 1);
        return (
          <div key={s.key} style={{ marginBottom: 12 }}>
            <ProChart
              flat
              title={s.label}
              question={`How is ${firstName} answering week to week?`}
              questionIcon
              right={si === 0 ? <RangeTrack label="Check-ins range" items={["6W", "3M", "All"] as const} value={span} onChange={setSpan} /> : undefined}
              x={s.points.map((_, i) => `W${offset + i + 1}`)}
              min={lo}
              max={hi}
              series={[{ key: s.key, label: s.label, type: "line", color: colours[si % 3], values: vals, noLegend: true }]}
              tooltip={(i) => (vals[i] == null ? null : { title: `Week ${offset + i + 1}`, lines: [`${vals[i]}${s.unit.startsWith("/") ? s.unit : s.unit ? ` ${s.unit}` : ""}`, fmtDay(s.points[i].at)] })}
              summary={`${s.label}: ${nums.join(", ")}.`}
              scrubHint="Drag sideways to scrub, tap a point to pin it"
            />
          </div>
        );
      })}
      <ListCard
        rows={[
          ...(withPhotos.length
            ? [{ key: "photos", icon: ImageIcon, title: "Progress photos", meta: `${withPhotos.length} set${withPhotos.length === 1 ? "" : "s"} · ${fmtDay(withPhotos[0].submittedAt)}`, onClick: () => navigate(`${FORMS_PATH}/responses/${withPhotos[0].id}`) }]
            : []),
          ...data.responses.slice(0, 6).map((r) => ({
            key: r.id,
            icon: ClipboardCheck,
            tone: r.safetyFlag ? ("att" as const) : undefined,
            title: r.formTitle,
            meta: `${fmtDay(r.submittedAt)} · ${r.safetyFlag ? "Flagged · " : ""}${r.reviewedAt ? "Reviewed" : "To review"}`,
            onClick: () => navigate(`${FORMS_PATH}/responses/${r.id}`),
          })),
        ]}
      />
    </div>
  );
};
