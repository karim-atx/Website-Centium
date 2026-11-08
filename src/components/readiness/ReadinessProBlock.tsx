import React, { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCheck, Lock, Send, ShieldCheck } from "lucide-react";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { CtaButton } from "../ui/PinnedCta";
import { Card, SectionHead } from "../pro/client/kit";
import { fmtDay } from "../pro/client/clientFormat";
import { t } from "../../i18n/core";
import { useLinkOnce } from "../../hooks/useLinkOnce";
import { fetchClientReadiness, fetchReadinessForm, requestReadiness, withdrawReadiness, type ClientReadiness } from "../../services/readiness";
import { answerLines, word, type ReadinessLabel } from "../../services/readiness/model";

const LABEL_INK: Record<ReadinessLabel, string> = { cleared: INK.good, cleared_by_doctor: INK.good, start_light: INK.goldInk, see_doctor: INK.hi };

/**
 * Round K · DW: "Before you start" on the client page (Files for Full
 * coaching and Nutrition, Health records for Clinical overview). Any lane.
 * - Always: Send (or "Ask for a fresh one" after a form or a request), and
 *   while a request waits, when it was sent and Withdraw.
 * - With the client's medical_history (decision 7): the label
 *   (pro.label.*) with pro.reminder, when it was filled in, "Cleared by a
 *   doctor" with the date and note, and the answers in the form's words.
 * - Without it: that the client shares it only if they choose to, and Ask
 *   to share where the tab can ask.
 * Every form word is the server's in the professional's language. Nothing
 * renders until the reads succeed (the Database's calls not live yet,
 * offline), so the tab is as before.
 *
 * ?readiness=open (proReadinessPath: the hub row pro.readiness.completed and
 * the push) scrolls this block into view once it has loaded, then the
 * parameter is taken off the address.
 */
export const ReadinessProBlock: React.FC<{ clientId: string; firstName: string; onAsk?: () => void }> = ({ clientId, firstName, onAsk }) => {
  const [state, setState] = useState<{ texts: Record<string, string>; r: ClientReadiness } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [nonce, setNonce] = useState(0);
  const load = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let live = true;
    void Promise.all([fetchReadinessForm(), fetchClientReadiness(clientId)]).then(([f, c]) => {
      if (live && f.ok && c.ok) setState({ texts: f.data.texts, r: c.data });
    });
    return () => {
      live = false;
    };
  }, [clientId, nonce]);

  const anchor = useRef<HTMLDivElement | null>(null);
  useLinkOnce("readiness", "open", () => anchor.current?.scrollIntoView({ block: "start" }), !!state && !!word(state.texts, "intro.title"));

  if (!state || !word(state.texts, "intro.title")) return null;
  const { texts, r } = state;
  const w = (k: string) => word(texts, k);

  const act = async (run: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string) => {
    setBusy(true);
    setMsg(null);
    const res = await run();
    setBusy(false);
    setMsg(res.ok ? done : res.message);
    if (res.ok) load();
  };

  const asked = r.requestOpen && r.requestId;
  const everAsked = !!r.requestId || !!r.form;

  return (
    <>
      <SectionHead label={w("intro.title")} />
      <Card>
        <div ref={anchor} data-readiness-pro style={{ scrollMarginTop: 120 }}>
          {!r.shared ? (
            <div className="flex items-start" style={{ gap: 8 }}>
              <Lock size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS }}>
                {t("{name} hasn't shared medical history. They share it only if they choose to.", { name: firstName })}
              </p>
            </div>
          ) : r.form ? (
            <>
              <p className="flex items-center" style={{ gap: 6, fontSize: textPx(14), fontWeight: 800, color: LABEL_INK[r.form.label] }}>
                {r.form.label === "cleared_by_doctor" ? <ShieldCheck size={15} strokeWidth={2.2} aria-hidden /> : <ClipboardCheck size={15} strokeWidth={2.2} aria-hidden />}
                {w(`pro.label.${r.form.label}`)}
              </p>
              <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 2 }}>{t("Filled in {date}", { date: fmtDay(r.form.completedAt, true) })}</p>
              <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, marginTop: 8 }}>{w("pro.reminder")}</p>
              {r.form.clearedAt && (
                <div style={{ marginTop: 10, borderRadius: 12, background: INK.soft, padding: "8px 10px" }}>
                  <p style={{ fontSize: textPx(12.5), fontWeight: 600, color: INK.ch }}>
                    {r.form.clearedOn ? t("Cleared on {date}", { date: fmtDay(r.form.clearedOn, true) }) : w("pro.label.cleared_by_doctor")}
                  </p>
                  {r.form.clearanceNote && <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, marginTop: 2, overflowWrap: "anywhere" }}>{r.form.clearanceNote}</p>}
                </div>
              )}
              <dl style={{ marginTop: 12 }}>
                {answerLines(texts, r.form).map((l) => (
                  <div key={l.prompt} style={{ padding: "8px 0", borderTop: `1px solid ${INK.b06}` }}>
                    <dt style={{ fontSize: textPx(11.5), lineHeight: 1.45, color: INK.chF }}>{l.prompt}</dt>
                    <dd style={{ margin: 0, fontSize: textPx(12.5), lineHeight: 1.5, fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>{l.answer}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : (
            <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS }}>{t("{name} hasn't filled it in yet.", { name: firstName })}</p>
          )}

          {asked && r.requestedAt && (
            <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 12 }}>{t("Sent {date}. Waiting for {name}.", { date: fmtDay(r.requestedAt), name: firstName })}</p>
          )}
          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 12 }}>
            {asked ? (
              <CtaButton size="base" variant="secondary" label={t("Withdraw")} loading={busy} onClick={() => void act(() => withdrawReadiness(r.requestId as string), t("Withdrawn."))} />
            ) : (
              <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={everAsked ? t("Ask for a fresh one") : t("Send to {name}", { name: firstName })} loading={busy} onClick={() => void act(() => requestReadiness(clientId), t("Sent to {name}.", { name: firstName }))} />
            )}
            {!r.shared && onAsk && <CtaButton size="base" variant="secondary" icon={<Lock size={15} />} label={t("Ask to share")} onClick={onAsk} />}
          </div>
          {msg && (
            <p role="status" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginTop: 8 }}>
              {msg}
            </p>
          )}
        </div>
      </Card>
    </>
  );
};
