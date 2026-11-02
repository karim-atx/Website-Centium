import { useState } from "react";
import { Download } from "lucide-react";
import { SettingsRow } from "../ui/SettingsRows";
import { Toast } from "../ui/Toast";
import { exportMyData } from "../../services/premium/g2Calls";
import { exportFileName } from "../../services/premium/g2";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G2 · the full export, in Settings › Data & account. Always free and
// never capped, whatever the Premium switch: export_my_data() returns the
// member's whole record as one JSON object, saved as a file named with the
// date. 3 a day (ATX02). Journal entries in a locked folder are included
// only while that folder is unlocked, which the row says.

function save(json: unknown, name: string): void {
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportDataRow() {
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    const r = await exportMyData();
    setBusy(false);
    if (!r.ok) return setToast(r.message);
    save(r.json, exportFileName(new Date()));
    setToast(t("Your data was saved as a file."));
  };

  return (
    <>
      <SettingsRow
        icon={Download}
        title={busy ? t("Preparing your data…") : t("Download my data")}
        subtitle={t("Everything you've logged, as one file. Locked journal folders are included only while they're unlocked.")}
        onClick={() => void run()}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
}
