import React, { useEffect, useState } from "react";
import { Check, FlaskConical, Info } from "lucide-react";
import { partBSheetTone } from "./log/LogSheetParts";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { useApp } from "../../context/AppContext";
import { fetchMyGrants, type GrantMap } from "../../services/consent";
import {
  existingShare,
  getMyResultShares,
  getShareTargets,
  onlyTheseLine,
  shareResult,
  sharesCovering,
  stopSharingResult,
  type ResultShare,
  type ShareScope,
  type ShareTarget,
} from "../../services/result-shares";
import { localIsoDay, shortDay } from "../../services/care-plan/logic";
import { formatDisplayDate } from "../../utils/date";
import { initials } from "../professionals/typeColour";
import { textPx, linePx } from "../../theme/textSize";
import type { LabResult } from "../../services/labs/results";
import { useHealthMode, fieldStyle, FieldLabel, Skel, ConfirmPopup, ErrorLine, INK, INK_FAINT } from "./records/kit";
import { t, tn, tx } from "../../i18n/core";

// Release 3 · CU18–CU21 (Karim answer 3): share ONE lab result, or every
// result of its test, with one connected professional, as an explicit grant
// (DB-6 result_shares). Started and revoked from this same sheet, modelled on
// ShareImagingSheet: the shares that already make this result visible, each
// with Stop (CU21), then Who and What (CU19, r11.js step 1) and Note and
// confirm (CU20, r11.js step 2). Works whatever the Lab results switch says.
// Imaging is unchanged (ShareImagingSheet).

/** lib.js tokens: light / dark. */
const tok = (dark: boolean) => ({
  chS: dark ? "#B8B3C7" : "#5B5349",
  pr: dark ? "#A991FE" : "#AEA1DC",
  prPale: dark ? "#303141" : "#F0EDF9",
  prDeep: dark ? "#C3B3FB" : "#5F5093",
  card: dark ? "#1C1F28" : "#FFFFFF",
  soft: dark ? "#242730" : "#F5F5F6",
  b10: dark ? "rgba(245,243,250,0.10)" : "rgba(36,31,27,0.10)",
  b06: dark ? "rgba(245,243,250,0.06)" : "rgba(36,31,27,0.06)",
  optOn: dark ? "#9A8CD6" : "#AEA1DC",
  optOff: dark ? "#31343C" : "#E5E6EB",
  optOnBg: dark ? "#303141" : "#F0EDF9",
  optOffBg: dark ? "#262932" : "#FAFAFB",
  red: dark ? "#F09A8E" : "#C0392B",
  tealTint: dark ? "#293339" : "#E1EFEC",
  tealInk: dark ? "#93C1B9" : "#3C6B65",
  flaskTile: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9",
  flaskInk: dark ? "#C3B3FB" : "#7D6BB5",
});

