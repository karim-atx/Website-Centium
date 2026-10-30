import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";

// Release 3 · DB-7 / CU9: the client's "Add to my week" on a professional's
// recommendation. Cards are immutable, so "Added" is the client's own
// recommendation_adds row (select: own rows, or the sender's).
// recommendation_adds and add_recommendation are newer than the generated
// types, so the client is cast here.

const db = supabase as unknown as {
  from: (t: "recommendation_adds") => {
    select: (c: string) => {
      eq: (col: string, v: string) => {
        in: (col: string, v: string[]) => PromiseLike<{ data: { message_id: string }[] | null; error: { message: string } | null }>;
      };
    };
  };
  rpc: (fn: "add_recommendation", args: { p_message_id: string }) => PromiseLike<{ data: string | null; error: { code?: string; message: string } | null }>;
};

/** Which of these recommendations this account has already added. A failed read is "none yet". */
export async function fetchAddedRecommendations(userId: string, messageIds: string[]): Promise<Set<string>> {
  if (messageIds.length === 0) return new Set();
  const { data, error } = await db.from("recommendation_adds").select("message_id").eq("client_id", userId).in("message_id", messageIds);
  if (error) {
    console.error("[messages] Could not load added recommendations:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.message_id));
}

/** add_recommendation(p_message_id): idempotent; ATX08 when it isn't a recommendation to you. */
export async function addRecommendation(messageId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await db.rpc("add_recommendation", { p_message_id: messageId });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  return {
    ok: false,
    message: error.code === "ATX08" ? t("This recommendation isn't available any more.") : t("Couldn't add this to your week. Try again."),
  };
}
