import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Accessibility,
  BadgeCheck,
  Banknote,
  Bug,
  Building2,
  CalendarClock,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  Globe,
  Globe2,
  HeartHandshake,
  HeartPulse,
  HelpCircle,
  KeyRound,
  LifeBuoy,
  Lock,
  LogOut,
  MapPin,
  Mic,
  Music2,
  Phone,
  QrCode,
  Receipt,
  ScrollText,
  Send,
  ShieldCheck,
  Star,
  Sun,
  Tag,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { useMyVenues } from "../../hooks/useMyVenues";
import { fetchMoreSummary, type MoreSummary } from "../../services/pro/more";
import { fetchPracticeSettings, saveCallsWithHiredClients } from "../../services/pro/practice";
import { useCareNetworkPending } from "../pro/care/useCareNetworkPending";
import { serviceAreaLine } from "../pro/profile/profileModel";
import { PRO_ROUTES } from "../pro/subtypeLanes";
import { ReferralPopup } from "../profile/ReferralPopup";
import { ReferralLeafIcon } from "../icons/MoreLeafIcons";
import { useSignOutAllDevices } from "../profile/SignOutAllDevices";
import { REFUND_POLICY_HREF, BILLING_HELP_PATH } from "../../marketing/legal/refund";
import { tk, tn } from "../../i18n/core";
import { Column, Pane, PlanCard, SecondaryGroups, type SecondaryGroup, type SecondaryItem } from "./WebSecondaryLayout";
import { appSettingsSection } from "./webNav";
import { LEGAL_UPDATED, legalDate } from "../../pages/settings/legalCopy";
import { GUIDELINES_UPDATED } from "../../marketing/legal/guidelines";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