export const ShareResultSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  /** The result the sheet is about (the marker's latest). */
  result: LabResult | null;
  /** How many results its report holds ("{n} results, {date}"); the whole-test option needs a report. */
  panelCount?: number;
  onToast?: (message: string) => void;
  /** After a share was added or stopped, so callers can refresh their lines. */
  onChanged?: () => void;
}> = ({ open, onClose, result, panelCount = 0, onToast, onChanged }) => {
  const { authUserId } = useApp();
  const { dark, hc } = useHealthMode();
  const tc = tok(dark);
  const [step, setStep] = useState<"who" | "confirm">("who");
  const [targets, setTargets] = useState<ShareTarget[] | null>(null);
  const [shares, setShares] = useState<ResultShare[]>([]);
  const [grants, setGrants] = useState<Record<string, GrantMap>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [scope, setScope] = useState<ShareScope>("result");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopFor, setStopFor] = useState<ResultShare | null>(null);
  const [stopBusy, setStopBusy] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Fresh each time it opens: step 1, nothing typed.
  useEffect(() => {
    if (!open) return;
    setStep("who");
    setNote("");
    setError(null);
    setScope("result");
  }, [open, result?.id]);

  useEffect(() => {
    if (!open || !authUserId || !result) return;
    let cancelled = false;
    setLoadError(null);
    void Promise.all([getShareTargets(), getMyResultShares(), fetchMyGrants(authUserId)]).then(([tg, sh, gr]) => {
      if (cancelled) return;
      if (!tg.ok) {
        setTargets([]);
        setLoadError(tg.message);
      } else {
        setTargets(tg.targets);
        setWho((w) => (w && tg.targets.some((x) => x.professionalId === w) ? w : tg.targets[0]?.professionalId ?? null));
      }
      if (sh.ok) setShares(sh.shares);
      else setLoadError(sh.message);
      if (gr.status === "ok") setGrants(gr.grants);
    });
    return () => {
      cancelled = true;
    };
  }, [open, authUserId, result, tick]);

  if (!result) return null;
  const subject = { resultId: result.id, panelId: result.panelId };
  const covering = sharesCovering(shares, subject);
  const target = targets?.find((x) => x.professionalId === who) ?? null;
  const already = who ? existingShare(shares, who, scope, subject) : null;
  const resultLine = `${result.name}, ${formatDisplayDate(result.date)}`;
  const panelLine = tn(panelCount, "{n} result, {date}", "{n} results, {date}", { date: formatDisplayDate(result.date) });
  const nameFor = (id: string) => targets?.find((x) => x.professionalId === id) ?? null;
  const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

  const doShare = async () => {
    if (!who || !target || busy) return;
    if (offline()) return setError(t("You're offline. Try again when you're connected."));
    setBusy(true);
    setError(null);
    const r = await shareResult(who, scope, subject, note);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onToast?.(t("Shared with {name}", { name: target.firstName }));
    onChanged?.();
    onClose();
  };
  const doStop = async () => {
    if (!stopFor) return;
    if (offline()) return setStopError(t("You're offline. Try again when you're connected."));
    setStopBusy(true);
    setStopError(null);
    const r = await stopSharingResult(stopFor.id);
    setStopBusy(false);
    if (!r.ok) return setStopError(r.message);
    const p = nameFor(stopFor.professionalId);
    onToast?.(p ? t("Stopped sharing with {name}.", { name: p.firstName }) : t("Stopped sharing with them."));
    setStopFor(null);
    onChanged?.();
    setTick((x) => x + 1);
  };

  const label: React.CSSProperties = { fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: tc.chS };
  const stopFirst = stopFor ? nameFor(stopFor.professionalId)?.firstName ?? tx("They", "a professional") : "";

  const whoStep = (
    <>
      {/* CU21: what already makes this result visible, with Stop. */}
      {covering.length > 0 && (
        <div data-share-existing style={{ marginBottom: 14 }}>
          <p style={{ ...label, marginBottom: 8 }}>{t("Shared")}</p>
          <div style={{ background: tc.card, border: `1px solid ${tc.b10}`, borderRadius: 20, padding: "2px 14px" }}>
            {covering.map((s, i) => {
              const p = nameFor(s.professionalId);
              return (
                <div key={s.id} className="flex items-center" style={{ gap: 12, padding: "12px 0", borderBottom: i < covering.length - 1 ? `1px solid ${tc.b06}` : "none" }}>
                  <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: tc.flaskTile }}>
                    <FlaskConical size={16} strokeWidth={1.75} style={{ color: tc.flaskInk }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block" style={{ fontSize: textPx(14), lineHeight: linePx(20), color: INK }}>
                      {s.bloodMarkerId ? t("This result only") : t("All results from this test")}
                    </span>
                    <span className="block" style={{ fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>
                      {p
                        ? t("With {name} · shared {date}", { name: p.line, date: shortDay(localIsoDay(s.sharedAt)) })
                        : t("With a professional · shared {date}", { date: shortDay(localIsoDay(s.sharedAt)) })}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setStopError(null);
                      setStopFor(s);
                    }}
                    className="tap min-h-[44px] min-w-[44px] shrink-0"
                    style={{ fontSize: textPx(13), lineHeight: linePx(19.5), fontWeight: 700, color: tc.red }}
                  >
                    {t("Stop")}
                  </button>
                </div>
              );
            })}
          </div>
          {[...new Set(covering.map((s) => s.professionalId))]
            .filter((id) => grants[id]?.lab_results !== true && nameFor(id))
            .map((id) => (
              <p key={id} style={{ marginTop: 10, fontSize: textPx(11.5), lineHeight: 1.5, color: INK_FAINT }}>
                {onlyTheseLine(nameFor(id)!.firstName, shares.filter((s) => s.professionalId === id).length)}
              </p>
            ))}
        </div>
      )}

      <p style={{ ...label, marginBottom: 8 }}>{t("Who")}</p>
      {targets === null ? (
        [0, 1].map((i) => (
          <div key={i} className="flex items-center" style={{ gap: 12, padding: "10px 12px", marginBottom: 6 }}>
            <Skel w={32} h={32} r={16} />
            <Skel w="45%" h={12} />
          </div>
        ))
      ) : targets.length === 0 ? (
        <p style={{ padding: "4px 2px 8px", fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>
          {loadError ?? t("No professionals connected yet.")}
        </p>
      ) : (
        <div role="radiogroup" aria-label={t("Who")}>
          {targets.map((p) => {
            const on = p.professionalId === who;
            return (
              <button
                key={p.professionalId}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setWho(p.professionalId)}
                className="tap w-full flex items-center text-start"
                style={{ gap: 12, padding: "10px 12px", minHeight: 52, borderRadius: 14, marginBottom: 6, border: `1px solid ${on ? tc.pr : tc.b10}`, background: on ? tc.prPale : tc.card }}
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="shrink-0 object-cover" style={{ width: 32, height: 32, borderRadius: 9999 }} />
                ) : (
                  <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 32, height: 32, borderRadius: 9999, background: tc.tealTint, color: tc.tealInk, fontSize: textPx(11), fontWeight: 800 }}>
                    {initials(p.name)}
                  </span>
                )}
                <span className="flex-1 min-w-0" style={{ fontSize: textPx(14), lineHeight: linePx(20), fontWeight: 600, color: INK }}>
                  {p.line}
                </span>
                {on && <Check size={16} strokeWidth={2.6} style={{ color: tc.prDeep }} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      <p style={{ ...label, margin: "14px 0 8px" }}>{t("What")}</p>
      <div role="radiogroup" aria-label={t("What")}>
        {(
          [
            ["result", t("This result only"), resultLine],
            ...(result.panelId ? ([["panel", t("All results from this test"), panelLine]] as const) : []),
          ] as const
        ).map(([key, title, sub]) => {
          const on = scope === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setScope(key)}
              className="tap w-full block text-start"
              style={{ padding: "10px 12px", minHeight: 44, borderRadius: 12, marginBottom: 6, border: `1px solid ${on ? tc.optOn : tc.optOff}`, background: on ? tc.optOnBg : tc.optOffBg }}
            >
              <span className="block" style={{ fontSize: textPx(14), lineHeight: linePx(20), fontWeight: on ? 700 : 600, color: INK }}>
                {title}
              </span>
              <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: INK_FAINT }}>
                {sub}
              </span>
            </button>
          );
        })}
      </div>
      {already && target ? (
        <p data-share-already style={{ marginTop: 8, fontSize: textPx(11.5), lineHeight: 1.5, color: INK_FAINT }}>
          {t("Already shared with {name}.", { name: target.firstName })}
        </p>
      ) : (
        <p style={{ marginTop: 8, fontSize: textPx(11.5), lineHeight: 1.5, color: INK_FAINT }}>{t("Your other results stay private. You can stop sharing any time.")}</p>
      )}
    </>
  );

  const confirmStep = target && (
    <>
      <div style={{ borderRadius: 14, background: tc.soft, padding: 12, marginBottom: 12 }}>
        <p style={{ fontSize: textPx(13), lineHeight: linePx(19), fontWeight: 700, color: INK }}>{scope === "result" ? resultLine : panelLine}</p>
        <p style={{ fontSize: textPx(12), lineHeight: linePx(17), color: tc.chS }}>
          {scope === "result" ? t("With {name} · this result only", { name: target.line }) : t("With {name} · all results from this test", { name: target.line })}
        </p>
      </div>
      <FieldLabel htmlFor="share-result-note">{t("Note (optional)")}</FieldLabel>
      <input
        id="share-result-note"
        value={note}
        maxLength={280}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("Can we talk about this at my next visit?")}
        className="outline-none placeholder:text-charcoal-faint"
        style={fieldStyle(dark, hc)}
      />
      <p className="flex items-start" style={{ gap: 6, marginTop: 12, fontSize: textPx(11), lineHeight: linePx(16), color: INK_FAINT }}>
        <Info size={12} strokeWidth={2} className="shrink-0" style={{ marginTop: 2 }} aria-hidden />
        {t("{name} sees it straight away and gets a notification.", { name: target.firstName })}
      </p>
      {error && <ErrorLine style={{ marginTop: 10 }}>{error}</ErrorLine>}
    </>
  );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        onBack={step === "confirm" ? () => setStep("who") : undefined}
        title={step === "who" ? t("Share with…") : t("Confirm sharing")}
        chrome="partB"
        tone={partBSheetTone(dark)}
        footerBottom={30}
        footer={
          step === "who" ? (
            <CtaButton label={t("Continue")} onClick={() => setStep("confirm")} disabled={!target || !!already} />
          ) : (
            <CtaButton label={t("Share result")} icon={<Check size={16} />} onClick={() => void doShare()} loading={busy} disabled={!target} />
          )
        }
      >
        {step === "who" ? whoStep : confirmStep}
      </BottomSheet>
      <ConfirmPopup
        open={stopFor !== null}
        geometry="ours"
        title={t("Stop sharing this result?")}
        body={
          stopFor
            ? stopFor.bloodMarkerId
              ? t("{name} can no longer see {result}.", { name: stopFirst, result: resultLine })
              : t("{name} can no longer see the results from this test.", { name: stopFirst })
            : ""
        }
        confirmLabel={t("Stop sharing")}
        busy={stopBusy}
        error={stopError}
        onCancel={() => setStopFor(null)}
        onConfirm={() => void doStop()}
      />
    </>
  );
};
