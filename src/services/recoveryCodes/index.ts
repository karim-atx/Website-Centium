import { supabase } from "../../../lib/supabase/client";
import type { PostgrestError } from "@supabase/supabase-js";

// Two-factor recovery codes (v5.1 backend stage 1, Database docs/HANDOVER_API.md).
//
// THREE FUNCTIONS ARE THE WHOLE INTERFACE. The tables behind them are revoked
// from every client role, so nothing here queries them. Ten codes come back
// from generate_two_factor_recovery_codes() once, at the moment they are
// made; afterwards only bcrypt hashes exist, so no screen can show a sheet
// again. "View codes" therefore shows the masked sheet and the count, with
// Generate new as the way to get readable codes (the API doc's resolution of
// the MO1.8.4.3 conflict).
//
// A REDEEMED CODE DOES NOT RAISE THE SESSION TO aal2. Only GoTrue mints
// tokens. For a member that's enough: the challenge screen is a step this app
// imposes on a working aal1 session, so success = true is the signal to let
// them past it (AppContext.passMfaWithRecoveryCode). For an admin it is not,
// by design: the admin console keeps requiring aal2.
//
// The generated types are read from production, where this stage isn't yet,
// so the three calls go through one narrow cast rather than a regenerated
// types file.

export type RecoveryResult<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

export interface RecoveryStatus {
  twoFactorEnabled: boolean;
  factorAddedAt: string | null;
  total: number;
  remaining: number;
  generatedAt: string | null;
  lastUsedAt: string | null;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  remaining: number | null;
}

interface StatusRow {
  two_factor_enabled: boolean;
  factor_added_at: string | null;
  total: number;
  remaining: number;
  generated_at: string | null;
  last_used_at: string | null;
}

type Rpc = <T>(fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: T | null; error: PostgrestError | null }>;
const rpc = supabase.rpc.bind(supabase) as unknown as Rpc;

function describe(error: PostgrestError): { message: string; code?: string } {
  switch (error.code) {
    case "ATX01":
      return { code: "ATX01", message: "Your session expired. Sign in again." };
    case "ATX75":
      return { code: "ATX75", message: "Complete your authenticator challenge first." };
    case "ATX74":
      return { code: "ATX74", message: "Turn on two-factor first." };
    case "ATX02":
      // Written to be shown as it is, and it names the delay.
      return { code: "ATX02", message: error.message };
    default:
      return { code: error.code, message: "Couldn't reach Centium. Check your connection and try again." };
  }
}

/** Ten fresh codes, replacing any earlier sheet. The only time they're readable. */
export async function generateRecoveryCodes(): Promise<RecoveryResult<string[]>> {
  const { data, error } = await rpc<string[]>("generate_two_factor_recovery_codes");
  if (error) return { ok: false, ...describe(error) };
  return { ok: true, value: data ?? [] };
}

/** The Recovery codes widget's numbers. Always one row (0 / 0 before a sheet). */
export async function getRecoveryStatus(): Promise<RecoveryResult<RecoveryStatus>> {
  const { data, error } = await rpc<StatusRow[] | StatusRow>("two_factor_recovery_status");
  if (error) return { ok: false, ...describe(error) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, message: "Couldn't read your recovery codes." };
  return {
    ok: true,
    value: {
      twoFactorEnabled: row.two_factor_enabled,
      factorAddedAt: row.factor_added_at,
      total: row.total,
      remaining: row.remaining,
      generatedAt: row.generated_at,
      lastUsedAt: row.last_used_at,
    },
  };
}

/**
 * Spends one code at sign-in. A wrong code is `success: false` with the
 * server's one sentence, never an error; only ATX01 / ATX02 come back as
 * failures. Input is passed trimmed and otherwise as typed: the server
 * forgives case, hyphens, spaces, O/0 and I/1.
 */
export async function redeemRecoveryCode(typed: string): Promise<RecoveryResult<RedeemResult>> {
  const { data, error } = await rpc<RedeemResult | RedeemResult[]>("redeem_two_factor_recovery_code", { p_code: typed.trim() });
  if (error) return { ok: false, ...describe(error) };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, message: "Couldn't check that code. Try again." };
  return { ok: true, value: { success: !!row.success, message: row.message, remaining: row.remaining ?? null } };
}
