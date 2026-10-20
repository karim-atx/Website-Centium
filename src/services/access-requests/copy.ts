// Release 3 · CU8 / CU11: the sentences of a professional's request to see a
// data type. Pure, so it can be tested without Supabase.

/** "A", "A and B", "A, B and C". */
export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
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
  if (labels.length === 1) return `${firstName} ${tense} to see your ${labels[0].toLowerCase()}`;
  return `${firstName} ${tense} to see ${labels.length} things`;
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
  parts.push(`Either answer is fine; ${firstName} sees only what you turn on.`);
  return parts.join(" ");
}

/**
 * CU11 v2 compact body: "Workout activity, Food diary and Weight, for your
 * programme. You choose each one." `purpose` ("for your programme") is the
 * caller's; without it the list ends at the full stop.
 */
export function requestSummary(labels: string[], purpose?: string): string {
  const list = joinWithAnd(labels);
  return `${purpose ? `${list}, ${purpose}` : list}. You choose each one.`;
}