/** The repo's markers on the More rows, at the web row's sizes (Verified chip 13/20, stars 12). */
const VerifiedChip: React.FC = () => {
  const { t } = useApp();
  return (
    <span className="inline-flex items-center" style={{ gap: 4, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#1D744A" }}>
      <BadgeCheck size={14} strokeWidth={2} aria-hidden />
      {t("Verified")}
    </span>
  );
};
const ReviewStars: React.FC<{ average: number }> = ({ average }) => {
  const { t } = useApp();
  const full = Math.round(average);
  return (
    <span className="inline-flex" aria-label={t("{v} out of 5", { v: average.toFixed(1) })} style={{ gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={12} strokeWidth={2} style={{ color: "#D9A441" }} fill={i < full ? "#D9A441" : "none"} aria-hidden />
      ))}
    </span>
  );
};

/**
 * Professional handover v1, section 4 (ST Settings Web, ui="pro"): the More
 * column per lane. Practice · Clients and forms (Patients and forms) ·
 * Templates · Reputation · Business and billing · Account, with the repo's
 * own rows, descriptions and markers. Items with their own sidebar entry
 * (Messages, Explore, Community, Practice insights, Businesses), Profile
 * (pinned in the sidebar) and Settings (a sidebar entry) are left out
 * (decisions 3 and 4). ↗ rows open their own page: Public profile, Invite
 * clients, Care network, and the programme / meal-plan templates (Library or
 * Meal plans). The dark plan card is pinned at the bottom (Centium
 * Professional, /app/subscription).
 */
function useProMoreGroups(openReferral: () => void): SecondaryGroup[] {
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const { venues } = useMyVenues();
  const care = useCareNetworkPending();
  const [sum, setSum] = useState<MoreSummary | null>(null);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMoreSummary(authUserId).then((s) => live && setSum(s));
    return () => {
      live = false;
    };
  }, [authUserId]);
  const co = lane === "clinical_overview";
  const nu = lane === "nutrition";
  const { t } = useApp();
  const where = sum?.businesses ? (sum.businesses.length ? sum.businesses.join(" · ") : t("Independent")) : t("Independent, businesses & online");
  const area = (sum && serviceAreaLine(sum.areaLabel, sum.serviceRadiusKm, sum.workMode)) || t("Where clients can find you");
  const reviewsLine =
    sum?.rating && sum.rating.count > 0 && sum.rating.average != null
      ? tn(sum.rating.count, "{avg} average · {n} review", "{avg} average · {n} reviews", { avg: sum.rating.average.toFixed(1) })
      : t("What clients say about you");
  const templates: SecondaryItem[] = co
    ? [
        { key: "notetpl", label: tk("Clinical note templates"), desc: t("Consultation & follow-up notes"), icon: FileText, to: "/app/more/note-templates" },
        { key: "reftpl", label: tk("Referral templates"), desc: t("Letters to dietitians, trainers & physios"), icon: Send, to: "/app/more/templates?tab=referrals" },
      ]
    : nu
      ? [
          { key: "mealtpl", label: tk("Meal-plan templates"), desc: t("Reusable meal plans"), icon: UtensilsCrossed, to: PRO_ROUTES.mealPlans, ext: true },
          { key: "notetpl", label: tk("Note templates"), desc: t("Nutrition and session notes"), icon: FileText, to: "/app/more/note-templates" },
        ]
      : [
          { key: "progtpl", label: tk("Programme templates"), desc: t("Workouts & multi-week programmes"), icon: Dumbbell, to: `${PRO_ROUTES.library}/programmes`, ext: true },
          { key: "mealtpl", label: tk("Meal-plan templates"), desc: t("Reusable meal plans"), icon: UtensilsCrossed, to: `${PRO_ROUTES.library}/meal-plans`, ext: true },
          { key: "notetpl", label: tk("Note templates"), desc: t("Training and session notes"), icon: FileText, to: "/app/more/note-templates" },
        ];
  return [
    {
      label: tk("Practice"),
      items: [
        { key: "publicprofile", label: tk("Public profile"), desc: t("Preview it as clients see it"), icon: Globe2, to: "/app/more/public-profile" },
        { key: "credentials", label: co ? tk("Registration and licence") : tk("Credentials and licence"), desc: t("Licence number and verification"), icon: BadgeCheck, to: "/app/more/credentials", trailing: sum?.verified ? <VerifiedChip /> : undefined },
        { key: "services", label: tk("Services and pricing"), desc: co ? t("Appointment types & fees") : t("Session types, packages & offers"), icon: Tag, to: "/app/more/services" },
        { key: "where", label: tk("Where you work"), desc: where, icon: Building2, to: "/app/more/where-you-work" },
        { key: "area", label: tk("Service area"), desc: area, icon: MapPin, to: "/app/more/where-you-work/area" },
      ],
    },
    {
      label: co ? tk("Patients and forms") : tk("Clients and forms"),
      items: [
        {
          key: "intake",
          label: co ? tk("Intake and health history forms") : nu ? tk("Intake and food journal prompts") : tk("Intake and check-in forms"),
          desc: t("What new clients fill in"),
          icon: ClipboardList,
          to: "/app/more/forms",
        },
        { key: "consent", label: tk("Consent and data sharing"), desc: t("What clients share with you & why"), icon: ShieldCheck, to: "/app/more/consent" },
        { key: "invite", label: tk("Invite clients"), desc: t("Share it so clients can connect"), icon: QrCode, to: `${PRO_ROUTES.home}/invite`, ext: true },
      ],
    },
    { label: tk("Templates"), items: templates },
    {
      label: tk("Reputation"),
      items: [
        {
          key: "reviews",
          label: tk("Reviews"),
          desc: reviewsLine,
          icon: Star,
          to: "/app/more/reviews",
          trailing: sum?.rating?.count && sum.rating.average != null ? <ReviewStars average={sum.rating.average} /> : undefined,
        },
        { key: "care", label: tk("Care network"), desc: t("Sent to and received from colleagues"), icon: Send, to: "/app/more/care-network", ext: true, badge: care.count },
      ],
    },
    {
      label: tk("Business and billing"),
      items: [
        { key: "payments", label: tk("Payments and billing"), desc: t("Methods, payouts, invoices & receipts"), icon: Banknote, to: "/app/more/payments" },
        // The repo lists Venues here for a professional who runs one; kept (it has no sidebar entry).
        ...(venues.length > 0 ? [{ key: "venues", label: tk("Venues"), desc: t("Members, classes, hours & photos"), icon: Building2, to: "/app/business/venue", ext: true }] : []),
      ],
    },
    { label: tk("Account"), items: [{ key: "referral", label: tk("Referral"), desc: t("Share your code, earn rewards"), icon: ReferralLeafIcon as SecondaryItem["icon"], onClick: openReferral }] },
  ];
}

/** The More item a path lights (sub-pages keep their item). */
function proMoreSelected(groups: SecondaryGroup[], pathname: string, search: string): string | null {
  if (under(pathname, "/app/more/where-you-work/area")) return "area";
  if (under(pathname, "/app/more/templates")) return new URLSearchParams(search).get("tab") === "referrals" ? "reftpl" : null;
  for (const g of groups) for (const it of g.items) if (it.to && !it.ext && under(pathname, it.to.split("?")[0])) return it.key;
  return null;
}

