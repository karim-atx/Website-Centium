import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, CalendarClock, Check, ChevronRight, Globe, Package, ShieldCheck, UserPlus, type LucideIcon } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { fetchMyPlans } from "../../services/hires/pro";
import { fetchMyProfile, setPublicListing } from "../../services/professional-profile";
import {
  fetchGoLiveStatus,
  fetchOwnerProgress,
  fetchProLaneColumns,
  markOwnerItemDismissed,
  markOwnerItemDone,
} from "../../services/professional-onboarding";
import type { LicenceStatus } from "../../services/professional-cv";
import { GO_LIVE_ON_VERIFICATION, isRegulated, proKindOf } from "../../pages/onboarding/pro/proModel";
import "../../pages/onboarding/shell/onboarding.css";
import "../../pages/onboarding/pro/pro.css";
import { t } from "../../i18n/core";

const AVAILABILITY_ITEM = "pro_availability";

interface Item {
  key: string;
  icon: LucideIcon;
  title: string;
  desc?: string;
  done: boolean;
  onClick?: () => void;
}

/**
 * "Get set up" on the professional dashboard (OB-157, OB-191, OB-214;
 * BizOnboardingV10 isCheck). Every row is derived from the rows that make it
 * true (a client, a plan, rates and payment methods, the public listing, the
 * lane answers, the licence review), so the list never claims something that
 * was since undone. The one row nothing derives, availability, is stored in
 * onboarding_progress the first time the calendar is opened from here.
 * V6-72: rates and availability are live features (no "Soon"). The frames'
 * business navbar is a defect: professionals keep their own navigation.
 *
 * A professional who submitted through onboarding (every lane, user decision
 * 14 Oct 2026) is listed here once their licence or certificate is verified
 * (GO_LIVE_ON_VERIFICATION). Fitness / Other get a Certificate check row
 * beside Specialties and services (OURS), since their listing now waits on it.
 */
