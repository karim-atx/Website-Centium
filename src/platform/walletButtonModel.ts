// The membership pass's Wallet button (Round K · BJ, Karim 2026-11-08). Pure,
// so the rule and the outcome handling are tested on their own
// (walletButtonModel.test.ts); MembershipPass draws what this answers.
//
// WHERE GOOGLE'S BUTTON SHOWS: in the app on Android only, and only when
// wallet.available() says ok with Google Wallet (which already folds in the
// "wallet_passes" switch, and Google's own SAVE_PASSES availability, country
// included: anything but AVAILABLE answers no_wallet), the switch is on, and
// the pass is valid. Everywhere else in the app it is hidden; the pass, its QR
// and its code keep working as before.
//
// THE BROWSER IS UNCHANGED. A browser (and the iPhone app, where Apple Wallet
// "stays disabled, as today", PLAN §3) keeps the drawn, disabled placeholder.
//
// No imports: wallet.ts and index.ts pull in Capacitor and the Supabase
// client, which the tests' type check (no DOM) can't read. The shapes below
// are wallet.ts's and index.ts's own, and MembershipPass passes them in.

type Platform = "web" | "ios" | "android";
type WalletAvailability = { ok: boolean; wallet?: "google" | "apple"; reason?: string };
type WalletAddResult = "added" | "cancelled" | "failed";

export type WalletButton =
  /** Google's official "Add to Google Wallet" button, live. */
  | "google"
  /** The disabled placeholder the website has always drawn ("Available in the Centium phone app"). */
  | "placeholder"
  /** Nothing. */
  | "none";

export type WalletButtonInput = {
  platform: Platform;
  /** wallet.available()'s answer; null while it is being asked. */
  availability: WalletAvailability | null;
  /** nativeFeatureOn("wallet_passes"). */
  switchOn: boolean;
  /** GymMembership.passState: only "valid" can be issued (issue-wallet-pass's pass_not_valid). */
  passState: string | null | undefined;
  /** The gym left at least one Centium entry method on (a gym with only its own system shows no Wallet). */
  centiumEntry: boolean;
  /** access_pass_code: it governs gw: codes at the desk as it does pd: (DB-Z7). */
  passCodeOn: boolean;
};

export function walletButton(i: WalletButtonInput): WalletButton {
  if (!i.centiumEntry) return "none";
  if (i.platform === "web" || i.platform === "ios") return "placeholder";
  const a = i.availability;
  if (!a?.ok || a.wallet !== "google") return "none";
  if (!i.switchOn || i.passState !== "valid" || !i.passCodeOn) return "none";
  return "google";
}

/** The line under the pass after add(), as an English key; null says nothing. */
export type WalletNote = { key: string; error: boolean } | null;

export const WALLET_FAILED = "Couldn't add your pass to Google Wallet. Try again later.";
export const WALLET_ADDED = "Your pass is in Google Wallet.";

/** What the pass does with add()'s answer. "added" re-reads the pass devices so "Google Wallet" is listed. */
export function walletOutcome(result: WalletAddResult): { note: WalletNote; reloadDevices: boolean } {
  switch (result) {
    case "added":
      return { note: { key: WALLET_ADDED, error: false }, reloadDevices: true };
    case "cancelled":
      return { note: null, reloadDevices: false };
    default:
      return { note: { key: WALLET_FAILED, error: true }, reloadDevices: false };
  }
}

/** The official artwork, unchanged (Google's black #1F1F1F wallet-button, 283×50 en, 312×50 ar). */
export const WALLET_ART = {
  en: { src: "/brand/google-wallet/enUS_add_to_google_wallet_wallet-button.svg", width: 283, height: 50 },
  ar: { src: "/brand/google-wallet/ar_add_to_google_wallet_wallet-button.svg", width: 312, height: 50 },
} as const;

/**
 * Drawn 48 tall: Karim's floor (48 dp), taller than every other button on the
 * pass (the placeholder is 46, the text buttons 32), the width kept to the
 * artwork's own ratio.
 */
export const WALLET_BUTTON_HEIGHT = 48;

export function walletArtWidth(lang: "en" | "ar"): number {
  const a = WALLET_ART[lang];
  return Math.round(((WALLET_BUTTON_HEIGHT * a.width) / a.height) * 100) / 100;
}
