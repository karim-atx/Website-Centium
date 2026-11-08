import React, { useState } from "react";
import { LogOut } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { ConfirmCard } from "../ui/ConfirmCard";
import { signOutWarning, useOutbox } from "../outbox/Outbox";
import { linePx, textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";

/**
 * Round K (sign-out decision, 2026-11-08): Settings › Security › "Sign out of
 * all devices", for clients and professionals (phone Settings and the web
 * Settings column) and businesses (More › Security). The ordinary Sign out ends this device's session only;
 * this ends every one, this device's included (AppContext.signOutAllDevices).
 *
 * Asks first, in the stacked confirm. A failure keeps the confirm open with
 * the error line under the body and signs nothing out here, so the person can
 * try again; Cancel closes it and does nothing. Returns the opener and the
 * dialog to render, like useSignOutGuard. The business Security page passes
 * "kit", its BizConfirm card (the toast there has no error look, so the error
 * line in the card is used on every surface).
 */
export function useSignOutAllDevices(frame?: "kit"): { requestSignOutAll: () => void; signOutAllDialog: React.ReactNode } {
  const { signOutAllDevices } = useApp();
  const waiting = useOutbox();
  const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestSignOutAll = () => {
    setError(null);
    setOpen(true);
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await signOutAllDevices();
    // On success the page reloads signed out; nothing to tidy here.
    if (r.ok) return;
    setBusy(false);
    setError(r.message ? t(r.message) : t("Couldn't sign out of all devices. Try again."));
  };

  // Round D (D23): anything kept to save later is named, as on Sign out, after
  // the line saying what this one does.
  const warning = signOutWarning(waiting);
  const body = t("You'll be signed out here and on every other phone, tablet and browser.");
  const signOutAllDialog = (
    <ConfirmCard
      open={open}
      layout="stacked"
      frame={frame}
      tone="destructive"
      icon={<LogOut size={20} strokeWidth={2.2} />}
      title={t("Sign out of all devices?")}
      subtitle={warning ? `${body} ${warning}` : body}
      extra={
        error ? (
          <p role="alert" style={{ margin: "10px 0 0", fontSize: textPx(12.5), lineHeight: linePx(17), fontWeight: 600, color: dark ? "#F09A8E" : "#C0392B" }}>
            {error}
          </p>
        ) : undefined
      }
      confirmLabel={t("Sign out of all devices")}
      cancelLabel={t("Cancel")}
      busy={busy}
      onCancel={() => !busy && setOpen(false)}
      onConfirm={() => void confirm()}
    />
  );
  return { requestSignOutAll, signOutAllDialog };
}
