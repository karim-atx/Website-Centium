import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  Building2,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  FileText,
  Globe2,
  LineChart,
  MapPin,
  QrCode,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Store,
  Tag,
  User as UserIcon,
  UtensilsCrossed,
} from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useMyVenues } from "../../../hooks/useMyVenues";
import { forumAccess } from "../../../services/forum/rules";
import { fetchMoreSummary, type MoreSummary } from "../../../services/pro/more";
import { ReferralPopup } from "../../../components/profile/ReferralPopup";
import { CommunityLeafIcon, ExploreLeafIcon, PremiumLeafIcon, ReferralLeafIcon } from "../../../components/icons/MoreLeafIcons";
import { LEAF_D } from "../../../components/pro/home/ringGeometry";
import { INK } from "../../../components/pro/proInk";
import { PRO_ROUTES } from "../../../components/pro/subtypeLanes";
import { useProMessagesSummary } from "../../../components/pro/messages/useProMessagesSummary";
import { useCareNetworkPending } from "../../../components/pro/care/useCareNetworkPending";
import { serviceAreaLine } from "../../../components/pro/profile/profileModel";
import { clock12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { appLocale } from "../../../i18n/format";

// Release 3 W6 · MO1 v7 · the professional More (source/gen r19.js moreMenu19
// over moreMenu18 / moreMenu16 / moreMenu15 / more.js moreScreen; the frame
// copy wins over moreScreen where later rounds renamed rows: "Invite clients",
// "Care network"). Values, all literal from the generator:
//   title          19 / 700, 28.5 line, -0.03em, 13 below
//   Messages hero  358 x 169 min, r18, #ECF5F3 (dark teal .12), 7 below;
//                  "Messages" 38 / 700, line 1, -0.02em, #32544D (#D5EAE5),
//                  18 chevron at 2.6, 14 gap; subtitle 17 / 500, 22 line,
//                  max 160, 12 below, #869595 (#A5BDB9), "{n} unread" 800 in
//                  primary deep; padding 24 20 16 (empty: 16, centred).
//                  Mark 44, r13, 16 in, teal .10 (.18), two-leaf glyph 28,
//                  count pill 18 at -4/-4 with a 2px ring in the hero colour.
//                  Latest card: right 16, top 70, bottom 14, width 100% - 216,
//                  r14, card fill, padding 9 10, shadow 0 1 2 rgba(36,31,27,.06);
//                  name 11.5 / 800, time 10 / 700 (primary deep when unread),
//                  line 10.5, 1.4, 4 below. Larger text: the card stacks under
//                  the subtitle (14 above, r14, padding 10 12) and the mark goes.
//   tiles          3 columns, gap 9, 24 below; 131 min, r14, padding 18 8 12,
//                  mint #EBF5F2 (teal .12); 48 r12 #4F8F8A well, 30 glyph;
//                  label 12.5 / 700, 16 line, 10 below, balanced, inline 12
//                  chevron; desc 10, 14 line, 4 below, #8A9796 (#9CB0AD)
//   section label  11 / 600, 14 line, 0.14em caps, 7.5 + 1.5px primary rule,
//                  faint ink, margin 4 4 10
//   list           #F7F7FC (lavender .10), r18, padding 4 0, 24 below; rows
//                  56.6 min, padding 10 16 10 14, gap 12; 30 r10 #8E7FD0 well
//                  with a 22 glyph (1.3636 at 22 = 1.25 absolute); title
//                  12 / 700, 16 line; subtitle 10, 14 line, #9A94B3, 4 below;
//                  1px rule from 56 to 16 short of the edge (#EBEAF6, lavender
//                  .16); trailing gap 8, 4 before it; 14 chevron #9A94B3
//   Premium        #241F1B, r15, padding 13 15, 32 r11 leaf well
// Lane copy (moreScreen): Clinical overview says Registration and licence,
// Appointment types & fees, Patients and forms, Intake and health history
// forms, and has Clinical note / Referral templates; Nutrition has Intake and
// food journal prompts and no Programme templates.

type Icon = ComponentType<{ size?: number; strokeWidth?: number; absoluteStrokeWidth?: boolean; className?: string; style?: React.CSSProperties }>;
type Row = { icon: Icon; label: string; desc: string; to?: string; onClick?: () => void; tag?: ReactNode; trailing?: ReactNode };

const STAR_GOLD = "#D9A441";

function MessagesGlyph({ color, size }: { color: string; size: number }) {
  // msgGlyph16: two leaves facing each other and a dot, on a 24 box.
  const leaf = (x: number, y: number, r: number, h: number, op: number) => (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d={LEAF_D} fill={color} opacity={op} transform={`scale(${(h / 915).toFixed(4)}) translate(-245 -915)`} />
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden style={{ transform: "none" }}>
      {leaf(9.5, 21, -38, 17, 1)}
      {leaf(14.5, 21, 38, 17, 0.55)}
      <circle cx="12" cy="21.2" r="1.5" fill={color} />
    </svg>
  );
}

function shortWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return clock12(d);
  return d.toLocaleDateString(appLocale("en-US"), { day: "numeric", month: "short" });
}

