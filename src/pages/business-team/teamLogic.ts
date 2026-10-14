import type { BizKind } from "../../components/business-more/kind";
import type { BusinessRole, ClassSession, TeamPerson } from "../../services/business-team/team";
import { personUsesSeat, professionLabel } from "../../services/business-team/seats";
import { range12 } from "../../utils/time12";
import { DAY_SHORT, startOfWeekISO, weekdayColumn } from "../../utils/week";
import { localDayOf, shiftDate } from "../../utils/date";

// v6 Batch 4 · Team. Pure rules for the team page, person page and sheets
// (OpsTabsV4 logic lines 462-481, 499-545, 605-611), with the sample data
// replaced by real rows.

/** Page title per type (COPY "Team and access": Instructors / Team / Staff). */
export const TEAM_TITLE: Record<BizKind, string> = { classes: "Instructors", gym: "Team", store: "Staff" };

/** Subtitle (source line 462). */
export const teamSubtitle = (kind: BizKind) =>
  kind === "store" ? "Your team and who can help run the store" : "Your instructors and staff";

/** The early-data word (OURS per type, OP1-055 #16). */
const STAFF_WORD: Record<BizKind, [string, string]> = {
  classes: ["instructor", "instructors"],
  gym: ["team member", "team members"],
  store: ["staff member", "staff"],
};

export interface RoleOption {
  value: BusinessRole;
  label: string;
  sub: string;
}

/**
 * The role menu (OP1-067 M4, source 609: Instructor, Personal trainer, Front
 * desk, Manager). Store adds Shop assistant and drops the teaching roles
 * (OURS Q6; the B6 enum has no physiotherapist or nutritionist role).
 */
export function roleOptions(kind: BizKind): RoleOption[] {
  const front: RoleOption = { value: "front_desk", label: "Front desk", sub: "Bookings and check-in" };
  const manager: RoleOption = { value: "manager", label: "Manager", sub: "Runs the schedule and team" };
  if (kind === "store") {
    return [{ value: "shop_assistant", label: "Shop assistant", sub: "Orders and the shop floor" }, front, manager];
  }
  return [
    { value: "instructor", label: "Instructor", sub: "Teaches classes" },
    { value: "trainer", label: "Personal trainer", sub: "One-to-one sessions" },
    front,
    manager,
  ];
}

export const ROLE_LABEL: Record<BusinessRole, string> = {
  instructor: "Instructor",
  trainer: "Personal trainer",
  front_desk: "Front desk",
  manager: "Manager",
  staff: "Staff",
  shop_assistant: "Shop assistant",
};

/** The role card's row title (OP1-061 #9, the menu subtitles). */
export const ROLE_DOES: Record<BusinessRole, string> = {
  instructor: "Teaches classes",
  trainer: "One-to-one sessions",
  front_desk: "Bookings and check-in",
  manager: "Runs the schedule and team",
  staff: "No console access yet",
  shop_assistant: "Orders and the shop floor",
};

/** Short role under a seat (source roleShort). */
export const roleShort = (role: BusinessRole) => ROLE_LABEL[role].replace("Personal trainer", "Trainer").replace("Shop assistant", "Assistant");

/** "Instructor · Physiotherapist": the access level and, when known, the profession (B6 follow-up). */
export const roleAndProfession = (p: TeamPerson) => {
  const prof = professionLabel(p);
  return prof && prof !== ROLE_LABEL[p.role] ? `${ROLE_LABEL[p.role]} · ${prof}` : ROLE_LABEL[p.role];
};

export const firstWord = (name: string) => name.trim().split(/\s+/)[0] || name;

/** Initials from the name (first letters of up to two words); "?" when unnamed. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0 || name === "Unnamed") return "?";
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const isAccepted = (p: TeamPerson) => !!p.acceptedAt;

export interface SeatCounts {
  used: number;
  invited: number;
  total: number;
  free: number;
}

/** used = accepted (B0: only they hold a seat); free = total − used − invited (source 637). */
/** People whose role uses a seat (instructor, trainer; B6 follow-up, Q-09). */
export const seatHolders = (people: TeamPerson[]) => people.filter((p) => personUsesSeat(p));
/** People whose role needs no seat (front desk, manager, staff, shop assistant). */
export const noSeatPeople = (people: TeamPerson[]) => people.filter((p) => !personUsesSeat(p));

