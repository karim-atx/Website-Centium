import { useEffect, useState } from "react";
import { SettingsRow } from "../ui/SettingsRows";
import { HardDrive } from "lucide-react";
import { getStorageUsage, type StorageUsage } from "../../services/storage";
import { linePx, textPx } from "../../theme/textSize";
import { t, tk } from "../../i18n/core";

/**
 * How much Storage this account holds, against its cap. A Settings row in the
 * "Data & account" section (batch C 13; MO1.8 #52–#57).
 *
 * EXISTS SO THE CAP IS NOT FIRST MET AS A FAILURE. `storage_usage()` shipped
 * with the cap and had no caller, which meant the only way to discover the
 * limit was for an upload to be refused by it. This is the read path that
 * warns instead.
 *
 * ONE THRESHOLD, NOT A LADDER. Below 80% this states a fact and nothing more;
 * at or above it, the bar and the figure turn red and a line of advice
 * appears (K11, kept for account safety). The cap is 2 GB against a few tens
 * of MB a year of real medical use, so one clear warning is the whole job.
 *
 * MO1.8: the title spans the row; under it a 5 pt bar (primary @18%, fill
 * fill.pinned #9A8CD6 / #A991FE) 6 below, and the figure "21 KB of 2 GB"
 * 11 / 15 5 below that. The explainer is screen-reader text (K10, V6-149).
 * While loading: a skeleton bar and "–" (V6-149); a failed read hides the row.
 */
const WARN_AT = 0.8;

/** Binary units, one decimal above 1 MB (backend doc §1): "21 KB", "4.2 MB", "2 GB". */
function formatBytes(bytes: number): string {
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  const one = (n: number) => {
    const r = Math.round(n * 10) / 10;
    return Number.isInteger(r) ? String(r) : r.toFixed(1);
  };
  if (bytes >= GB) return `${one(bytes / GB)} GB`;
  if (bytes >= MB) return `${one(bytes / MB)} MB`;
  if (bytes === 0) return "0 KB";
  return `${Math.max(1, Math.round(bytes / KB))} KB`;
}

const EXPLAINER = tk("Lab reports, scans and other files you upload.");

export const StorageUsageRow: React.FC = () => {
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getStorageUsage().then((result) => {
      if (cancelled) return;
      if (result.ok) setUsage(result.usage);
      else setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // A failed read hides the row: inventing a figure would be worse than
  // staying quiet.
  if (failed) return null;

  const warning = !!usage && usage.fraction >= WARN_AT;
  const pct = usage ? Math.round(usage.fraction * 100) : 0;
  const small = { fontSize: textPx(11), lineHeight: linePx(15) };

  return (
    <SettingsRow
      icon={HardDrive}
      iconTone="dark"
      title={t("Storage")}
      srDescription={t(EXPLAINER)}
      subtitle={
        <>
          {usage ? (
            <span
              // 6 under the title: this margin collapses with the subtitle
              // wrapper's 2 (MO1.8 #55: title bottom 1013.9, bar 1019.9).
              className="mt-1.5 block h-[5px] rounded-full bg-primary/[0.18] overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("Storage used")}
            >
              {/* A visible sliver for any non-zero usage: a bar that renders as
                  nothing says "empty", and 4 MB of 2 GB is not empty. */}
              <span
                className={`block h-full rounded-full ${warning ? "bg-status-high" : "bg-fill-pinned"}`}
                style={{ width: usage.usedBytes > 0 ? `max(2px, ${usage.fraction * 100}%)` : "0%" }}
              />
            </span>
          ) : (
            <span aria-hidden className="mt-1.5 block h-[5px] rounded-full bg-cream-soft animate-skeleton-pulse" />
          )}
          {/* <bdi>: the English figure keeps its own order inside Arabic (RTL)
              pages (kept-list 144). */}
          <span className={`block mt-[5px] ${warning ? "text-status-high" : "text-charcoal-faint"}`} style={small}>
            {usage ? (
              <bdi>
                {t("{used} of {cap}", { used: formatBytes(usage.usedBytes), cap: formatBytes(usage.capBytes) })}
              </bdi>
            ) : (
              <span aria-label={t("Loading")}>–</span>
            )}
          </span>
          {warning && (
            <span className="block mt-[5px] text-status-high" style={small}>
              {t("You're running low. Remove a lab report or scan you no longer need to free up space.")}
            </span>
          )}
        </>
      }
    />
  );
};