function MessagesHero() {
  const navigate = useNavigate();
  const dark = useIsDark();
  const { accessibility } = useApp();
  const stack = accessibility.largerText;
  const s = useProMessagesSummary();
  const empty = !s.loading && !s.hasAny;
  const clear = !s.loading && s.hasAny && s.unread === 0 && s.newEnquiries === 0;
  const title = dark ? "#D5EAE5" : "#32544D";
  const sub = dark ? "#A5BDB9" : "#869595";
  const heroBg = dark ? "rgba(162,200,194,0.12)" : "#ECF5F3";

  const card = s.latest && (
    <>
      <span className="flex justify-between items-baseline" style={{ gap: 8 }}>
        <span style={{ fontSize: textPx(11.5), fontWeight: 800, color: INK.ch, lineHeight: 1.3, overflowWrap: "anywhere" }}>{s.latest.name}</span>
        <span className="shrink-0" style={{ fontSize: textPx(10), fontWeight: 700, color: s.latest.unread ? INK.prDeep : INK.chF }}>{shortWhen(s.latest.at)}</span>
      </span>
      <span className="block line-clamp-3" style={{ marginTop: 4, fontSize: textPx(10.5), lineHeight: 1.4, color: INK.chS }}>
        {s.latest.preview}
      </span>
    </>
  );

  const label = `Messages, ${s.unread} unread, ${s.newEnquiries} enquiries waiting`;
  return (
    <button
      type="button"
      onClick={() => navigate("/app/messages")}
      aria-label={label}
      className="tap relative block w-full overflow-hidden text-start animate-fade-slide-up"
      style={{ minHeight: 169, borderRadius: 18, marginBottom: 7, background: heroBg }}
    >
      {!stack && !empty && !s.loading && (
        <span
          aria-hidden
          className="absolute flex items-center justify-center"
          style={{ top: 16, insetInlineEnd: 16, width: 44, height: 44, borderRadius: 13, background: dark ? "rgba(162,200,194,0.18)" : "rgba(79,143,138,0.10)" }}
        >
          <MessagesGlyph color={dark ? "#93C1B9" : "#4F8F8A"} size={28} />
          {s.unread > 0 && (
            <span
              className="absolute flex items-center justify-center"
              style={{
                top: -4,
                insetInlineEnd: -4,
                minWidth: 18,
                height: 18,
                padding: "0 5px",
                borderRadius: 9999,
                background: INK.fill,
                color: INK.onFill,
                fontSize: 10,
                fontWeight: 800,
                boxShadow: `0 0 0 2px ${dark ? "#1F2A2D" : "#ECF5F3"}`,
              }}
            >
              {s.unread > 99 ? "99+" : s.unread}
            </span>
          )}
        </span>
      )}
      {!stack && card && (
        <span
          aria-hidden
          className="absolute"
          style={{ insetInlineEnd: 16, top: 70, bottom: 14, width: "calc(100% - 216px)", borderRadius: 14, background: INK.card, padding: "9px 10px", boxShadow: "0 1px 2px rgba(36,31,27,0.06)", overflow: "hidden" }}
        >
          {card}
        </span>
      )}
      <span
        className="relative flex flex-col"
        style={{ justifyContent: empty ? "center" : "flex-start", minHeight: 169, padding: `${empty ? 16 : 24}px 20px 16px` }}
      >
        <span className="flex items-center" style={{ gap: 14 }}>
          <span style={{ fontSize: textPx(38), fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em", color: title }}>Messages</span>
          <ChevronRight size={18} strokeWidth={2.6} className="shrink-0" style={{ color: title }} />
        </span>
        <span className="block" style={{ marginTop: 12, maxWidth: 160, fontSize: textPx(17), fontWeight: 500, lineHeight: linePx(22), color: sub }}>
          {s.loading ? (
            <span aria-hidden className="block rounded bg-current opacity-20" style={{ width: 110, height: 16 }} />
          ) : empty ? (
            "Chat with clients and answer enquiries"
          ) : clear ? (
            "All caught up"
          ) : (
            <>
              <b style={{ color: INK.prDeep, fontWeight: 800 }}>{s.unread} unread</b>
              <br />
              {s.newEnquiries === 1 ? "1 new enquiry" : `${s.newEnquiries} new enquiries`}
            </>
          )}
        </span>
        {stack && card && (
          <span aria-hidden className="block" style={{ marginTop: 14, borderRadius: 14, background: INK.card, padding: "10px 12px" }}>
            {card}
          </span>
        )}
      </span>
    </button>
  );
}

function Tile({ icon: I, label, desc, onClick, abs }: { icon: Icon; label: string; desc: string; onClick: () => void; abs?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex flex-col items-center text-center bg-th-ebf5f2 dark:bg-th-a2c8c2/[0.12] animate-fade-slide-up"
      style={{ minHeight: 131, borderRadius: 14, padding: "18px 8px 12px" }}
    >
      <span className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: 12, background: "#4F8F8A" }}>
        {abs ? <I size={30} strokeWidth={1} absoluteStrokeWidth className="text-white" /> : <I size={30} className="text-white" />}
      </span>
      <span className="block text-charcoal" style={{ marginTop: 10, fontSize: textPx(12.5), fontWeight: 700, lineHeight: linePx(16), textWrap: "balance" }}>
        {label}
        <span className="inline-block" style={{ verticalAlign: -2, marginInlineStart: 3 }}>
          <ChevronRight size={12} strokeWidth={2.6} />
        </span>
      </span>
      <span className="text-th-8a9796 dark:text-th-9cb0ad" style={{ marginTop: 4, fontSize: textPx(10), lineHeight: linePx(14), textWrap: "balance" }}>
        {desc}
      </span>
    </button>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p
      style={{
        margin: "4px 4px 10px",
        fontSize: textPx(11),
        fontWeight: 600,
        lineHeight: linePx(14),
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        paddingBottom: 7.5,
        borderBottom: `1.5px solid ${INK.pr}`,
        color: INK.chF,
      }}
    >
      {children}
    </p>
  );
}

