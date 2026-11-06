import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Activity, ArrowDownUp, Check, ExternalLink, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "../../components/ui/PageHeader";
import { SettingsBody, SettingsRow, SettingsSection } from "../../components/ui/SettingsRows";
import { CentredPopup } from "../../components/ui/CentredPopup";
import { Button } from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { useOnline } from "../../hooks/useOnline";
import { isNative } from "../../platform";
import { health } from "../../platform/health";
import type { HealthAvailability, HealthType } from "../../platform/contracts";
import {
  connectErrorKey,
  HEALTH_CONNECT_PLAY_URL,
  HEALTH_TYPE_LABEL,
  healthView,
  rowLine,
  syncResultKey,
  typesToRead,
  type HealthStatus,
} from "../../services/health-connect/model";
import { syncedWhen } from "../../services/health-connect/when";
import { t } from "../../i18n/core";

// Round J · J-2e, website PLAN.md §2.1: Health Connect, in the app only
// (/app/settings/devices/health). A browser, or an account that isn't a
// customer, goes back to Devices and sources.
//
// - Not connected: what's read, by type ("Weight and body fat aren't read
//   while recovery-sensitive mode is on."), that Centium only reads, where the
//   data goes, then "Connect" (the system's permission sheet). A connection
//   syncs at once; what was allowed and refused is listed.
// - Connected: each type's access, "Last synced {time}", "Sync now", "Change
//   access" (Health Connect's own screen), the source order (Devices and
//   sources), and "Disconnect" with its two choices.
// - Not installed or out of date: a link to Health Connect on Google Play.
// Automatic syncs are AppContext's (platform/health.ts); nothing here starts one.

function openPlayStore() {
  // As NativeAppGate does: the phone hands the store link to Google Play.
  window.location.href = HEALTH_CONNECT_PLAY_URL;
}

