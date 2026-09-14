import { supabase } from "../../../lib/supabase/client";
import { findCatalogFoodByName } from "../food";
import type { FoodSearchResult } from "../food";

// Real voice food logging: a recorded clip in, candidate foods out.
//
// REPLACES parseFoodInput, WHICH WAS A CANNED RESPONSE. That function ignored
// its argument and returned the same four items -- shawarma, toum, fries, Diet
// Pepsi -- for every recording, alongside a hardcoded transcript the user was
// shown as though it were what they had said. Nothing about it was real except
// the diary rows it produced, which is the worst half to have working.
//
// THE KEY LIVES IN AN EDGE FUNCTION, NOT HERE. parse-voice-food holds the Groq
// credential and does both model calls; this module uploads audio to it and
// interprets the answer. See Database-Atraxia supabase/functions/parse-voice-food.
//
// MATCHING STAYS ON THIS SIDE. The function returns names, not foods, and
// findCatalogFoodByName resolves them against the catalog exactly as the mock
// path already did. Keeping it here means the review step in Phase C works on
// FoodSearchResult objects the rest of the app already understands, and that no
// matching logic has to exist twice in two languages.

/**
 * What the recorder should produce, in seconds.
 *
 * MATCHES THE FUNCTION'S OWN GROQ_MAX_AUDIO_SECONDS DEFAULT, deliberately: two
 * numbers that must agree are one number too many, and a client that allowed
 * longer would simply be refused with audio_too_large after the upload.
 *
 * THE BYTES ARE WHAT ACTUALLY MATTER, and they were measured rather than
 * assumed. MediaRecorder's default on this engine is ~126 kbps, which puts two
 * minutes at ~1.9 MB -- close enough to where large bodies start failing to be
 * a bad bet. At the 32 kbps this module asks for, the same two minutes measured
 * ~495 KB. That is what makes 120 seconds safe; the duration alone would not.
 */
export const MAX_RECORDING_SECONDS = 120;

/**
 * Opus at 32 kbps, which is a speech codec doing the thing it is best at.
 *
 * Not the default: leaving it unset gave ~126 kbps, four times the size for no
 * gain Whisper can use, paid for by every phone on a slow connection.
 */
export const AUDIO_BITS_PER_SECOND = 32_000;

/**
 * Recording formats, most preferred first.
 *
 * NEGOTIATED, NOT ASSUMED. Chrome and Firefox produce webm/opus; Safari
 * produces mp4. Both are on the transcription endpoint's accepted list, so the
 * only requirement is asking for one the browser will actually give.
 */
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

/** The recording type this browser will produce, or null if it cannot record. */
export function pickRecordingMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/** One thing the model heard, with the catalog row it resolved to, if any. */
export interface VoiceFoodItem {
  /** As transcribed. Kept even when matched, since it is what the user said. */
  spokenName: string;
  quantity: number;
  /** A serving word the speaker used, or null. Display only for now. */
  unit: string | null;
  /**
   * Null when nothing in the catalog matched.
   *
   * SHOWN, NOT DROPPED. An unmatched item is the one case where this feature
   * can quietly lose something a user said, so it travels through as a null
   * match rather than being filtered out here.
   */
  food: FoodSearchResult | null;
}

export type VoiceFoodOutcome =
  | { ok: true; transcript: string; items: VoiceFoodItem[] }
  /** Heard nothing worth parsing. Not an error; the recording was silence. */
  | { ok: false; kind: "no_speech" }
  /** Heard words, but no food in them. Also not an error. */
  | { ok: false; kind: "no_items"; transcript: string }
  | { ok: false; kind: "rate_limited"; retryAfterSeconds: number | null; message: string }
  | { ok: false; kind: "offline"; message: string }
  | { ok: false; kind: "failed"; message: string };

/** Body shape parse-voice-food returns, on success and on refusal alike. */
interface FnBody {
  transcript?: unknown;
  items?: unknown;
  code?: unknown;
  message?: unknown;
  retryAfterSeconds?: unknown;
  maxSeconds?: unknown;
}

const GENERIC_FAILURE = "Couldn't process that recording. Try again, or add the food manually.";

/**
 * Maps a refusal body to something a user can act on.
 *
 * THE FUNCTION'S OWN MESSAGE WINS WHERE IT SENT ONE. It knows things this side
 * does not -- which stage failed, how long to wait -- and it already writes for
 * a reader. The codes handled explicitly below are the ones where this side can
 * say something better, or where the function sends no message at all.
 *
 * THE 4xx CASES SHOULD NOT HAPPEN from a correctly built client: the recorder
 * enforces the same limits the function does. They are handled anyway because
 * "should not happen" is how a blank screen gets shipped -- a browser that
 * produces an unexpected container, or a cap changed on one side only, lands
 * here rather than nowhere.
 */
