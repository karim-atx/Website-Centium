import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CalendarPlus, Check, ClockAlert, UserX } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { ProCardSkeleton } from "../states";
import { Chip, ListCard, NumBox, SectionHead, SoftLine, type ListRow } from "./kit";
import type { ClientPageData } from "./useClientPage";
import { fetchEventOutcomes } from "../../../services/pro/clientPage";
import { range12, time12 } from "../../../utils/time12";

/**
 * Release 3 · CL2 v3 Tab 4 Sessions / Tab 5 Appointments (source gen/r6b.js
 * cpTab6 'Sessions'): Completed, No-show and Late cancel boxes (numBox), then
 * Upcoming (the first "Next") and Past with the outcome chip (DB-4
 * calendar_events.outcome). Times through time12 ("10:00 to 11:00 AM").
 * The session pack card (r6b) is the pack batch's (W4 / W6); not drawn here
 * without its data. The professional's sessions with this client come from
 * their own calendar (fetchSessions, first invitee = this client).
 */
export const SessionsTab: React.FC<{ data: ClientPageData; patient: boolean; onSchedule: () => void }> = ({ data, patient, onSchedule }) => {
  const { sessions, today } = data;
  const [outcomes, setOutcomes] = useState<Record<string, string | null> | null>(null);
  const nowKey = `${today} ${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const upcoming = useMemo(() => (sessions ?? []).filter((s) => `${s.date} ${s.startTime}` >= nowKey), [sessions, nowKey]);
  const past = useMemo(() => (sessions ?? []).filter((s) => `${s.date} ${s.startTime}` < nowKey).reverse(), [sessions, nowKey]);
  const ids = past.map((s) => s.id).join(",");
  useEffect(() => {
    let live = true;
    void fetchEventOutcomes(ids ? [...new Set(ids.split(","))] : []).then((o) => live && setOutcomes(o));
    return () => {
      live = false;
    };
  }, [ids]);

  if (!sessions) return <ProCardSkeleton lines={4} height={220} />;
  const word = patient ? "appointment" : "session";
  const count = (o: string) => past.filter((s) => outcomes?.[s.id] === o).length;
  const when = (date: string, start?: string, end?: string) => {
    const d = date === today ? "Today" : new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `${d} ${end ? range12(start, end) : time12(start)}`;
  };
  const place = (s: { location?: string; url?: string }) => (s.location ? s.location : s.url ? "Online" : "");

  const upRows: ListRow[] = upcoming.slice(0, 5).map((s, i) => ({
    key: `${s.key}`,
    icon: CalendarDays,
    title: when(s.date, s.startTime, s.endTime),
    meta: [s.title, place(s)].filter(Boolean).join(" · "),
    trailing: i === 0 ? <Chip label="Next" tone="pr" /> : undefined,
  }));
  const pastRows: ListRow[] = past.slice(0, 10).map((s) => {
    const o = outcomes?.[s.id] ?? null;
    return {
      key: s.key,
      icon: o === "no_show" ? UserX : o === "late_cancel" ? ClockAlert : o === "completed" ? Check : CalendarDays,
      tone: o === "no_show" ? "att" : o === "late_cancel" ? "req" : o === "completed" ? "done" : undefined,
      title: when(s.date, s.startTime, s.endTime),
      meta: [s.title, place(s)].filter(Boolean).join(" · "),
      trailing: o === "completed" ? <Chip label="Completed" tone="done" /> : o === "no_show" ? <Chip label="No-show" tone="att" /> : o === "late_cancel" ? <Chip label="Late cancel" tone="req" /> : undefined,
    };
  });

  return (
    <>
      <div className="flex" style={{ gap: 8, marginBottom: 14 }}>
        <NumBox label="Completed" value={outcomes ? `${count("completed")}` : "–"} />
        <NumBox label="No-show" value={outcomes ? `${count("no_show")}` : "–"} />
        <NumBox label="Late cancel" value={outcomes ? `${count("late_cancel")}` : "–"} />
      </div>
      <SectionHead label="Upcoming" />
      {upRows.length ? <ListCard rows={upRows} /> : <SoftLine icon={CalendarDays}>{`No ${word}s booked.`}</SoftLine>}
      <div className="flex" style={{ marginBottom: 14 }}>
        <CtaButton size="base" variant="secondary" icon={<CalendarPlus size={15} />} label={`Schedule ${patient ? "an appointment" : "a session"}`} onClick={onSchedule} />
      </div>
      <SectionHead label="Past" />
      {pastRows.length ? <ListCard rows={pastRows} /> : <p style={{ fontSize: textPx(12), color: INK.chF, marginBottom: 12 }}>{`No past ${word}s in the last 90 days.`}</p>}
    </>
  );
};
