import React, { useEffect, useState } from "react";
import { Bell, CalendarClock, Clock, Copy, Mail, MessageCircle, Repeat, Share2, UserPlus } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { Toggle } from "../../ui/Toggle";
import { PassQr } from "../../marketplace/PassQr";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ComingSoon, ComingSoonPill } from "../ComingSoon";
import { bookingHref, bookingUrl, saveBookingPolicy, saveReminderDefaults, type BookingAudience, type BookingPolicy } from "../../../services/pro/calendar";
import { ChoiceCard, FieldButton, SettingsRow } from "./calendarFields";
import type { AlertValue } from "./calendarModel";

/**
 * Release 3 · W4 CA17 to CA23, the Booking rows' sheets (source/gen/r6a.js
 * bookSheet6, BOOK6). DB-4 gives professional_booking_policies (who can book,
 * minimum notice, free cancellation window, late cancel and no-show charge,
 * new-client approval, booking window, the public link switch) and
 * practice_settings' two default reminders. What the frames draw beyond that
 * (Selected clients, No one, repeat-booking and outside-hours approvals,
 * approve within, slot step, most sessions a day, email confirmation, include
 * your note, CA23 calendar sync) has no backend: drawn with Coming soon,
 * never as a working switch (W4 notes, backend gaps).
 */

export type BookingSheetKind = "link" | "who" | "notice" | "approvals" | "window" | "reminders" | "sync";

export const BOOKING_TITLES: Record<BookingSheetKind, string> = {
  link: "Booking link",
  who: "Who can book",
  notice: "Notice and cancellation",
  approvals: "Booking approvals",
  window: "Booking window",
  reminders: "Reminders to clients",
  sync: "Sync with your calendar",
};

/** CA18 choices for the three audiences the database knows. */
export const AUDIENCE: Record<BookingAudience, { title: string; sub: string }> = {
  everyone: { title: "Everyone with the link", sub: "New people send a request first" },
  approved_only: { title: "Active clients only", sub: "Clients you work with now" },
  clients_only: { title: "All your clients", sub: "Clients in any stage" },
};

const hoursLabel = (h: number) => (h === 0 ? "No notice" : h % 24 === 0 && h >= 48 ? `${h / 24} days` : `${h} hour${h === 1 ? "" : "s"}`);
const beforeLabel = (h: number) => (h === 0 ? "Up to the start" : `${hoursLabel(h)} before`);
const chargeLabel = (p: number) => (p === 0 ? "No charge" : p === 100 ? "Charge the full price" : `Charge ${p}% of the price`);
export const windowLabel = (days: number) => (days % 7 === 0 ? `${days / 7} week${days === 7 ? "" : "s"} ahead` : `${days} days ahead`);

const withCurrent = (list: number[], v: number) => (list.includes(v) ? list : [...list, v].sort((a, b) => a - b));
const NOTICE = [0, 1, 2, 4, 12, 24, 48];
const FREE_CANCEL = [0, 2, 12, 24, 48];
const CHARGES = [0, 25, 50, 100];
const WINDOW = [7, 14, 21, 28, 42, 56, 84];

/** A dropdown field over a list of numbers. */
const NumberSelect: React.FC<{ label: string; value: number; options: number[]; text: (n: number) => string; onChange: (n: number) => void }> = ({ label, value, options, text, onChange }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <div>
      <FieldButton label={label} value={text(value)} ariaLabel={`${label}, ${text(value)}`} open={!!anchor} onClick={(e) => setAnchor(e.currentTarget)} />
      <PopupMenu
        open={!!anchor}
        onClose={() => setAnchor(null)}
        anchor={anchor}
        matchWidth={anchor}
        options={withCurrent(options, value).map((n) => ({ value: String(n), label: text(n) }))}
        selected={String(value)}
        onSelect={(v) => {
          onChange(Number(v));
          setAnchor(null);
        }}
      />
    </div>
  );
};

