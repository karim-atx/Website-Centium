import { useCallback, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Gift, UserRound } from "lucide-react";
import { Toast } from "../../../components/ui/Toast";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Card, Chip, ListCard, SectionHead, type ListRow } from "../../../components/pro/client/kit";
import { ListSkeleton, ProError } from "../../../components/pro/states";
import { PageHead } from "../../../components/pro/businesses/BusinessParts";
import { INK } from "../../../components/pro/proInk";
import { useApp } from "../../../context/AppContext";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { useSwitches } from "../../../services/premium/hooks";
import {
  endPremiumPass,
  fetchMyPasses,
  fetchPassCandidates,
  givePremiumPass,
  passReasonText,
  passesUsedText,
  premiumDate,
  premiumOn,
  type MyPasses,
  type PassCandidate,
  type PassHolder,
} from "../../../services/premium";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G1 · EA: "Premium passes" under the professional's plan
// (/app/more/premium-passes, from ProSubscription). Only while the Premium
// switch is on for them; off, it isn't offered and this route goes back to
// the plan page.
// - my_premium_passes(): allowance (own paid plan: Starter 2, Growth 5, Pro 15,
//   Unlimited 30; 0 on Free or a business seat), used, verified, the holders;
// - premium_pass_candidates(): each active client with why they can't have
//   one yet, in plain words;
// - give_premium_pass (ATXQ6 shows the reason's sentence), and
//   end_premium_pass behind a confirmation: it ends in 7 days.
// Never a price: a pass is never sold to the client.

type Data = { passes: MyPasses; candidates: PassCandidate[] };

export default function PremiumPasses() {
  const { user } = useApp();
  const back = useBack("/app/subscription");
  const { switches, loading: switchesLoading } = useSwitches();
  const on = premiumOn(switches);
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [ending, setEnding] = useState<PassHolder | null>(null);
  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!on) return;
    let live = true;
    void Promise.all([fetchMyPasses(), fetchPassCandidates()]).then(([p, c]) => {
      if (!live) return;
      if (!p.ok) return setFailed(p.message);
      setFailed(null);
      setData({ passes: p.value, candidates: c.ok ? c.value : [] });
    });
    return () => {
      live = false;
    };
  }, [on, tick]);

  if (user.accountType !== "professional") return null;
  if (!switchesLoading && !on) return <Navigate to="/app/subscription" replace />;

  const give = async (c: PassCandidate) => {
    if (busy) return;
    setBusy(c.clientId);
    const r = await givePremiumPass(c.clientId);
    setBusy(null);
    setToast(r.ok ? t("{name} now has Centium Premium.", { name: c.name || t("Your client") }) : r.message);
    reload();
  };
  const takeBack = async () => {
    if (!ending || busy) return;
    setBusy(ending.clientId);
    const r = await endPremiumPass(ending.clientId);
    setBusy(null);
    setEnding(null);
    setToast(r.ok ? t("Premium ends in 7 days. {name} is told.", { name: ending.name || t("Your client") }) : r.message);
    reload();
  };

  const p = data?.passes;
  const holding = new Set((p?.passes ?? []).map((h) => h.clientId));
  const holderRows: ListRow[] = (p?.passes ?? []).map((h) => ({
    key: h.clientId,
    icon: Gift,
    title: h.name || t("Your client"),
    meta: h.endsAt ? t("Ends {date}", { date: premiumDate(h.endsAt) }) : h.startsAt ? t("Since {date}", { date: premiumDate(h.startsAt) }) : undefined,
    trailing: h.endsAt ? (
      <Chip label={t("Ending")} tone="att" />
    ) : (
      <button type="button" onClick={() => setEnding(h)} disabled={!!busy} className="tap min-h-[44px] disabled:opacity-50" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
        {t("Take back")}
      </button>
    ),
  }));
  const candidateRows: ListRow[] = (data?.candidates ?? [])
    .filter((c) => !holding.has(c.clientId))
    .map((c) => ({
      key: c.clientId,
      icon: UserRound,
      title: c.name || t("Your client"),
      meta: c.eligible ? undefined : passReasonText(c.reason),
      trailing: c.eligible ? (
        <button type="button" onClick={() => void give(c)} disabled={!!busy} className="tap min-h-[44px] disabled:opacity-50" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
          {t("Include Premium")}
        </button>
      ) : undefined,
    }));

  return (
    <div data-premium-passes="">
      <PageHead title={t("Premium passes")} sub={t("Include Centium Premium for your clients")} onBack={back} />
      {failed ? (
        <ProError onRetry={reload} message={t(failed)} />
      ) : !p ? (
        <ListSkeleton rows={3} />
      ) : p.allowance === 0 ? (
        <Card>
          <p style={{ fontSize: textPx(13.5), color: INK.ch, lineHeight: 1.5 }}>{t("Premium passes come with your own paid plan, Starter and up. Each one includes Centium Premium for one of your clients.")}</p>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 12 }}>
            <p style={{ fontSize: textPx(14), fontWeight: 800, color: INK.ch }}>{passesUsedText(p.used, p.allowance)}</p>
            <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 4, lineHeight: 1.5 }}>
              {t("A pass you take back ends 7 days later, and so does one whose client stops working with you.")}
            </p>
            {!p.verified && <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.hi, marginTop: 8, lineHeight: 1.5 }}>{passReasonText("not_verified")}</p>}
          </Card>
          {holderRows.length > 0 && (
            <section aria-label={t("Clients with Premium")}>
              <SectionHead label={t("Clients with Premium")} />
              <ListCard rows={holderRows} />
            </section>
          )}
          <section aria-label={t("Your clients")}>
            <SectionHead label={t("Your clients")} />
            {candidateRows.length > 0 ? (
              <ListCard rows={candidateRows} />
            ) : (
              <Card>
                <p style={{ fontSize: textPx(13), color: INK.chS }}>{t("Your active clients show here.")}</p>
              </Card>
            )}
          </section>
        </>
      )}
      <ConfirmCard
        open={!!ending}
        layout="stacked"
        frame="kit"
        tone="destructive"
        title={t("Take back Premium?")}
        subtitle={t("{name}'s Premium ends in 7 days, and they're told. You can include it for someone else once it has ended.", { name: ending?.name || t("Your client") })}
        confirmLabel={t("Take back")}
        cancelLabel={t("Keep it")}
        busy={!!busy}
        onCancel={() => setEnding(null)}
        onConfirm={() => void takeBack()}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
