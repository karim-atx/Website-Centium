import { supabase } from "../../../lib/supabase/client";
import { matchesPhrase, type Phrase } from "./normalise";
import { parsePhrases } from "./support";

// The self-harm phrase list (self_harm_phrases(), signed in), read once per
// session and kept in memory. Only the list comes down; the text it is
// compared with never leaves the device.

type Rpc = { rpc: (fn: string) => PromiseLike<{ data: unknown; error: { message: string } | null }> };

let cached: Promise<Phrase[]> | null = null;

async function read(): Promise<Phrase[]> {
  const { data, error } = await (supabase as unknown as Rpc).rpc("self_harm_phrases");
  if (error) {
    console.error("[moderation] Could not read the support phrases:", error.message);
    cached = null; // try again next time
    return [];
  }
  return parsePhrases(data);
}

export function loadSelfHarmPhrases(): Promise<Phrase[]> {
  if (!cached) cached = read();
  return cached;
}

/** Whether the person's own text holds a self-harm phrase. False when the list can't be read. */
export async function mentionsSelfHarm(text: string): Promise<boolean> {
  if (!text.trim()) return false;
  return matchesPhrase(text, await loadSelfHarmPhrases());
}
