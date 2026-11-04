import { t, tk } from "../../i18n/core";

// Round H (EU): a gym can keep its own entry system (Database migration
// 20261226380000, HANDOVER_API "Round H · Gyms keep their own entry systems").
// gyms.entry_system (enum gym_entry_system) names it, gyms.entry_system_name
// (1 to 80 characters on one line) is required for 'other' and optional
// otherwise, and the four Centium methods (access_qr, access_pass_code,
// access_nfc, access_bluetooth) may then all be off. Without an own system at
// least one Centium method stays on (gyms_access_method_check).
//
// The pure half: types, labels, the access rule, the external ID's shape and
// the ATXU codes' words. The calls live in services/front-desk/entrySystem.ts,
// services/business-more and services/venues.

export const ENTRY_SYSTEMS = [
  "none",
  "key_cards",
  "pin_keypad",
  "biometric_reader",
  "turnstile",
  "kisi",
  "brivo",
  "salto",
  "paxton",
  "gym_software",
  "other",
] as const;
export type EntrySystem = (typeof ENTRY_SYSTEMS)[number];

const LABEL: Record<EntrySystem, string> = {
  none: tk("None"),
  key_cards: tk("Key cards or fobs"),
  pin_keypad: tk("PIN keypad"),
  biometric_reader: tk("Biometric reader"),
  turnstile: tk("Turnstile or gate"),
  kisi: "Kisi",
  brivo: "Brivo",
  salto: "Salto",
  paxton: "Paxton",
  gym_software: tk("Gym software"),
  other: tk("Other"),
};

/** Brand names stay as they are in every language. */
const BRANDS: ReadonlySet<EntrySystem> = new Set(["kisi", "brivo", "salto", "paxton"]);

export function entrySystemLabel(s: EntrySystem): string {
  return BRANDS.has(s) ? LABEL[s] : t(LABEL[s]);
}

/** What a member or the desk calls the system: its own name when it has one, else the type. */
export function entrySystemDisplay(s: EntrySystem, name: string | null | undefined): string {
  const n = name?.trim();
  return n ? n : entrySystemLabel(s);
}

export function toEntrySystem(raw: unknown): EntrySystem {
  return typeof raw === "string" && (ENTRY_SYSTEMS as readonly string[]).includes(raw) ? (raw as EntrySystem) : "none";
}

export const ENTRY_SYSTEM_NAME_MAX = 80;
export const EXTERNAL_ID_MAX = 64;

/** The venue's entry settings as gyms holds them. */
export interface EntryMethods {
  qr: boolean;
  passCode: boolean;
  nfc: boolean;
  bluetooth: boolean;
  system: EntrySystem;
  systemName: string | null;
}

export const anyCentiumMethod = (m: Pick<EntryMethods, "qr" | "passCode" | "nfc" | "bluetooth">): boolean => m.qr || m.passCode || m.nfc || m.bluetooth;
export const usesOwnSystem = (m: Pick<EntryMethods, "system">): boolean => m.system !== "none";

/**
 * Why these settings can't be saved, or null. Mirrors the database's rules:
 * at least one Centium method or an own system; 'other' needs a name; a name
 * is one line of 1 to 80 characters.
 */
export function entryMethodsProblem(m: EntryMethods): string | null {
  if (!anyCentiumMethod(m) && !usesOwnSystem(m)) return t("Keep at least one Centium method on, or choose your own entry system.");
  const name = m.systemName?.trim() ?? "";
  if (m.system === "other" && !name) return t("Name your entry system.");
  if (/[\r\n]/.test(m.systemName ?? "") || name.length > ENTRY_SYSTEM_NAME_MAX) return t("Use one line of up to {n} characters.", { n: ENTRY_SYSTEM_NAME_MAX });
  return null;
}

/** The name as gyms stores it: null for 'none' or when blank, trimmed otherwise. */
export const systemNameForSave = (m: EntryMethods): string | null => (m.system === "none" ? null : m.systemName?.trim() || null);

/**
 * An external ID as the database accepts it: trimmed, one line, 1 to 64
 * characters. Blank means no ID (null). `false` when it can't be used (ATXU4).
 */
export function normalizeExternalId(raw: string): string | null | false {
  const s = raw.trim();
  if (!s) return null;
  if (/[\r\n\t]/.test(s) || s.length > EXTERNAL_ID_MAX) return false;
  return s;
}

/** Lists show only the last 4 characters (Karim, Round H decision 6); the enrol sheet and the export show it in full. */
export function maskExternalId(id: string | null | undefined): string | null {
  const s = id?.trim();
  if (!s) return null;
  return s.length <= 4 ? s : `•••• ${s.slice(-4)}`;
}

/** The ATXU codes (Round H) as people read them; null for anything else. */
export function entryCodeMessage(code: string | undefined): string | null {
  switch (code) {
    case "ATXU0":
      return t("That Centium entry method is turned off at this venue.");
    case "ATXU1":
      return t("Agree to share your membership with the gym's entry system first.");
    case "ATXU2":
      return t("Only the owner or a manager can export the members list.");
    case "ATXU3":
      return t("This membership has already changed. Reload and try again.");
    case "ATXU4":
      return t("Use one line of up to {n} characters for the ID.", { n: EXTERNAL_ID_MAX });
    case "ATXU5":
      return t("This venue doesn't use its own entry system.");
    case "ATXU6":
      return t("It's too late to undo this.");
    default:
      return null;
  }
}

/**
 * The key of the consent wording the member saw (agree_to_gym_entry_sharing's
 * p_wording_key, 1 to 100 characters). Change it whenever the wording changes.
 */
export const ENTRY_SHARING_WORDING_KEY = "gym_entry_sharing_v1";

/** The consent checkbox's words (shown only when the gym uses its own system). */
export const entrySharingLine = (gym: string, system: string): string =>
  t("I agree that {gym} adds my first name, member number and membership dates to its entry system ({system}) so I can get in.", { gym, system });
