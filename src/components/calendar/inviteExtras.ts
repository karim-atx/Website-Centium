import { supabase } from "../../../lib/supabase/client";
import { formatPrice } from "../../utils/price";
import { toEventAlert, type EventAlert } from "./eventAlert";

// CU7 (Release 3, DB-4): what a professional's session invitation adds on the
// client's calendar, read beside getCalendar rather than inside it so the
// calendar read itself is unchanged.
//
// - The session pack: session_packs() as the client (p_client_id null: the
//   caller's own active hires whose plan has a session_count), matched to the
//   event's owner. Only on a session (calendar_events.appointment_service_id),
//   with its price (calendar_events.price, USD like every appointment_services
//   row).
// - The professional's reminders: calendar_event_invitees.alert / alert_2,
//   which the professional sets when inviting (createSessions, CA22 defaults).
//   Also only on a session, from somebody else, named by
//   related_profile_summary.
//
// A failed read returns an empty map: the invitation still shows as before,
// just without these two lines.

export interface InviteExtra {
  /** "$60" or "" when the session has no price. */
  price: string;
  /** Sessions left on the pack with this professional; undefined = no pack. */
  packLeft?: number;
  /** The inviting professional's reminders, when any is set. */
  reminder?: { first: string; alert: EventAlert; alert2: EventAlert };
}

type Row = {
  id: string;
  invited_by: string | null;
  alert: string | null;
  alert_2: string | null;
  calendar_events: { owner_id: string; price: number | string | null; appointment_service_id: string | null } | null;
};

type PackRow = { professional_id: string; sessions_left: number };

const db = supabase as unknown as {
  from: (t: string) => {
    select: (c: string) => {
      eq: (col: string, v: string) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
      in: (col: string, v: string[]) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** By calendar_event_invitees.id. */
export async function fetchInviteExtras(userId: string): Promise<Record<string, InviteExtra>> {
  const rows = await db
    .from("calendar_event_invitees")
    .select("id, invited_by, alert, alert_2, calendar_events (owner_id, price, appointment_service_id)")
    .eq("invited_user_id", userId);
  if (rows.error) {
    console.error("[calendar] Could not load session details:", rows.error.message);
    return {};
  }
  const sessions = ((rows.data ?? []) as Row[]).filter((r) => r.calendar_events?.appointment_service_id);
  if (sessions.length === 0) return {};

  const [packs, names] = await Promise.all([
    db.rpc("session_packs", { p_client_id: null }),
    (() => {
      const ids = [...new Set(sessions.map((r) => r.invited_by).filter((x): x is string => !!x && x !== userId))];
      return ids.length
        ? db.from("related_profile_summary").select("id, first_name").in("id", ids)
        : Promise.resolve({ data: [], error: null });
    })(),
  ]);
  if (packs.error) console.error("[calendar] Could not load session packs:", packs.error.message);
  const leftByPro = new Map(((packs.data ?? []) as PackRow[]).map((p) => [p.professional_id, p.sessions_left]));
  const nameById = new Map(
    ((names.data ?? []) as { id: string; first_name: string | null }[]).map((p) => [p.id, p.first_name?.trim() || ""])
  );

  const out: Record<string, InviteExtra> = {};
  for (const r of sessions) {
    const ev = r.calendar_events!;
    const alert = toEventAlert(r.alert);
    const alert2 = toEventAlert(r.alert_2);
    const first = r.invited_by ? nameById.get(r.invited_by) : undefined;
    out[r.id] = {
      price: formatPrice(ev.price),
      packLeft: leftByPro.get(ev.owner_id),
      reminder: first && (alert !== "none" || alert2 !== "none") ? { first, alert, alert2 } : undefined,
    };
  }
  return out;
}
