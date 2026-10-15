import React from "react";
import { ChevronRight, RefreshCw, X } from "lucide-react";
import type { Routine } from "../../types";
import { FolderHeader } from "../../components/folders/FolderParts";
import { CoachAvatar } from "../../components/workout/CoachAvatar";
import { COACH_FOLDER_COLORS, coachColor, coachTone } from "./coachColors";
import { FOLDER_FAMILIES, type FolderFamily } from "../../data/folderColors";
import { pastProgrammesLine } from "../../services/routines/programmeLogic";
import { textPx } from "../../theme/textSize";
import type { CoachProgrammes } from "./useCoachProgrammes";

/**
 * Release 3 · W7 (CU1 v4) · "From your coach", above Folders.
 *
 * A SEPARATE SECTION, NOT A FOLDER (decision 7): the client's folders,
 * Unfiled, drag and ⋮ menus stay exactly as they are; a programme's routine
 * is listed here instead of in Unfiled while the programme runs. Per coach:
 * the header (avatar, first name, role, Updated badge), then each programme
 * as a FolderHeader ("Week 3 of 8 · 1 routine", no grip) over its routine
 * row ("Week 3, day 2 • …", TODAY, no grip, ⋮ = Save a copy). Two coaches:
 * 14 apart, teal then gold avatars, sky then clay folders. After them, the
 * Past programmes row. No programme and no history: nothing at all (the
 * client screen is unchanged).
 */