function List({ rows, onGo }: { rows: Row[]; onGo: (r: Row) => void }) {
  return (
    <div className="bg-[#F7F7FC] dark:bg-th-aea1dc/[0.10] animate-fade-slide-up" style={{ borderRadius: 18, padding: "4px 0", marginBottom: 24 }}>
      {rows.map((r, i) => (
        <button
          key={r.label}
          type="button"
          onClick={() => onGo(r)}
          className="tap relative w-full flex items-center text-start"
          style={{ minHeight: 56.6, paddingBlock: "10px", paddingInline: "14px 16px", gap: 12 }}
        >
          {i > 0 && <span aria-hidden className="absolute top-0 bg-th-ebeaf6 dark:bg-th-aea1dc/[0.16]" style={{ insetInlineStart: 56, insetInlineEnd: 16, height: 1 }} />}
          <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "rgb(var(--th-8e7fd0))" }}>
            <r.icon size={22} strokeWidth={1.25} absoluteStrokeWidth className="text-white" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="flex flex-wrap items-center text-charcoal" style={{ columnGap: 8, rowGap: 2, fontSize: textPx(12), fontWeight: 700, lineHeight: linePx(16) }}>
              {r.label}
              {r.tag}
            </span>
            <span className="block text-th-9a94b3" style={{ marginTop: 4, fontSize: textPx(10), lineHeight: linePx(14) }}>
              {r.desc}
            </span>
          </span>
          <span className="flex items-center shrink-0" style={{ gap: 8, marginInlineStart: 4 }}>
            {r.trailing}
            <ChevronRight size={14} strokeWidth={2} className="text-th-9a94b3" />
          </span>
        </button>
      ))}
    </div>
  );
}

function VerifiedTag() {
  return (
    <span className="inline-flex items-center" style={{ gap: 3, fontSize: textPx(10), fontWeight: 700, color: INK.good }}>
      <BadgeCheck size={12} strokeWidth={2} />
      Verified
    </span>
  );
}

