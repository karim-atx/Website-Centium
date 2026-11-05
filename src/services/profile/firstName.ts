import { rpc } from "../pro/rpc";
import { t } from "../../i18n/core";
import { checkFirstName } from "./nameRules";
import { describeFirstNameError } from "./firstNameErrors";

// Round J · FI: every first-name write goes through set_my_first_name
// (Database 20261226520000): Settings › Account, the professional's Name
// sheet and onboarding. It returns the name as saved (trimmed), audits it, and
// allows five changes in 30 days (setting it the first time isn't a change).
// The same rules run in a profiles trigger; the direct UPDATE(first_name)
// grant is revoked once this is live everywhere.

/** Sets the signed-in member's first name. The shared rule first, then the server's. */
export async function setMyFirstName(raw: string): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const checked = checkFirstName(raw);
  if (!checked.ok) return { ok: false, message: t(checked.message) };
  try {
    const { data, error } = await rpc("set_my_first_name", { p_first_name: checked.name });
    if (error) return { ok: false, message: describeFirstNameError(error) };
    return { ok: true, name: typeof data === "string" && data.trim() ? data : checked.name };
  } catch (e) {
    return { ok: false, message: describeFirstNameError(e as { code?: string; message?: string }) };
  }
}
