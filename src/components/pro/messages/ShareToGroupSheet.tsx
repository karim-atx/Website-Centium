import React, { useEffect, useState } from "react";
import { CalendarPlus, ClipboardList, Music2, Pin, Send, UtensilsCrossed } from "lucide-react";
import { emptyPlaylistShare, playlistShareReady, PlaylistShareFields, type PlaylistShareDraft, type PlaylistShareError } from "./SharePlaylistSheet";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { ListCard, type ListRow } from "../client/kit";
import { ProCardSkeleton, ProError } from "../states";
import { INK } from "../proInk";
import { textPx } from "../../../theme/textSize";
import { range12, time12 } from "../../../utils/time12";
import { todayLocal } from "../../../utils/date";
import { daysLabel } from "../../../services/messaging/groupCardsModel";
import {
  fetchShareableMealPlans,
  fetchShareableProgrammes,
  fetchShareableSessions,
  sendAnnouncement,
  sendGroupCard,
  sendPlaylistCard,
  type GroupCardKind,
  type ShareableMealPlan,
  type ShareableProgramme,
  type ShareableSession,
} from "../../../services/pro/messages";

/**
 * Release 3 · MO27 "Group chat · share to the group" (gen/r16.js groupChat16
 * sheet): a list card of four rows, then the footnote 12 text.faint.
 * - A programme: one of my templates, sent with send_group_card
 *   (programme_share; the database copies only its name, length and exercise
 *   count, never a client's copy).
 * - A meal plan (Round D, meal_plan_share): one of my meal plan templates;
 *   the card carries its name, days and the note, never calories or macros.
 * - A group session: one of my own upcoming calendar events
 *   (session_share: title, start, length, place and the event, so members
 *   can book a place; never an attendee).
 * - An announcement: my message, pinned to the top (the chat's pin).
 * - A playlist (Round E, playlist_share): a Spotify, Apple Music or YouTube
 *   Music link with an optional title and note (send_playlist_card).
 * An optional note (≤ 300) goes with a card. Nothing is sent before Share.
 */
type ListStep = "programmes" | "sessions" | "mealplans";
const LIST_FOR: Record<GroupCardKind, ListStep> = { programme_share: "programmes", session_share: "sessions", meal_plan_share: "mealplans" };
type Step = { kind: "menu" } | { kind: ListStep } | { kind: "announce" } | { kind: "playlist" } | { kind: "note"; card: GroupCardKind; id: string; title: string };

