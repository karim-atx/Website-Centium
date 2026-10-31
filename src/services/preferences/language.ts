import { supabase } from "../../../lib/supabase/client";
import type { Language } from "../../i18n/core";

// Round F (AV, F12): the app language on the account (app_preferences.language,
// enum app_language, 20260906004033), so it follows the member across devices
// and the Database sends notifications and emails in it (Database Round F:
// account_language(), and the copy into the Auth emails' metadata). The device
// keeps its own copy for an instant start; the account's is the truth once
// signed in.

type Row = { language: string | null };
const table = () =>
  supabase.from("app_preferences") as unknown as {
    select: (c: string) => { eq: (c: "owner_id", v: string) => { maybeSingle: () => PromiseLike<{ data: Row | null; error: { message: string } | null }> } };
    update: (v: { language: Language }) => {
      eq: (c: "owner_id", v: string) => { select: (c: string) => PromiseLike<{ data: Row[] | null; error: { code?: string; message: string } | null }> };
    };
    insert: (v: { owner_id: string; language: Language }) => PromiseLike<{ error: { code?: string; message: string } | null }>;
  };

export const toLanguage = (v: string | null | undefined): Language | null => (v === "ar" || v === "en" ? v : null);

/**
 * The account's language; null when it has no preferences row yet; undefined
 * when the read failed, which must never lead to a write (the device's choice
 * would overwrite the account's).
 */
export async function readAccountLanguage(ownerId: string): Promise<Language | null | undefined> {
  try {
    const { data, error } = await table().select("language").eq("owner_id", ownerId).maybeSingle();
    if (error) {
      console.error("[language] Could not read:", error.message);
      return undefined;
    }
    return toLanguage(data?.language);
  } catch (e) {
    console.error("[language] Could not read:", e);
    return undefined;
  }
}

/** Update first, insert only if no row matched (the UPDATE grant excludes owner_id, so never upsert). */
export async function writeAccountLanguage(ownerId: string, language: Language): Promise<boolean> {
  const updated = await table().update({ language }).eq("owner_id", ownerId).select("language");
  if (updated.error) {
    console.error("[language] Could not save:", updated.error.message);
    return false;
  }
  if (updated.data && updated.data.length > 0) return true;
  const inserted = await table().insert({ owner_id: ownerId, language });
  if (inserted.error?.code === "23505") return writeAccountLanguage(ownerId, language);
  if (inserted.error) {
    console.error("[language] Could not save:", inserted.error.message);
    return false;
  }
  return true;
}

export { settleLanguage } from "../../i18n/settle";
