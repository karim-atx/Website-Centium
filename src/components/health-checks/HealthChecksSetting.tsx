import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Stethoscope } from "lucide-react";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { useHealthChecks } from "../../context/healthChecksStore";
import { COPY } from "../../services/health-checks/guidance";

/**
 * The Profile → Safety & content switch. Adults only: somebody known to be
 * under 18 never sees it, and the database refuses anyone who is not a
 * confirmed adult (ATX54), which is shown as the under-18 line. Turning it on
 * asks first with the document's own text; turning it off erases it.
 */
export function HealthChecksSetting() {
  const navigate = useNavigate();
  const { user } = useApp();
  const checks = useHealthChecks();
  const { refresh } = checks;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!checks.available) return null;
  if (typeof user.age === "number" && user.age < 18) return null;

  const on = checks.on === true;

  const confirmOn = async () => {
    setBusy(true);
    const r = await checks.turnOn();
    setBusy(false);
    setConfirming(false);
    if (r.ok) setNote(null);
    else setNote(r.reason === "adults-only" ? COPY.under18 : "Couldn't turn it on. Please try again.");
  };

  const turnOff = async () => {
    setBusy(true);
    const ok = await checks.turnOff();
    setBusy(false);
    setNote(ok ? COPY.turnedOff : "Couldn't turn it off. Please try again.");
  };

  return (
    <Card className="mb-6 animate-fade-slide-up">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="flex items-center gap-2.5 text-sm font-bold text-charcoal">
          <Stethoscope size={16} className="text-primary-dark shrink-0" />
          {COPY.switchLabel}
        </span>
        <Toggle
          checked={on || confirming}
          disabled={checks.on === null || busy}
          onChange={(v) => {
            setNote(null);
            if (v) setConfirming(true);
            else if (confirming) setConfirming(false);
            else void turnOff();
          }}
          label={COPY.switchLabel}
        />
      </div>
      <p className="text-xs text-charcoal-faint leading-relaxed">{COPY.switchDescription}</p>
      {confirming && (
        <div className="mt-3 rounded-xl bg-primary-pale px-3.5 py-3">
          <p className="text-xs text-charcoal leading-relaxed">{COPY.turningOn}</p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" disabled={busy} onClick={confirmOn}>
              Turn on
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {note && (
        <p role="status" className="text-xs font-semibold text-primary-dark bg-primary-pale rounded-xl px-3.5 py-2.5 mt-3 leading-relaxed">
          {note}
        </p>
      )}
      {on && (
        <button
          onClick={() => navigate("/app/health/checks")}
          className="tap mt-3 flex items-center gap-1 text-xs font-semibold text-primary-dark"
        >
          {COPY.planTitle}
          <ChevronRight size={14} />
        </button>
      )}
    </Card>
  );
}
