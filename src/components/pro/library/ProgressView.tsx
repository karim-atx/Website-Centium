import React, { useEffect, useState } from "react";
import { Lock, TrendingDown, TrendingUp } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { WorkoutTemplate } from "../../../types";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { fetchAdherence, fetchProgrammeSessions, type ProgrammeSession } from "../../../services/pro/library";
import { todayLocal } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { useIsDark } from "../../../hooks/useIsDark";
import { INK } from "../proInk";
import { Avatar, ListCard, SectionHead } from "../client/kit";
import { EmptyState } from "../EmptyState";
import { ProCardSkeleton, ProError } from "../states";
import { DetailHeader } from "./libraryUi";
import { currentWeek, deltaKg, fmtKg, isActive, programmeWeeks, topLift, weekCell, type WeekCell } from "./libraryModel";
import { t, tk } from "../../../i18n/core";
import { useIsWeb } from "../../web/useWebLayout";
import { ClientTabsWeb } from "../web/ClientPageWeb";
import { CapsHeadWeb, EmptyPanelWeb, InitialsWeb, ProgBodyWeb, ProgHeaderWeb } from "../web/ProgrammeWeb";

/**
 * Release 3 · W5 TR7 "Progress per client" for one programme.
 *
 * By client: one row per active client, one cell per programme week (W1 …),
 * from client_adherence over that week's 7 days (planned vs completed
 * workouts, counted only when the client shares Workout activity): All done,
 * Partly done, Not yet. By workout: the template is one workout, so one row:
 * all clients done, some, none. Top lifts this block: each client's biggest
 * change in top working weight between their first and latest session of
 * this programme (workout_sessions). No length set: the weeks run to today.
 */
