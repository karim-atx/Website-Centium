// Release 3 · what one professional_notifications row says (DB-2). The
// database stores a title_key and a payload of ids and labels, never health
// values; the sentence is the website's. The keys are the ones HANDOVER_API
// "Invite codes and the hub's speed" lists as written by the backend (each has a
// sentence; notificationText.test.ts checks); team invitations are never a
// notification (they come from business_employees). An unknown key falls
// back to its kind, so a new key never renders blank.

import type { ProNotification } from "../../../services/pro/notifications";
import { CLIENT_COPY, notificationCopy, PRO_COPY } from "../../../services/notifications/notificationsModel";
import { imageNoticeCopy } from "../../../services/moderation/imageCopy";
import { CATEGORY_LABEL } from "./categoryLabels";
import { topicsPhrase } from "../forms/formModel";

export type NotificationTone = "pr" | "req" | "att" | "act" | "done";

export interface NotificationText {
  title: string;
  line: string;
  icon: "calendar-check" | "calendar-x" | "message" | "star" | "banknote" | "user-plus" | "clipboard" | "shield" | "share" | "bell" | "activity";
  tone: NotificationTone;
}

/** A win kind (share_requests.win_kind) in a sentence. */
const WIN_WORD: Record<string, string> = { pr: "PR", programme_complete: "finished programme", consistency: "consistency", streak: "streak", logging_streak: "logging streak", meal_plan_complete: "finished meal plan" };
const winWord = (k: unknown) => (typeof k === "string" && WIN_WORD[k]) || "win";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Market + Share 3.0 Release 2: a member-inbox row (`memberKind`, the
 * professional kinds of Database 20261210600000) reads PRO_COPY with its
 * payload (services/notifications PRO_FILLS) and P-MA.7's tile per kind.
 */
const MEMBER_LOOK: Record<string, Pick<NotificationText, "icon" | "tone">> = {
  hire_offer_received: { icon: "banknote", tone: "req" },
  existing_team_invite: { icon: "user-plus", tone: "req" },
  hired: { icon: "user-plus", tone: "done" },
  classes_added: { icon: "calendar-check", tone: "pr" },
  class_changed: { icon: "calendar-check", tone: "act" },
  class_cancelled: { icon: "calendar-x", tone: "att" },
  removed_from_team: { icon: "bell", tone: "pr" },
  instructor_review_received: { icon: "star", tone: "req" },
};

export function notificationText(n: ProNotification, names: Record<string, string>): NotificationText {
  if (n.memberKind) {
    const c = notificationCopy({ titleKey: n.titleKey, kind: n.memberKind, payload: n.payload }, PRO_COPY);
    return { title: c.title, line: c.body, ...(MEMBER_LOOK[n.memberKind] ?? { icon: "bell", tone: "pr" }) };
  }
  const p = n.payload;
  const who = (n.clientId && names[n.clientId]) || str(p.first_name) || "A client";
  const key = n.titleKey;
  switch (key) {
    case "pro.request.new":
      return { title: `${who} asked to work with you`, line: "Accept or decline in Requests", icon: "user-plus", tone: "req" };
    case "pro.hire.new":
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
      return { title: who, line: "Sent you a form", icon: "clipboard", tone: "pr" };
    case "pro.form.flagged": {
      // W6: the payload carries the marked topics (save_form_response); FINAL_PLAN 3 §6.2 wording.
      const topics = Array.isArray(p.safety_topics) ? p.safety_topics.filter((t): t is string => typeof t === "string") : [];
      return { title: who, line: topics.length ? `Check-in flagged: answers mention ${topicsPhrase(topics)}` : "Check-in flagged", icon: "clipboard", tone: "att" };
    }
    case "pro.result.shared":
      return { title: who, line: str(p.marker) ? `Shared a result: ${str(p.marker)}` : "Shared a result with you", icon: "share", tone: "pr" };
    case "pro.client.allergies_updated":
      return { title: who, line: "Updated their allergies", icon: "shield", tone: "att" };
    case "pro.diary.reply":
      return { title: `${who} replied to your feedback`, line: "Food journal", icon: "message", tone: "pr" };
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
    // W8 SH4: answer_share_request sends pro.share.{answer} with payload.win_kind.
    case "pro.share.allowed":
      return { title: `${who} allowed you to share their ${winWord(p.win_kind)}`, line: "Share cards", icon: "share", tone: "pr" };
    case "pro.share.allowed_no_name":
      return { title: `${who} allowed you to share their ${winWord(p.win_kind)}, without their name`, line: "Share cards", icon: "share", tone: "pr" };
    case "pro.share.declined":
      return { title: `${who} declined sharing their ${winWord(p.win_kind)}. You can't ask again for this win.`, line: "Share cards", icon: "share", tone: "pr" };
    case "pro.share.removal_requested":
      return { title: `${who} asked you to remove a shared card`, line: "Share cards", icon: "share", tone: "req" };
    // Database 20261219030000: a professional's ambassador decision, in the
    // member notice's own words (CLIENT_COPY; the decline names the date from
    // payload.next_eligible_on). Not in PRO_KINDS: the member row would repeat it.
    case "pro.ambassador.approved": {
      const c = notificationCopy({ titleKey: "ambassador_application_approved", kind: "ambassador_application_approved", payload: p }, CLIENT_COPY);
      return { title: c.title, line: c.body, icon: "star", tone: "done" };
    }
    case "pro.ambassador.declined": {
      const c = notificationCopy({ titleKey: "ambassador_application_declined", kind: "ambassador_application_declined", payload: p }, CLIENT_COPY);
      return { title: c.title, line: c.body, icon: "bell", tone: "pr" };
    }
    // Round C Release 2 (Database 20261221040000): an image decision, with
    // payload.surface and, when rejected, payload.reason_category.
    case "pro.image.approved": {
      const c = imageNoticeCopy(true, p.surface, null);
      return { title: c.title, line: c.body, icon: "bell", tone: "done" };
    }
    case "pro.image.rejected": {
      const c = imageNoticeCopy(false, p.surface, p.reason_category);
      return { title: c.title, line: c.body, icon: "bell", tone: "pr" };
    }
    default:
      if (key.startsWith("pro.referral.")) return { title: "A referral was updated", line: "Care network", icon: "share", tone: "pr" };
      if (key.startsWith("pro.care_network.")) return { title: "Your care network was updated", line: "Care network", icon: "user-plus", tone: "pr" };
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
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][t.getMonth()]} ${t.getDate()}`;
}