export const ProMoreLayout: React.FC<{ secW: number; banners: React.ReactNode; children: React.ReactNode }> = ({ secW, banners, children }) => {
  const { t } = useApp();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [referralOpen, setReferralOpen] = useState(false);
  const groups = useProMoreGroups(() => setReferralOpen(true));
  // The first item (Credentials and licence) opens by default.
  if (pathname === "/app/more" || pathname === "/app/more/") return <Navigate to="/app/more/credentials" replace />;
  const planOn = under(pathname, "/app/subscription") || under(pathname, "/app/more/premium-passes");
  const selected = planOn ? null : proMoreSelected(groups, pathname, search);
  return (
    <>
      <Column
        title={t("More")}
        secW={secW}
        plan={<PlanCard title={t("Centium Professional")} line={t("Your plan, client limit & upgrades")} selected={planOn} onClick={() => navigate("/app/subscription")} />}
      >
        <SecondaryGroups title={t("More")} groups={groups} selected={selected} navPb={24} onSelect={(it) => (it.onClick ? it.onClick() : it.to && navigate(it.to))} />
      </Column>
      <Pane banners={banners} scrollKey={pathname + search} span>
        {children}
      </Pane>
      <ReferralPopup open={referralOpen} onClose={() => setReferralOpen(false)} />
    </>
  );
};

/**
 * Addendum A (WC-SE) and the Professional Settings (WP-SE): the Settings
 * column, its sections following the repo Settings page. Help · Appearance ·
 * Permissions · Connected devices (clients) · Security · Practice
 * (professionals, between Security and Data & account as in the repo) · Data
 * & account · General · Legal. Sub-pages open in the pane with their section
 * lit; Contact us, Report a bug and Rate this app are centred popups; the
 * refund policy is a link to the Legal page's refund section in a new tab.
 */
/** Settings › Practice › Calls with hired clients, switched from the Settings column (the PracticeSection switch, the same reader and writer). */
function useCallsSetting(on: boolean): { on: boolean | null; error: string | null; toggle: () => void } {
  const { authUserId, t } = useApp();
  const [calls, setCalls] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!on || !authUserId) return;
    let live = true;
    void fetchPracticeSettings(authUserId).then((r) => {
      if (!live) return;
      if (r.ok) setCalls(r.data.callsWithHiredClients);
      else setError(r.offline ? t("Offline, showing last update") : t("Couldn't load this setting."));
    });
    return () => {
      live = false;
    };
  }, [on, authUserId, t]);
  const toggle = () => {
    if (!authUserId || busy || calls === null) return;
    const prev = calls;
    setCalls(!prev);
    setBusy(true);
    setError(null);
    void saveCallsWithHiredClients(authUserId, !prev).then((r) => {
      setBusy(false);
      if (!r.ok) {
        setCalls(prev);
        setError(t(r.message));
      }
    });
  };
  return { on: calls, error, toggle };
}

