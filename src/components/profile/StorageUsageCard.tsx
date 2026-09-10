import { useEffect, useState } from "react";
import { Card } from "../ui/Card";
import { HardDrive } from "lucide-react";
import { getStorageUsage, type StorageUsage } from "../../services/storage";

/**
 * How much Storage this account holds, against its cap.
 *
 * EXISTS SO THE CAP IS NOT FIRST MET AS A FAILURE. `storage_usage()` shipped
 * with the cap and had no caller, which meant the only way to discover the
 * limit was for an upload to be refused by it. This is the read path that
 * warns instead.
 *
 * ONE THRESHOLD, NOT A LADDER. Below 80% this states a fact and nothing more;
 * at or above it, the bar and the figure turn amber and a line of advice
 * appears. Tiers beyond that would be inventing urgency the numbers do not
 * support — the cap is 2 GB against a few tens of MB a year of real medical
 * use, so anyone who reaches 80% is doing something unusual enough that one
 * clear warning is the whole job.
 */
const WARN_AT = 0.8;

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb >= 10 ? Math.round(gb) : Math.round(gb * 10) / 10} GB`;
  }
  if (bytes >= 1024 * 1024) return `${Math.round(mb)} MB`;
  if (bytes === 0) return "0 MB";
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const StorageUsageCard: React.FC = () => {
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

  // Nothing at all until there is something true to say. A skeleton or a
  // zeroed bar would both read as "you have used nothing", which is a
  // measurement rather than an absence — and if the read failed, inventing a
  // figure would be worse than staying quiet.
  if (failed || !usage) return null;

  const warning = usage.fraction >= WARN_AT;
  const pct = Math.round(usage.fraction * 100);

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-3">
          <HardDrive size={16} className="text-charcoal-soft" />
          <span className="text-sm font-medium text-charcoal">Storage</span>
        </div>
        <span
          className={`text-xs font-semibold ${warning ? "text-status-high" : "text-charcoal-faint"}`}
        >
          {formatBytes(usage.usedBytes)} of {formatBytes(usage.capBytes)}
        </span>
      </div>

      <div
        className="h-1.5 rounded-full bg-charcoal/[0.08] overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Storage used"
      >
        {/* A visible sliver for any non-zero usage: a bar that renders as
            nothing says "empty", and 4 MB of 2 GB is not empty. */}
        <div
          className={`h-full rounded-full ${warning ? "bg-status-high" : "bg-primary"}`}
          style={{ width: usage.usedBytes > 0 ? `max(2px, ${usage.fraction * 100}%)` : "0%" }}
        />
      </div>

      <p className="text-[11px] text-charcoal-faint mt-2">
        {warning
          ? "You're running low. Remove a lab report or scan you no longer need to free up space."
          : "Lab reports, scans and other files you upload."}
      </p>
    </Card>
  );
};