export const ShareToGroupSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  threadId: string;
  userId: string;
  /** Meal plans are the Full coaching and Nutrition lanes' (HANDOVER d). */
  coachesNutrition: boolean;
  onShared: () => void;
}> = ({ open, onClose, threadId, userId, coachesNutrition, onShared }) => {
  const [step, setStep] = useState<Step>({ kind: "menu" });
  const [programmes, setProgrammes] = useState<ShareableProgramme[] | null>(null);
  const [sessions, setSessions] = useState<ShareableSession[] | null>(null);
  const [mealPlans, setMealPlans] = useState<ShareableMealPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [playlist, setPlaylist] = useState<PlaylistShareDraft>(emptyPlaylistShare);
  const [playlistError, setPlaylistError] = useState<PlaylistShareError>(null);

  useEffect(() => {
    if (!open) {
      setStep({ kind: "menu" });
      setText("");
      setError(null);
      setPlaylist(emptyPlaylistShare());
      setPlaylistError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFailed(false);
    if (step.kind === "programmes" && !programmes)
      void fetchShareableProgrammes(userId).then((r) => !cancelled && (r.ok ? setProgrammes(r.data) : setFailed(true)));
    if (step.kind === "sessions" && !sessions)
      void fetchShareableSessions(userId, todayLocal()).then((r) => !cancelled && (r.ok ? setSessions(r.data) : setFailed(true)));
    if (step.kind === "mealplans" && !mealPlans)
      void fetchShareableMealPlans(userId).then((r) => !cancelled && (r.ok ? setMealPlans(r.data) : setFailed(true)));
    return () => {
      cancelled = true;
    };
  }, [open, step.kind, userId, programmes, sessions, mealPlans, reload]);

  const finish = () => {
    onShared();
    onClose();
  };
  const share = async () => {
    if (busy) return;
    if (step.kind === "playlist") {
      if (!playlistShareReady(playlist)) return;
      setBusy(true);
      setPlaylistError(null);
      const p = await sendPlaylistCard(threadId, playlist.url, playlist.title, playlist.note);
      setBusy(false);
      if (!p.ok) return setPlaylistError({ message: p.message, field: p.field });
      return finish();
    }
    setBusy(true);
    setError(null);
    const r =
      step.kind === "note"
        ? await sendGroupCard(threadId, step.card, step.id, text)
        : step.kind === "announce"
          ? await sendAnnouncement(threadId, userId, text)
          : ({ ok: false, message: "" } as const);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    finish();
  };

  const back = step.kind === "menu" ? undefined : () => setStep(step.kind === "note" ? { kind: LIST_FOR[step.card] } : { kind: "menu" });
  const menu: ListRow[] = [
    { key: "programme", icon: ClipboardList, title: "A programme", meta: "Members open it in Workout", onClick: () => setStep({ kind: "programmes" }) },
    ...(coachesNutrition ? [{ key: "meal", icon: UtensilsCrossed, title: "A meal plan", meta: "Only if you coach nutrition", onClick: () => setStep({ kind: "mealplans" }) }] : []),
    { key: "session", icon: CalendarPlus, title: "A group session", meta: "Members book a place", onClick: () => setStep({ kind: "sessions" }) },
    { key: "announce", icon: Pin, title: "An announcement", meta: "Pinned to the top", onClick: () => setStep({ kind: "announce" }) },
    { key: "playlist", icon: Music2, title: "A playlist", meta: "Spotify, Apple Music or YouTube Music", onClick: () => setStep({ kind: "playlist" }) },
  ];

  const list = (rows: ListRow[] | null, empty: string) =>
    failed ? (
      <ProError onRetry={() => setReload((x) => x + 1)} />
    ) : !rows ? (
      <ProCardSkeleton lines={3} />
    ) : rows.length === 0 ? (
      <p style={{ fontSize: textPx(13), color: INK.chF }}>{empty}</p>
    ) : (
      <ListCard rows={rows} />
    );

  const field = (label: string, max: number, required: boolean) => (
    <label className="block">
      <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        {label}
      </span>
      <textarea
        value={text}
        maxLength={max}
        rows={3}
        aria-required={required}
        onChange={(e) => setText(e.target.value)}
        className="w-full rounded-[12px] px-3 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ fontSize: textPx(14), background: INK.soft, border: `1px solid ${INK.b10}`, color: INK.ch }}
      />
    </label>
  );

  const footer =
    step.kind === "note" || step.kind === "announce" || step.kind === "playlist" ? (
      <CtaButton
        label={step.kind === "announce" ? "Send and pin" : "Share"}
        icon={<Send size={15} aria-hidden />}
        loading={busy}
        disabled={(step.kind === "announce" && !text.trim()) || (step.kind === "playlist" && !playlistShareReady(playlist))}
        onClick={() => void share()}
      />
    ) : undefined;

  return (
    <BottomSheet open={open} onClose={onClose} title="Share to the group" onBack={back} footer={footer}>
      {step.kind === "menu" && (
        <>
          <ListCard rows={menu} />
          <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>Sharing never sends anyone's results or health data to the group.</p>
        </>
      )}
      {step.kind === "programmes" &&
        list(
          programmes?.map((p) => ({
            key: p.id,
            icon: ClipboardList,
            title: p.name,
            meta: p.durationWeeks ? `${p.durationWeeks} ${p.durationWeeks === 1 ? "week" : "weeks"}` : undefined,
            onClick: () => setStep({ kind: "note", card: "programme_share", id: p.id, title: p.name }),
          })) ?? null,
          "No programmes yet. Build one in Library."
        )}
      {step.kind === "sessions" &&
        list(
          sessions?.map((s) => ({
            key: s.id,
            icon: CalendarPlus,
            title: s.title,
            meta: [new Date(`${s.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }), s.startTime ? (s.endTime ? range12(s.startTime, s.endTime) : time12(s.startTime)) : null, s.location].filter(Boolean).join(" · "),
            onClick: () => setStep({ kind: "note", card: "session_share", id: s.id, title: s.title }),
          })) ?? null,
          "No upcoming sessions. Add one in Calendar."
        )}
      {step.kind === "mealplans" &&
        list(
          mealPlans?.map((p) => ({
            key: p.id,
            icon: UtensilsCrossed,
            title: p.name,
            meta: daysLabel(p.days) ?? undefined,
            onClick: () => setStep({ kind: "note", card: "meal_plan_share", id: p.id, title: p.name }),
          })) ?? null,
          "No meal plans yet. Make one in Meal plans first."
        )}
      {step.kind === "note" && (
        <>
          <p style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, marginBottom: 12 }}>{step.title}</p>
          {field("Note (optional)", 300, false)}
          {step.card === "meal_plan_share" && (
            <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5, marginTop: 8 }}>Members see its name, its length and your note, never calories or macros.</p>
          )}
        </>
      )}
      {step.kind === "announce" && field("Announcement", 2000, true)}
      {step.kind === "playlist" && (
        <PlaylistShareFields
          draft={playlist}
          onChange={(d) => {
            setPlaylist(d);
            if (playlistError) setPlaylistError(null);
          }}
          error={playlistError}
        />
      )}
      {error && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
          {error}
        </p>
      )}
    </BottomSheet>
  );
};
