import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronUp, Mail } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { useSubscriptionTiers } from "../../../hooks/useSubscriptionTiers";
import { useEffectiveProfessionalTier } from "../../../hooks/useEffectiveProfessionalTier";
import type { SubscriptionTier } from "../../../services/subscription-tiers";
import { formatPrice, type BillingPeriod } from "../../../services/subscription-tiers/pricing";
import { UPGRADE_EMAIL, UPGRADE_SUBJECT } from "../../../services/subscription-tiers/upgrade";
import { CentiumLockup } from "../../../components/icons/CentiumMark";
import { PinnedCta } from "../../../components/ui/PinnedCta";
import { LEAF_D } from "../../../components/pro/home/ringGeometry";
import { INK } from "../../../components/pro/proInk";
import { ProCardSkeleton, ProError } from "../../../components/pro/states";
import { textPx } from "../../../theme/textSize";
import { ProBusinessBilling } from "./ProBusinessBilling";

// Release 3 W6 · MO24 v3 Subscription (source/gen r16.js subscription16,
// tierCard16, tierGlyph16; COPY MO24). The real professional tiers from
// subscription_tiers (useSubscriptionTiers), the plan in force from
// my_effective_professional_tier (useEffectiveProfessionalTier: own plan or a
// business seat), the client count against the cap, Monthly / Yearly, the
// swipeable plan cards with Current and Recommended for you, All plans at a
// glance, and no in-app payment: the CTA is the upgrade email (FreePeriodNotice
// stays where W2 shows it). Replaces the old professional branch of Subscription.tsx.

const money2 = (v: number) => (Number.isInteger(v) ? formatPrice(v) : `$${v.toFixed(2)}`);
const savePct = (t: SubscriptionTier) => (t.yearlyPrice && t.monthlyPrice > 0 ? Math.round((1 - t.yearlyPrice / (t.monthlyPrice * 12)) * 100) : 0);
const clientsWord = (n: number) => `${n} client${n === 1 ? "" : "s"}`;

/** tierGlyph16: n leaves (1 to 3 fanned from a stem, 4 and 5 as a flower). */
function TierGlyph({ n, color, size }: { n: number; color: string; size: number }) {
  const leaf = (x: number, y: number, r: number, h: number, op = 1, k = 0) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d={LEAF_D} fill={color} opacity={op} transform={`scale(${(h / 915).toFixed(4)}) translate(-245 -915)`} />
    </g>
  );
  const parts: React.ReactNode[] = [];
  if (n <= 3) {
    const ang = n === 1 ? [0] : n === 2 ? [-26, 26] : [-40, 0, 40];
    ang.forEach((a, i) => parts.push(leaf(20, 34, a, n === 3 && i === 1 ? 26 : 22, n === 3 && i !== 1 ? 0.7 : 1, i)));
    parts.push(<circle key="c" cx="20" cy="34" r="2" fill={color} />);
  } else {
    for (let i = 0; i < n; i++) parts.push(leaf(20, 20, (i * 360) / n, n === 4 ? 15 : 14, i % 2 ? 0.75 : 1, i));
    parts.push(<circle key="w" cx="20" cy="20" r="3.2" fill="#FFFFFF" />, <circle key="c" cx="20" cy="20" r="1.6" fill={color} />);
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden style={{ transform: "none", flexShrink: 0 }}>
      {parts}
    </svg>
  );
}