function useSettingsGroups(onSignOutAll: () => void): SecondaryGroup[] {
  const { user, t, theme, language } = useApp();
  const legal = t("Last updated {date}", { date: legalDate(LEGAL_UPDATED) });
  const pro = user.accountType === "professional";
  const calls = useCallsSetting(pro);
  const customer = user.accountType === "customer";
  const sec = (s: string) => `/app/settings?section=${s}`;
  return [
    { label: tk("Help"), items: [{ key: "help", label: tk("Help and questions"), desc: t("Answers, live chat and email"), icon: LifeBuoy, to: "/app/settings/help" }] },
    { label: tk("Appearance"), items: [{ key: "appearance", label: tk("Appearance"), desc: `${theme === "dark" ? t("Currently on") : t("Currently off")}. ${t("Applies throughout Centium")}`, icon: Sun, to: sec("appearance") }] },
    { label: tk("Permissions"), items: [{ key: "permissions", label: tk("Permissions"), icon: Mic, to: sec("permissions") }] },
    ...(customer ? [{ label: tk("Connected devices"), items: [{ key: "devices", label: tk("Connected devices"), icon: HeartPulse, to: sec("devices") }] }] : []),
    {
      label: tk("Security"),
      items: [
        { key: "twofactor", label: tk("Two-factor authentication"), icon: ShieldCheck, to: "/app/settings/two-factor" },
        // Round K: Sign out ends this device only; this ends every session (its confirm opens over the page).
        { key: "signout-all", label: tk("Sign out of all devices"), icon: LogOut, onClick: onSignOutAll },
      ],
    },
    // WP-MO.10 (WP-MO Pane List, page "settings"): the Practice rows themselves, each page opening in the pane; Calls with hired clients switches in place.
    ...(pro
      ? [
          {
            label: tk("Practice"),
            items: [
              { key: "p-booking", label: tk("Booking defaults"), desc: t("Notice, buffers and cancellation window"), icon: CalendarClock, to: "/app/more/practice/booking-defaults" },
              { key: "p-data", label: tk("Default data requests"), desc: t("What new clients are asked to share"), icon: ShieldCheck, to: "/app/more/practice/data-requests" },
              { key: "p-invoice", label: tk("Invoice details"), desc: t("Name on invoices, tax number, numbering"), icon: Receipt, to: "/app/more/practice/invoice" },
              {
                key: "p-calls",
                label: tk("Calls with hired clients"),
                desc: calls.error ?? t("Voice and video in client chats"),
                icon: Phone,
                onClick: calls.toggle,
                switchOn: calls.on,
              },
              { key: "p-listing", label: tk("Public listing"), desc: t("Whether clients can find you in Explore"), icon: Globe2, to: "/app/more/practice/listing" },
            ],
          },
        ]
      : []),
    { label: tk("Data & account"), items: [{ key: "data", label: tk("Data & account"), icon: KeyRound, to: sec("data") }] },
    {
      label: tk("General"),
      items: [
        { key: "language", label: tk("Language"), desc: language === "ar" ? "العربية" : "English", icon: Globe, to: "/app/settings/language" },
        { key: "music", label: tk("Your music"), icon: Music2, to: "/app/settings/music" },
        { key: "accessibility", label: tk("Accessibility"), icon: Accessibility, to: "/app/settings/accessibility" },
        { key: "crisis", label: tk("Crisis lines"), icon: HeartHandshake, to: "/app/get-support" },
        { key: "billing", label: tk("Billing and refunds"), icon: CreditCard, to: BILLING_HELP_PATH },
        { key: "contact", label: tk("Contact us"), icon: HelpCircle, to: `${sec("general")}&popup=contact` },
        { key: "bug", label: tk("Report a bug"), icon: Bug, to: `${sec("general")}&popup=bug` },
        { key: "rate", label: tk("Rate this app"), icon: Star, to: `${sec("general")}&popup=rate` },
      ],
    },
    {
      label: tk("Legal"),
      items: [
        { key: "terms", label: tk("Terms of Service"), desc: legal, icon: FileText, to: "/app/settings/terms" },
        { key: "privacy", label: tk("Privacy"), desc: legal, icon: Lock, to: "/app/settings/privacy" },
        {
          key: "refund",
          label: tk("Refund and cancellation policy"),
          icon: ScrollText,
          ext: true,
          onClick: () => window.open(REFUND_POLICY_HREF, "_blank", "noopener"),
        },
        { key: "guidelines", label: tk("Community guidelines"), desc: t("Last updated {date}", { date: legalDate(GUIDELINES_UPDATED) }), icon: Users, to: sec("guidelines") },
      ],
    },
  ];
}

/** The Settings item a path lights. */
function settingsSelected(pathname: string, search: string): string {
  if (pathname === BILLING_HELP_PATH) return "billing";
  if (under(pathname, "/app/settings/help")) return "help";
  if (under(pathname, "/app/settings/notifications")) return "permissions";
  if (under(pathname, "/app/settings/devices")) return "devices";
  if (under(pathname, "/app/settings/two-factor")) return "twofactor";
  if (under(pathname, "/app/settings/account")) return "data";
  if (under(pathname, "/app/more/practice/booking-defaults")) return "p-booking";
  if (under(pathname, "/app/more/practice/data-requests")) return "p-data";
  if (under(pathname, "/app/more/practice/invoice")) return "p-invoice";
  if (under(pathname, "/app/more/practice/listing")) return "p-listing";
  if (pathname === "/app/get-support") return "crisis";
  for (const k of ["language", "music", "accessibility", "terms", "privacy"]) if (under(pathname, `/app/settings/${k}`)) return k;
  const popup = new URLSearchParams(search).get("popup");
  if (popup === "contact" || popup === "bug" || popup === "rate") return popup;
  return appSettingsSection(search);
}

export const AppSettingsLayout: React.FC<{ secW: number; banners: React.ReactNode; children: React.ReactNode }> = ({ secW, banners, children }) => {
  const { t, user } = useApp();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { requestSignOutAll, signOutAllDialog } = useSignOutAllDevices();
  const groups = useSettingsGroups(requestSignOutAll);
  // The client's first item is Help (WC-SE default); the professional's is Appearance (WP-SE).
  const atIndex = (pathname === "/app/settings" || pathname === "/app/settings/") && !new URLSearchParams(search).get("section");
  if (atIndex && user.accountType === "customer") return <Navigate to="/app/settings/help" replace />;
  const selected = settingsSelected(pathname, search);
  return (
    <>
      <Column title={t("Settings")} secW={secW}>
        <SecondaryGroups title={t("Settings")} groups={groups} selected={selected} navPb={24} onSelect={(it) => (it.onClick ? it.onClick() : it.to && navigate(it.to))} />
      </Column>
      <Pane banners={banners} scrollKey={pathname + search} span>
        {children}
      </Pane>
      {signOutAllDialog}
    </>
  );
};
