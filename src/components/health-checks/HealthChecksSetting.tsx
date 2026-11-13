import React, { useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";
import { HealthScanIcon } from "../profile/HealthScanIcon";
import { Card } from "../ui/Card";
import { Toggle } from "../ui/Toggle";
import { SELECTABLE_INNER, SelectableBox } from "../ui/SelectableBox";
import { Button } from "../ui/Button";
import { BizRow } from "../business-more/kit";
import { useApp } from "../../context/AppContext";
import { useHealthChecks } from "../../context/healthChecksStore";
import { COPY } from "../../services/health-checks/guidance";
import { t } from "../../i18n/core";

/**
 * The Profile → Safety & content switch. Adults only: somebody known to be
 * under 18 never sees it, and the database refuses anyone who is not a
 * confirmed adult (ATX54), which is shown as the under-18 line. Turning it on
 * asks first with the document's own text; turning it off erases it.
 *
 * FX-02: `variant` "row" draws it as the last item of the mobile Safety &
 * content card (behind the card's 1px charcoal 6% divider, 16 above and
 * below); "pane" as the last row of the web More › Safety & content group.
 * "card" (default) is its own card, as before.
 */
export function HealthChecksSetting({ variant = "card" }: { variant?: "card" | "row" | "pane" }) {
  const navigate = useNavigate();
  const { user } = useApp();
  const checks = useHealthChecks();
  const { refresh } = checks;
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const descId = useId();

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
    else setNote(r.reason === "adults-only" ? COPY.under18 : t("Couldn't turn it on. Please try again."));
  };

  const turnOff = async () => {
    setBusy(true);
    const ok = await checks.turnOff();
    setBusy(false);
    setNote(ok ? COPY.turnedOff : t("Couldn't turn it off. Please try again."));
  };

  const selected = on || confirming;
  const disabled = checks.on === null || busy;
  const onToggle = () => {
    setNote(null);
    if (!selected) setConfirming(true);
    else if (confirming) setConfirming(false);
    else void turnOff();
  };
  const confirmBlock = confirming && (
    <div className={clsx(SELECTABLE_INNER, "mt-3 rounded-xl bg-primary-pale px-3.5 py-3")}>
      <p className="text-xs text-charcoal leading-relaxed">{COPY.turningOn}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={busy} onClick={confirmOn}>
          {t("Turn on")}
        </Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
          {t("Cancel")}
        </Button>
      </div>
    </div>
  );
  const noteLine = note && (
    <p role="status" className={clsx(SELECTABLE_INNER, "text-xs font-semibold text-primary-dark bg-primary-pale rounded-xl px-3.5 py-2.5 mt-3 leading-relaxed")}>
      {note}
    </p>
  );
  const planLink = on && (
    <button
      onClick={() => navigate("/app/health/checks")}
      className="tap mt-3 flex items-center gap-1 text-xs font-semibold text-primary-dark"
    >
      {COPY.planTitle}
      <ChevronRight size={14} />
    </button>
  );

  // FX-02 (web): a row of the Safety & content group, like Recovery above it.
  // The row is the switch, so its confirmation, note and plan link sit under
  // it at the text's inset (50), never inside the switch.
  if (variant === "pane") {
    return (
      <>
        <BizRow
          icon={ScanIcon}
          title={t(COPY.switchLabel)}
          desc={COPY.switchDescription}
          toggle={{ checked: selected, onChange: onToggle, disabled, label: t(COPY.switchLabel) }}
        />
        {(confirmBlock || noteLine || planLink) && (
          <div style={{ paddingInlineStart: 50, paddingBottom: 8 }}>
            {confirmBlock}
            {noteLine}
            {planLink}
          </div>
        )}
      </>
    );
  }

  const box = (
    // FP: the box is the switch (a full-box switch behind it), so a tap
    // anywhere on it does what the switch does. The confirmation and the note
    // keep their own taps and never toggle.
    <SelectableBox
      inner
      kind="switch"
      selected={selected}
      onToggle={onToggle}
      disabled={disabled}
      label={t(COPY.switchLabel)}
      describedBy={descId}
      className={variant === "row" ? undefined : "rounded-[17px] pt-4 px-4 pb-[18px]"}
    >
      {/* MO1.5 anatomy row 9 (2x frame): 36 #F0EDF9 tile (new, decision
          22), the description under the title's x, 10 below the tile, 12/400
          on an 18 line. */}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
            <HealthScanIcon className="text-primary-dark" />
          </span>
          <span aria-hidden className="text-sm font-semibold text-charcoal">{t(COPY.switchLabel)}</span>
        </span>
        <Toggle decorative checked={selected} disabled={disabled} />
      </div>
      <p id={descId} aria-hidden className="ps-12 mt-2.5 text-xs text-charcoal-faint leading-normal">{COPY.switchDescription}</p>
      {confirmBlock}
      {noteLine}
      {planLink}
    </SelectableBox>
  );

  // FX-02 (mobile): the third item of the Recovery card, after Cycle
  // tracking, behind the same divider as Cycle tracking (1px charcoal 6%, 16
  // above and below).
  if (variant === "row") return <div className="mt-4 pt-4 border-t border-charcoal/[0.06]">{box}</div>;

  return (
    // MO1.5 / MO1.5.1.1: drawn like the Recovery card above it (radius 18,
    // padding 16 16 18), the icon in a tile, title 14/600. The glyph is the handover asset
    // MO1-5-4_01_advanced-health-monitoring (HealthScanIcon; was Stethoscope).
    // FP: the padding sits on the switch box inside the card, so the whole
    // card answers.
    <Card padded={false} className="mb-6 animate-fade-slide-up !rounded-[18px]">
      {box}
    </Card>
  );
}

/** The pane row's glyph: HealthScanIcon at its own 20 (the icon is unchanged). */
const ScanIcon: React.FC<{ className?: string }> = ({ className }) => <HealthScanIcon className={className} />;
