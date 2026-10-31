import type { Language } from "./core";

// Round F (AV): pure, so it is testable without the Supabase client.
/**
 * Which language to use once signed in. The account's wins, except while the
 * member is still onboarding (the choice they just made on the landing page or
 * sign-up is the one to keep, and is written up instead).
 */
export function settleLanguage(local: Language, account: Language | null, onboarded: boolean): { use: Language; write: boolean } {
  if (account === null) return { use: local, write: local !== "en" };
  if (!onboarded && local !== account) return { use: local, write: true };
  return { use: account, write: false };
}
