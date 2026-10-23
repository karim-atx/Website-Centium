import React, { useEffect, useId, useMemo, useState } from "react";
import { Check, Lock } from "lucide-react";
import { TicketStub } from "../../../../components/market/TicketStub";
import { sheetChipStyle } from "../../../../components/ui/sheetChip";
import { NO_ICON_SCALE } from "../../../../components/pro/proInk";
import { useMyCv } from "../../../../components/cv/useMyCv";
import { useApp } from "../../../../context/AppContext";
import { useOnline } from "../../../../hooks/useOnline";
import { fetchShowcaseServices } from "../../../../services/pro-market";
import { applyToOpening, type ApplyInput, type Opportunity } from "../../../../services/team-hiring";
import { fetchWorkHistory } from "../../../../services/pro-profile";
import { payMoney, payText } from "../../../../services/hiring/fee";
import { MasterSheet, PrimaryButton, SaveError, SoonNote, fieldStyle, lh, px, useMarketColors } from "../../../business-market/listingParts";
import { applyTitle, attachableCredentials, availabilityLabel, openingSub, parseRate, proposalHint, scheduleLine, unitWord } from "./opportunitiesModel";

// Market + Share 3.0 · W4 · P-MA.5.2 Apply (MasterBottomSheet; Professional
// Marketplace Screens `sheet` for apSheet / apSheetRate, lines 551–577 and
// 826–835; frame-check P-MA.5.2 "Apply · pay set by the gym" / "Apply · pay
// proposals allowed"). Title "Apply to {gym}"; the body (gap 10):
// - the opening ticket (fTicket): --sgrey radius 14; label "Opening" 13 / 500
//   --slabel, the title 15 / 800, "{gym} · Role" 12 / 600 --accent, the
//   schedule 12 --ink2; the 72 stub (--pale, 1.5px dashed --fill) with the pay
//   15 / 800 --pdark; 14 notches in --sbody;
// - "Short message" (fText): a textarea in the --sfield field;
// - Pay: locked "Pay · set by the gym" (the pay in --ink2 with the 15 lock in
//   --faint, hint "This opening doesn't take proposals.") or the editable
//   "Your rate" (border 1px --fill, hint "This gym takes proposals. Their
//   posted pay is …"), sent as p_proposed_pay;
// - the availability checkbox (fCheck: the 20 box radius 6 --fill with the
//   12 / 3 tick, 13 / 18 700), required: Send stays disabled until it's ticked;
// - Attach (fChips): the professional's own LIVE credentials (named, not
//   expired unless shown when expired) and services (session types and
//   offered plans), read only, as toggle chips; "Work history" (W5) is a chip
//   too when work_history (Database Release 2) lists Centium hires; with none
//   it is drawn disabled with "No Centium work yet." (a failed read: "Couldn't
//   load your work history.");
// - the footer CTA "Send application" → apply_to_opening (Release 2: the
//   message is required, 1 to 2,000 characters, so Send waits for one too);
//   ATXH1 / ATXH2 / ATXH5 / ATXH6 / ATXH7 show their words under it.

export interface ApplySheetProps {
  opening: Opportunity | null;
  onClose: () => void;
  /** The application went in: the caller marks the card Applied and shows the strip. */
  onSent: (opening: Opportunity) => void;
  /** already_applied: the caller marks the card Applied too. */
  onAlreadyApplied?: (opening: Opportunity) => void;
}

type Chip = { key: string; kind: ApplyInput["attachments"][number]["kind"]; refId: string | null; label: string };

export function ApplySheet({ opening, onClose, onSent, onAlreadyApplied }: ApplySheetProps) {
  // A fresh form (and request id) per opening.
  return opening ? <ApplyForm key={opening.id} opening={opening} onClose={onClose} onSent={onSent} onAlreadyApplied={onAlreadyApplied} /> : null;
}