export const CoachSection: React.FC<{
  coach: CoachProgrammes;
  dark: boolean;
  capsInk: string;
  shade: (f: FolderFamily) => FolderFamily;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  seen: Record<string, string>;
  onSeen: (a: { id: string; assignedAt: string }) => void;
  onMenu: (routineId: string, anchor: HTMLElement) => void;
  onPast: () => void;
  renderRow: (r: Routine, family: FolderFamily, meta: string, today: boolean) => React.ReactNode;
}> = ({ coach, dark, capsInk, shade, collapsed, onToggle, seen, onSeen, onMenu, onPast, renderRow }) => {
  const { status, groups, past, coaches, provisional } = coach;
  // Nothing from a coach, now or before: the section does not exist.
  if (status === "ok" && groups.length === 0 && past.length === 0) return null;
  if (status !== "ok" && provisional.length === 0) return null;

  // The Folders label's style (9.5/700, .2em caps, #9A94B3).
  const label = (
    <p className="mb-2.5 text-[9.5px] leading-[14.3px] font-bold tracking-[1.9px] uppercase" style={{ color: capsInk }}>
      From your coach
    </p>
  );

  // Loading (a coach's routine is known, its programme not read yet): the
  // list's own skeleton (WO1 O1 shade and radius), so nothing jumps after.
  if (status === "loading") {
    return (
      <section aria-label="From your coach" aria-busy style={{ marginBottom: 22 }}>
        {label}
        <div aria-hidden className="flex flex-col" style={{ gap: 6 }}>
          {[54, 54].map((h, i) => (
            <div key={i} className="animate-skeleton-pulse bg-cream-soft" style={{ height: h, borderRadius: 14 }} />
          ))}
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section aria-label="From your coach" style={{ marginBottom: 22 }}>
        {label}
        <div role="alert" className="flex items-center justify-between" style={{ gap: 12, padding: "12px 14px", borderRadius: 14, background: coachColor("soft", dark) }}>
          <p style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
            {coach.message ?? "Couldn't load your coach's programmes."}
          </p>
          <button
            type="button"
            onClick={coach.retry}
            className="tap relative shrink-0 before:absolute before:-inset-[12px] before:content-['']"
            style={{ fontSize: textPx(12), fontWeight: 700, color: dark ? "#C3B3FB" : "rgb(var(--thi-7d6bb5))" }}
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const isUnseen = (p: { updated: boolean; assignment: { id: string; assignedAt: string } }) =>
    p.updated && seen[p.assignment.id] !== p.assignment.assignedAt;
  // The Updated banner: the most recently re-assigned programme not yet closed.
  const updated = groups
    .flatMap((g) => g.programmes.map((p) => ({ p, pro: g.professionalId })))
    .filter(({ p }) => isUnseen(p))
    .sort((a, b) => b.p.assignment.assignedAt.localeCompare(a.p.assignment.assignedAt))[0];
  const nameOf = (pro: string) => coaches[pro]?.name ?? "Your coach";

  return (
    <section aria-label="From your coach" style={{ marginBottom: 22 }}>
      {updated && (
        <div role="status" className="flex items-start" style={{ gap: 10, borderRadius: 14, background: coachColor("pale", dark), padding: "10px 12px", marginBottom: 12 }}>
          <RefreshCw size={15} strokeWidth={2.2} className="shrink-0" style={{ color: coachColor("deep", dark), marginTop: 2 }} aria-hidden />
          <span className="flex-1 min-w-0" style={{ fontSize: textPx(12.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal))" }}>
            <b>Updated by your coach</b> · {nameOf(updated.pro)} updated {updated.p.name}.
          </span>
          <button
            type="button"
            onClick={() => onSeen(updated.p.assignment)}
            aria-label="Close"
            className="tap relative shrink-0 flex before:absolute before:-inset-[15px] before:content-['']"
            style={{ color: coachColor("faint", dark), marginTop: 2 }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      )}
      {label}
      {groups.map((g, gi) => {
        const info = coaches[g.professionalId];
        const name = info?.name ?? "Your coach";
        return (
          <div key={g.professionalId || gi} style={{ marginTop: gi > 0 ? 14 : 0 }}>
            <div className="flex items-center" style={{ gap: 10, marginBottom: 10 }}>
              <CoachAvatar name={name} avatarUrl={info?.avatarUrl} size={32} tone={coachTone(gi)} />
              <span className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontSize: textPx(13.5), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
                  {name}
                </span>
                {info?.role && (
                  <span className="block truncate" style={{ fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
                    {info.role}
                  </span>
                )}
              </span>
              {g.programmes.some(isUnseen) && (
                <span
                  className="inline-flex items-center shrink-0 whitespace-nowrap"
                  style={{ gap: 4, fontSize: textPx(11), fontWeight: 700, color: coachColor("deep", dark), background: coachColor("pale", dark), borderRadius: 8, padding: "3px 8px" }}
                >
                  <RefreshCw size={11} strokeWidth={2.4} aria-hidden /> Updated
                </span>
              )}
            </div>
            <div className="flex flex-col" style={{ gap: 14 }}>
              {g.programmes.map((p) => {
                // A routine coloured by the client keeps its colour; else the coach's.
                const own = p.routine.color && p.routine.color !== "#7D6BB5" ? FOLDER_FAMILIES[p.routine.color] : undefined;
                const family = shade(own ?? FOLDER_FAMILIES[COACH_FOLDER_COLORS[gi % COACH_FOLDER_COLORS.length]]);
                const isCollapsed = collapsed.has(p.assignment.id);
                return (
                  <div key={p.assignment.id} className="flex flex-col gap-1.5">
                    <FolderHeader
                      folder={{ id: p.assignment.id, name: p.name }}
                      family={family}
                      drawnInk
                      themed
                      count={1}
                      countText={p.countLine}
                      noGrip
                      collapsed={isCollapsed}
                      onToggle={() => onToggle(p.assignment.id)}
                      onMenu={(anchor) => onMenu(p.routine.id, anchor)}
                    />
                    {!isCollapsed && renderRow(p.routine, family, p.meta, p.today)}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {past.length > 0 && (
        <button
          type="button"
          onClick={onPast}
          className="tap w-full flex items-center justify-between text-left"
          style={{ gap: 10, padding: "12px 14px", borderRadius: 14, background: coachColor("soft", dark), marginTop: groups.length ? 6 : 0 }}
        >
          <span className="min-w-0">
            <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
              Past programmes · {past.length}
            </span>
            <span className="block truncate" style={{ fontSize: textPx(11.5), color: coachColor("faint", dark) }}>
              {pastProgrammesLine(past.slice(0, 2))}
            </span>
          </span>
          <ChevronRight size={15} strokeWidth={2} className="shrink-0" style={{ color: coachColor("faint", dark) }} aria-hidden />
        </button>
      )}
    </section>
  );
};