export const ProgressView: React.FC<{ template: WorkoutTemplate; onBack: () => void }> = ({ template, onBack }) => {
  const { templateAssignments, professionalClients } = useApp();
  const dark = useIsDark();
  const [tab, setTab] = useState<"client" | "workout">("client");
  const [cells, setCells] = useState<Record<string, WeekCell[]> | null>(null);
  const [sessions, setSessions] = useState<ProgrammeSession[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const today = todayLocal();
  const web = useIsWeb();

  const active = templateAssignments.filter((a) => a.templateId === template.id && isActive(a) && a.startsOn);
  const length =
    template.durationWeeks ??
    Math.max(1, ...active.map((a) => currentWeek(a.startsOn, a.joinWeek, null, today)?.n ?? 1));
  const key = active.map((a) => a.id).join(",");

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const shared = active.filter((a) => professionalClients.find((c) => c.clientId === a.clientId)?.access.workoutActivity);
    void Promise.all([
      Promise.all(
        shared.map(async (a) => {
          const weeks = programmeWeeks(a, length);
          const row = await Promise.all(
            weeks.map(async (w) => {
              if (w.from > today) return { ok: true as const, cell: "future" as WeekCell };
              const r = await fetchAdherence(a.clientId, 7, w.until < today ? w.until : today);
              if (!r.ok) return { ok: false as const };
              return { ok: true as const, cell: weekCell(r.data?.planned ?? null, r.data?.completed ?? null, false) };
            })
          );
          // Weeks before the client's join week are not theirs: drawn empty.
          const lead: WeekCell[] = Array.from({ length: (a.joinWeek ?? 1) - 1 }, () => "future");
          return [a.id, row.some((x) => !x.ok) ? null : [...lead, ...row.map((x) => (x.ok ? x.cell : "none"))]] as const;
        })
      ),
      fetchProgrammeSessions(active.map((a) => a.routineId).filter((x): x is string => !!x)),
    ]).then(([rows, s]) => {
      if (cancelled) return;
      if (rows.some(([, r]) => r === null) || !s.ok) {
        setFailed(true);
        return;
      }
      setCells(Object.fromEntries(rows as (readonly [string, WeekCell[]])[]));
      setSessions(s.data);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, length, reload]);

  const fill = (c: WeekCell) =>
    c === "all" ? INK.fill : c === "part" ? (dark ? "rgba(174,161,220,0.35)" : "#DDD7F2") : INK.soft;
  const label: Record<WeekCell, string> = { all: tk("All done"), part: tk("Partly done"), none: tk("Not yet"), future: tk("Not yet") };
  const weeksRow = Array.from({ length }, (_, i) => i + 1);

  const grid = (rows: { key: string; name: string; url?: string | null; cells: WeekCell[] | null }[]) => (
    <div className="scroll-row" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "12px 14px", marginBottom: 16 }}>
      <div style={{ minWidth: 100 + length * 30 }}>
        <div className="flex" style={{ gap: 4, paddingInlineStart: 96, paddingBottom: 8, borderBottom: `1px solid ${INK.b06}` }}>
          {weeksRow.map((w) => (
            <span key={w} className="flex-1 text-center" style={{ fontSize: textPx(10.5), color: INK.chF, minWidth: 26 }}>{t("W{n}", { n: w })}</span>
          ))}
        </div>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center" style={{ gap: 4, padding: "8px 0", borderBottom: `1px solid ${INK.b06}` }}>
            <span className="flex items-center shrink-0" style={{ width: 92, gap: 8 }}>
              <Avatar name={r.name} url={r.url} size={24} />
              <span className="truncate" style={{ fontSize: textPx(13), color: INK.ch }}>{r.name.split(" ")[0]}</span>
            </span>
            {r.cells === null ? (
              <span className="flex items-center flex-1" style={{ gap: 6, fontSize: textPx(11.5), color: INK.chF }}>
                <Lock size={12} aria-hidden /> {t("Not sharing workout activity.")}
              </span>
            ) : (
              weeksRow.map((w, i) => {
                const c = r.cells![i] ?? "future";
                return <span key={w} role="img" aria-label={t("Week {n}: {status}", { n: w, status: t(label[c]) })} className="flex-1" style={{ height: 24, borderRadius: 7, minWidth: 26, background: fill(c) }} />;
              })
            )}
          </div>
        ))}
        <div className="flex flex-wrap" style={{ gap: 14, paddingTop: 10 }}>
          {(["all", "part", "none"] as WeekCell[]).map((c) => (
            <span key={c} className="flex items-center" style={{ gap: 6, fontSize: textPx(11.5), color: INK.chF }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: fill(c) }} />
              {t(label[c])}
            </span>
          ))}
        </div>
      </div>
    </div>
  );

  const clientRows = active.map((a) => {
    const c = professionalClients.find((x) => x.clientId === a.clientId);
    return { key: a.id, name: c?.name ?? "", url: c?.avatarUrl, cells: c?.access.workoutActivity ? cells?.[a.id] ?? [] : null };
  });
  const sharedRows = clientRows.filter((r) => r.cells !== null);
  const workoutRow = {
    key: "w",
    name: template.name,
    cells: weeksRow.map((_, i): WeekCell => {
      const col = sharedRows.map((r) => r.cells![i]).filter((c) => c && c !== "future");
      if (!col.length) return "future";
      if (col.every((c) => c === "all")) return "all";
      return col.some((c) => c === "all" || c === "part") ? "part" : "none";
    }),
  };

  const lifts = (sessions ?? []).length
    ? active.flatMap((a) => {
        const c = professionalClients.find((x) => x.clientId === a.clientId);
        const l = topLift((sessions ?? []).filter((s) => s.userId === a.clientId && s.routineId === a.routineId));
        return c && l ? [{ a, c, l }] : [];
      })
    : [];

  // Website viewport (WP-LI.3.1, WP-LI Programme Web v5 "progress"): the web header (Progress above the name),
  // the equal tabs, the weeks card (names 224, cells 56 high r12, 8 apart, the legend) and Top lifts 2 across.
  if (web) {
    const webFill = (c: WeekCell) => (c === "all" ? "#9A8CD6" : c === "part" ? "#DDD7F2" : "#F5F5F6");
    const webGrid = (rows: { key: string; name: string; url?: string | null; cells: WeekCell[] | null; initials: boolean }[]) => (
      <section aria-label={t("Weeks")} style={{ boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 20, padding: "20px 24px", overflowX: "auto", overflowY: "hidden" }}>
        <div style={{ minWidth: 232 + length * 48 }}>
          <div className="flex" style={{ gap: 8, paddingInlineStart: 232, paddingBottom: 12, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
            {weeksRow.map((w) => (
              <span key={w} className="flex-1 text-center" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E" }}>{t("W{n}", { n: w })}</span>
            ))}
          </div>
          {rows.map((r) => (
            <div key={r.key} className="flex items-center" style={{ gap: 8, padding: "12px 0", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
              <span className="flex items-center shrink-0" style={{ width: 224, gap: 12 }}>
                {r.initials && <InitialsWeb name={r.name} url={r.url} />}
                <span className="truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{r.initials ? r.name.split(" ")[0] : r.name}</span>
              </span>
              {r.cells === null ? (
                <span className="flex items-center flex-1" style={{ gap: 8, height: 56, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>
                  <Lock size={16} strokeWidth={2} aria-hidden /> {t("Not sharing workout activity.")}
                </span>
              ) : (
                weeksRow.map((w, i) => {
                  const c = r.cells![i] ?? "future";
                  const aria = t("Week {n}: {status}", { n: w, status: t(label[c]) });
                  return <span key={w} role="img" aria-label={aria} title={aria} className="flex-1" style={{ height: 56, borderRadius: 12, background: webFill(c) }} />;
                })
              )}
            </div>
          ))}
          <div className="flex flex-wrap" style={{ gap: 24, paddingTop: 16 }}>
            {(["all", "part", "none"] as WeekCell[]).map((c) => (
              <span key={c} className="flex items-center whitespace-nowrap" style={{ gap: 8, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                <span aria-hidden style={{ width: 14, height: 14, borderRadius: 4, background: webFill(c) }} />
                {t(label[c])}
              </span>
            ))}
          </div>
        </div>
      </section>
    );
    return (
      <div>
        <ProgHeaderWeb title={template.name} eyebrow={t("Progress")} onBack={onBack} />
        <ProgBodyWeb>
          <ClientTabsWeb label={t("Progress")} items={[{ key: "client", label: t("By client") }, { key: "workout", label: t("By workout") }]} active={tab} onChange={(k) => setTab(k as "client" | "workout")} />
          {active.length === 0 && <EmptyPanelWeb line={t("Not assigned to anyone yet.")} />}
          {failed && <ProError onRetry={() => setReload((n) => n + 1)} />}
          {!failed && active.length > 0 && !cells && <ProCardSkeleton lines={4} />}
          {!failed && cells && (tab === "client" ? webGrid(clientRows.map((r) => ({ ...r, initials: true }))) : webGrid([{ ...workoutRow, initials: false }]))}
          {!failed && sessions && active.length > 0 && (
            <section aria-label={t("Top lifts this block")} style={{ marginTop: 24 }}>
              <CapsHeadWeb label={t("Top lifts this block")} />
              {lifts.length === 0 ? (
                <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{t("No sessions logged yet.")}</p>
              ) : (
                <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 24 }}>
                  {lifts.map(({ a, c, l }) => {
                    const up = l.lastKg >= l.firstKg;
                    const Trend = up ? TrendingUp : TrendingDown;
                    return (
                      <div key={a.id} className="flex items-center min-w-0" style={{ boxSizing: "border-box", gap: 24, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 20, padding: "24px 28px" }}>
                        <span className="flex items-center justify-center shrink-0" style={{ width: 64, height: 64, borderRadius: 18, background: "#F0EDF9" }}>
                          <Trend size={28} strokeWidth={1.75} aria-hidden style={{ color: "#7D67D9" }} />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block" style={{ fontSize: 22, lineHeight: "30px", fontWeight: 700, color: "#241F1B" }}>{`${c.name} · ${l.exercise}`}</span>
                          <span className="block" style={{ marginTop: 4, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>
                            {t("{from} to {to} kg x {reps}", { from: fmtKg(l.firstKg), to: fmtKg(l.lastKg), reps: l.reps })}
                          </span>
                        </span>
                        <span className="flex items-center shrink-0" style={{ gap: 8, fontSize: 40, lineHeight: "48px", fontWeight: 700, letterSpacing: "-0.02em", color: up ? "#1D744A" : "#C0392B" }}>
                          <Trend size={28} strokeWidth={2} aria-hidden />
                          {deltaKg(l)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </ProgBodyWeb>
      </div>
    );
  }

  return (
    <div>
      <DetailHeader title={template.name} eyebrow={t("Progress")} onBack={onBack} />
      <SegmentedTabs className="mb-3" items={[{ key: "client", label: t("By client") }, { key: "workout", label: t("By workout") }]} activeKey={tab} onChange={(k) => setTab(k as "client" | "workout")} />
      {active.length === 0 && <EmptyState icon={TrendingUp} title={t("Not assigned to anyone yet.")} />}
      {failed && <ProError onRetry={() => setReload((n) => n + 1)} />}
      {!failed && active.length > 0 && !cells && <ProCardSkeleton lines={4} />}
      {!failed && cells && (tab === "client" ? grid(clientRows) : grid([workoutRow]))}

      {!failed && sessions && active.length > 0 && (
        <>
          <SectionHead label={t("Top lifts this block")} />
          {lifts.length === 0 ? (
            <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{t("No sessions logged yet.")}</p>
          ) : (
            <ListCard
              rows={lifts.map(({ a, c, l }) => {
                const up = l.lastKg >= l.firstKg;
                return {
                  key: a.id,
                  icon: up ? TrendingUp : TrendingDown,
                  title: `${c.name} · ${l.exercise}`,
                  meta: t("{from} to {to} kg x {reps}", { from: fmtKg(l.firstKg), to: fmtKg(l.lastKg), reps: l.reps }),
                  trailing: (
                    <span className="flex items-center shrink-0" style={{ gap: 4, fontSize: textPx(13), fontWeight: 700, color: up ? INK.good : INK.hi }}>
                      {up ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}
                      {deltaKg(l)}
                    </span>
                  ),
                };
              })}
            />
          )}
        </>
      )}
    </div>
  );
};