function Stars({ average }: { average: number }) {
  const full = Math.round(average);
  return (
    <span className="inline-flex" aria-label={`${average.toFixed(1)} out of 5`} style={{ gap: 1 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={10} strokeWidth={2} style={{ color: STAR_GOLD }} fill={i < full ? STAR_GOLD : "none"} />
      ))}
    </span>
  );
}

function CountBadge({ n }: { n: number }) {
  return (
    <span
      aria-label={`${n} waiting`}
      className="inline-flex items-center justify-center"
      style={{ minWidth: 18, height: 18, padding: "0 6px", borderRadius: 9999, background: INK.fill, color: INK.onFill, fontSize: 10, fontWeight: 700 }}
    >
      {n}
    </span>
  );
}

export default function ProfessionalMore() {
  const navigate = useNavigate();
  const { user, authUserId } = useApp();
  const { lane } = useProSubtype();
  const { venues } = useMyVenues();
  const care = useCareNetworkPending();
  const forumAllowed = forumAccess(user.dateOfBirth) === "adult";
  // Database 20261219030000: the hub's ambassador decision row opens here
  // with ?open=referral, on the popup that carries the status card.
  const [params, setParams] = useSearchParams();
  const [referralOpen, setReferralOpenState] = useState(() => params.get("open") === "referral");
  const setReferralOpen = (open: boolean) => {
    setReferralOpenState(open);
    if (!open && params.has("open")) setParams({}, { replace: true });
  };
  const [sum, setSum] = useState<MoreSummary | null>(null);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchMoreSummary(authUserId).then((s) => live && setSum(s));
    return () => {
      live = false;
    };
  }, [authUserId]);

  const go = (r: Row) => (r.onClick ? r.onClick() : navigate(r.to!));
  const co = lane === "clinical_overview";
  const nt = lane === "nutrition";

  const where = sum?.businesses ? (sum.businesses.length ? sum.businesses.join(" · ") : "Independent") : "Independent, businesses & online";
  // PLAN S2 (drawn copy): "{area_label} and {n} km around" from the map area and service_radius_km.
  const area = (sum && serviceAreaLine(sum.areaLabel, sum.serviceRadiusKm, sum.workMode)) || "Where clients can find you";
  const reviewsLine =
    sum?.rating && sum.rating.count > 0 && sum.rating.average != null
      ? `${sum.rating.average.toFixed(1)} average · ${sum.rating.count} ${sum.rating.count === 1 ? "review" : "reviews"}`
      : "What clients say about you";

  const practice: Row[] = [
    { icon: Globe2, label: "Public profile", desc: "Preview it as clients see it", to: "/app/more/public-profile" },
    { icon: BadgeCheck, label: co ? "Registration and licence" : "Credentials and licence", desc: "Licence number and verification", to: "/app/more/credentials", tag: sum?.verified ? <VerifiedTag /> : undefined },
    { icon: Tag, label: "Services and pricing", desc: co ? "Appointment types & fees" : "Session types, packages & offers", to: "/app/more/services" },
    { icon: Building2, label: "Where you work", desc: where, to: "/app/more/where-you-work" },
    { icon: MapPin, label: "Service area", desc: area, to: "/app/more/where-you-work/area" },
  ];
  const forms: Row[] = [
    {
      icon: ClipboardList,
      label: co ? "Intake and health history forms" : nt ? "Intake and food journal prompts" : "Intake and check-in forms",
      desc: "What new clients fill in",
      to: "/app/more/forms",
    },
    { icon: ShieldCheck, label: "Consent and data sharing", desc: "What clients share with you & why", to: "/app/more/consent" },
    { icon: QrCode, label: "Invite clients", desc: "Share it so clients can connect", to: `${PRO_ROUTES.home}/invite` },
  ];
  const templates: Row[] = co
    ? [
        { icon: FileText, label: "Clinical note templates", desc: "Consultation & follow-up notes", to: "/app/more/note-templates" },
        { icon: Send, label: "Referral templates", desc: "Letters to dietitians, trainers & physios", to: "/app/more/templates?tab=referrals" },
      ]
    : nt
      ? [
          { icon: UtensilsCrossed, label: "Meal-plan templates", desc: "Reusable meal plans", to: "/app/more/templates?tab=meal-plans" },
          { icon: FileText, label: "Note templates", desc: "Nutrition and session notes", to: "/app/more/note-templates" },
        ]
      : [
          { icon: Dumbbell, label: "Programme templates", desc: "Workouts & multi-week programmes", to: "/app/more/templates?tab=programmes" },
          { icon: UtensilsCrossed, label: "Meal-plan templates", desc: "Reusable meal plans", to: "/app/more/templates?tab=meal-plans" },
          { icon: FileText, label: "Note templates", desc: "Training and session notes", to: "/app/more/note-templates" },
        ];
  const reputation: Row[] = [
    { icon: Star, label: "Reviews", desc: reviewsLine, to: "/app/more/reviews", trailing: sum?.rating?.count && sum.rating.average != null ? <Stars average={sum.rating.average} /> : undefined },
    { icon: Send, label: "Care network", desc: "Sent to and received from colleagues", to: "/app/more/care-network", trailing: care.count > 0 ? <CountBadge n={care.count} /> : undefined },
  ];
  const billing: Row[] = [
    { icon: Banknote, label: "Payments and billing", desc: "Methods, payouts, invoices & receipts", to: "/app/more/payments" },
    { icon: Store, label: "Businesses", desc: "Where you are connected & join requests", to: "/app/more/businesses" },
    // FINAL_PLAN W6 "plus kept rows": the venue console for owners and staff.
    ...(venues.length > 0 ? [{ icon: Building2, label: "Venues", desc: "Members, classes, hours & photos", to: "/app/business/venue" }] : []),
  ];
  const account: Row[] = [
    { icon: UserIcon, label: "Profile", desc: "Your account, details & sign out", to: "/app/profile" },
    { icon: ReferralLeafIcon as Icon, label: "Referral", desc: "Share your code, earn rewards", onClick: () => setReferralOpen(true) },
    { icon: Settings, label: "Settings", desc: "Notifications, security, help & legal", to: "/app/settings" },
  ];

  return (
    <div>
      <p className="text-charcoal" style={{ marginBottom: 13, fontSize: 19, lineHeight: "28.5px", fontWeight: 700, letterSpacing: "-0.03em" }}>
        More
      </p>
      <MessagesHero />
      <div className={forumAllowed ? "grid grid-cols-3" : "grid grid-cols-2"} style={{ gap: 9, marginBottom: 24 }}>
        {/* Market + Share 3.0 D-39: Explore opens the professional Marketplace (P-MA); the live ProfessionalExplore stays reachable from its Overview ("Gyms and colleagues"). */}
        <Tile icon={ExploreLeafIcon as Icon} label="Explore" desc="Your Showcase, offers and performance" onClick={() => navigate("/app/pro/marketplace")} />
        {forumAllowed && <Tile icon={CommunityLeafIcon as Icon} label="Community" desc="Forum discussions & fitness courses" onClick={() => navigate("/app/forum")} />}
        <Tile icon={LineChart} abs label="Practice insights" desc="Clients, sessions, retention & reviews" onClick={() => navigate("/app/more/practice-insights")} />
      </div>
      <SectionLabel>Practice</SectionLabel>
      <List rows={practice} onGo={go} />
      <SectionLabel>{co ? "Patients and forms" : "Clients and forms"}</SectionLabel>
      <List rows={forms} onGo={go} />
      <SectionLabel>Templates</SectionLabel>
      <List rows={templates} onGo={go} />
      <SectionLabel>Reputation</SectionLabel>
      <List rows={reputation} onGo={go} />
      <SectionLabel>Business and billing</SectionLabel>
      <List rows={billing} onGo={go} />
      <SectionLabel>Account</SectionLabel>
      <List rows={account} onGo={go} />
      <button
        type="button"
        onClick={() => navigate("/app/subscription")}
        className="tap w-full flex items-center justify-between text-start"
        style={{ gap: 14, borderRadius: 15, padding: "13px 15px", background: "#241F1B" }}
      >
        <span className="flex items-center" style={{ gap: 12 }}>
          <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 11, background: "rgba(174,161,220,0.26)" }}>
            <PremiumLeafIcon size={22} style={{ color: "#C8BFE9" }} />
          </span>
          <span>
            <span className="block text-white" style={{ fontSize: textPx(12.5), fontWeight: 800 }}>Centium Professional</span>
            <span className="block" style={{ fontSize: textPx(10), color: "rgba(255,255,255,0.6)" }}>Your plan, client limit &amp; upgrades</span>
          </span>
        </span>
        <ChevronRight size={14} strokeWidth={2} style={{ color: "#C8BFE9" }} className="shrink-0" />
      </button>
      <ReferralPopup colleague open={referralOpen} onClose={() => setReferralOpen(false)} />
    </div>
  );
}