/**
 * used = accepted seat-using roles; invited = unaccepted seat-using roles (B0:
 * an invitation holds no seat, it's reported apart); free = total − used −
 * invited (source 637). The database's my_business_seat_capacity counts the
 * same way; the screen prefers its numbers when they're loaded.
 */
export function seatCounts(people: TeamPerson[], capacity: number, server?: { used: number; invited: number } | null): SeatCounts {
  const holders = seatHolders(people);
  const used = server?.used ?? holders.filter(isAccepted).length;
  const invited = server?.invited ?? holders.length - holders.filter(isAccepted).length;
  return { used, invited, total: capacity, free: Math.max(0, capacity - used - invited) };
}

/** "4 of 5 seats used · 1 invited · 0 free" with the parts only when non-zero (source 637). */
export function seatLine(c: SeatCounts): string {
  return `${c.used} of ${c.total} seats used` + (c.invited ? ` · ${c.invited} invited` : "") + (c.free ? ` · ${c.free} free` : "");
}

/** The hint under the grid (source 481; OURS for zero seats, OP1-056 E). */
export function seatHint(c: SeatCounts, perBlock: number): string {
  if (c.total === 0) return `You have no seats yet. Add a block of ${perBlock} seats to invite people.`;
  return c.free > 0 ? "Tap a seat to see who's in it, or + to invite someone." : `All seats are taken. Add a block of ${perBlock} seats to invite more people.`;
}

export type Seat = { kind: "person"; person: TeamPerson; index: number } | { kind: "free"; index: number };

/**
 * Seats in blocks of `perBlock` (source 471-476): accepted people first, then
 * invitations, then free seats. Invitations hold no seat in the database (B0);
 * they are drawn in the next cells as the board does, and when there are more
 * invitations than cells the grid grows by one block for them.
 */
export function seatBlocks(people: TeamPerson[], capacity: number, perBlock: number): Seat[][] {
  const holders = seatHolders(people);
  const ordered = [...holders.filter(isAccepted), ...holders.filter((p) => !isAccepted(p))];
  const cells = Math.max(capacity, Math.ceil(ordered.length / perBlock) * perBlock);
  const seats: Seat[] = Array.from({ length: cells }, (_, i) =>
    ordered[i] ? { kind: "person", person: ordered[i], index: i } : { kind: "free", index: i }
  );
  const blocks: Seat[][] = [];
  for (let i = 0; i < seats.length; i += perBlock) blocks.push(seats.slice(i, i + perBlock));
  return blocks;
}

/** The Monday-first week containing `today`, and the one before (for deltas). */
export function weekRange(today: string, offsetWeeks = 0): { from: string; to: string } {
  const from = shiftDate(startOfWeekISO(today), offsetWeeks * 7);
  return { from, to: shiftDate(from, 6) };
}

const inRange = (d: string, r: { from: string; to: string }) => d >= r.from && d <= r.to;

export interface Boxes {
  boxes: { label: string; value: string; delta: string }[];
  line: string;
}

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `${n}` : "");

/**
 * The two number boxes and the sentence under them (source 462).
 * Deltas: against the previous Monday-to-Sunday week (OURS), hidden until the
 * team is 14 days old (OP1-055 early rule).
 */
