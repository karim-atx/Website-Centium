import type { TeamPerson } from "./teamData";
import type { TeamState } from "./useTeam";
import type { Vocab } from "./vocab";

// Small helpers shared by the Team index and section (kept out of component files for fast refresh).

export interface SeatEntry {
  kind: "used" | "pending" | "free";
  person?: TeamPerson;
}

export function seatList(state: TeamState): SeatEntry[] {
  const people = state.team?.people ?? [];
  const used = people.filter((p) => p.acceptedAt);
  const pending = people.filter((p) => !p.acceptedAt);
  const free = Math.max(0, (state.team?.seats.capacity ?? 0) - used.length - pending.length);
  return [
    ...used.map((person) => ({ kind: "used" as const, person })),
    ...pending.map((person) => ({ kind: "pending" as const, person })),
    ...Array.from({ length: free }, () => ({ kind: "free" as const })),
  ];
}

const daysAgo = (iso: string, today: string): number =>
  Math.max(0, Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${iso.slice(0, 10)}T00:00:00`).getTime()) / 86400000));

export const sentAgo = (iso: string, today: string): string => {
  const n = daysAgo(iso, today);
  return n === 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
};

export const errText = (e: "offline" | "error", vocab: Vocab) =>
  e === "offline" ? `You're offline. Showing your ${vocab.teamWord} as of the last update.` : `Couldn't load your ${vocab.teamWord}. Check your connection and try again.`;