function ApplyForm({ opening: o, onClose, onSent, onAlreadyApplied }: { opening: Opportunity } & Omit<ApplySheetProps, "opening">) {
  const m = useMarketColors();
  const online = useOnline();
  const { authUserId } = useApp();
  const { cv } = useMyCv();
  const ids = { msg: useId(), rate: useId(), rateHint: useId(), attach: useId(), wh: useId() };
  const [message, setMessage] = useState("");
  const [rate, setRate] = useState(o.allowPayProposals && o.pay != null ? String(o.pay) : "");
  const [available, setAvailable] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const [services, setServices] = useState<{ id: string; label: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soon, setSoon] = useState(false);
  /** Centium work history (DB10): true / false once read, null while pending or unread. */
  const [hasWork, setHasWork] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let alive = true;
    void fetchShowcaseServices(authUserId).then((r) => {
      if (!alive) return;
      setServices(r.ok ? [...r.data.sessions.map((s) => ({ id: s.id, label: s.name })), ...r.data.plans.filter((p) => p.active).map((p) => ({ id: p.id, label: p.name }))] : []);
    });
    // work_history (Database Release 2): the Work history chip.
    void fetchWorkHistory(authUserId).then((r) => alive && setHasWork(r.ok ? r.value.length > 0 : null));
    return () => {
      alive = false;
    };
  }, [authUserId]);

  const chips = useMemo<Chip[]>(() => {
    const now = new Date();
    const nowMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const creds = cv ? attachableCredentials(cv.licences, nowMonth) : [];
    return [
      ...creds.map((c) => ({ key: `c:${c.id}`, kind: "credential" as const, refId: c.id, label: c.label })),
      ...(services ?? []).map((s) => ({ key: `s:${s.id}`, kind: "service" as const, refId: s.id, label: s.label })),
      ...(hasWork ? [{ key: "wh", kind: "work_history" as const, refId: null, label: "Work history" }] : []),
    ];
  }, [cv, services, hasWork]);

  const proposals = o.allowPayProposals;
  const rateValue = proposals ? parseRate(rate) : null;
  const rateInvalid = proposals && rate.trim() !== "" && rateValue == null;
  // apply_to_opening needs a message (1 to 2,000 characters) and the availability confirmation (ATXH5).
  const canSend = available && !rateInvalid && online && message.trim().length > 0;
  const schedule = scheduleLine(o);

  const toggle = (k: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const send = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    setError(null);
    setSoon(false);
    const r = await applyToOpening(
      o.id,
      {
        message: message.trim(),
        proposedPay: rateValue,
        availabilityConfirmed: true,
        attachments: chips.filter((c) => picked.has(c.key)).map((c) => ({ kind: c.kind, refId: c.refId, label: c.label })),
      }
    );
    setBusy(false);
    if (r.ok) return onSent(o);
    if (r.pending) return setSoon(true);
    if (r.error === "already_applied") onAlreadyApplied?.(o);
    setError(r.message);
  };

  const grey: React.CSSProperties = { background: m.sgrey, borderRadius: 14, padding: "12px 14px" };
  const label: React.CSSProperties = { display: "block", fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8, lineHeight: "normal" };
  const hint: React.CSSProperties = { fontSize: px(11.5), lineHeight: lh(16), color: m.faint, marginTop: 8 };

  return (
    <MasterSheet
      open
      onClose={onClose}
      title={applyTitle(o)}
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <PrimaryButton onClick={() => void send()} disabled={!canSend} busy={busy}>
            {busy ? "Sending…" : "Send application"}
          </PrimaryButton>
          {soon ? <SoonNote style={{ marginTop: 4 }}>Hiring is coming soon.</SoonNote> : null}
          {error ? <SaveError style={{ marginTop: 4 }}>{error}</SaveError> : null}
          {!online ? <SoonNote style={{ marginTop: 4 }}>You're offline. Try again when you're connected.</SoonNote> : null}
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, color: m.ink, lineHeight: "normal" }}>
        <TicketStub
          stubWidth={72}
          tone="pale"
          radius={14}
          background={m.sgrey}
          border="none"
          notchBg={m.sbody}
          notchRing={false}
          stub={<span style={{ fontSize: px(15), fontWeight: 800, color: m.pdark, textAlign: "center", lineHeight: lh(18) }}>{o.pay != null ? payMoney(o.pay) : "Open"}</span>}
          bodyStyle={{ padding: "12px 14px" }}
        >
          <div style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 6 }}>Opening</div>
          <div style={{ fontSize: px(15), fontWeight: 800 }}>{o.title}</div>
          <div style={{ fontSize: px(12), fontWeight: 600, color: m.accent }}>{openingSub(o)}</div>
          {schedule ? <div style={{ fontSize: px(12), color: m.ink2, marginTop: 2 }}>{schedule}</div> : null}
        </TicketStub>

        <div style={grey}>
          <label htmlFor={ids.msg} style={label}>
            Short message
          </label>
          <textarea id={ids.msg} value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={2} className="market-focus" style={{ ...fieldStyle(m), resize: "none" }} />
        </div>

        {proposals ? (
          <div style={grey}>
            <label htmlFor={ids.rate} style={label}>
              Your rate
            </label>
            <div style={{ ...fieldStyle(m, rateInvalid), border: `1px solid ${m.fill}`, display: "flex", alignItems: "center", gap: 4 }}>
              <span aria-hidden>$</span>
              <input
                id={ids.rate}
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                aria-describedby={ids.rateHint}
                aria-invalid={rateInvalid || undefined}
                style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", font: "inherit", color: "inherit", padding: 0 }}
              />
              <span style={{ color: m.faint, whiteSpace: "nowrap" }}>{unitWord(o.payUnit)}</span>
            </div>
            <div id={ids.rateHint} style={hint}>
              {proposalHint(o)}
            </div>
          </div>
        ) : (
          <div style={grey}>
            <div style={label}>Pay · set by the gym</div>
            <div style={{ ...fieldStyle(m), display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, minWidth: 0, color: m.ink2 }}>{o.pay != null ? payText(o.pay, o.payUnit) : "Set by the gym"}</span>
              <Lock size={15} strokeWidth={2} color={m.faint} aria-label="Locked" style={NO_ICON_SCALE} />
            </div>
            <div style={hint}>This opening doesn't take proposals.</div>
          </div>
        )}

        <button
          type="button"
          role="checkbox"
          aria-checked={available}
          onClick={() => setAvailable((v) => !v)}
          className="hit market-focus"
          style={{ display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, background: m.sgrey, padding: "12px 14px", border: 0, width: "100%", textAlign: "left", font: "inherit", color: m.ink, cursor: "pointer" }}
        >
          <span
            aria-hidden
            style={{ width: 20, height: 20, borderRadius: 6, background: available ? m.fill : m.card, border: available ? 0 : `1.5px solid ${m.fill}`, boxSizing: "border-box", color: m.onfill, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}
          >
            {available ? <Check size={12} strokeWidth={3} style={NO_ICON_SCALE} /> : null}
          </span>
          <span style={{ fontSize: px(13), lineHeight: lh(18), fontWeight: 700 }}>{availabilityLabel(o)}</span>
        </button>

        <div style={grey} role="group" aria-labelledby={ids.attach}>
          <div id={ids.attach} style={label}>
            Attach
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {chips.map((c) => {
              const on = picked.has(c.key);
              return (
                <button key={c.key} type="button" aria-pressed={on} onClick={() => toggle(c.key)} className="hit market-focus" style={{ ...sheetChipStyle(on), padding: "8px 12px", fontSize: px(13), fontFamily: "inherit", lineHeight: "normal", cursor: "pointer", whiteSpace: "normal", textAlign: "left" }}>
                  {c.label}
                </button>
              );
            })}
            {hasWork ? null : (
              <button type="button" aria-pressed={false} aria-disabled aria-describedby={ids.wh} className="hit market-focus" style={{ ...sheetChipStyle(false), padding: "8px 12px", fontSize: px(13), fontFamily: "inherit", lineHeight: "normal", cursor: "default", opacity: 0.4 }}>
                Work history
              </button>
            )}
          </div>
          {hasWork ? null : (
            <div id={ids.wh} style={hint}>
              {hasWork === false
                ? chips.length || services === null
                  ? "No Centium work yet."
                  : "Add credentials and services to your profile to attach them. No Centium work yet."
                : chips.length || services === null
                  ? "Couldn't load your work history."
                  : "Add credentials and services to your profile to attach them. Couldn't load your work history."}
            </div>
          )}
        </div>
      </div>
    </MasterSheet>
  );
}
