// Round I · FH: Help for members and professionals (Database 20261226480000,
// HANDOVER_API "Round I · FH"). The calls; the rules are in ./helpModel.
//
// - help_center(p_audience, p_language): every published topic and question,
//   in order, signed out too.
// - help_vote(p_question_id, p_helpful): "Was this helpful?", signed in only;
//   a second vote replaces the first.
// - start_support_thread_from_help(p_topic_id, p_question_ids): the support
//   chat, found or created as start_support_thread() does, with the topic and
//   the questions viewed recorded for the Admin (never posted in the chat).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t } from "../../i18n/core";
import { parseHelpCenter, type HelpCenter } from "./helpModel";

export * from "./helpModel";

export type HelpAudience = "member" | "professional";

// Not in the generated types yet (Database Round I is newer than database.types.ts).
type Rpc = { rpc: (fn: string, args: object) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }> };
const rpc = (fn: string, args: object) => (supabase as unknown as Rpc).rpc(fn, args);

export async function fetchHelpCenter(audience: HelpAudience, language: "en" | "ar"): Promise<{ ok: true; value: HelpCenter } | { ok: false; message: string }> {
  const { data, error } = await rpc("help_center", { p_audience: audience, p_language: language });
  const parsed = error ? null : parseHelpCenter(data);
  if (parsed) return { ok: true, value: parsed };
  if (error && isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  return { ok: false, message: t("Couldn't load Help. Try again.") };
}

/** "Was this helpful?": true when the vote was kept. */
export async function voteHelpful(questionId: string, helpful: boolean): Promise<boolean> {
  const { error } = await rpc("help_vote", { p_question_id: questionId, p_helpful: helpful });
  return !error;
}

/** The support chat, with what was read in Help recorded alongside it. */
export async function startSupportThreadFromHelp(topicId: string, questionIds: readonly string[]): Promise<{ ok: true; threadId: string } | { ok: false; message: string }> {
  const { data, error } = await rpc("start_support_thread_from_help", { p_topic_id: topicId, p_question_ids: [...questionIds] });
  if (!error && typeof data === "string") return { ok: true, threadId: data };
  if (error && isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  // ATX02: more than 20 chats opened from Help today.
  if (error?.code === "ATX02") return { ok: false, message: t("You've opened the chat from Help many times today. Try again tomorrow, or email us.") };
  if (error?.code === "ATX06") return { ok: false, message: t("Your session expired. Sign in again to chat with support.") };
  return { ok: false, message: t("Couldn't open the chat. Try again, or email us.") };
}
