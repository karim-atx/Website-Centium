import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { AchievementDetailSheet } from "../../../components/mind/AchievementDetailSheet";
import { AchievementIcon } from "../../../components/mind/AchievementIcon";
import { formatEarnedAt, tierCardColours, tierHex, tierIcon } from "../../../components/mind/achievementStyle";
import { tierRank } from "../../../theme/marketTokens";
import {
  toBadges,
  categoriesPresent,
  recentlyUnlocked,
  nextRungLabel,
  tierProgress,
  tierReached,
  earnedCount,
  visibleAchievements,
  CATEGORY_LABEL,
  CATEGORY_ORDER,
  type Badge,
  type AchievementCategory,
} from "../../../services/achievements";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";
import { ChipStrip } from "./ChipStrip";
import { MindSectionWeb } from "./MindSectionWeb";
import { mindCaps } from "./mindWebStyles";

/**
 * The tier card's colours (WC-MI Mind Web v5 "achievements", literal): Bronze
 * ink #B8683F on #F8EEE6 with #EBD3C2, Silver #6B7684 on #F1F3F5 with
 * #D9DEE3. The handover draws only those two; Gold, Platinum and Diamond
 * (unspecified) take the repo's tier recipe (tierCardColours) on their rail
 * colour.
 */
const DRAWN: Record<number, { ink: string; fill: string; border: string }> = {
  1: { ink: "#B8683F", fill: "#F8EEE6", border: "#EBD3C2" },
  2: { ink: "#6B7684", fill: "#F1F3F5", border: "#D9DEE3" },
};
function cardColours(rank: number) {
  if (DRAWN[rank]) return DRAWN[rank];
  const c = tierCardColours(tierHex(rank), false);
  return { ink: c.ink, fill: c.fill, border: c.track };
}

const line = (i: number) => (i ? "0.5px solid rgba(36,31,27,0.08)" : "none");

