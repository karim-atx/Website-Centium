import { personUsesSeat } from "../../../services/business-team/seats";
import type { TeamPerson } from "./teamData";
import type { TeamState } from "./useTeam";
import type { Vocab } from "./vocab";
import { t, tn } from "../../../i18n/core";

// Small helpers shared by the Team index and section (kept out of component files for fast refresh).

export interface SeatEntry {
  kind: "used" | "pending" | "free";
  person?: TeamPerson;
}

export function seatList(state: TeamState): SeatEntry[] {
  const people = state.team?.people ?? [];
  // Seats count instructors and trainers only (B6 follow-up, role_uses_seat).
  const holders = people.filter((p) => personUsesSeat(p));
  const used = holders.filter((p) => p.acceptedAt);
  const pending = holders.filter((p) => !p.acceptedAt);
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
  return n === 0 ? t("today") : n === 1 ? t("yesterday") : tn(n, "{n} day ago", "{n} days ago");
};

export const errText = (e: "offline" | "error", vocab: Vocab) =>
  e === "offline"
    ? vocab.kind === "store"
      ? t("You're offline. Showing your staff as of the last update.")
      : t("You're offline. Showing your team as of the last update.")
    : t("Couldn't load your team. Check your connection and try again.");
