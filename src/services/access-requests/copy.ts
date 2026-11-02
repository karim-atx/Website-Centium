// Release 3 · CU8 / CU11: the sentences of a professional's request to see a
// data type. Pure, so it can be tested without Supabase. The labels arrive
// already in the app's language (the caller translates them); English output
// is unchanged.

import { getLanguage, t, tn } from "../../i18n/core";
import { appLocale } from "../../i18n/format";

/** "A", "A and B", "A, B and C". */
export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (getLanguage() !== "en") return new Intl.ListFormat(appLocale(), { type: "conjunction" }).format(items);
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** First word of a display name, for "{pro_first_name}". */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

/**
 * CU8 v4 "Data sharing · Alex asks to see lab results": the notice's title.
 * One request names the data type; several count them (CU11 v2 "asks to see
 * {n} things").
 */
export function requestTitle(firstName: string, labels: string[], tense: "asked" | "asks" = "asked"): string {
  if (labels.length === 1) {
    const vars = { name: firstName, data: labels[0].toLowerCase() };
    return tense === "asks" ? t("{name} asks to see your {data}", vars) : t("{name} asked to see your {data}", vars);
  }
  return tense === "asks"
    ? tn(labels.length, "{name} asks to see {n} thing", "{name} asks to see {n} things", { name: firstName })
    : tn(labels.length, "{name} asked to see {n} thing", "{name} asked to see {n} things", { name: firstName });
}

/**
 * CU8 v4 body: "{message} Either answer is fine; {first} sees only what you
 * turn on." The frame's "For your training plan." is the professional's own
 * note (access_requests.message); without one the body starts at "Either".
 * With several requests the categories are listed first, as CU11 does.
 */
export function requestBody(firstName: string, labels: string[], message?: string | null): string {
  const parts: string[] = [];
  if (labels.length > 1) parts.push(`${joinWithAnd(labels)}.`);
  const note = message?.trim();
  if (note) parts.push(/[.!?]$/.test(note) ? note : `${note}.`);
  parts.push(t("Either answer is fine; {name} sees only what you turn on.", { name: firstName }));
  return parts.join(" ");
}

/**
 * CU11 v2 compact body: "Workout activity, Food diary and Weight, for your
 * programme. You choose each one." `purpose` ("for your programme") is the
 * caller's; without it the list ends at the full stop.
 */
export function requestSummary(labels: string[], purpose?: string): string {
  const list = joinWithAnd(labels);
  return t("{list}. You choose each one.", { list: purpose ? t("{list}, {purpose}", { list, purpose }) : list });
}
