import React, { useId, useState } from "react";
import { Check, Circle, Sparkles } from "lucide-react";
import { NO_ICON_SCALE } from "../pro/proInk";
import { useOnline } from "../../hooks/useOnline";
import { legalHref } from "../../pages/settings/legalCopy";
import { MasterSheet, PrimaryButton, SaveError, SoonNote, fieldStyle, lh, px, useMarketColors } from "../../pages/business-market/listingParts";
import {
  applyForAmbassador,
  canSend,
  checklistRows,
  friendsToGoLine,
  linkProblem,
  MOTIVATION_MAX,
  whatYouGetLine,
  type AmbassadorStatus,
} from "../../services/ambassador";

// Release B · B2 "Apply to be an ambassador" (PLAN S3; not drawn, so built
// in the MasterSheet anatomy of pro/marketplace/opportunities/ApplySheet.tsx:
// grey 14 boxes with the 13 / 500 --slabel label, fieldStyle fields, the
// required fCheck checkbox and PrimaryButton in the pinned footer):
// - intro (13.5 charcoal-soft);
// - "What you get": the Referral popup's reward-row style (a 32 r10
//   primary-pale tile with the 15 / 1.75 glyph). POINTS ONLY (Karim, BR), so
//   PLAN S3's "Your friend · 12% off" row is not drawn;
// - "Who can apply": my_ambassador_application's booleans, Check (teal) or
//   Circle (faint), "{n} more friend(s) to go." under them;
// - "Why you'd like to be one" (500 max, counter) and "Where you share
//   (optional)";
// - "I agree to the Ambassador terms" (required; the link opens Legal ›
//   Referral, rewards and ambassador program on the website);
// - "Send application" → apply_for_ambassador (5 an hour), disabled until
//   every row is green and the form is complete; a refusal shows in the
//   footer's role="alert" line, worded by code.

export interface AmbassadorApplySheetProps {
  open: boolean;
  status: AmbassadorStatus | null;
  onClose: () => void;
  /** The application went in: the caller re-reads the status (pending card). */
  onSent: () => void;
}

const TERMS_HEADING = "Referral, rewards and ambassador program";

export function AmbassadorApplySheet({ open, status, onClose, onSent }: AmbassadorApplySheetProps) {
  // A fresh form each time it opens.
  return open && status ? <ApplyForm status={status} onClose={onClose} onSent={onSent} /> : null;
}

