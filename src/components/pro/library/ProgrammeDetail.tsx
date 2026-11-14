import React, { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Check, Ellipsis, UserPlus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import type { WorkoutTemplate } from "../../../types";
import { BlockCard } from "../../workout/BlockCard";
import { UnverifiedProgramNotice } from "../../workout/UnverifiedProgramNotice";
import { groupIntoRuns } from "../../../services/workout/blocks";
import { prescriptionLine } from "../../../services/workout/prescription";
import { formatDuration } from "../../../services/workout";
// Batch D GH: a set over the ceilings (an old row) adds nothing to a session's volume.
import { plausibleVolumeKg } from "../../../services/workout/setLimits";
import { fetchProgrammeSessions, type ProgrammeSession } from "../../../services/pro/library";
import { PinnedCta } from "../../ui/PinnedCta";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar, RoundBtn, SectionHead } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { LockLine } from "../LockLine";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { DetailHeader, ErrorLine } from "./libraryUi";
import { currentWeek, isActive } from "./libraryModel";
import { todayLocal } from "../../../utils/date";
import { reviewStateText } from "../../../services/workout/logReplyLogic";
import { useReviewStates } from "./useReviewStates";
import { appLocale } from "../../../i18n/format";
import { t, tn } from "../../../i18n/core";
import { useIsWeb, useWebLayout } from "../../web/useWebLayout";
import { Lock } from "lucide-react";
import { blockHeading } from "../../../services/workout/prescription";
import { BLOCK_LINE } from "../web/programmeSpec";
import { BlockBandWeb, CapsHeadWeb, EmptyPanelWeb, InitialsWeb, ProgBodyWeb, ProgHeaderWeb, SpecCardWeb } from "../web/ProgrammeWeb";

/** One date, or "{from} to {to}". */
const dateSpan = (d: string[]) => (d.length > 1 ? t("{from} to {to}", { from: d[0], to: d[1] }) : d[0] ?? "");

/**
 * Release 3 · W5 TR2 "Programme builder", as far as the schema goes.
 *
 * workout_templates stores ONE workout (its exercise list and blocks) and a
 * length in weeks; there is no week-by-day schedule to draw Week 1 … Week n
 * tabs or Mon to Sun rows from (a backend gap, reported). So the screen shows
 * the header (Assign, ⋮), "Template · {n} weeks · used by {n} clients", the
 * workout card with every prescription (blocks drawn by BlockCard, as the old
 * expanded template did), the note to the client, and then — kept from the
 * old builder's expanded card — who it's assigned to with their real
 * sessions. Each client's activity has the old four states: not sharing
 * Workout activity (LockLine), loading, none, sessions; a session opens the
 * client's workout log (TR22), a client opens their copy (TR6), Progress
 * opens TR7. Ended assignments are Past programmes.
 */