/** One 72 badge card: the 52 tile (r14) with the 40 art, the title 15/22 and its line 13/20. */
function BadgeCard({ badge, onOpen }: { badge: Badge; onOpen: () => void }) {
  const ok = badge.earned !== null;
  const { display } = badge;
  const sub = ok
    ? badge.pointsEarned > 0
      ? t("+{n} pts", { n: badge.pointsEarned.toLocaleString(appLocale()) })
      : t("No points, just bragging rights")
    : badge.rungs.length > 1
      ? nextRungLabel(badge) ?? display.description
      : display.description; // a one-off says what to do; a ladder how far to its next rung (the frame's two kinds of line)
  return (
    <button
      type="button"
      data-mind-badge
      onClick={onOpen}
      className="mind-web-hover flex items-center text-start"
      style={{ gap: 12, borderRadius: 16, border: "0.5px solid rgba(36,31,27,0.1)", padding: "12px 14px", minHeight: 72, boxSizing: "border-box", minWidth: 0 }}
    >
      <span className="relative grid place-items-center" style={{ width: 52, height: 52, borderRadius: 14, flex: "none", background: ok ? "#FCF9F2" : "#F2F2F2" }}>
        <span style={{ display: "block", opacity: ok ? 1 : 0.45, filter: ok ? "none" : "grayscale(1)" }}>
          <AchievementIcon achievementKey={display.key} emoji={display.icon} size={40} />
        </span>
        {!ok && (
          <span className="absolute grid place-items-center" style={{ insetInlineEnd: -3, bottom: -3, width: 18, height: 18, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }}>
            <Lock size={10} color="#8C8378" aria-hidden />
          </span>
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="block" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 700, color: ok ? "#241F1B" : "rgba(36,31,27,0.6)" }}>
          {display.title}
          {!ok && <span className="sr-only">{t(", Locked")}</span>}
        </span>
        <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
          {sub}
        </span>
        {!ok && badge.next && badge.progress > 0 && (
          <span className="block overflow-hidden" style={{ marginTop: 6, height: 5, borderRadius: 999, background: "#F0EDF9" }}>
            <span className="block" style={{ height: "100%", width: `${Math.round(badge.progress * 100)}%`, background: "#9A8CD6", borderRadius: 999 }} />
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Website viewport v1, WC-MI.3 Achievements (WC-MI Mind Web v5, screen
 * "achievements", literal values). The tier card across the page (r20,
 * 1px border, padding 20 24 14): the tier and balance (40/48 800), the bar
 * (8) with "N to Gold" and "a / b", the five-tier rail (36 discs, 1.5 line and
 * stub) and the earned count; the rewards line under a rule. Then the
 * category chips (one row + the draggable pill scrollbar when they overflow),
 * and an 8 : 4 grid (1 : 1 at 1024): the badge cards (auto-fill 260, rows 72,
 * gap 12) beside Recently unlocked (rows 72, 44 art). Same data, five tiers
 * (Karim's decision) and the same detail popup as mobile.
 */
export default function AchievementsWeb() {
  const { achievements, pointsSummary, pointTiers, achievementsLoading, achievementsError, refreshAchievements } = useApp();
  const online = useOnline();
  const { rail } = useWebLayout();
  const hideNumbers = useHideNumbers();
  const [category, setCategory] = useState<AchievementCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();

  const rows = useMemo(() => visibleAchievements(achievements ?? [], hideNumbers), [achievements, hideNumbers]);
  const badges = useMemo(() => toBadges(rows), [rows]);
  const categories = useMemo(() => categoriesPresent(badges), [badges]);
  const recent = useMemo(() => recentlyUnlocked(rows, 3), [rows]);
  const counts = earnedCount(rows);
  const shown = category === "all" ? badges : badges.filter((b) => b.category === category);
  const openBadge = openId ? badges.find((b) => b.id === openId) ?? null : null;
  const badgeOf = (key: string) => badges.find((b) => b.rungs.some((r) => r.key === key)) ?? null;

  // As mobile: `?badge=<key>` (the unlock pill) opens that badge once loaded.
  const linked = achievements === null ? null : params.get("badge");
  const [handled, setHandled] = useState<string | null>(null);
  if (linked && linked !== handled) {
    setHandled(linked);
    const b = badgeOf(linked);
    if (b) setOpenId(b.id);
  } else if (!params.get("badge") && handled !== null) {
    setHandled(null);
  }
  useEffect(() => {
    if (!linked) return;
    const next = new URLSearchParams(params);
    next.delete("badge");
    setParams(next, { replace: true });
  }, [linked, params, setParams]);

  const chipItems = [
    { key: "all" as const, label: t("All") },
    ...(achievements === null ? CATEGORY_ORDER.filter((c) => !(hideNumbers && c === "consistency")) : categories).map((c) => ({ key: c, label: t(CATEGORY_LABEL[c]) })),
  ];

  const bannerText = !online ? t("You're offline. Showing your last saved achievements.") : achievementsError ? t(achievementsError || "Couldn't load. Check your connection.") : null;
  const loading = achievements === null && (achievementsLoading || !achievementsError);

  const rank = pointsSummary ? tierRank(pointTiers, pointsSummary.tierName) : 1;
  const tier = cardColours(rank);
  const ci = pointsSummary ? pointTiers.findIndex((pt) => pt.name === pointsSummary.tierName) : -1;
  const prog = pointsSummary ? tierProgress(pointsSummary) : 0;
  const step = pointTiers.length ? 100 / pointTiers.length : 20;
  const fmt = (n: number) => n.toLocaleString(appLocale());

  return (
    <MindSectionWeb title={t("Achievements")} sub={t("What you've earned so far")}>
      {pointsSummary && (
        <div data-mind-tier className="flex flex-col" style={{ flex: "none", borderRadius: 20, border: `1px solid ${tier.border}`, background: tier.fill, padding: "20px 24px 14px", gap: 14 }}>
          <div className="flex items-center" style={{ gap: 32 }}>
            <div style={{ flex: "none" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 800, letterSpacing: "1.4px", textTransform: "uppercase", color: tier.ink }}>
                {t("{tier} tier", { tier: pointsSummary.tierName })}
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 40, lineHeight: "48px", fontWeight: 800, letterSpacing: "-1.2px", color: "#241F1B", fontVariantNumeric: "tabular-nums" }}>
                {fmt(pointsSummary.balance)}
                <span style={{ fontSize: 15, fontWeight: 600, color: "#8C8378", marginInlineStart: 6, letterSpacing: 0 }}>{t("pts")}</span>
              </p>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex justify-between" style={{ fontSize: 13, fontWeight: 600, gap: 12 }}>
                <span className="whitespace-nowrap" style={{ color: tier.ink }}>
                  {pointsSummary.nextTierName && pointsSummary.pointsToNextTier !== null
                    ? t("{n} to {tier}", { n: fmt(pointsSummary.pointsToNextTier), tier: pointsSummary.nextTierName })
                    : t("Highest tier")}
                </span>
                {pointsSummary.nextTierMinPoints !== null && (
                  <span className="whitespace-nowrap" style={{ color: "#8C8378", fontVariantNumeric: "tabular-nums" }}>
                    <bdi dir="ltr">
                      {fmt(pointsSummary.balance)} / {fmt(pointsSummary.nextTierMinPoints)}
                    </bdi>
                  </span>
                )}
              </div>
              <div className="overflow-hidden" style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.7)" }}>
                <span data-mind-tier-bar className="block" style={{ height: "100%", width: `${Math.round(prog * 100)}%`, borderRadius: 999, background: tier.ink }} />
              </div>
              <div className="relative flex" style={{ marginTop: 16 }}>
                <span aria-hidden className="absolute" style={{ insetInlineStart: "10%", insetInlineEnd: "10%", top: 17, height: 1.5, background: "rgba(36,31,27,0.08)" }} />
                {ci >= 0 && ci < pointTiers.length - 1 && (
                  <span aria-hidden className="absolute" style={{ top: 17, height: 1.5, insetInlineStart: `${step * (ci + 0.5)}%`, width: `${step * prog}%`, background: tier.ink }} />
                )}
                {pointTiers.map((pt) => {
                  const r = tierRank(pointTiers, pt.name);
                  const hex = tierHex(r);
                  const cur = pt.name === pointsSummary.tierName;
                  const got = tierReached(pt, pointsSummary);
                  const Icon = tierIcon(r);
                  return (
                    <div key={pt.name} data-mind-tier-disc className="relative flex flex-col items-center" style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className="grid place-items-center"
                        style={{ width: 36, height: 36, borderRadius: 999, boxSizing: "border-box", background: cur ? tier.ink : "#FFFFFF", border: `1.5px solid ${cur ? tier.ink : got ? hex : `${hex}3D`}`, boxShadow: cur ? `0 0 0 4px ${tier.border}` : "none" }}
                      >
                        <Icon size={16} strokeWidth={1.75} color={cur ? "#FFFFFF" : hex} aria-hidden />
                      </span>
                      <span style={{ marginTop: 6, fontSize: 13, lineHeight: "20px", fontWeight: cur ? 800 : 400, color: cur ? tier.ink : "#8C8378" }}>{pt.name}</span>
                      <span style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#8C8378", fontVariantNumeric: "tabular-nums" }}>{fmt(pt.minPoints)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {achievements !== null && (
              <div className="text-end" style={{ flex: "none" }}>
                <p className="whitespace-nowrap" style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#241F1B", fontVariantNumeric: "tabular-nums" }}>
                  {t("{a} of {b}", { a: counts.earned, b: counts.total })}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: "#8C8378" }}>{t("earned")}</p>
              </div>
            )}
          </div>
          <p style={{ margin: 0, paddingTop: 12, borderTop: `0.5px solid ${tier.border}`, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("Rewards for your points are coming soon.")}</p>
        </div>
      )}

      {(categories.length > 0 || achievements === null) && <ChipStrip label={t("Achievements")} items={chipItems} active={category} onChange={setCategory} />}

      {bannerText && (
        <div role="alert" className="flex items-center" style={{ gap: 12, borderRadius: 12, padding: 12, background: "#FBE7E4", color: "#C0392B" }}>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600 }}>{bannerText}</p>
          {online && achievementsError && (
            <button type="button" onClick={refreshAchievements} className="mind-web-focus" style={{ fontSize: 13, fontWeight: 700, padding: "0 8px", height: 36, borderRadius: 8 }}>
              {t("Retry")}
            </button>
          )}
        </div>
      )}

      <div data-mind-ach-grid style={{ display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24, alignItems: "start" }}>
        {loading ? (
          <div aria-busy="true" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
            <span className="sr-only" role="status">{t("Loading your achievements…")}</span>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} aria-hidden className="bg-cream-soft animate-skeleton-pulse" style={{ height: 76, borderRadius: 16 }} />
            ))}
          </div>
        ) : shown.length === 0 ? (
          !achievementsError ? (
            <div className="flex flex-col items-center text-center" style={{ padding: "40px 24px", borderRadius: 20, background: "#F5F5F6", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#241F1B" }}>{t("Nothing here yet")}</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("Use the app and badges start appearing here.")}</p>
            </div>
          ) : (
            <div />
          )
        ) : (
          <div style={{ minWidth: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gridAutoRows: "minmax(72px,auto)", alignContent: "start", gap: 12 }}>
            {shown.map((b) => (
              <BadgeCard key={b.id} badge={b} onOpen={() => setOpenId(b.id)} />
            ))}
          </div>
        )}
        <aside data-mind-recent className="flex flex-col overflow-hidden" style={{ position: "sticky", top: 88, minWidth: 0, borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)" }}>
          <p style={{ ...mindCaps, flex: "none", padding: "14px 16px 10px" }}>{t("Recently unlocked")}</p>
          {recent.map((a, i) => {
            const badge = badgeOf(a.key);
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => badge && setOpenId(badge.id)}
                className="mind-web-hover flex items-center text-start"
                style={{ flex: "none", minHeight: 72, boxSizing: "border-box", gap: 12, padding: "12px 16px", borderTop: line(i) }}
              >
                <AchievementIcon achievementKey={a.key} emoji={a.icon} size={44} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="block" style={{ fontSize: 15, fontWeight: 700, color: "#241F1B" }}>{a.title}</span>
                  <span className="block" style={{ fontSize: 13, color: "#8C8378" }}>{a.earnedAt ? formatEarnedAt(a.earnedAt) : a.description}</span>
                </span>
                <span className="whitespace-nowrap" style={{ fontSize: 13, fontWeight: 700, color: "#3C6B65", fontVariantNumeric: "tabular-nums" }}>
                  {a.points > 0 ? t("+{n} pts", { n: fmt(a.points) }) : t("No points, just bragging rights")}
                </span>
              </button>
            );
          })}
          {recent.length === 0 && (
            <div className="grid place-items-center" style={{ flex: 1, padding: 24, background: "#FAFAFB" }}>
              <p style={{ margin: 0, textAlign: "center", fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>
                {t("Nothing unlocked yet. Log a meal or a workout to earn your first badge.")}
              </p>
            </div>
          )}
        </aside>
      </div>

      <AchievementDetailSheet open={openBadge !== null} onClose={() => setOpenId(null)} badge={openBadge} nextLabel={openBadge ? nextRungLabel(openBadge) : null} />
    </MindSectionWeb>
  );
}