function describeRefusal(status: number, body: FnBody): VoiceFoodOutcome {
  const code = typeof body.code === "string" ? body.code : "";
  const fnMessage = typeof body.message === "string" ? body.message : "";

  if (status === 429 || code === "rate_limited") {
    const retryAfterSeconds =
      typeof body.retryAfterSeconds === "number" ? body.retryAfterSeconds : null;
    return {
      ok: false,
      kind: "rate_limited",
      retryAfterSeconds,
      message: fnMessage || "Voice logging is busy right now. Try again shortly, or add the food manually.",
    };
  }

  switch (code) {
    case "audio_too_large": {
      const max = typeof body.maxSeconds === "number" ? body.maxSeconds : MAX_RECORDING_SECONDS;
      return { ok: false, kind: "failed", message: `That recording was too long. Keep it under about ${max} seconds.` };
    }
    case "empty_audio":
    case "missing_audio":
      return { ok: false, kind: "failed", message: "That recording didn't capture any audio. Try again." };
    case "unsupported_audio":
      return { ok: false, kind: "failed", message: "This browser's recording format isn't supported. Try adding the food manually." };
    case "unauthenticated":
      return { ok: false, kind: "failed", message: "Please sign in again to use voice logging." };
    case "not_configured":
      // A deployment fault. The user cannot fix it and should not be told to
      // retry something that will fail identically every time.
      console.error("[voice] parse-voice-food is not configured (missing GROQ_API_KEY)");
      return { ok: false, kind: "failed", message: "Voice logging isn't available right now. Add the food manually for now." };
    default:
      return { ok: false, kind: "failed", message: fnMessage || GENERIC_FAILURE };
  }
}

/**
 * Sends a recording for transcription and parsing, then resolves each name
 * against the catalog.
 *
 * NOTHING IS LOGGED HERE. This returns candidates; the caller shows them and
 * the user decides. That separation is the product requirement and it is also
 * why this module writes to no table.
 */
export async function transcribeAndParse(audio: Blob): Promise<VoiceFoodOutcome> {
  const form = new FormData();
  // A filename with a real extension: the function forwards the file onward,
  // and a transcription endpoint that sniffs by extension should not have to
  // guess from "blob".
  const extension = audio.type.includes("mp4") ? "mp4" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("audio", audio, `recording.${extension}`);

  let body: FnBody;
  let status = 200;

  try {
    // invoke() attaches the caller's JWT, which the function requires -- it
    // refuses the anon key alone.
    const { data, error } = await supabase.functions.invoke<FnBody>("parse-voice-food", { body: form });

    if (error) {
      // The useful part is the response body, not error.message. Same handling
      // as services/calling, with the status kept because 429 is the one
      // outcome that must stay distinguishable from every other refusal.
      const context = (error as { context?: unknown }).context;
      if (context instanceof Response) {
        status = context.status;
        let parsed: FnBody = {};
        try {
          parsed = (await context.clone().json()) as FnBody;
        } catch {
          /* Not JSON: fall through with an empty body and a real status. */
        }
        console.error(`[voice] parse-voice-food refused: status=${status} code=${String(parsed.code ?? "")}`);
        return describeRefusal(status, parsed);
      }
      // No Response at all means the request never completed -- DNS, dropped
      // connection, offline. Distinct from anything the server said.
      console.error("[voice] parse-voice-food unreachable:", error.message);
      return { ok: false, kind: "offline", message: "You appear to be offline. Try again once you're connected." };
    }

    body = (data ?? {}) as FnBody;
  } catch (err) {
    console.error("[voice] parse-voice-food threw:", err);
    return { ok: false, kind: "offline", message: "You appear to be offline. Try again once you're connected." };
  }

  const code = typeof body.code === "string" ? body.code : "";
  const transcript = typeof body.transcript === "string" ? body.transcript : "";

  if (code === "no_speech") return { ok: false, kind: "no_speech" };
  if (code === "no_items") return { ok: false, kind: "no_items", transcript };

  const raw = Array.isArray(body.items) ? body.items : [];
  if (raw.length === 0) {
    // A 200 with neither items nor a code that explains why. Treated as "no
    // food found" rather than as success, so the user is never shown an empty
    // list that looks like the feature worked.
    return { ok: false, kind: "no_items", transcript };
  }

  // Matching runs in parallel: each lookup is an independent round trip and a
  // four-item meal should not cost four sequential ones.
  const items = await Promise.all(
    raw.map(async (entry): Promise<VoiceFoodItem | null> => {
      if (typeof entry !== "object" || entry === null) return null;
      const e = entry as { name?: unknown; quantity?: unknown; unit?: unknown };
      const spokenName = typeof e.name === "string" ? e.name.trim() : "";
      if (!spokenName) return null;

      const quantity =
        typeof e.quantity === "number" && Number.isFinite(e.quantity) && e.quantity > 0 ? e.quantity : 1;
      const unit = typeof e.unit === "string" && e.unit.trim() ? e.unit.trim() : null;

      return { spokenName, quantity, unit, food: await findCatalogFoodByName(spokenName) };
    })
  );

  const kept = items.filter((i): i is VoiceFoodItem => i !== null);
  if (kept.length === 0) return { ok: false, kind: "no_items", transcript };

  return { ok: true, transcript, items: kept };
}