export default function HealthConnectPage() {
  const navigate = useNavigate();
  const { user, today } = useApp();
  const online = useOnline();
  // True while recovery-sensitive mode is on or not yet known.
  const recoverySensitive = useHideNumbers();
  const [avail, setAvail] = useState<HealthAvailability | null>(null);
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [note, setNote] = useState<{ text: string; danger: boolean } | null>(null);
  const [asked, setAsked] = useState<{ granted: HealthType[]; refused: HealthType[] } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [removeData, setRemoveData] = useState(false);
  const allowed = isNative() && user.accountType === "customer";

  const read = useCallback(async () => {
    const a = await health.available().catch((): HealthAvailability => ({ ok: false }));
    setAvail(a);
    if (a.ok) setStatus(await health.status());
  }, []);

  useEffect(() => {
    if (!allowed) return;
    let live = true;
    const again = () => live && void read();
    again();
    const onVisible = () => document.visibilityState === "visible" && again();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [allowed, read]);

  if (!allowed) return <Navigate to="/app/settings/devices" replace />;

  const view = healthView(avail, status);
  if (view?.kind === "unavailable") return <Navigate to="/app/settings/devices" replace />;

  const sync = async () => {
    setBusy("sync");
    const r = await health.syncNow();
    const k = syncResultKey(r);
    setNote({ text: t(k.key), danger: k.danger });
    await read();
    setBusy(null);
  };

  const connect = async () => {
    setBusy("connect");
    setNote(null);
    setAsked(null);
    try {
      const r = await health.connect({ recoverySensitive });
      setAsked(r);
      if (r.granted.length === 0) {
        setNote({ text: t("Access refused. Nothing was connected."), danger: true });
        setBusy(null);
        await read();
        return;
      }
      // Connected: the first sync now (30 days), not at the next resume.
      await sync();
    } catch (e) {
      setNote({ text: t(connectErrorKey(e, !online)), danger: true });
      setBusy(null);
    }
  };

  const disconnect = async () => {
    setBusy("disconnect");
    setNote(null);
    try {
      await health.disconnect({ removeSyncedData: removeData });
      setConfirm(false);
      setAsked(null);
      setNote({ text: removeData ? t("Disconnected. Health Connect's data was removed.") : t("Disconnected. What's synced so far stays."), danger: false });
      await read();
    } catch {
      setNote({ text: online ? t("Couldn't disconnect. Try again.") : t("You're offline. Try again when you're back online."), danger: true });
    }
    setBusy(null);
  };

  const types = typesToRead(recoverySensitive);
  const line = view ? rowLine(view) : null;

  return (
    <div>
      <PageHeader title="Health Connect" showBack tightBack />
      <SettingsBody>
        {view === null && <p className="text-[13px] text-charcoal-faint">{t("Loading…")}</p>}

        {view?.kind === "install" && (
          <div data-hc-state="install" className="rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-5">
            <p className="text-[15px] font-bold text-charcoal">{t(view.update ? "Health Connect needs an update" : "Health Connect isn't installed")}</p>
            <p className="mt-1 text-[13px] text-charcoal-muted">
              {view.update ? t("Update Health Connect from Google Play, then come back here.") : t("Install Health Connect from Google Play, then come back here.")}
            </p>
            <Button className="w-full mt-4" onClick={openPlayStore}>
              <ExternalLink size={16} aria-hidden /> {view.update ? t("Update on Google Play") : t("Get it on Google Play")}
            </Button>
          </div>
        )}

        {view?.kind === "not_connected" && (
          <div data-hc-state="not_connected">
            <SettingsSection label={t("What's read")}>
              {types.map((x) => (
                <SettingsRow key={x} icon={Activity} title={t(HEALTH_TYPE_LABEL[x])} />
              ))}
            </SettingsSection>
            {recoverySensitive && <p className="-mt-4 mb-6 px-1 text-[12.5px] text-charcoal-muted">{t("Weight and body fat aren't read while recovery-sensitive mode is on.")}</p>}
            <div className="mb-6 px-1 flex flex-col gap-2 text-[13px] leading-5 text-charcoal-muted">
              <p>{t("Centium only reads. It never writes to {provider}.", { provider: "Health Connect" })}</p>
              <p>{t("What's read is saved to your Centium account and used only in Centium. It's never shared or sold.")}</p>
            </div>
            <Button className="w-full" onClick={() => void connect()} disabled={busy !== null}>
              {busy === "connect" ? t("Connecting…") : t("Connect Health Connect")}
            </Button>
          </div>
        )}

        {view?.kind === "connected" && status && (
          <div data-hc-state="connected" data-hc-access={view.accessState ?? ""}>
            <div className="mb-6 rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-5">
              <p className={clsx("text-[15px] font-bold", view.accessState === "ok" || view.accessState === null ? "text-charcoal" : "text-status-high")}>
                {line ? t(line.key, line.time ? { time: syncedWhen(line.time, today) } : undefined) : null}
              </p>
              {view.accessState === "access_off" && <p className="mt-1 text-[13px] text-charcoal-muted">{t("Allow Centium again in Health Connect to keep syncing.")}</p>}
              {view.accessState === "error" && <p className="mt-1 text-[13px] text-charcoal-muted">{t("The last sync didn't finish. Try Sync now.")}</p>}
              {view.lastSyncedAt && <p className="mt-1 text-[12.5px] text-charcoal-faint">{t("Last synced {time}", { time: syncedWhen(view.lastSyncedAt, today) })}</p>}
              <Button className="w-full mt-4" onClick={() => void sync()} disabled={busy !== null}>
                <RefreshCw size={16} aria-hidden /> {busy === "sync" ? t("Syncing…") : t("Sync now")}
              </Button>
            </div>
            <SettingsSection label={t("Access")}>
              {types.map((x) => {
                const on = status.granted.includes(x);
                return <SettingsRow key={x} icon={on ? Check : X} title={t(HEALTH_TYPE_LABEL[x])} value={on ? t("Allowed") : t("Not allowed")} />;
              })}
              <SettingsRow icon={SlidersHorizontal} title={t("Change access")} onClick={() => void health.openSettings().catch(() => undefined)} />
            </SettingsSection>
            {recoverySensitive && <p className="-mt-4 mb-6 px-1 text-[12.5px] text-charcoal-muted">{t("Weight and body fat aren't read while recovery-sensitive mode is on.")}</p>}
            <SettingsSection label={t("When sources overlap")}>
              <SettingsRow icon={ArrowDownUp} title={t("Source order")} onClick={() => navigate("/app/settings/devices")} />
            </SettingsSection>
            <button type="button" onClick={() => { setRemoveData(false); setConfirm(true); }} className="tap block mx-auto mt-2 px-3 py-2 text-[13px] font-semibold text-status-high">
              {t("Disconnect")}
            </button>
          </div>
        )}

        {asked && (asked.granted.length > 0 || asked.refused.length > 0) && (
          <div data-hc-asked className="mt-4 px-1 text-[12.5px] text-charcoal-muted">
            {asked.granted.length > 0 && <p>{t("Allowed: {types}", { types: asked.granted.map((x) => t(HEALTH_TYPE_LABEL[x])).join(t(", ")) })}</p>}
            {asked.refused.length > 0 && <p>{t("Not allowed: {types}", { types: asked.refused.map((x) => t(HEALTH_TYPE_LABEL[x])).join(t(", ")) })}</p>}
          </div>
        )}

        {note && (
          <p role="status" data-hc-note className={clsx("mt-4 px-1 text-[13px] font-semibold", note.danger ? "text-status-high" : "text-primary-dark")}>
            {note.text}
          </p>
        )}
      </SettingsBody>

      <CentredPopup open={confirm} onClose={() => setConfirm(false)} title={t("Disconnect Health Connect?")}>
        <div role="radiogroup" aria-label={t("Disconnect Health Connect?")} className="flex flex-col gap-2 text-start">
          {[false, true].map((remove) => (
            <label key={String(remove)} className="flex items-start gap-3 rounded-[14px] border border-charcoal/[0.11] p-3">
              <input type="radio" name="hc-remove" checked={removeData === remove} onChange={() => setRemoveData(remove)} className="mt-1" />
              <span>
                <span className="block text-[14px] font-semibold text-charcoal">{remove ? t("Remove {provider}'s data", { provider: "Health Connect" }) : t("Keep what's synced so far")}</span>
                <span className="block text-[12px] text-charcoal-muted">
                  {remove
                    ? t("Deletes everything Centium synced from Health Connect: steps, sleep, workouts, heart rate, weight and body fat. What you entered yourself stays.")
                    : t("Nothing new is read. What's already in Centium stays.")}
                </span>
              </span>
            </label>
          ))}
          <Button className="w-full mt-2" onClick={() => void disconnect()} disabled={busy !== null}>
            {busy === "disconnect" ? t("Disconnecting…") : t("Disconnect")}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setConfirm(false)} disabled={busy !== null}>
            {t("Cancel")}
          </Button>
        </div>
      </CentredPopup>
    </div>
  );
}