export const BookingSheet: React.FC<{
  kind: BookingSheetKind | null;
  me: string;
  policy: BookingPolicy;
  handle: string | null;
  reminders: { alert: AlertValue; alert2: AlertValue };
  onClose: () => void;
  onSaved: () => void;
  onToast: (text: string) => void;
}> = ({ kind, me, policy, handle, reminders, onClose, onSaved, onToast }) => {
  const [p, setP] = useState<BookingPolicy>(policy);
  const [day, setDay] = useState(false);
  const [hour, setHour] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) return;
    setP(policy);
    const set = [reminders.alert, reminders.alert2];
    setDay(set.includes("day_1"));
    setHour(set.includes("hour_1"));
    setError(null);
  }, [kind, policy, reminders]);

  if (!kind) return null;

  const savePolicy = async (next: BookingPolicy, close = true) => {
    setBusy(true);
    setError(null);
    const r = await saveBookingPolicy(me, next);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    onSaved();
    if (close) onClose();
    return true;
  };

  const saveReminders = async () => {
    const list: AlertValue[] = [...(day ? (["day_1"] as AlertValue[]) : []), ...(hour ? (["hour_1"] as AlertValue[]) : [])];
    // The other reminders a practice may hold (not drawn here) are kept.
    const others = [reminders.alert, reminders.alert2].filter((a) => a !== "none" && a !== "day_1" && a !== "hour_1");
    const all = [...list, ...others].slice(0, 2);
    setBusy(true);
    setError(null);
    const r = await saveReminderDefaults(me, all[0] ?? "none", all[1] ?? "none");
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved();
    onClose();
  };

  const url = handle ? bookingUrl(handle) : null;
  const href = handle ? bookingHref(handle) : "";
  const copy = () => {
    if (!url) return;
    void navigator.clipboard?.writeText(href).catch(() => {});
    onToast("Link copied");
  };
  const share = async () => {
    if (!url) return;
    const data = { title: "Book a session", url: href };
    if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
      try {
        await navigator.share(data);
        return;
      } catch {
        return;
      }
    }
    copy();
  };

  const saveFooter = (onClick: () => void) => <CtaButton size="sheet" className="w-full" label="Save" loading={busy} onClick={onClick} />;
  // No backend: the row says so, and never shows a value it cannot keep.
  const soon = (key: string, icon: typeof Bell, title: string, last?: boolean) => (
    <SettingsRow key={key} icon={icon} title={title} muted right={<ComingSoonPill />} last={last} />
  );

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (kind === "link") {
    body = (
      <>
        <div className="flex flex-col items-center" style={{ gap: 12 }}>
          {url ? (
            <div className="flex items-center justify-center" style={{ width: 168, height: 168, borderRadius: 20, border: `1px solid ${INK.b10}`, background: "#FFFFFF" }}>
              <PassQr value={href} size={136} label="Booking link QR code" failedText="Couldn't draw the QR code. Try again." />
            </div>
          ) : null}
          <p className="text-center" style={{ fontSize: textPx(12.5), color: INK.chS, maxWidth: 280, lineHeight: 1.55 }}>
            Anyone with this link sees your open slots and session types, then books under your rules.
          </p>
        </div>
        <div className="flex flex-col" style={{ marginTop: 14, gap: 12 }}>
          {url ? (
            <div>
              <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
                Link
              </span>
              <button type="button" onClick={copy} aria-label={`Copy link, ${url}`} className="tap w-full flex items-center justify-between text-left" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8, fontSize: textPx(14), color: INK.ch }}>
                <span className="truncate">{url}</span>
                <Copy size={16} strokeWidth={1.75} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
              </button>
            </div>
          ) : (
            <p style={{ borderRadius: 12, background: INK.soft, padding: 12, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>
              Choose your handle on your public profile to get your booking link.
            </p>
          )}
          <div className="flex items-center justify-between" style={{ height: 52, borderRadius: 12, background: INK.soft, padding: "0 12px" }}>
            <span style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>{p.bookingLinkEnabled ? "Link is on" : "Link is off"}</span>
            <Toggle
              checked={p.bookingLinkEnabled}
              label="Booking link"
              disabled={busy}
              onChange={(v) => {
                const next = { ...p, bookingLinkEnabled: v };
                setP(next);
                void savePolicy(next, false).then((ok) => !ok && setP(p));
              }}
            />
          </div>
        </div>
      </>
    );
    footer = (
      <div className="flex w-full" style={{ gap: 8 }}>
        <CtaButton size="sheet" variant="secondary" className="flex-1" label="Copy link" icon={<Copy size={15} aria-hidden />} disabled={!url} onClick={copy} />
        <CtaButton size="sheet" className="flex-1" label="Share" icon={<Share2 size={15} aria-hidden />} disabled={!url} onClick={() => void share()} />
      </div>
    );
  } else if (kind === "who") {
    const order: BookingAudience[] = ["everyone", "approved_only", "clients_only"];
    body = (
      <div role="radiogroup" aria-label="Who can book" className="flex flex-col" style={{ gap: 8 }}>
        {order.map((a) => (
          <ChoiceCard key={a} title={AUDIENCE[a].title} sub={AUDIENCE[a].sub} on={p.whoCanBook === a} onClick={() => setP({ ...p, whoCanBook: a })} />
        ))}
        <ChoiceCard title="Selected clients" sub="Choose who in the list below" on={false} disabled trailing={<ComingSoonPill />} />
        <ChoiceCard title="No one" sub="Only you can add sessions" on={false} disabled trailing={<ComingSoonPill />} />
      </div>
    );
    footer = saveFooter(() => void savePolicy(p));
  } else if (kind === "notice") {
    body = (
      <div className="flex flex-col" style={{ gap: 14 }}>
        <NumberSelect label="Minimum notice to book" value={p.minNoticeHours} options={NOTICE} text={hoursLabel} onChange={(n) => setP({ ...p, minNoticeHours: n })} />
        <NumberSelect label="Free cancellation until" value={p.freeCancelHours} options={FREE_CANCEL} text={beforeLabel} onChange={(n) => setP({ ...p, freeCancelHours: n })} />
        <NumberSelect label="Late cancellation" value={p.lateCancelPct} options={CHARGES} text={chargeLabel} onChange={(n) => setP({ ...p, lateCancelPct: n })} />
        <NumberSelect label="No-show" value={p.noShowPct} options={CHARGES} text={chargeLabel} onChange={(n) => setP({ ...p, noShowPct: n })} />
        <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5 }}>Clients see these rules before they book and in every reminder.</p>
      </div>
    );
    footer = saveFooter(() => void savePolicy(p));
  } else if (kind === "approvals") {
    body = (
      <>
        <SettingsRow icon={UserPlus} title="New clients" sub={p.newClientApproval ? "Need your OK" : "Booked automatically"} right={<Toggle checked={p.newClientApproval} label="New clients need your OK" onChange={(v) => setP({ ...p, newClientApproval: v })} />} />
        {soon("repeat", Repeat, "Repeat bookings")}
        {soon("outside", CalendarClock, "Bookings outside working hours")}
        {soon("within", Clock, "Approve within", true)}
      </>
    );
    footer = saveFooter(() => void savePolicy(p));
  } else if (kind === "window") {
    body = (
      <div className="flex flex-col" style={{ gap: 14 }}>
        <NumberSelect label="Clients can book up to" value={p.windowDays} options={WINDOW} text={windowLabel} onChange={(n) => setP({ ...p, windowDays: n })} />
        <div>
          {soon("step", Clock, "Slots start every")}
          {soon("most", CalendarClock, "Most sessions a day", true)}
        </div>
      </div>
    );
    footer = saveFooter(() => void savePolicy(p));
  } else if (kind === "reminders") {
    body = (
      <>
        <SettingsRow icon={Bell} title="24 hours before" sub="Push notification" right={<Toggle checked={day} label="24 hours before" onChange={setDay} />} />
        <SettingsRow icon={Bell} title="1 hour before" sub="Push notification" right={<Toggle checked={hour} label="1 hour before" onChange={setHour} />} />
        {soon("email", Mail, "Email confirmation")}
        {soon("note", MessageCircle, "Include your note", true)}
      </>
    );
    footer = saveFooter(() => void saveReminders());
  } else {
    body = <ComingSoon line="Events from your other calendars block those times here, so clients can't book over them." />;
  }

  return (
    <BottomSheet open={!!kind} onClose={onClose} title={BOOKING_TITLES[kind]} footer={footer ?? undefined}>
      {body}
      {error && (
        <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 12 }}>
          {error}
        </p>
      )}
    </BottomSheet>
  );
};