export const ProGetSetUpCard: React.FC<{ onAddClient: () => void; onPlans: () => void; className?: string }> = ({ onAddClient, onPlans, className }) => {
  const { authUserId, user, professionalClients } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState<{
    plans: number;
    rates: boolean;
    listed: boolean;
    workMode: boolean;
    specialties: boolean;
    availability: boolean;
    licence: LicenceStatus | null;
  } | null>(null);
  const kind = user.professionalSubtype;
  const regulated = isRegulated(proKindOf(kind));

  const load = useCallback(async () => {
    if (!authUserId) return;
    const [plans, profile, lane, progress, goLive] = await Promise.all([
      fetchMyPlans(authUserId),
      fetchMyProfile(authUserId),
      fetchProLaneColumns(authUserId),
      fetchOwnerProgress(authUserId),
      fetchGoLiveStatus(authUserId, regulated),
    ]);
    const licence: LicenceStatus | null = goLive.ok ? goLive.status : null;
    const p = profile.ok ? profile.profile : null;
    let listed = !!p?.listedPublicly;
    const items = progress.ok ? progress.items : {};
    // Listed when the licence or certificate is verified, as Review promised
    // ("Your profile goes live once your licence is checked"). Once only: the
    // row is then dismissed, so turning the listing off later is respected.
    const pendingLive = items[GO_LIVE_ON_VERIFICATION];
    if (licence?.kind === "verified" && pendingLive && !pendingLive.dismissed) {
      const r = await setPublicListing(true);
      if (r.status === "ok") listed = r.listed;
      // ATXC6: the database doesn't count the check yet; keep the item so a later visit lists them.
      if (r.status !== "needs_verification") await markOwnerItemDismissed(authUserId, GO_LIVE_ON_VERIFICATION);
    }
    setData({
      plans: plans.ok ? plans.plans.length : 0,
      rates: !!p && (p.monthlyRate !== null || p.consultationRate !== null) && p.paymentModalities.length > 0,
      listed,
      workMode: lane.ok && !!lane.row?.work_mode,
      specialties: lane.ok && (lane.row?.specialties?.length ?? 0) > 0,
      availability: !!items[AVAILABILITY_ITEM]?.done,
      licence,
    });
  }, [authUserId, regulated]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  if (!data) return null;

  const descByKind =
    kind === "dietitian" || kind === "nutritionist"
      ? t("First consultation and follow-ups")
      : kind === "physiotherapist"
        ? t("Assessment and treatment blocks")
        : kind === "doctor"
          ? t("First appointment and follow-ups")
          : t("Single sessions and blocks");
  const licenceDone = data.licence?.kind === "verified";
  const checkDesc = (word: "licence" | "certificate") =>
    data.licence?.kind === "rejected"
      ? t("Needs changes")
      : data.licence?.kind === "pending"
        ? t("Usually within 2 working days")
        : word === "licence"
          ? t("Add your licence to go live")
          : t("Add your certificate to go live");
  const todo: Item[] = [
    { key: "client", icon: UserPlus, title: t("Add your first client"), desc: t("Share a client code"), done: professionalClients.length > 0, onClick: onAddClient },
    { key: "plans", icon: Package, title: t("Add packages and prices"), desc: descByKind, done: data.plans > 0, onClick: onPlans },
    { key: "rates", icon: Banknote, title: t("Set your rates and payment methods"), desc: t("Cash (card payments coming soon)"), done: data.rates, onClick: () => navigate("/app/more/services") },
    {
      key: "availability",
      icon: CalendarClock,
      title: t("Set your availability"),
      desc: t("Clients book into open times"),
      done: data.availability,
      onClick: () => {
        if (authUserId) void markOwnerItemDone(authUserId, AVAILABILITY_ITEM);
        navigate("/app/pro/calendar");
      },
    },
    {
      key: "listing",
      icon: Globe,
      title: t("Choose who can find you"),
      desc: licenceDone ? t("Your public listing") : regulated ? t("Once your licence is checked") : t("Once your certificate is checked"),
      done: data.listed,
      // Release 3 W6: the listing switch lives in Settings › Practice.
      onClick: () => navigate("/app/more/practice/listing"),
    },
  ];
  const doneRows: Item[] = [
    { key: "about", icon: Check, title: t("About you"), done: true },
    { key: "work", icon: Check, title: t("Where you work"), done: data.workMode },
    regulated
      ? {
          key: "licence",
          icon: licenceDone ? Check : ShieldCheck,
          title: licenceDone ? t("Licence verified") : t("Licence check"),
          desc: licenceDone ? undefined : checkDesc("licence"),
          done: licenceDone,
          onClick: () => navigate("/app/professionals/verification"),
        }
      : { key: "services", icon: Check, title: t("Specialties and services"), done: data.specialties },
    ...(regulated
      ? []
      : [
          {
            key: "licence",
            icon: licenceDone ? Check : ShieldCheck,
            title: licenceDone ? t("Certificate verified") : t("Certificate check"),
            desc: licenceDone ? undefined : checkDesc("certificate"),
            done: licenceDone,
            onClick: () => navigate("/app/professionals/verification"),
          },
        ]),
  ];
  const all = [...todo, ...doneRows];
  const rows = [...all.filter((r) => !r.done), ...all.filter((r) => r.done)];
  const n = all.filter((r) => r.done).length;
  if (n === all.length) return null;

  return (
    <div className={`ob-vars ${className ?? ""}`}>
      <section className="obp-check" aria-label={t("Get set up")}>
        <div className="obp-check-head">
          <h2 className="obp-check-t">{t("Get set up")}</h2>
          <p className="obp-check-n">
            {t("{n} of {total} done", { n, total: all.length })}
          </p>
        </div>
        <p className="obp-check-sub">{t("Finish these to start working with clients.")}</p>
        <div className="obp-check-segs" aria-hidden>
          {all.map((r, i) => (
            <span key={r.key} data-on={i < n ? "true" : undefined} />
          ))}
        </div>
        {rows.map((r) => {
          const Icon = r.done ? Check : r.icon;
          const inner = (
            <>
              <span className="obp-check-ic" aria-hidden>
                <Icon size={15} strokeWidth={2} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="obp-check-it">{r.title}</span>
                {r.desc && !r.done && <span className="obp-check-id">{r.desc}</span>}
              </span>
              {!r.done && r.onClick && (
                <span className="ob-chev" aria-hidden style={{ color: "var(--ob-desc)" }}>
                  <ChevronRight size={14} className="rtl:-scale-x-100" />
                </span>
              )}
            </>
          );
          return !r.done && r.onClick ? (
            <button key={r.key} type="button" className="obp-check-item tap" onClick={r.onClick}>
              {inner}
            </button>
          ) : (
            <div key={r.key} className="obp-check-item" data-done={r.done ? "true" : undefined} aria-label={r.done ? t("{item}, done", { item: r.title }) : undefined}>
              {inner}
            </div>
          );
        })}
      </section>
    </div>
  );
};