function TierCard({ tier, rank, yearly, current, recommended }: { tier: SubscriptionTier; rank: number; yearly: boolean; current: boolean; recommended: boolean }) {
  const dark = useIsDark();
  const black = recommended && !current;
  const ink = black ? "#FFFFFF" : INK.ch;
  const sub = black ? "rgba(255,255,255,0.68)" : INK.chF;
  const gl = black ? "#C8BFE9" : dark ? "#C3B3FB" : "#7D6BB5";
  const free = tier.monthlyPrice === 0;
  const price = free ? "Free" : yearly && tier.yearlyPrice != null ? money2(tier.yearlyPrice) : money2(tier.monthlyPrice);
  const per = free ? "No card needed" : yearly && tier.yearlyPrice != null ? `a year · ${money2(tier.yearlyPrice / 12)} a month` : "a month";
  const save = yearly ? savePct(tier) : 0;
  const cap = tier.maxClients;
  const inc: [string, boolean][] = [
    [cap == null ? "Unlimited active clients" : `Up to ${cap} active client${cap === 1 ? "" : "s"}`, true],
    ["Every tool for your professional type", false],
    ["Messages, groups and calls with hired clients", false],
    ["Care network and public profile", false],
  ];
  const badge = (text: string, bg: string, color: string) => (
    <span
      className="absolute"
      style={{ top: -10, insetInlineStart: 16, fontSize: textPx(10), fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 9999, padding: "3px 9px", background: bg, color }}
    >
      {text}
    </span>
  );
  return (
    <div
      className="relative"
      style={{
        flex: "0 0 262px",
        scrollSnapAlign: "center",
        borderRadius: 22,
        padding: 16,
        background: black ? "#241F1B" : INK.card,
        border: current ? `2px solid ${INK.pr}` : `1px solid ${black ? "#241F1B" : INK.bCard}`,
        color: ink,
      }}
      aria-label={`${tier.name}${current ? ", your current plan" : recommended ? ", recommended for you" : ""}`}
    >
      {current ? badge("Current", INK.pr, "#FFFFFF") : recommended ? badge("Recommended for you", "#C8BFE9", "#241F1B") : null}
      <div className="flex items-center" style={{ gap: 12, marginTop: 4 }}>
        <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 15, background: black ? "rgba(174,161,220,0.22)" : INK.prPale }}>
          <TierGlyph n={rank} color={gl} size={36} />
        </span>
        <span>
          <span className="block" style={{ fontSize: textPx(18), fontWeight: 800 }}>{tier.name}</span>
          <span className="block" style={{ fontSize: textPx(12), color: sub }}>{cap == null ? "No client limit" : clientsWord(cap)}</span>
        </span>
      </div>
      <p className="flex items-baseline flex-wrap" style={{ marginTop: 14, gap: 6 }}>
        <span style={{ fontSize: textPx(28), fontWeight: 800, letterSpacing: "-0.02em" }}>{price}</span>
        {save > 0 && (
          <span style={{ fontSize: textPx(10.5), fontWeight: 800, borderRadius: 9999, padding: "2px 7px", background: black ? "rgba(127,199,156,0.2)" : INK.goodBg, color: black ? "#7FC79C" : INK.good }}>
            Save {save}%
          </span>
        )}
      </p>
      <p style={{ fontSize: textPx(11.5), color: sub }}>{per}</p>
      <div className="flex flex-col" style={{ gap: 7, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${black ? "rgba(255,255,255,0.12)" : INK.b06}` }}>
        {inc.map(([text, strong]) => (
          <span key={text} className="flex items-start" style={{ gap: 8, fontSize: textPx(12), lineHeight: 1.4, color: strong ? ink : sub, fontWeight: strong ? 700 : 500 }}>
            <TierGlyph n={1} color={gl} size={14} />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ProSubscription() {
  const back = useBack();
  const dark = useIsDark();
  const { professionalClients } = useApp();
  const { tiers: all, loading, error } = useSubscriptionTiers("professional");
  const { effective, loading: planLoading, error: planError } = useEffectiveProfessionalTier();
  const [period, setPeriod] = useState<BillingPeriod>("yearly");
  const [compare, setCompare] = useState(false);
  const [centred, setCentred] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);

  const tiers = useMemo(() => all.filter((t) => !t.isAddon), [all]);
  const current = effective?.tier ?? null;
  const curIdx = current ? tiers.findIndex((t) => t.id === current.id) : -1;
  const used = professionalClients.length;
  const cap = current?.maxClients ?? null;
  const atCap = cap != null && used >= cap;
  const seat = effective?.source === "business_seat";
  // Recommended: the next tier up from the plan in force (the frame's Growth
  // for a Starter); none on the top tier.
  const recIdx = curIdx >= 0 && curIdx < tiers.length - 1 ? curIdx + 1 : -1;
  const yearly = period === "yearly";
  const bestSave = Math.max(0, ...tiers.map(savePct));

  // Start with the recommended card centred (or the current one).
  useEffect(() => {
    const el = track.current;
    // Waits for the plan in force too, so the first card shown is the right one.
    if (!el || tiers.length === 0 || planLoading || centred !== null) return;
    const start = recIdx >= 0 ? recIdx : Math.max(0, curIdx);
    const card = el.children[start] as HTMLElement | undefined;
    if (card) el.scrollLeft = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
    setCentred(start);
  }, [tiers.length, recIdx, curIdx, centred, planLoading]);

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let dist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const h = c as HTMLElement;
      const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setCentred(best);
  };

  const target = centred != null && centred > curIdx ? tiers[centred] : recIdx >= 0 ? tiers[recIdx] : null;
  const ask = () => {
    if (!target) return;
    window.location.href = `mailto:${UPGRADE_EMAIL}?subject=${encodeURIComponent(`${UPGRADE_SUBJECT} to ${target.name}`)}`;
  };

  const next = recIdx >= 0 ? tiers[recIdx] : null;
  const left = cap != null ? Math.max(0, cap - used) : null;
  const segs = cap == null ? 0 : Math.min(cap, 10);
  const filled = cap == null ? 0 : cap <= 10 ? Math.min(used, cap) : Math.round((Math.min(used, cap) / cap) * 10);
  const tone = atCap ? INK.hi : INK.prDeep;

  return (
    <div style={{ paddingBottom: target ? 72 : 0 }}>
      <button
        type="button"
        onClick={back}
        aria-label="Back"
        className="tap flex items-center justify-center"
        style={{ width: 44, height: 44, marginInlineStart: -12, marginBottom: 0, color: INK.chS }}
      >
        <ChevronLeft size={20} strokeWidth={2} />
      </button>
      <div className="text-center" style={{ margin: "-30px 0 14px" }}>
        <CentiumLockup width={64} className="mx-auto" style={{ marginBottom: 10 }} />
        <p style={{ fontSize: textPx(25), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, color: INK.ch }}>Grow your client roster.</p>
        <p style={{ fontSize: textPx(13.5), color: INK.chS, margin: "6px auto 0", maxWidth: 300, lineHeight: 1.5 }}>
          Centium for professionals scales with how many clients you manage.
        </p>
      </div>

      <div style={{ borderRadius: 18, background: atCap ? INK.hiBg : INK.prPale, padding: "14px 16px", marginBottom: 14 }}>
        {planLoading ? (
          <ProCardSkeleton lines={2} />
        ) : planError ? (
          <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.hi }}>{planError}</p>
        ) : current ? (
          <>
            <div className="flex justify-between items-baseline" style={{ gap: 8 }}>
              <p style={{ fontSize: textPx(14), color: tone }}>
                You're on <b>{seat && effective?.viaBusinessName ? `${current.name} (via ${effective.viaBusinessName})` : current.name}</b>
              </p>
              <p className="whitespace-nowrap" style={{ fontSize: textPx(13), fontWeight: 800, color: tone, fontVariantNumeric: "tabular-nums" }}>
                {cap == null ? clientsWord(used) : `${used} of ${clientsWord(cap)}`}
              </p>
            </div>
            {segs > 0 && (
              <span className="flex" style={{ gap: 4, marginTop: 10 }} aria-hidden>
                {Array.from({ length: segs }, (_, i) => (
                  <span
                    key={i}
                    style={{
                      flex: 1,
                      height: 8,
                      borderRadius: 9999,
                      background: i < filled ? (atCap ? INK.hi : dark ? "#C3B3FB" : "#7D6BB5") : dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.85)",
                    }}
                  />
                ))}
              </span>
            )}
            <p style={{ fontSize: textPx(12), color: atCap ? INK.hi : INK.chS, marginTop: 8, fontWeight: atCap ? 700 : 500 }}>
              {atCap
                ? "You're at your limit. New hire requests can't be accepted until you upgrade."
                : seat
                  ? "This plan comes with your business seat. Your own plan would replace it."
                  : left != null && next
                    ? `${left} place${left === 1 ? "" : "s"} left. ${next.name} takes you to ${next.maxClients ?? "no limit"}.`
                    : left != null
                      ? `${left} place${left === 1 ? "" : "s"} left.`
                      : "No client limit on your plan."}
            </p>
          </>
        ) : (
          <p style={{ fontSize: textPx(13), color: INK.prDeep }}>Your plan couldn't be identified.</p>
        )}
      </div>

      {/* Batch 2 · CS (Karim): a professional who holds a business plan chooses its billing here. */}
      <ProBusinessBilling />

      <div className="flex" role="radiogroup" aria-label="Billing period" style={{ gap: 8, marginBottom: 14 }}>
        {(["monthly", "yearly"] as const).map((p) => {
          const on = period === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPeriod(p)}
              className="tap flex-1 flex items-center justify-center"
              style={{ minHeight: 44, borderRadius: 12, padding: "10px 0", gap: 6, fontSize: textPx(12), fontWeight: 700, background: on ? INK.fill : INK.soft, color: on ? INK.onFill : INK.chF }}
            >
              {p === "monthly" ? "Monthly" : "Yearly"}
              {p === "yearly" && bestSave > 0 && (
                <span style={{ fontSize: textPx(10), fontWeight: 700, borderRadius: 9999, padding: "2px 6px", background: on ? "rgba(255,255,255,0.22)" : "rgb(var(--c-teal))", color: "#FFFFFF" }}>
                  {`−${bestSave}%`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {error ? (
        <ProError onRetry={() => window.location.reload()} message={error} />
      ) : loading ? (
        <ProCardSkeleton lines={4} height={260} />
      ) : (
        <>
          <div style={{ margin: "0 -16px", overflow: "hidden" }}>
            <div
              ref={track}
              onScroll={onScroll}
              className="flex overflow-x-auto no-scrollbar"
              style={{ gap: 10, padding: "12px 16px 4px", scrollSnapType: "x mandatory", scrollPaddingInline: 16 }}
            >
              {tiers.map((t, i) => (
                <TierCard key={t.id} tier={t} rank={Math.min(5, i + 1)} yearly={yearly} current={i === curIdx} recommended={i === recIdx} />
              ))}
            </div>
          </div>
          <div className="flex justify-center" style={{ gap: 6, margin: "10px 0 16px" }} aria-hidden>
            {tiers.map((t, i) => (
              <span key={t.id} style={{ width: i === centred ? 18 : 6, height: 6, borderRadius: 9999, background: i === centred ? INK.prDeep : "rgb(var(--c-charcoal) / 0.11)" }} />
            ))}
          </div>
          <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, overflow: "hidden", marginBottom: 10 }}>
            <button type="button" aria-expanded={compare} onClick={() => setCompare((c) => !c)} className="tap w-full flex items-center justify-between text-start" style={{ padding: "13px 16px", minHeight: 44 }}>
              <span style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>All plans at a glance</span>
              {compare ? <ChevronUp size={16} strokeWidth={2} style={{ color: INK.chF }} /> : <ChevronDown size={16} strokeWidth={2} style={{ color: INK.chF }} />}
            </button>
            {compare && (
              <div style={{ padding: "0 12px 10px" }}>
                {[null, ...tiers].map((t, i) => {
                  const me = !!t && t.id === current?.id;
                  const cells = t
                    ? [t.name, t.maxClients == null ? "No limit" : String(t.maxClients), t.monthlyPrice === 0 ? "Free" : yearly && t.yearlyPrice != null ? money2(t.yearlyPrice) : money2(t.monthlyPrice)]
                    : ["Plan", "Clients", yearly ? "Yearly" : "Monthly"];
                  return (
                    <div
                      key={t?.id ?? "head"}
                      className="grid"
                      style={{
                        gridTemplateColumns: "1.3fr 1fr 1fr",
                        gap: 6,
                        padding: "8px 6px",
                        borderRadius: 8,
                        borderTop: i ? `1px solid ${INK.b06}` : undefined,
                        background: me ? INK.prPale : undefined,
                        fontSize: textPx(12),
                        color: i ? INK.ch : INK.chF,
                        fontWeight: i ? 600 : 800,
                      }}
                    >
                      <span className="flex items-center" style={{ gap: 6 }}>
                        {t && <TierGlyph n={Math.min(5, i)} color={dark ? "#C3B3FB" : "#7D6BB5"} size={16} />}
                        {cells[0]}
                      </span>
                      <span className="text-center">{cells[1]}</span>
                      <span className="text-end">{cells[2]}</span>
                    </div>
                  );
                })}
                <p style={{ fontSize: textPx(10.5), color: INK.chF, marginTop: 6 }}>Plans differ only by how many active clients you can have.</p>
              </div>
            )}
          </div>
        </>
      )}
      <p className="text-center" style={{ fontSize: textPx(11), color: INK.chF, lineHeight: 1.5 }}>
        Payments in the app are coming soon. Upgrades are confirmed by email.
      </p>
      {target && <PinnedCta primary={{ label: `Ask to upgrade to ${target.name}`, icon: <Mail size={15} />, onClick: ask }} />}
    </div>
  );
}
