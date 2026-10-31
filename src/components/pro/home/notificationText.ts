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
import { heldNoticeText, RELEASED_NOTICE } from "../../share/heldShareModel";
import { t, tk, tn } from "../../../i18n/core";
import { appLocale } from "../../../i18n/format";

export type NotificationTone = "pr" | "req" | "att" | "act" | "done";

export interface NotificationText {
  title: string;
  line: string;
  icon: "calendar-check" | "calendar-x" | "message" | "star" | "banknote" | "user-plus" | "clipboard" | "shield" | "share" | "bell" | "activity";
  tone: NotificationTone;
}

/** A win kind (share_requests.win_kind) in a sentence. */
const WIN_WORD: Record<string, string> = {
  pr: tk("PR"),
  programme_complete: tk("finished programme"),
  consistency: tk("consistency"),
  streak: tk("streak"),
  logging_streak: tk("logging streak"),
  meal_plan_complete: tk("finished meal plan"),
};
const winWord = (k: unknown) => t((typeof k === "string" && WIN_WORD[k]) || "win");

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
  const who = (n.clientId && names[n.clientId]) || str(p.first_name) || t("A client");
  const name = { name: who };
  const key = n.titleKey;
  switch (key) {
    case "pro.request.new":
      return { title: t("{name} asked to work with you", name), line: t("Accept or decline in Requests"), icon: "user-plus", tone: "req" };
    case "pro.hire.new": {
      const plan = str(p.plan);
      return {
        title: plan ? t("{name} chose {plan}", { name: who, plan }) : t("{name} chose one of your plans", name),
        line: t("Confirm you received the payment"),
        icon: "banknote",
        tone: "act",
      };
    }
    case "pro.hire.cancelled":
      return { title: t("{name} cancelled their hire", name), line: t("Hire"), icon: "calendar-x", tone: "att" };
    case "pro.review.new": {
      const r = typeof p.rating === "number" ? p.rating : null;
      return { title: r ? t("You have a new {rating}-star review", { rating: r }) : t("You have a new review"), line: t("Reviews"), icon: "star", tone: "req" };
    }
    case "pro.access.granted": {
      const label = CATEGORY_LABEL[str(p.category) ?? ""];
      return { title: label ? t("{name} shared {category} with you", { name: who, category: t(label) }) : t("{name} shared more with you", name), line: t("Sharing"), icon: "shield", tone: "pr" };
    }
    case "pro.access.declined": {
      const label = CATEGORY_LABEL[str(p.category) ?? ""];
      return { title: label ? t("{name} chose not to share {category}", { name: who, category: t(label) }) : t("{name} chose not to share that", name), line: t("Sharing"), icon: "shield", tone: "pr" };
    }
    case "pro.booking.booked": {
      const service = str(p.service);
      return { title: service ? t("{name} booked {service}", { name: who, service }) : t("{name} booked a session", name), line: t("Booking"), icon: "calendar-check", tone: "pr" };
    }
    case "pro.booking.requested": {
      const service = str(p.service);
      return { title: service ? t("{name} asked to book {service}", { name: who, service }) : t("{name} asked to book a session", name), line: t("Booking request"), icon: "calendar-check", tone: "pr" };
    }
    case "pro.booking.cancelled":
      return { title: t("{name} cancelled a booking", name), line: t("Booking"), icon: "calendar-x", tone: "att" };
    case "pro.booking.late_cancel":
      return { title: t("{name} cancelled a booking", name), line: t("Late cancel"), icon: "calendar-x", tone: "att" };
    case "pro.session.unpaid":
      return { title: t("A session is unpaid"), line: str(p.title) ?? t("Session"), icon: "banknote", tone: "act" };
    // Round D (Database 20261223040000): a member booked a place from a group's session card.
    case "pro.session.booked": {
      const taken = typeof p.taken === "number" ? p.taken : null;
      const cap = typeof p.capacity === "number" ? p.capacity : null;
      const title = str(p.title);
      return {
        title: title ? t("A group member booked {title}", { title }) : t("A group member booked a session"),
        line: taken !== null && cap !== null ? tn(cap, "{taken} of {n} place taken", "{taken} of {n} places taken", { taken }) : t("Group session"),
        icon: "calendar-check",
        tone: "pr",
      };
    }
    case "pro.workout.finished": {
      const routine = str(p.routine);
      return { title: who, line: routine ? t("Finished {routine}", { routine }) : t("Finished a workout"), icon: "activity", tone: "pr" };
    }
    case "pro.form.submitted":
      return { title: who, line: t("Sent you a form"), icon: "clipboard", tone: "pr" };
    case "pro.form.flagged": {
      // W6: the payload carries the marked topics (save_form_response); FINAL_PLAN 3 §6.2 wording.
      const topics = Array.isArray(p.safety_topics) ? p.safety_topics.filter((x): x is string => typeof x === "string") : [];
      return { title: who, line: topics.length ? t("Check-in flagged: answers mention {topics}", { topics: topicsPhrase(topics) }) : t("Check-in flagged"), icon: "clipboard", tone: "att" };
    }
    // 20261222080000: an urgent answer was sent (form_responses.urgent; the
    // push says "Urgent: a check-in needs your attention"). Subject
    // form_response, so it opens the response as pro.form.flagged does.
    case "pro.form.urgent":
      return { title: who, line: t("Urgent: a check-in needs your attention"), icon: "clipboard", tone: "att" };
    case "pro.result.shared": {
      const marker = str(p.marker);
      return { title: who, line: marker ? t("Shared a result: {marker}", { marker }) : t("Shared a result with you"), icon: "share", tone: "pr" };
    }
    case "pro.client.allergies_updated":
      return { title: who, line: t("Updated their allergies"), icon: "shield", tone: "att" };
    case "pro.diary.reply":
      return { title: t("{name} replied to your feedback", name), line: t("Food journal"), icon: "message", tone: "pr" };
    case "pro.care_network.request":
      return { title: t("A colleague wants to connect"), line: t("Care network"), icon: "user-plus", tone: "req" };
    case "pro.care_network.accepted":
      return { title: t("A colleague accepted your request"), line: t("Care network"), icon: "user-plus", tone: "pr" };
    case "pro.care_network.declined":
      return { title: t("A colleague declined your request"), line: t("Care network"), icon: "user-plus", tone: "pr" };
    case "pro.referral.received":
      return { title: t("You have a new referral for {name}", name), line: t("Care network"), icon: "share", tone: "req" };
    case "pro.referral.client_agreed":
      return { title: t("{name} agreed to your referral", name), line: t("Care network"), icon: "share", tone: "pr" };
    case "pro.referral.client_declined":
      return { title: t("{name} declined your referral", name), line: t("Care network"), icon: "share", tone: "pr" };
    case "pro.referral.accepted":
      return { title: t("Your referral was accepted"), line: t("Care network"), icon: "share", tone: "pr" };
    case "pro.referral.declined":
      return { title: t("Your referral was declined"), line: t("Care network"), icon: "share", tone: "pr" };
    // W8 SH4: answer_share_request sends pro.share.{answer} with payload.win_kind.
    case "pro.share.allowed":
      return { title: t("{name} allowed you to share their {win}", { name: who, win: winWord(p.win_kind) }), line: t("Share cards"), icon: "share", tone: "pr" };
    case "pro.share.allowed_no_name":
      return { title: t("{name} allowed you to share their {win}, without their name", { name: who, win: winWord(p.win_kind) }), line: t("Share cards"), icon: "share", tone: "pr" };
    case "pro.share.declined":
      return { title: t("{name} declined sharing their {win}. You can't ask again for this win.", { name: who, win: winWord(p.win_kind) }), line: t("Share cards"), icon: "share", tone: "pr" };
    case "pro.share.removal_requested":
      return { title: t("{name} asked you to remove a shared card", name), line: t("Share cards"), icon: "share", tone: "req" };
    // Round D · DV (Database 20261222030000): the word lists held a card;
    // payload.reason is the short category, never the matched word.
    case "pro.share.held": {
      const c = heldNoticeText(p.reason);
      return { title: t(c.title), line: t(c.line), icon: "share", tone: "att" };
    }
    // 20261222070000: a held card was released ("Not a problem" or Restore), once per hold.
    case "pro.share.released":
      return { title: t(RELEASED_NOTICE.title), line: t(RELEASED_NOTICE.line), icon: "share", tone: "done" };
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
      return { title: t(c.title), line: t(c.body), icon: "bell", tone: "done" };
    }
    case "pro.image.rejected": {
      const c = imageNoticeCopy(false, p.surface, p.reason_category);
      return { title: t(c.title), line: t(c.body), icon: "bell", tone: "pr" };
    }
    default:
      if (key.startsWith("pro.referral.")) return { title: t("A referral was updated"), line: t("Care network"), icon: "share", tone: "pr" };
      if (key.startsWith("pro.care_network.")) return { title: t("Your care network was updated"), line: t("Care network"), icon: "user-plus", tone: "pr" };
      if (key.startsWith("pro.share.")) return { title: t("{name} answered your request to share a win", name), line: t("Share cards"), icon: "share", tone: "pr" };
      return n.kind === "request"
        ? { title: t("New request"), line: who, icon: "user-plus", tone: "req" }
        : n.kind === "to_review"
          ? { title: who, line: t("Something to review"), icon: "clipboard", tone: "pr" }
          : { title: t("New update"), line: who, icon: "bell", tone: "pr" };
  }
}

/** "10 min ago", "2h ago", "Yesterday", or the date. */
export function whenLabel(iso: string, now: Date): string {
  const d = new Date(iso);
  const mins = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60000));
  if (mins < 60) return mins <= 1 ? t("Just now") : t("{n} min ago", { n: mins });
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return t("{n}h ago", { n: Math.floor(mins / 60) });
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return t("Yesterday");
  // The month in the app's language (was a hand-written English month list).
  return d.toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
}