export function teamBoxes(
  kind: BizKind,
  people: TeamPerson[],
  sessions: ClassSession[],
  capacity: number,
  today: string,
  now: number = Date.now(),
  server?: { used: number; invited: number } | null
): Boxes {
  const c = seatCounts(people, capacity, server);
  // Everyone counts as team, seat or not (a receptionist is on the team).
  const active = people.filter(isAccepted).length;
  const openInvites = people.length - active;
  const thisWeek = weekRange(today, 0);
  const lastWeek = weekRange(today, -1);
  const teamIds = new Set(people.filter(isAccepted).map((p) => p.professionalId));
  const teamSessions = sessions.filter((s) => s.professionalId && teamIds.has(s.professionalId));
  const sessThis = teamSessions.filter((s) => inRange(s.date, thisWeek));
  const sessLast = teamSessions.filter((s) => inRange(s.date, lastWeek));
  const oldest = people.reduce<number | null>((m, p) => {
    const t = Date.parse(p.invitedAt);
    return Number.isNaN(t) ? m : m === null ? t : Math.min(m, t);
  }, null);
  const early = oldest === null || now - oldest < 14 * 86400000;
  const weekAgo = now - 7 * 86400000;
  const activeWeekAgo = people.filter((p) => p.acceptedAt && Date.parse(p.acceptedAt) <= weekAgo).length;

  if (people.length === 0) {
    return {
      boxes: [
        { label: "Active team", value: "0", delta: "" },
        { label: kind === "store" ? "Open invites" : "Sessions this week", value: "0", delta: "" },
      ],
      line: "Invite the people who work with you. Instructors and trainers use a seat.",
    };
  }
  if (kind === "store") {
    const firstInvited = people.find((p) => !isAccepted(p));
    return {
      boxes: [
        { label: "Active team", value: String(active), delta: "" },
        { label: "Open invites", value: String(openInvites), delta: "" },
      ],
      line: `${c.used} of ${c.total} seats used.` + (firstInvited ? ` ${firstInvited.name} hasn't accepted their invite yet.` : ""),
    };
  }
  const boxes = [
    { label: "Active team", value: String(active), delta: early ? "" : signed(active - activeWeekAgo) },
    { label: "Sessions this week", value: String(sessThis.length), delta: early ? "" : signed(sessThis.length - sessLast.length) },
  ];
  if (early) {
    return { boxes, line: `${active} ${STAFF_WORD[kind][active === 1 ? 0 : 1]} so far. Seats left: ${c.free}.` };
  }
  const byPerson = new Map<string, number>();
  for (const s of sessThis) byPerson.set(s.professionalId!, (byPerson.get(s.professionalId!) ?? 0) + 1);
  const top = [...byPerson.entries()].sort((a, b) => b[1] - a[1])[0];
  const topName = top ? people.find((p) => p.professionalId === top[0])?.name : null;
  const line = top && topName
    ? `${topName} teaches the most: ${top[1]} session${top[1] === 1 ? "" : "s"} this week.`
    : `${c.used} of ${c.total} seats used. No sessions on the schedule this week.`;
  return { boxes, line };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Mon 5 Oct" for a yyyy-mm-dd date. */
export function dayDate(d: string): string {
  const dt = new Date(`${d}T00:00:00`);
  return `${DAY_SHORT[weekdayColumn(dt)]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

/** "12 Mar 2026" for an instant. */
export function longDate(iso: string): string {
  const dt = new Date(iso);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

/** "Today" / "Tue 6 Oct". */
export const dayWord = (d: string, today: string) => (d === today ? "Today" : dayDate(d));

/** A session line for the preview card: "Today 6:00 PM · Spin 45 · 18 of 20 booked" (source NEXT, 12-hour). */
export function previewLine(s: ClassSession, today: string, booked: number | null): string {
  const time = range12(s.start, null);
  return `${dayWord(s.date, today)} ${time} · ${s.title}` + (booked === null ? "" : ` · ${booked} of ${s.capacity} booked`);
}

/** Classes of one person that overlap another of theirs on the same day (BU2-18 clash). */
export function clashOf(s: ClassSession, all: ClassSession[]): ClassSession | null {
  return (
    all.find(
      (o) => o.id !== s.id && o.date === s.date && o.professionalId === s.professionalId && o.start < s.end && s.start < o.end
    ) ?? null
  );
}

/** "Requested today at 9:12 AM" / "Requested Sat 3 Oct" (OP1-124 #9d, 12-hour). */
export function requestedWhen(iso: string, today: string): string {
  const dt = new Date(iso);
  const local = localDayOf(dt);
  if (local === today) {
    const h = dt.getHours();
    const m = dt.getMinutes();
    return `Requested today at ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }
  return `Requested ${dayDate(local)}`;
}
