// "Add to Google Wallet" for a gym membership pass (App-Centium ROUND_K.md
// §4; Database DB-Z7's issue-wallet-pass).
//
// The server makes the pass, with its own rotating-code secret (gw: codes the
// front desk reads), and answers with a signed "Save to Google Wallet" JWT;
// the phone hands that to Google Wallet, whose own sheet shows the pass and
// adds it. The pass shows the venue, the plan and "Valid until", never the
// member's name (D-BJ3).
//
// Android only for now. iPhone later answers "apple" and adds a .pkpass from
// the same function (wallet: "apple"); Google Wallet isn't offered there.
//
// Shown only where all three agree: the app, the "wallet_passes" switch
// (app_config) and a phone whose Google Wallet can save passes.
import { registerPlugin } from "@capacitor/core";
import { supabase } from "../../lib/supabase/client";
import { nativeFeatureOn } from "./appConfig";
import { isNative } from "./index";

export type WalletAvailability = {
  ok: boolean;
  wallet?: "google" | "apple";
  /** no_wallet: Google Wallet can't save passes on this phone (missing, or no account on it). */
  reason?: "not_native" | "no_wallet" | "unsupported";
};

export type WalletAddResult = "added" | "cancelled" | "failed";

interface CentiumWalletPlugin {
  available(): Promise<WalletAvailability>;
  save(options: { jwt: string }): Promise<{ result: WalletAddResult }>;
}

const CentiumWallet = registerPlugin<CentiumWalletPlugin>("CentiumWallet");

export const wallet = {
  async available(): Promise<WalletAvailability> {
    if (!isNative()) return { ok: false, reason: "not_native" };
    if (!nativeFeatureOn("wallet_passes")) return { ok: false, reason: "unsupported" };
    // An app build without the plugin rejects: that's "unsupported" too.
    return CentiumWallet.available().catch(() => ({ ok: false, reason: "unsupported" as const }));
  },

  /**
   * Adds the membership's pass to the phone's wallet: the server issues (or
   * updates) it, then the wallet's own sheet asks the member. "failed" covers a
   * pass the server won't issue (not valid any more, not the member's).
   */
  async add(membershipId: string): Promise<WalletAddResult> {
    const which = await wallet.available();
    if (!which.ok || !which.wallet) return "failed";
    const { data, error } = await supabase.functions.invoke<{ jwt?: string }>("issue-wallet-pass", {
      body: { membership_id: membershipId, wallet: which.wallet },
    });
    if (error || !data?.jwt) {
      console.warn("[wallet] The pass wasn't issued:", error?.message ?? "no jwt");
      return "failed";
    }
    const r = await CentiumWallet.save({ jwt: data.jwt }).catch(() => ({ result: "failed" as const }));
    return r.result;
  },
};
