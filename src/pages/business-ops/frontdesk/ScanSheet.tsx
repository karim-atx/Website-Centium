import React, { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, CameraOff, CircleCheck, RotateCcw, ScanLine, UserCheck, WifiOff, XCircle } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { useCameraCodeReader } from "../../../components/food/useCameraCodeReader";
import { checkInWithPass, fetchDeskEntries, isMissingDesk, markMembershipPaid, verifyPass } from "../../../services/front-desk";
import { offerPromotionUsed } from "../../../components/promotions/promotionUsed";

import {
  checkInView,
  normalizePassToken,
  scanResultView,
  VERIFY_FAILED_VIEW,
  type CheckIn,
  type PassCheck,
  type ResultIcon,
  type ResultTone,
  type ScanResultView,
} from "../../../services/front-desk/frontDeskLogic";
import { textPx } from "../../../theme/textSize";
import { t } from "../../../i18n/core";
import { EmptyCard, StatusChip } from "./frontDeskKit";

// OURS-OP1-front-desk-scan: the camera (zxing-wasm / BarcodeDetector, QR
// format) and a hardware scanner both feed check_in_with_pass(desk venue,
// token, 'qr') (B10), which decides AND records the entry, denials included;
// the result is the BizTypeKit central pop-up (OP1-019 geometry): R1
// "{name} is checked in", R4-R8 by the recorded reason, R9 "Already checked
// in" (no second row). Mark as paid (R4): mark_gym_membership_paid(), then
// the same pass is checked in again. THE PENDING RULE: on a database without
// B10 the scan falls back to verify_gym_pass(), which records nothing, so a
// valid pass reads "{name}'s pass is valid" (R2).

const SAME_TOKEN_MS = 10_000;

const ICON: Record<ResultIcon, React.ReactNode> = {
  check: <CircleCheck size={20} strokeWidth={2.2} />,
  banknote: <Banknote size={20} strokeWidth={2.2} />,
  x: <XCircle size={20} strokeWidth={2.2} />,
  scan: <ScanLine size={20} strokeWidth={2.2} />,
  "user-check": <UserCheck size={20} strokeWidth={2.2} />,
  retry: <RotateCcw size={20} strokeWidth={2.2} />,
};

const DISC: Record<ResultTone, { bg: string; ink: string }> = {
  good: { bg: "rgb(var(--c-status-good-bg))", ink: "rgb(var(--c-status-good))" },
  warn: { bg: "rgb(var(--c-status-caution-bg))", ink: "rgb(var(--c-caution-text))" },
  high: { bg: "rgb(var(--c-status-high-bg))", ink: "rgb(var(--c-status-high))" },
  primary: { bg: "rgb(var(--c-primary-pale))", ink: "rgb(var(--c-primary-dark))" },
  soft: { bg: "rgb(var(--c-cream-soft))", ink: "rgb(var(--c-charcoal-faint))" },
};

/** What a scan hands the check-in sheet: the member, and whether to sell them a day pass. */
export type CheckInPreset = { membershipId: string | null; firstName: string | null; dayPass: boolean };

