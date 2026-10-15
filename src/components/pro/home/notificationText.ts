// Release 3 · what one professional_notifications row says (DB-2). The
// database stores a title_key and a payload of ids and labels, never health
// values; the sentence is the website's. Keys come from notify_professional's
// callers (20261124020100 to 20261124080000); an unknown key falls back to
// its kind, so a new key never renders blank.

import type { ProNotification } from "../../../services/pro/notifications";
import { CATEGORY_LABEL } from "./categoryLabels";

export type NotificationTone = "pr" | "req" | "att" | "act" | "done";

export interface NotificationText {
  title: string;
  line: string;
  icon: "calendar-check" | "calendar-x" | "message" | "star" | "banknote" | "user-plus" | "clipboard" | "shield" | "share" | "building" | "bell" | "activity";
  tone: NotificationTone;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function notificationText(n: ProNotification, names: Record<string, string>): NotificationText {
  const p = n.payload;
  const who = (n.clientId && names[n.clientId]) || str(p.first_name) || "A client";
  const key = n.titleKey;
  switch (key) {
    case "pro.request.new":
    case "pro.notify.new_request":
      return { title: `${who} asked to work with you`, line: "Accept or decline in Requests", icon: "user-plus", tone: "req" };
    case "pro.hire.new":
    case "pro.notify.hire_pending_payment":
      return { title: `${who} chose ${str(p.plan) ?? "one of your plans"}`, line: "Confirm you received the payment", icon: "banknote", tone: "act" };
    case "pro.hire.cancelled":
      return { title: `${who} cancelled their hire`, line: "Hire", icon: "calendar-x", tone: "att" };
    case "pro.review.new": {
      const r = typeof p.rating === "number" ? p.rating : null;
      return { title: r ? `You have a new ${r}-star review` : "You have a new review", line: "Reviews", icon: "star", tone: "req" };
    }
    case "pro.access.granted":
      return { title: `${who} shared ${CATEGORY_LABEL[str(p.category) ?? ""] ?? "more"} with you`, line: "Sharing", icon: "shield", tone: "pr" };
    case "pro.access.declined":
      return { title: `${who} chose not to share ${CATEGORY_LABEL[str(p.category) ?? ""] ?? "that"}`, line: "Sharing", icon: "shield", tone: "pr" };
    case "pro.booking.booked":
      return { title: `${who} booked ${str(p.service) ?? "a session"}`, line: "Booking", icon: "calendar-check", tone: "pr" };
    case "pro.booking.requested":
    case "pro.notify.booking_requested":
      return { title: `${who} asked to book ${str(p.service) ?? "a session"}`, line: "Booking request", icon: "calendar-check", tone: "pr" };
    case "pro.booking.cancelled":
      return { title: `${who} cancelled a booking`, line: "Booking", icon: "calendar-x", tone: "att" };
    case "pro.booking.late_cancel":
      return { title: `${who} cancelled a booking`, line: "Late cancel", icon: "calendar-x", tone: "att" };
    case "pro.session.unpaid":
      return { title: "A session is unpaid", line: str(p.title) ?? "Session", icon: "banknote", tone: "act" };
    case "pro.workout.finished":
      return { title: who, line: `Finished ${str(p.routine) ?? "a workout"}`, icon: "activity", tone: "pr" };
    case "pro.form.submitted":
    case "pro.notify.check_in_submitted":
      return { title: who, line: "Sent a check-in", icon: "clipboard", tone: "pr" };
    case "pro.form.flagged":
      return { title: who, line: "Check-in flagged: talk to a doctor follow-up", icon: "clipboard", tone: "att" };
    case "pro.result.shared":
    case "pro.notify.result_shared":
      return { title: who, line: str(p.marker) ? `Shared a result: ${str(p.marker)}` : "Shared a result with you", icon: "share", tone: "pr" };
    case "pro.client.allergies_updated":
    case "pro.notify.allergy_added":
      return { title: who, line: "Updated their allergies", icon: "shield", tone: "att" };
    case "pro.diary.reply":
      return { title: `${who} replied to your feedback`, line: "Food journal", icon: "message", tone: "pr" };
    case "pro.notify.gone_quiet":
      return { title: `${who} has gone quiet`, line: typeof p.days === "number" ? `No activity for ${p.days} days` : "No recent activity", icon: "bell", tone: "att" };
    case "pro.notify.meal_plan_ending":
      return { title: `${who}'s meal plan ends soon`, line: typeof p.days_left === "number" ? `${p.days_left} days left` : "Meal plan", icon: "calendar-check", tone: "pr" };
    case "pro.notify.monitoring_threshold":
      return { title: who, line: str(p.metric) ? `${str(p.metric)} passed its care-plan threshold` : "A care-plan threshold was passed", icon: "activity", tone: "att" };
    case "pro.notify.team_invitation":
      return { title: `${str(p.business) ?? "A business"} invited you to their team`, line: "Businesses", icon: "building", tone: "pr" };
    case "pro.care_network.request":
      return { title: "A colleague wants to connect", line: "Care network", icon: "user-plus", tone: "req" };
    case "pro.care_network.accepted":
      return { title: "A colleague accepted your request", line: "Care network", icon: "user-plus", tone: "pr" };
    case "pro.care_network.declined":
      return { title: "A colleague declined your request", line: "Care network", icon: "user-plus", tone: "pr" };
    case "pro.referral.received":
      return { title: `You have a new referral for ${who}`, line: "Care network", icon: "share", tone: "req" };
    case "pro.referral.client_agreed":
      return { title: `${who} agreed to your referral`, line: "Care network", icon: "share", tone: "pr" };
    case "pro.referral.client_declined":
      return { title: `${who} declined your referral`, line: "Care network", icon: "share", tone: "pr" };
    case "pro.referral.accepted":
      return { title: "Your referral was accepted", line: "Care network", icon: "share", tone: "pr" };
    case "pro.referral.declined":
      return { title: "Your referral was declined", line: "Care network", icon: "share", tone: "pr" };
    case "pro.share.removal_requested":
      return { title: `${who} asked you to remove a shared card`, line: "Share cards", icon: "share", tone: "req" };
    default:
      if (key.startsWith("pro.share.")) return { title: `${who} answered your request to share a win`, line: "Share cards", icon: "share", tone: "pr" };
      return n.kind === "request"
        ? { title: "New request", line: who, icon: "user-plus", tone: "req" }
        : n.kind === "to_review"
          ? { title: who, line: "Something to review", icon: "clipboard", tone: "pr" }
          : { title: "New update", line: who, icon: "bell", tone: "pr" };
  }
}

/** "10 min ago", "2h ago", "Yesterday", or the date. */
export function whenLabel(iso: string, now: Date): string {
  const t = new Date(iso);
  const mins = Math.max(0, Math.round((now.getTime() - t.getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const sameDay = t.toDateString() === now.toDateString();
  if (sameDay) return `${Math.floor(mins / 60)}h ago`;
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (t.toDateString() === y.toDateString()) return "Yesterday";
  return `${t.getDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getMonth()]}`;
}
