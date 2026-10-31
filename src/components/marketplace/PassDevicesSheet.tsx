import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { useOnline } from "../../hooks/useOnline";
import { fetchPassDevices, revokePassDevice, type PassDevice } from "../../services/venues/passDevice";
import { appLocale } from "../../i18n/format";
import { t } from "../../i18n/core";

// Round F2 · AB5: the devices holding this pass's 30-second code
// (my_pass_devices), each removable (revoke_pass_device, 10 an hour): its
// code stops working at the desk. Never the secret. Removing this device
// tells the pass, which then gets a new secret. OURS, in the pass's own
// language (the membership pass sheet's rows and 12/700 text buttons).

const day = (iso: string) => new Date(iso).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" });

export function PassDevicesSheet({
  open,
  onClose,
  membershipId,
  thisDeviceId,
  onRemovedThis,
}: {
  open: boolean;
  onClose: () => void;
  membershipId: string;
  thisDeviceId: string | null;
  onRemovedThis: () => void;
}) {
  const online = useOnline();
  const [devices, setDevices] = useState<PassDevice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchPassDevices(membershipId).then((r) => {
      if (cancelled) return;
      if (!r.ok) return setError(r.message);
      setError(null);
      setDevices(r.value);
    });
    return () => {
      cancelled = true;
    };
  }, [open, membershipId, tick]);

  const remove = async (d: PassDevice) => {
    if (busy) return;
    setBusy(d.deviceId);
    setError(null);
    const r = await revokePassDevice(d.deviceId);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    if (d.deviceId === thisDeviceId) onRemovedThis();
    setTick((x) => x + 1);
  };

  const active = (devices ?? []).filter((d) => !d.revokedAt);

  return (
    <BottomSheet open={open} onClose={onClose} title={t("Devices with this pass")}>
      <p className="m-0 text-[12.5px] leading-[18px] text-charcoal-soft">
        {t("Each device makes its own code. Remove one you no longer use, and its code stops working at the desk.")}
      </p>
      {!devices && !error && <div aria-busy="true" className="mt-3 h-[56px] rounded-2xl bg-cream-soft animate-skeleton-pulse" />}
      {devices && active.length === 0 && <p className="mt-3 mb-0 text-[12.5px] text-charcoal-faint">{t("No devices yet. Opening your pass adds this one.")}</p>}
      {active.length > 0 && (
        <ul className="mt-3 mb-0 p-0 list-none rounded-2xl border border-charcoal/[0.08] bg-cream-card overflow-hidden">
          {active.map((d, i) => (
            <li key={d.deviceId} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-charcoal/[0.08]" : ""}`}>
              <Smartphone size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-soft" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-bold text-charcoal truncate">{d.label}</span>
                <span className="block text-[11.5px] text-charcoal-faint">
                  {d.deviceId === thisDeviceId
                    ? t("This device")
                    : d.lastUsedAt
                      ? t("Last used {date}", { date: day(d.lastUsedAt) })
                      : t("Added {date}", { date: day(d.createdAt) })}
                </span>
              </span>
              <button
                type="button"
                onClick={() => void remove(d)}
                disabled={!!busy || !online}
                className="tap shrink-0 text-[12px] font-bold text-status-high disabled:opacity-50"
                style={{ minHeight: 44 }}
              >
                {busy === d.deviceId ? t("Removing…") : t("Remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 mb-0 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
