// The outbox's pure rules (Round D, D22), apart from storage so they are
// tested without the browser: which waiting entry a new one replaces, and
// what is waiting in words.

export type OutboxKind = "water" | "weight" | "bp" | "food" | "habit" | "workout" | "message" | "goal";

/** The fields the rules read; every queued entry has at least these. */
export type OutboxItem = { id: string; kind: OutboxKind; habitId?: string; day?: string; metric?: string };

/** The queue after adding \`item\`: a habit tick (same habit and day) or a goal (same metric) replaces the waiting one. */
export function withQueued<T extends OutboxItem>(items: readonly T[], item: T): T[] {
  if (item.kind === "habit") return [...items.filter((q) => !(q.kind === "habit" && q.habitId === item.habitId && q.day === item.day)), item];
  if (item.kind === "goal") return [...items.filter((q) => !(q.kind === "goal" && q.metric === item.metric)), item];
  return [...items, item];
}

const KIND_WORDS: Record<OutboxKind, [string, string]> = {
  water: ["water entry", "water entries"],
  weight: ["weight entry", "weight entries"],
  bp: ["blood pressure reading", "blood pressure readings"],
  food: ["food entry", "food entries"],
  habit: ["habit tick", "habit ticks"],
  workout: ["workout", "workouts"],
  message: ["message", "messages"],
  goal: ["goal", "goals"],
};

/** "2 food entries and 1 workout": what is waiting, in words, for the sign-out warning and the sheet. */
export function describeQueued(items: readonly { kind: OutboxKind }[]): string {
  const counts = new Map<OutboxKind, number>();
  for (const q of items) counts.set(q.kind, (counts.get(q.kind) ?? 0) + 1);
  const parts = (Object.keys(KIND_WORDS) as OutboxKind[])
    .filter((k) => counts.has(k))
    .map((k) => {
      const n = counts.get(k)!;
      return `${n} ${KIND_WORDS[k][n === 1 ? 0 : 1]}`;
    });
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