export const ScanSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  online: boolean;
  /** The venue this desk checks people in at. */
  gymId: string | null;
  /** B10 answers on this database (false: the verify-only fallback). */
  live: boolean | null;
  /** The business sells a day pass (R5's "Sell a day pass"). */
  sellsDayPass: boolean;
  onCheckInByName: (preset: CheckInPreset | null) => void;
  /** An entry was recorded or a pass marked paid: the desk reloads. */
  onChanged: () => void;
}> = ({ open, onClose, online, gymId, live, sellsDayPass, onCheckInByName, onChanged }) => {
  const [result, setResult] = useState<{ view: ScanResultView; check: PassCheck | null; ci: CheckIn | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [payError, setPayError] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const last = useRef<{ token: string; at: number } | null>(null);
  const resumeRef = useRef<() => void>(() => undefined);
  // Scanning pauses while a result is open (or a check is running).
  const paused = useRef(false);
  useEffect(() => {
    paused.current = !!result || busy;
  }, [result, busy]);

  const check = useCallback(
    async (token: string) => {
      setBusy(true);
      setPayError(false);
      if (live !== false && gymId) {
        const r = await checkInWithPass(gymId, token, "qr");
        if (r.ok) {
          const c = r.value;
          let alreadyAt: string | null = null;
          if (c.alreadyIn && c.checkInId) {
            // R9's time: the earlier entry, from today's list.
            const e = await fetchDeskEntries(gymId);
            alreadyAt = e.ok ? e.value.find((x) => x.id === c.checkInId)?.at ?? null : null;
          } else onChanged();
          setBusy(false);
          setResult({ view: checkInView(c, { sellsDayPass, alreadyAt }), check: null, ci: c });
          return;
        }
        if (!isMissingDesk(r)) {
          setBusy(false);
          // ATXE6 (desk check-in off) and ATX03 say why; anything else is C4.
          const why = r.code === "ATXE6" || r.code === "ATX03" ? r.message : null;
          setResult({ view: why ? { ...VERIFY_FAILED_VIEW, body: why, primaryLabel: t("Scan again") } : VERIFY_FAILED_VIEW, check: null, ci: null });
          return;
        }
      }
      // The pending rule: no B10 on this database, look only.
      const r = await verifyPass(token);
      setBusy(false);
      if (!r.ok) {
        setResult({ view: VERIFY_FAILED_VIEW, check: null, ci: null });
        return;
      }
      setResult({ view: scanResultView(r.value, { checkInsLive: false, sellsDayPass: false }), check: r.value, ci: null });
    },
    [gymId, live, sellsDayPass, onChanged]
  );

  /** A read from the camera or the hardware scanner; true when it was taken. */
  const take = useCallback(
    (raw: string): boolean => {
      const token = normalizePassToken(raw);
      if (!token || paused.current) return false;
      const now = Date.now();
      if (last.current && last.current.token === token && now - last.current.at < SAME_TOKEN_MS) return false;
      last.current = { token, at: now };
      void check(token);
      return true;
    },
    [check]
  );

  const cameraOn = open && online;
  const { video, camera, resume } = useCameraCodeReader({ active: cameraOn, kind: "qr", accept: take });
  useEffect(() => {
    resumeRef.current = resume;
  }, [resume]);

  // W4: keep the screen on at the door while the sheet is open.
  useEffect(() => {
    if (!open) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    void nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => undefined);
    return () => void lock?.release().catch(() => undefined);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setResult(null);
      last.current = null;
    }
  }, [open]);

  const closeResult = (again: boolean) => {
    setResult(null);
    setPayError(false);
    if (again) resumeRef.current();
  };

  const onPrimary = async () => {
    if (!result) return;
    const { view, check: c, ci } = result;
    const membershipId = ci?.membershipId ?? c?.membershipId ?? null;
    if (view.primary === "mark-paid" && membershipId) {
      setBusy(true);
      const r = await markMembershipPaid(membershipId);
      if (!r.ok) {
        setBusy(false);
        setPayError(true);
        return;
      }
      offerPromotionUsed({ kind: "membership", sourceId: membershipId });
      onChanged();
      // Check the same pass in again: it is paid now (R1; R2 without B10).
      if (last.current) await check(last.current.token);
      else setBusy(false);
      return;
    }
    closeResult(true);
  };

  const onSecondary = () => {
    if (!result) return;
    switch (result.view.secondary) {
      case "done":
        closeResult(false);
        onClose();
        return;
      case "check-in":
      case "sell-day-pass": {
        const src = result.ci ?? result.check;
        closeResult(false);
        onCheckInByName({ membershipId: src?.membershipId ?? null, firstName: src?.firstName ?? null, dayPass: result.view.secondary === "sell-day-pass" });
        return;
      }
      default:
        closeResult(true);
    }
  };

  // W7: a USB or Bluetooth scanner types the token and Enter into a focused
  // input. inputMode none keeps the phone's keyboard closed.
  const hidden = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open && !result) {
      const timer = window.setTimeout(() => hidden.current?.focus({ preventScroll: true }), 300);
      return () => window.clearTimeout(timer);
    }
  }, [open, result]);

  const view = result?.view;
  const showCamera = online && (camera === "starting" || camera === "scanning");

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={t("Scan a pass")}
        tone="business"
        headerHeight={53}
        bodyPadding={{ top: 18, right: 20, bottom: 12, left: 20 }}
        footer={
          <button
            type="button"
            onClick={() => onCheckInByName(null)}
            className="tap w-full text-charcoal-soft"
            style={{ minHeight: 44, fontSize: textPx(14), fontWeight: 700 }}
          >
            {t("Check someone in")}
          </button>
        }
      >
        <input
          ref={hidden}
          aria-label={t("Pass code from a scanner")}
          inputMode="none"
          autoComplete="off"
          className="sr-only"
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const el = e.currentTarget;
            if (take(el.value)) navigator.vibrate?.(40);
            el.value = "";
          }}
        />
        {!online ? (
          <EmptyCard icon={WifiOff} title={t("You're offline")} body={t("Passes can't be checked without a connection. Try again when you're back online.")}>
            <button type="button" onClick={() => setRetryTick((n) => n + 1)} key={retryTick} className="tap text-[12px] font-bold text-primary-dark" style={{ minHeight: 44, marginTop: 4 }}>
              {t("Retry")}
            </button>
          </EmptyCard>
        ) : showCamera ? (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1 / 1", borderRadius: 18, background: "#121317" }}>
            <video ref={video} playsInline muted aria-hidden className="absolute inset-0 w-full h-full" style={{ objectFit: "cover" }} />
            <div
              aria-hidden
              className="absolute"
              style={{ width: 200, height: 200, left: "50%", top: "50%", transform: "translate(-50%, -50%)", border: "2px solid rgba(255,255,255,0.85)", borderRadius: 14 }}
            />
            <div aria-hidden className="absolute inset-x-0 bottom-0" style={{ height: 56, background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 100%)" }} />
            <p role="status" className="absolute inset-x-0 text-center" style={{ bottom: 10, color: "rgba(255,255,255,0.85)", fontSize: textPx(12), fontWeight: 600 }}>
              {busy ? t("Checking the pass…") : camera === "starting" ? t("Starting the camera…") : t("Point the camera at the member's pass.")}
            </p>
          </div>
        ) : camera === "denied" ? (
          <EmptyCard icon={CameraOff} title={t("Camera is blocked")} body={t("Allow camera access for Centium in your browser settings, or check them in by name.")} />
        ) : (
          <EmptyCard icon={CameraOff} title={t("No camera available")} body={t("This device can't scan passes. Check them in by name instead.")} />
        )}
        <p className="text-center text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginTop: 12 }}>
          {t("Each member's pass is in their Centium app.")}
        </p>
      </BottomSheet>

      <ConfirmCard
        open={!!view}
        layout="stacked"
        frame="kit"
        icon={view ? ICON[view.icon] : null}
        disc={view ? DISC[view.tone] : undefined}
        title={view?.title ?? ""}
        subtitle={view?.body}
        confirmLabel={view?.primaryLabel ?? ""}
        cancelLabel={view?.secondaryLabel ?? ""}
        busy={busy}
        extra={
          view && (view.minor || payError) ? (
            <div style={{ marginTop: 8 }}>
              {view.minor && (
                <>
                  <StatusChip tone="warn">{t("Under 18")}</StatusChip>
                  <p className="text-[13px] leading-[19px] text-charcoal-soft" style={{ marginTop: 6 }}>
                    {t("Check your rules for members under 18.")}
                  </p>
                </>
              )}
              {payError && (
                <p role="alert" className="text-[11.5px] font-bold leading-[16px] text-status-high" style={{ marginTop: 6 }}>
                  {t("Couldn't mark it as paid. Try again.")}
                </p>
              )}
            </div>
          ) : null
        }
        onConfirm={() => void onPrimary()}
        onCancel={onSecondary}
      />
    </>
  );
};
