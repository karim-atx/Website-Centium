// Release 3 · CU18–CU21 (Karim answer 3): sharing one lab result, or every
// result of its test (the panel), with one connected professional. The pure
// part, testable without Supabase.

export interface ResultShare {
  id: string;
  professionalId: string;
  /** One result (blood_markers.id), or null for a whole-test share. */
  bloodMarkerId: string | null;
  /** A whole test (blood_panels.id), or null for a single result. */
  bloodPanelId: string | null;
  note: string | null;
  sharedAt: string;
}

export type ShareScope = "result" | "panel";

/** The result a share sheet is about: its row id and, if it came from a report, that report. */
export interface ShareSubject {
  resultId: string;
  panelId: string | null;
}

/** Shares that make this result visible: the result itself, or its whole test. */
export function sharesCovering(shares: ResultShare[], subject: ShareSubject): ResultShare[] {
  return shares.filter(
    (s) => s.bloodMarkerId === subject.resultId || (subject.panelId !== null && s.bloodPanelId === subject.panelId)
  );
}

/** The share row that exactly matches a (professional, scope) choice, if any. */
export function existingShare(
  shares: ResultShare[],
  professionalId: string,
  scope: ShareScope,
  subject: ShareSubject
): ResultShare | null {
  return (
    shares.find(
      (s) =>
        s.professionalId === professionalId &&
        (scope === "result" ? s.bloodMarkerId === subject.resultId : subject.panelId !== null && s.bloodPanelId === subject.panelId)
    ) ?? null
  );
}

/** The insert payload for a choice; null when the whole-test option doesn't apply. */
export function shareRow(
  clientId: string,
  professionalId: string,
  scope: ShareScope,
  subject: ShareSubject,
  note: string
): { client_id: string; professional_id: string; blood_marker_id: string | null; blood_panel_id: string | null; note: string | null } | null {
  if (scope === "panel" && !subject.panelId) return null;
  const n = note.trim();
  return {
    client_id: clientId,
    professional_id: professionalId,
    blood_marker_id: scope === "result" ? subject.resultId : null,
    blood_panel_id: scope === "panel" ? subject.panelId : null,
    note: n ? n.slice(0, 280) : null,
  };
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

/**
 * CU21 v2: "Lab results as a whole are off for {first} in Data sharing. Only
 * these two are visible."
 */
export function onlyTheseLine(firstName: string, count: number): string {
  const n = WORDS[count] ?? String(count);
  const tail = count === 1 ? "Only this one is visible." : `Only these ${n} are visible.`;
  return `Lab results as a whole are off for ${firstName} in Data sharing. ${tail}`;
}

/** "A", "A and B", "A, B and C". */
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/**
 * CU17 v2 banner: "Shared with Alex Morgan, GP" for one professional (name and
 * role line), first names joined for two or three, a count beyond.
 */
export function sharedWithLabel(people: { line: string; firstName: string }[]): string | null {
  if (people.length === 0) return null;
  if (people.length === 1) return `Shared with ${people[0].line}`;
  if (people.length <= 3) return `Shared with ${joinAnd(people.map((p) => p.firstName))}`;
  return `Shared with ${people.length} professionals`;
}
