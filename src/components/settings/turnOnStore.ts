import type { UnlockMethod } from "../../services/journal/lockLogic";

// services/journal's FolderLockAuth, restated so this (and its test) stays
// clear of the Supabase client.
interface FolderLockAuth {
  method: UnlockMethod;
  email: string;
}

// Round K (DB-Z8): the "turn on" flow's state, kept outside UnlockPhones so it
// survives a remount. The fingerprint sheet can stay open for minutes; when the
// app resumes the page may mount again while register_device_key is still
// answering, and state held in the component was lost with it (the App's
// emulator test: ATXB1 logged, then neither "Confirm it's you" nor an error).
// Tagged with the account, so nothing carries across a sign-out.

export interface TurnOnState {
  owner: string | null;
  busy: boolean;
  error: string | null;
  /** The public key made on the phone, waiting for a re-authentication. */
  pending: { publicKey: string; auth: FolderLockAuth } | null;
  notice?: string;
  /** The server's line after a phone was added. */
  done: string | null;
  /** Bumped when a phone was added, so a remounted list reads again. */
  added: number;
}

const EMPTY: TurnOnState = { owner: null, busy: false, error: null, pending: null, done: null, added: 0 };

let state: TurnOnState = EMPTY;
const listeners = new Set<() => void>();

export function turnOnSnapshot(): TurnOnState {
  return state;
}

export function subscribeTurnOn(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Merges `patch` for `owner`; another account's state is dropped first. */
export function setTurnOn(owner: string | null, patch: Partial<Omit<TurnOnState, "owner">>): void {
  const base = state.owner === owner ? state : { ...EMPTY, owner };
  state = { ...base, ...patch };
  for (const l of listeners) l();
}

/** The state as `owner` should see it: empty when it belongs to someone else. */
export function turnOnFor(snapshot: TurnOnState, owner: string | null): TurnOnState {
  return snapshot.owner === owner ? snapshot : { ...EMPTY, owner };
}

/** Tests only. */
export function resetTurnOn(): void {
  state = EMPTY;
  for (const l of listeners) l();
}
