/**
 * A form's answers kept on this device as they are typed (Round D O7).
 *
 * The server draft is saved a moment after each change, but closing the
 * sheet offline used to lose whatever hadn't reached it. This copy is
 * written on every change and read back when the form opens again, then
 * saved to the server once there is a connection; it is cleared when the
 * server has it or the form is sent. Under "centium-state:" so signing out
 * clears it with the rest of the account's device cache.
 */
export type DraftAnswers = Record<string, unknown>;

const keyFor = (userId: string, assignmentId: string) => `centium-state:form-draft:${userId}:${assignmentId}`;

export function readLocalDraft(userId: string, assignmentId: string): DraftAnswers | null {
  try {
    const raw = window.localStorage.getItem(keyFor(userId, assignmentId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as DraftAnswers) : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(userId: string, assignmentId: string, answers: DraftAnswers): void {
  try {
    window.localStorage.setItem(keyFor(userId, assignmentId), JSON.stringify(answers));
  } catch {
    /* storage unavailable: the server draft is the only copy, as before */
  }
}

export function clearLocalDraft(userId: string, assignmentId: string): void {
  try {
    window.localStorage.removeItem(keyFor(userId, assignmentId));
  } catch {
    /* nothing to clear */
  }
}
