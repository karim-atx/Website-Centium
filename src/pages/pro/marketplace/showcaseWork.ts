// Market + Share 3.0 · W5 · P-MA.2 Work history (`scWork`, Professional
// Marketplace Screens lines 182–215 and the script's `workList`), the
// professional's own view: pure lines on top of the lead's pro-profile display
// rules (workStub, workRoleLine, workDates). No Supabase import (node:test).

import { workDates, workStub, type WorkEntry } from "../../../services/pro-profile/model";
import { t, tn } from "../../../i18n/core";

/** "2 roles · 1 class slot" (the head row's count, 11.5 / 700 --tealink); "" with none. */
export function workCountLine(list: readonly Pick<WorkEntry, "type">[]): string {
  const roles = list.filter((e) => e.type === "role").length;
  const slots = list.filter((e) => e.type === "class_slot").length;
  const parts: string[] = [];
  if (roles) parts.push(tn(roles, "{n} role", "{n} roles"));
  if (slots) parts.push(tn(slots, "{n} class slot", "{n} class slots"));
  return parts.join(" · ");
}

/**
 * The entry's date line: the lead's workDates, plus " · ended" for a role
 * that ended (the board's "Jan to Jun 2025 · ended"). The board's "· 2
 * classes a week" / "· 1 class" need a count WorkEntry doesn't carry (DB10
 * work_history has none), so they're left out.
 */
export function workMetaLine(e: Pick<WorkEntry, "type" | "from" | "to">, today: string): string {
  const dates = workDates(e, today);
  return workStub(e, today) === "Ended" ? t("{dates} · ended", { dates }) : dates;
}
