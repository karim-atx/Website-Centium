import type { AccessCategory, GrantMap } from "./index";

/**
 * A record of what the client last asked a consent switch to do, written
 * BEFORE the request goes out and cleared when it answers.
 *
 * WHY A WRITE NEEDS A WITNESS AT ALL. `keepalive` (see lib/supabase/suspension)
 * carries a consent write across a page unload, which was the reproduced cause
 * of three recorded failures. It cannot carry one across a connection that is
 * genuinely gone — a dropped network mid-flight, a browser that evicts the page
 * before the request is handed to the network stack, a server that never
 * answers. In those cases the row keeps its old value, the tab is gone before
 * any error can be raised, and the client is left believing a switch is set the
 * way they left it.
 *
 * So the intent is recorded first. On the next load the recorded intent is
 * compared with what the database actually says, and a disagreement is told to
 * the client in words rather than rendered as a switch that quietly sprang
 * back. On a control that gates clinical data, "it didn't save" has to be
 * something the client is told, not something they are left to notice.
 *
 * WHAT IS STORED, AND WHAT DELIBERATELY IS NOT. A professional's id, a category
 * name, the value asked for, and when. No health data of any kind, and nothing
 * that is not already visible on the screen that wrote it. It is keyed by the
 * client's own user id, so a second account signing in on the same device
 * neither sees nor reconciles someone else's record.
 *
 * localStorage rather than sessionStorage, which is the opposite of the choice
 * made for the suspension flag and for a reason worth stating: a sessionStorage
 * record dies with the tab, and "the tab went away mid-write" is precisely the
 * case this exists to catch.
 */
export interface PendingGrantChange {
  professionalId: string;
  category: AccessCategory;
  /** What the switch was moved to. */
  requested: boolean;
  /** ISO. Only used to expire records nobody ever came back for. */
  at: string;
}

const KEY_PREFIX = "centium-consent-pending:";

/**
 * How long an unreconciled record is kept.
 *
 * Long enough to survive a closed tab and a night's sleep, short enough that a
 * record nobody has come back to in a week stops being evidence of anything.
 * It is not a safety limit — a record only ever produces a message when the
 * database disagrees with it, and being told a change is not in effect is
 * true whether it was lost in flight or overridden from another device.
 */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const keyFor = (clientId: string) => `${KEY_PREFIX}${clientId}`;

/**
 * Storage can be absent or refuse to write — private mode, blocked site data,
 * a full quota. None of that may break a consent toggle, which is why every
 * path here fails to the same place: no record, no reconciliation, and the
 * write itself entirely unaffected.
 */
function read(clientId: string): PendingGrantChange[] {
  try {
    const raw = localStorage.getItem(keyFor(clientId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - MAX_AGE_MS;
    return (parsed as PendingGrantChange[]).filter(
      (p) =>
        p &&
        typeof p.professionalId === "string" &&
        typeof p.category === "string" &&
        typeof p.requested === "boolean" &&
        typeof p.at === "string" &&
        Date.parse(p.at) > cutoff
    );
  } catch {
    return [];
  }
}

function write(clientId: string, records: PendingGrantChange[]): void {
  try {
    if (records.length === 0) localStorage.removeItem(keyFor(clientId));
    else localStorage.setItem(keyFor(clientId), JSON.stringify(records));
  } catch {
    /* See read(): storage is a convenience here, never a dependency. */
  }
}

const sameTarget = (a: { professionalId: string; category: string }, b: { professionalId: string; category: string }) =>
  a.professionalId === b.professionalId && a.category === b.category;

/**
 * Records an intent. One record per (professional, category): a second toggle
 * of the same switch replaces the first, because only the latest answer is
 * the one the client would expect to find in effect.
 */
export function recordPendingGrant(
  clientId: string,
  professionalId: string,
  category: AccessCategory,
  requested: boolean
): void {
  const record: PendingGrantChange = { professionalId, category, requested, at: new Date().toISOString() };
  write(clientId, [...read(clientId).filter((p) => !sameTarget(p, record)), record]);
}

/** Drops an intent once its write has answered, either way. */
export function clearPendingGrant(
  clientId: string,
  professionalId: string,
  category: AccessCategory
): void {
  write(
    clientId,
    read(clientId).filter((p) => !sameTarget(p, { professionalId, category }))
  );
}

/**
 * Compares every recorded intent against what the database actually returned,
 * and hands back the ones that did not take effect.
 *
 * DROPS THE ONES THAT AGREE AND KEEPS THE ONES THAT DO NOT, which is the
 * opposite of what this did first and the correction came from testing rather
 * than from reasoning. Clearing a record the moment it was read meant the
 * warning survived exactly one mount — and React's StrictMode mounts an effect
 * twice in development, so the first pass consumed the record and the second
 * found nothing left to warn about. The message never appeared. Any remount
 * would have done the same thing in production: leaving the screen and coming
 * back would have quietly eaten a PHI warning.
 *
 * So a disagreement persists until it stops being one. It goes away when the
 * database catches up with what the client asked for — which happens when they
 * set the switch again here (a new record replaces this one), or from another
 * device, or from any path that changes the row. Until then the client is
 * still not sharing what they think they are sharing, and saying so again is
 * the correct behaviour, not nagging. The seven-day expiry in `read` is the
 * only thing that ever removes one silently.
 *
 * A record naming a professional who is no longer in `grants` is dropped
 * without a word: the relationship has ended, which clears every grant between
 * the pair anyway, so there is no live sharing to warn anyone about.
 */
export function reconcilePendingGrants(
  clientId: string,
  grants: Record<string, GrantMap>
): PendingGrantChange[] {
  const records = read(clientId);
  if (records.length === 0) return [];

  const unsaved = records.filter((p) => {
    const known = grants[p.professionalId];
    if (!known) return false;
    return (known[p.category] === true) !== p.requested;
  });

  write(clientId, unsaved);
  return unsaved;
}
