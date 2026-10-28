// The voice food logger's limits and the wait in words. Pure, so it is
// tested without the Supabase client.
/**
 * The function's own caps (Round C DK, parse-voice-food): at most 20 items,
 * and a name over 80 characters is dropped. Applied here too, so a reply from
 * an older deployment can't put more on the review screen than the current
 * one would.
 */
export const MAX_VOICE_ITEMS = 20;
export const MAX_VOICE_NAME_LENGTH = 80;

/**
 * The wait, in words, when the function gave a time but no sentence (the
 * provider's own 429). Seconds read as seconds up to a minute and a half;
 * past that, minutes: "about 3600s" is not a wait anyone can picture.
 */
export function rateLimitedText(retryAfterSeconds: number | null): string {
  if (retryAfterSeconds === null || !Number.isFinite(retryAfterSeconds) || retryAfterSeconds <= 0)
    return "Voice logging is busy right now. Try again shortly, or add the food manually.";
  if (retryAfterSeconds < 90)
    return `Voice logging is busy. Try again in about ${Math.ceil(retryAfterSeconds)}s, or add the food manually.`;
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `Voice logging is busy. Try again in about ${minutes} minutes, or add the food manually.`;
}
