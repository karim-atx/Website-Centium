import { useCallback, useEffect, useSyncExternalStore } from "react";
import { fetchCategories, fetchMyNickname } from "../../services/forum";
import type { ForumCategory } from "../../services/forum/rules";

// What every forum screen needs about the reader: the categories (with their
// sensitivity, for recovery-sensitive mode) and their own nickname. Held in a
// small module store so moving between the list, a post and the composer does
// not refetch either, and a nickname saved in one place shows everywhere.

type State = {
  userId: string | null;
  categories: ForumCategory[] | null;
  /** undefined while loading, null when none has been chosen. */
  nickname: string | null | undefined;
  error: string | null;
};

let state: State = { userId: null, categories: null, nickname: undefined, error: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  emit();
};

let inflight: Promise<void> | null = null;

async function load(userId: string) {
  let cats: Awaited<ReturnType<typeof fetchCategories>>;
  let nick: Awaited<ReturnType<typeof fetchMyNickname>>;
  try {
    [cats, nick] = await Promise.all([fetchCategories(), fetchMyNickname(userId)]);
  } catch {
    if (state.userId === userId) set({ error: "Couldn't load the forum. Check your connection and try again." });
    return;
  }
  if (state.userId !== userId) return;
  set({
    categories: cats.ok ? cats.value : state.categories,
    nickname: nick.ok ? nick.value : state.nickname,
    error: !cats.ok ? cats.message : !nick.ok ? nick.message : null,
  });
}

/** Called after a successful save so every screen shows the new nickname. */
export function rememberNickname(nickname: string) {
  set({ nickname });
}

export function useForumMe(userId: string | null) {
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state
  );
  useEffect(() => {
    if (!userId) return;
    if (state.userId !== userId) {
      inflight = null;
      set({ userId, categories: null, nickname: undefined, error: null });
    }
    if (state.categories && state.nickname !== undefined) return;
    if (!inflight) {
      inflight = load(userId).finally(() => {
        inflight = null;
      });
    }
  }, [userId]);

  const retry = useCallback(() => {
    if (!userId) return;
    set({ error: null });
    inflight = load(userId).finally(() => {
      inflight = null;
    });
  }, [userId]);

  const mine = snap.userId === userId;
  return {
    categories: mine ? snap.categories : null,
    nickname: mine ? snap.nickname : undefined,
    error: mine ? snap.error : null,
    retry,
  };
}
