// B15 · "Needs your attention" (DI-05, DA1-015 #5 / S1, DA2-001 #9, DA3-001 #2)
// from business_attention(): only the items the caller can act on, only when
// not zero, ordered high → low by the server. Pure, so node --test loads it.
//
// REPLACES the client-derived list (hidden listing, unredeemed codes, classes
// under half booked, unfilled seats). The panel's look is BizSummaryV27's
// (icon 15, title 12.5/600, sub 10.5/500, action pill); "Your listing is
// hidden" / "Clients can't find you on Explore" / "Turn on" (eye-off, high)
// are the drawn strings. Every other title, sub and action is OURS (listed in
// the B15 report): the server gives a count per item, not per class, so the
// drawn per-class rows ("Yoga Flow is 40% booked") become one counted row.

import { t, tn } from "../../i18n/core";
import type { AttentionRow } from "./dashboardTypes";

export type AttentionIcon = "eye-off" | "shield-alert" | "receipt" | "banknote" | "calendar-clock" | "user-x" | "calendar-x" | "package" | "package-minus" | "image-off" | "star" | "user-plus" | "users";

export type AttentionTarget = "listing" | "setup" | "subscription" | "revenue" | "classes" | "orders" | "products" | "photos" | "reputation" | "join_requests" | "seats";

export interface AttentionItem {
  key: string;
  icon: AttentionIcon;
  /** Severity as the drawn colours: high #C0392B, medium caution, low primary dark. */
  tone: "high" | "caution" | "primary";
  title: string;
  sub: string;
  action: string;
  to: AttentionTarget;
}

type Spec = (n: number) => Omit<AttentionItem, "key" | "tone">;

// Round G (EH5): read at call time, so each row follows the app's language.
const ITEMS: Record<string, Spec> = {
  not_on_explore: () => ({ icon: "eye-off", title: t("Your listing is hidden"), sub: t("Clients can't find you on Explore"), action: t("Turn on"), to: "listing" }),
  verification_needs_changes: () => ({ icon: "shield-alert", title: t("Verification needs changes"), sub: t("Centium asked for a few fixes"), action: t("Fix"), to: "setup" }),
  centium_charge_due: (n) => ({ icon: "receipt", title: t("Centium charge due"), sub: tn(n, "{n} charge to pay", "{n} charges to pay"), action: t("View"), to: "subscription" }),
  money_overdue: (n) => ({ icon: "banknote", title: t("Payments overdue"), sub: tn(n, "{n} payment past the due date", "{n} payments past the due date"), action: t("View"), to: "revenue" }),
  classes_under_40pct_next_48h: (n) => ({ icon: "calendar-clock", title: tn(n, "{n} class under 40% booked", "{n} classes under 40% booked"), sub: t("In the next 48 hours"), action: t("Open"), to: "classes" }),
  classes_without_instructor_next_7d: (n) => ({ icon: "user-x", title: tn(n, "{n} class without an instructor", "{n} classes without an instructor"), sub: t("In the next 7 days"), action: t("Open"), to: "classes" }),
  instructor_double_booked: (n) => ({ icon: "calendar-x", title: t("Instructor double-booked"), sub: tn(n, "{n} class overlaps another", "{n} classes overlap another"), action: t("Open"), to: "classes" }),
  orders_to_pack: (n) => ({ icon: "package", title: t("Orders waiting to be packed"), sub: tn(n, "{n} order", "{n} orders"), action: t("View"), to: "orders" }),
  low_stock: (n) => ({ icon: "package-minus", title: t("Low stock"), sub: tn(n, "{n} product under 5 left", "{n} products under 5 left"), action: t("View"), to: "products" }),
  photos_rejected: (n) => ({ icon: "image-off", title: t("Photos not approved"), sub: tn(n, "{n} photo to replace", "{n} photos to replace"), action: t("View"), to: "photos" }),
  low_reviews_unanswered: (n) => ({ icon: "star", title: t("Low reviews to answer"), sub: tn(n, "{n} review of 3 stars or less", "{n} reviews of 3 stars or less"), action: t("Reply"), to: "reputation" }),
  join_requests: (n) => ({ icon: "user-plus", title: t("Join requests"), sub: t("{n} waiting for you", { n }), action: t("View"), to: "join_requests" }),
  no_free_seats: () => ({ icon: "users", title: t("No free seats"), sub: t("Every seat is in use"), action: t("Add"), to: "seats" }),
};

const TONE: Record<AttentionRow["severity"], AttentionItem["tone"]> = { high: "high", medium: "caution", low: "primary" };

/** business_attention rows (raw from PostgREST): an unknown severity reads as low. */
export function toAttentionRows(rows: { item: string; count: number | string | null; severity: string | null }[] | null | undefined): AttentionRow[] {
  return (rows ?? [])
    .map((r) => ({ item: r.item, count: Number(r.count ?? 0), severity: (r.severity === "high" || r.severity === "medium" ? r.severity : "low") as AttentionRow["severity"] }))
    .filter((r) => r.count > 0);
}

/** The panel's rows, in the server's order; an item this build does not know is left out. */
export function attentionItems(rows: AttentionRow[]): AttentionItem[] {
  const out: AttentionItem[] = [];
  for (const r of rows) {
    const spec = ITEMS[r.item];
    if (!spec || r.count <= 0) continue;
    out.push({ key: r.item, tone: TONE[r.severity], ...spec(r.count) });
  }
  return out;
}