function ApplyForm({ status, onClose, onSent }: { status: AmbassadorStatus; onClose: () => void; onSent: () => void }) {
  const m = useMarketColors();
  const online = useOnline();
  const ids = { why: useId(), count: useId(), link: useId(), linkHint: useId(), terms: useId(), who: useId() };
  const [motivation, setMotivation] = useState("");
  const [link, setLink] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = checklistRows(status);
  const toGo = friendsToGoLine(status);
  const badLink = linkProblem(link);
  const ready = canSend(status, { motivation, link, terms }) && online;

  const send = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const r = await applyForAmbassador({ motivation, link, acceptTerms: terms });
    setBusy(false);
    if (r.ok) return onSent();
    setError(r.message);
  };

  const grey: React.CSSProperties = { background: m.sgrey, borderRadius: 14, padding: "12px 14px" };
  const label: React.CSSProperties = { display: "block", fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8, lineHeight: "normal" };
  const hint: React.CSSProperties = { fontSize: px(11.5), lineHeight: lh(16), color: m.faint, marginTop: 8 };

  return (
    <MasterSheet
      open
      onClose={onClose}
      title="Apply to be an ambassador"
      footer={
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <PrimaryButton onClick={() => void send()} disabled={!ready} busy={busy}>
            {busy ? "Sending…" : "Send application"}
          </PrimaryButton>
          {error ? <SaveError style={{ marginTop: 4 }}>{error}</SaveError> : null}
          {!online ? <SoonNote style={{ marginTop: 4 }}>You're offline. Try again when you're connected.</SoonNote> : null}
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10, color: m.ink, lineHeight: "normal" }}>
        <p className="text-charcoal-soft" style={{ margin: 0, fontSize: px(13.5), lineHeight: lh(19) }}>
          Ambassadors earn more for each friend who joins with their code. We review every application.
        </p>

        <div style={grey}>
          <div style={label}>What you get</div>
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
              <Sparkles size={15} strokeWidth={1.75} className="text-primary-accent" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12px] text-charcoal-faint">You</span>
              <span className="block text-[13.5px] font-bold text-charcoal">{whatYouGetLine()}</span>
            </span>
          </div>
        </div>

        <div style={grey} role="group" aria-labelledby={ids.who}>
          <div id={ids.who} style={label}>
            Who can apply
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.map((r) => (
              <li key={r.key} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: px(13), lineHeight: lh(18), color: r.done ? m.ink : m.ink2 }}>
                {r.done ? (
                  <Check size={16} strokeWidth={2.4} aria-hidden style={{ color: m.teal, flexShrink: 0, ...NO_ICON_SCALE }} />
                ) : (
                  <Circle size={16} strokeWidth={1.75} aria-hidden style={{ color: m.faint, flexShrink: 0, ...NO_ICON_SCALE }} />
                )}
                <span>
                  {r.label}
                  <span className="sr-only">{r.done ? ", done" : ", not yet"}</span>
                </span>
              </li>
            ))}
          </ul>
          {toGo ? <div style={hint}>{toGo}</div> : null}
        </div>

        <div style={grey}>
          <label htmlFor={ids.why} style={label}>
            Why you'd like to be one
          </label>
          <textarea
            id={ids.why}
            value={motivation}
            onChange={(e) => setMotivation(e.target.value.slice(0, MOTIVATION_MAX))}
            maxLength={MOTIVATION_MAX}
            rows={3}
            aria-describedby={ids.count}
            className="market-focus"
            style={{ ...fieldStyle(m), resize: "none" }}
          />
          <div id={ids.count} style={{ ...hint, textAlign: "right" }}>
            {motivation.length} / {MOTIVATION_MAX}
          </div>
        </div>

        <div style={grey}>
          <label htmlFor={ids.link} style={label}>
            Where you share (optional)
          </label>
          <input
            id={ids.link}
            type="url"
            inputMode="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Instagram, TikTok, a blog…"
            aria-invalid={!!badLink || undefined}
            aria-describedby={badLink ? ids.linkHint : undefined}
            className="market-focus"
            style={fieldStyle(m, !!badLink)}
          />
          {badLink ? (
            <div id={ids.linkHint} style={{ ...hint, color: m.high }}>
              {badLink}
            </div>
          ) : null}
        </div>

        {/* fCheck, as ApplySheet's availability row; the terms link sits
            beside the checkbox button, not inside it (no link in a button). */}
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", borderRadius: 14, background: m.sgrey, padding: "12px 14px" }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={terms}
            aria-labelledby={ids.terms}
            onClick={() => setTerms((v) => !v)}
            className="hit market-focus"
            style={{ width: 20, height: 20, borderRadius: 6, background: terms ? m.fill : m.card, border: terms ? 0 : `1.5px solid ${m.fill}`, boxSizing: "border-box", color: m.onfill, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, padding: 0, cursor: "pointer" }}
          >
            {terms ? <Check size={12} strokeWidth={3} style={NO_ICON_SCALE} /> : null}
          </button>
          <span id={ids.terms} style={{ fontSize: px(13), lineHeight: lh(18), fontWeight: 700 }}>
            <span onClick={() => setTerms((v) => !v)} style={{ cursor: "pointer" }}>
              I agree to the{" "}
            </span>
            <a href={legalHref("terms", TERMS_HEADING)} target="_blank" rel="noopener noreferrer" style={{ color: m.accent }}>
              Ambassador terms
            </a>
          </span>
        </div>
      </div>
    </MasterSheet>
  );
}