export const ProgrammeDetail: React.FC<{
  template: WorkoutTemplate;
  onBack: () => void;
  onAssign: () => void;
  onMenu: (anchor: HTMLElement) => void;
  onProgress: () => void;
  onOpenCopy: (assignmentId: string) => void;
  onOpenLog: (sessionId: string) => void;
}> = ({ template, onBack, onAssign, onMenu, onProgress, onOpenCopy, onOpenLog }) => {
  const { templateAssignments, professionalClients, endTemplateAssignment } = useApp();
  const [sessions, setSessions] = useState<ProgrammeSession[] | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [reload, setReload] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState<string | null>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  // Round D · TR22: each session's reviewed mark and reply count.
  const reviewStates = useReviewStates(sessions?.map((s) => s.id) ?? []);
  const web = useIsWeb();
  const { rail } = useWebLayout();

  const assignments = templateAssignments.filter((a) => a.templateId === template.id);
  const active = assignments.filter(isActive);
  const past = assignments.filter((a) => !isActive(a));
  const routineIds = useMemo(() => assignments.map((a) => a.routineId).filter((x): x is string => !!x), [assignments]);
  const routineKey = routineIds.join(",");

  // Fetched when the programme opens, not on the list (a roster of forty and
  // thirty templates would otherwise pull every session nobody opened).
  useEffect(() => {
    let cancelled = false;
    if (routineIds.length === 0) {
      setSessions([]);
      setState("ok");
      return;
    }
    setState((s) => (s === "ok" ? s : "loading"));
    void fetchProgrammeSessions(routineIds).then((r) => {
      if (cancelled) return;
      // A FAILED READ IS NOT AN EMPTY ONE: keep what was shown and say so.
      if (!r.ok) {
        setState(r.offline && sessions ? "offline" : "error");
        return;
      }
      setSessions(r.data);
      setState("ok");
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineKey, reload]);

  const clientOf = (clientId: string) => professionalClients.find((c) => c.clientId === clientId);
  const meta = [t("Template"), template.durationWeeks ? tn(template.durationWeeks, "{n} week", "{n} weeks") : null, tn(active.length, "used by {n} client", "used by {n} clients")].filter(Boolean).join(" · ");
  const runs = groupIntoRuns(template.exercises, template.blocks ?? []);
  const today = todayLocal();

  const activity = (clientId: string, routineId: string | null) => {
    const c = clientOf(clientId);
    if (!c) return null;
    if (!c.access.workoutActivity) return <LockLine what={t("Workout activity")} clientFirstName={c.name.split(" ")[0]} />;
    if (state === "error" && !sessions) return <ProError onRetry={() => setReload((n) => n + 1)} />;
    if (!sessions) return <ProCardSkeleton lines={2} />;
    const mine = sessions.filter((s) => s.userId === clientId && s.routineId === routineId);
    if (mine.length === 0) return <p style={{ fontSize: textPx(11.5), color: INK.chF }}>{t("No sessions logged yet.")}</p>;
    return (
      <div>
        {mine.slice(0, 3).map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpenLog(s.id)}
            className="tap w-full text-start"
            style={{ padding: "8px 0", minHeight: 44, borderTop: `1px solid ${INK.b06}` }}
          >
            <span className="block" style={{ fontSize: textPx(12.5), fontWeight: 600, color: INK.ch }}>
              {fmtDay(s.date)} · {formatDuration(s.durationSec)} · {t("{n} kg", { n: Math.round(plausibleVolumeKg(s)).toLocaleString(appLocale()) })}
            </span>
            <span className="block truncate" style={{ fontSize: textPx(11.5), color: INK.chF }}>
              {s.exercises.map((e) => e.name).join(", ")}
            </span>
            {reviewStateText(reviewStates[s.id]) && (
              <span className="flex items-center" style={{ gap: 4, fontSize: textPx(11.5), fontWeight: 600, color: reviewStates[s.id]?.reviewedAt ? INK.good : INK.chS }}>
                {reviewStates[s.id]?.reviewedAt && <Check size={12} aria-hidden />}
                {reviewStateText(reviewStates[s.id])}
              </span>
            )}
          </button>
        ))}
        {mine.length > 3 && <p style={{ fontSize: textPx(11), color: INK.chF }}>{tn(mine.length - 3, "{n} earlier session not shown.", "{n} earlier sessions not shown.")}</p>}
      </div>
    );
  };


  // Website viewport (WP-LI.3, WP-LI Programme Web v5 "detail"): the web header (back, the name, the meta
  // line beside it, Assign to clients, ⋮) and two columns under it: the workout card 7 (5 on the rail) with
  // the name band and the spec-strip cards, the assigned clients 5 (3). Mobile below is unchanged.
  if (web) {
    const empty = active.length === 0;
    let n = 0;
    const endLabel = (a: (typeof active)[number]) => (confirmEnd === a.id ? t("Click again to confirm") : a.startsOn && a.startsOn > today ? t("Remove") : t("End programme"));
    const end = (id: string) => {
      if (confirmEnd !== id) {
        setConfirmEnd(id);
        return;
      }
      setConfirmEnd(null);
      void endTemplateAssignment(id).then((m) => setActionError(m ?? null));
    };
    const webActivity = (clientId: string, routineId: string | null) => {
      const c = clientOf(clientId);
      if (!c) return null;
      if (!c.access.workoutActivity)
        return (
          <div className="flex items-start" style={{ gap: 10, borderRadius: 14, background: "#F5F5F6", padding: "10px 14px" }}>
            <Lock size={16} strokeWidth={2} aria-hidden className="shrink-0" style={{ marginTop: 2, color: "#71685E" }} />
            <p className="flex-1 min-w-0" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
              {t("Workout activity not shared, so hidden. {name} can change this any time.", { name: c.name.split(" ")[0] })}
            </p>
          </div>
        );
      if (state === "error" && !sessions) return <ProError onRetry={() => setReload((x) => x + 1)} />;
      if (!sessions) return <ProCardSkeleton lines={2} />;
      const mine = sessions.filter((s) => s.userId === clientId && s.routineId === routineId);
      if (mine.length === 0) return <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("No sessions logged yet.")}</p>;
      return (
        <div className="flex flex-col">
          {mine.slice(0, 3).map((s) => (
            <button key={s.id} type="button" onClick={() => onOpenLog(s.id)} className="flex items-center text-start hover:bg-[#F5F5F6]" style={{ minHeight: 44, gap: 12, borderTop: "1px solid rgba(36,31,27,0.06)" }}>
              <span className="whitespace-nowrap shrink-0" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                {fmtDay(s.date)} · {formatDuration(s.durationSec)} · {t("{n} kg", { n: Math.round(plausibleVolumeKg(s)).toLocaleString(appLocale()) })}
              </span>
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                {reviewStateText(reviewStates[s.id]) ? `${reviewStateText(reviewStates[s.id])} · ` : ""}
                {s.exercises.map((e) => e.name).join(", ")}
              </span>
            </button>
          ))}
          {mine.length > 3 && <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{tn(mine.length - 3, "{n} earlier session not shown.", "{n} earlier sessions not shown.")}</p>}
        </div>
      );
    };
    const cardGap = !rail && empty ? 16 : 10;
    return (
      <div>
        <ProgHeaderWeb
          title={template.name}
          meta={meta}
          onBack={onBack}
          cta={!template.isPublic && !empty ? { label: t("Assign to clients"), icon: UserPlus, onClick: onAssign } : undefined}
          onMore={onMenu}
        />
        <ProgBodyWeb>
          <UnverifiedProgramNotice isVerified={template.isVerified} isPublic={template.isPublic} className="mb-3" />
          {actionError && <ErrorLine>{actionError}</ErrorLine>}
          <div className="grid" style={{ gridTemplateColumns: `repeat(${rail ? 8 : 12},minmax(0,1fr))`, gap: 24, alignItems: "start" }}>
            <section aria-label={t("Workout")} className="flex flex-col min-w-0" style={{ gridColumn: `span ${rail ? 5 : 7}`, boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 20, padding: 24 }}>
              <div style={{ borderRadius: 12, background: "rgba(125,107,181,0.11)", padding: "16px 20px", marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 22, lineHeight: "30px", fontWeight: 700, letterSpacing: "-0.01em", color: "#241F1B", overflowWrap: "anywhere" }}>{template.name}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                  {[tn(template.exercises.length, "{n} exercise", "{n} exercises"), template.durationMin ? tn(template.durationMin, "{n} min", "{n} min") : null].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex flex-col" style={{ gap: cardGap }}>
                {runs.map((run) =>
                  run.block ? (
                    <BlockBandWeb key={run.block.id} heading={blockHeading(run.block, run.ordinal)} line={t(BLOCK_LINE[run.block.kind])} gap={cardGap}>
                      {run.members.map((ex) => (
                        <SpecCardWeb key={ex.id} ex={ex} n={++n} />
                      ))}
                    </BlockBandWeb>
                  ) : (
                    run.members.map((ex) => <SpecCardWeb key={ex.id} ex={ex} n={++n} />)
                  )
                )}
              </div>
              {template.coachNote && (
                <p style={{ margin: "12px 0 0", borderRadius: 14, fontSize: 15, lineHeight: "24px", color: "#5F5093", background: "#F0EDF9", padding: "14px 18px", textWrap: "pretty" }}>
                  {t("Note to client: {note}", { note: template.coachNote })}
                </p>
              )}
            </section>

            {!template.isPublic && (
              <section aria-label={t("Assigned to clients")} className="flex flex-col min-w-0" style={{ gridColumn: `span ${rail ? 3 : 5}` }}>
                <CapsHeadWeb label={t("Assigned to clients")} right={empty ? undefined : t("Progress")} onRight={empty ? undefined : onProgress} />
                {state === "offline" && <OfflineLine />}
                {empty ? (
                  <EmptyPanelWeb line={t("Not assigned to anyone yet.")} action={{ label: t("Assign to clients"), icon: UserPlus, onClick: onAssign }} minHeight={rail ? 420 : 560} />
                ) : (
                  <div className="flex flex-col" style={{ gap: 16 }}>
                    {active.map((a) => {
                      const c = clientOf(a.clientId);
                      const week = currentWeek(a.startsOn, a.joinWeek, template.durationWeeks, today);
                      const line = [week ? (week.of ? t("Week {n} of {of}", { n: week.n, of: week.of }) : t("Week {n}", { n: week.n })) : a.startsOn && a.startsOn > today ? t("Starts {date}", { date: fmtDay(a.startsOn) }) : null, a.endsOn ? t("ends {date}", { date: fmtDay(a.endsOn) }) : null]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <div key={a.id} className="flex flex-col" style={{ boxSizing: "border-box", background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", borderRadius: 20, padding: "16px 20px" }}>
                          <div className="flex items-center" style={{ gap: 12 }}>
                            <button type="button" onClick={() => onOpenCopy(a.id)} className="flex-1 min-w-0 flex items-center text-start hover:opacity-80" style={{ gap: 12 }}>
                              <InitialsWeb name={c?.name ?? ""} url={c?.avatarUrl} />
                              <span className="flex-1 min-w-0">
                                <span className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{c?.name ?? t("A client")}</span>
                                {line && <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{line}</span>}
                              </span>
                            </button>
                            <button type="button" onClick={() => end(a.id)} className="shrink-0 hover:text-[#C0392B]" style={{ padding: "8px 0", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: confirmEnd === a.id ? "#C0392B" : "#5B5349" }}>
                              {endLabel(a)}
                            </button>
                          </div>
                          <div style={{ marginTop: 8 }}>{webActivity(a.clientId, a.routineId)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {past.length > 0 && (
                  <>
                    <CapsHeadWeb label={t("Past programmes")} first={false} />
                    {past.map((a) => {
                      const c = clientOf(a.clientId);
                      return (
                        <div key={a.id} className="flex items-center" style={{ gap: 12, padding: "8px 0" }}>
                          <InitialsWeb name={c?.name ?? ""} url={c?.avatarUrl} size={36} />
                          <span className="flex-1 min-w-0 flex flex-wrap items-baseline justify-between" style={{ columnGap: 12 }}>
                            <span style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>{c?.name ?? t("A client")}</span>
                            <span style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                              {dateSpan([...new Set([a.startsOn ? fmtDay(a.startsOn, true) : null, a.endsOn ? fmtDay(a.endsOn, true) : null].filter((d): d is string => !!d))])}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            )}
          </div>
        </ProgBodyWeb>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 96 }}>
      <DetailHeader
        title={template.name}
        onBack={onBack}
        right={
          <div className="flex shrink-0" style={{ gap: 8 }}>
            {!template.isPublic && <RoundBtn icon={UserPlus} label={t("Assign to clients")} onClick={onAssign} />}
            <RoundBtn ref={moreRef} icon={Ellipsis} label={t("More")} onClick={() => moreRef.current && onMenu(moreRef.current)} />
          </div>
        }
      />
      <p style={{ fontSize: textPx(12), color: INK.chF, margin: "-6px 0 12px" }}>{meta}</p>
      <UnverifiedProgramNotice isVerified={template.isVerified} isPublic={template.isPublic} className="mb-3" />
      {actionError && <ErrorLine>{actionError}</ErrorLine>}

      <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderInlineStart: `4px solid ${INK.pr}`, borderRadius: 18, padding: "14px 16px", marginBottom: 12 }}>
        <p style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch }}>{template.name}</p>
        <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 6 }}>
          {[tn(template.exercises.length, "{n} exercise", "{n} exercises"), template.durationMin ? tn(template.durationMin, "{n} min", "{n} min") : null].filter(Boolean).join(" · ")}
        </p>
        {runs.map((run) =>
          run.block ? (
            <div key={run.block.id} style={{ margin: "4px -12px" }}>
              <BlockCard block={run.block} ordinal={run.ordinal} members={run.members} />
            </div>
          ) : (
            run.members.map((ex) => {
              const line = prescriptionLine(ex);
              return (
                <p key={ex.id} className="flex" style={{ gap: 8, fontSize: textPx(13), color: INK.chS, padding: "2px 0" }}>
                  <span aria-hidden style={{ color: INK.chT }}>•</span>
                  <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>
                    {ex.name}
                    {line ? ` ${line}` : ""}
                  </span>
                </p>
              );
            })
          )
        )}
      </div>

      {template.coachNote && (
        <p className="rounded-xl" style={{ fontSize: textPx(12), color: INK.prDeep, background: INK.prPale, padding: "8px 12px", marginBottom: 12 }}>
          {t("Note to client: {note}", { note: template.coachNote })}
        </p>
      )}

      {!template.isPublic && (
        <>
          <SectionHead label={t("Assigned to clients")} right={active.length ? t("Progress") : undefined} onRight={active.length ? onProgress : undefined} />
          {state === "offline" && <OfflineLine />}
          {active.length === 0 && <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>{t("Not assigned to anyone yet.")}</p>}
          {active.map((a) => {
            const c = clientOf(a.clientId);
            const week = currentWeek(a.startsOn, a.joinWeek, template.durationWeeks, today);
            const line = [week ? (week.of ? t("Week {n} of {of}", { n: week.n, of: week.of }) : t("Week {n}", { n: week.n })) : a.startsOn && a.startsOn > today ? t("Starts {date}", { date: fmtDay(a.startsOn) }) : null, a.endsOn ? t("ends {date}", { date: fmtDay(a.endsOn) }) : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <div key={a.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "12px 14px", marginBottom: 8 }}>
                <button type="button" onClick={() => onOpenCopy(a.id)} className="tap w-full flex items-center text-start" style={{ gap: 12, minHeight: 44 }}>
                  <Avatar name={c?.name ?? ""} url={c?.avatarUrl} size={34} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>
                      {c?.name ?? t("A client")}
                    </span>
                    {line && <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>{line}</span>}
                  </span>
                </button>
                <div style={{ marginTop: 6 }}>{activity(a.clientId, a.routineId)}</div>
                <div className="flex justify-end" style={{ marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmEnd !== a.id) {
                        setConfirmEnd(a.id);
                        return;
                      }
                      setConfirmEnd(null);
                      // Remove (not started yet) and End are one call: end_template_assignment
                      // works before the start date and takes the sessions after today off
                      // the client's calendar (follow-up 20261124160000). The row then
                      // shows under Past programmes; the client keeps their routine.
                      void endTemplateAssignment(a.id).then((m) => setActionError(m ?? null));
                    }}
                    className="tap"
                    style={{ minHeight: 44, fontSize: textPx(12), fontWeight: 700, color: confirmEnd === a.id ? INK.hi : INK.chS }}
                  >
                    {confirmEnd === a.id ? t("Tap again to confirm") : a.startsOn && a.startsOn > today ? t("Remove") : t("End programme")}
                  </button>
                </div>
              </div>
            );
          })}

          {past.length > 0 && (
            <>
              <SectionHead label={t("Past programmes")} className="mt-4" />
              {past.map((a) => {
                const c = clientOf(a.clientId);
                return (
                  <div key={a.id} className="flex items-center" style={{ gap: 12, padding: "8px 0", borderBottom: `1px solid ${INK.b06}` }}>
                    <Avatar name={c?.name ?? ""} url={c?.avatarUrl} size={30} />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
                        {c?.name ?? t("A client")}
                      </span>
                      <span className="block" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                        {/* Removed before its start: starts_on = ends_on, one date. */}
                        {dateSpan([...new Set([a.startsOn ? fmtDay(a.startsOn, true) : null, a.endsOn ? fmtDay(a.endsOn, true) : null].filter((d): d is string => !!d))])}
                      </span>
                    </span>
                  </div>
                );
              })}
            </>
          )}

          {active.length > 0 && (
            <button type="button" onClick={onProgress} className="tap flex items-center mt-3" style={{ gap: 6, minHeight: 44, fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
              <BarChart3 size={15} aria-hidden /> {t("Progress")}
            </button>
          )}

          <PinnedCta primary={{ label: t("Assign to clients"), icon: <UserPlus size={15} />, onClick: onAssign }} />
        </>
      )}
    </div>
  );
};

