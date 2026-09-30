import { useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ReferralSheet } from "../../components/profile/ReferralSheet";
import { PaymentsSheet } from "../../components/profile/PaymentsSheet";
import { PublicListingSheet } from "../../components/profile/PublicListingSheet";
import { useUnread } from "../../context/UnreadContext";
import { UnreadBadge } from "../../components/messages/UnreadBadge";
import { CommunityLeafIcon, ExploreLeafIcon, ReferralLeafIcon, PremiumLeafIcon } from "../../components/icons/MoreLeafIcons";
import {
  Users,
  User as UserIcon,
  ChevronRight,
  Settings,
  HeartPulse,
  MessageCircle,
  CalendarDays,
  Building2,
  Banknote,
  Globe2,
} from "lucide-react";

// MO1.4 · More (handover 2026-09-30 More supplement, assets/MO1.4.png, built in
// full on 2026-09-30). Every measurement below is taken from the frame, which
// is 1:1 at 390 wide (content 16 to 374):
//   Mind hero      358 x 169, radius 18, #ECF5F3; "Mind" 38px bold #32544D with
//                  an 18px chevron 14px after it; subtitle 17px #869595 on a
//                  22px line, wrapping after "Habits, journal &"; the supplied
//                  brain illustration at 0.61 scale (214 x 169) flush top-right
//   tile row       three tiles, gap 9, height 120, radius 14, #EBF5F2; a 30px
//                  #4F8F8A icon well 18px from the top; 12.5px bold title with
//                  a chevron, 10px #8A9796 subtitle on a 14px line, centred
//   grouped list   radius 18, #F7F7FC, 4px padding; rows 56.6 high, 30px
//                  #8E7FD0 wells 14px in, 11px to the text; 12px bold title,
//                  10px #9A94B3 subtitle and chevron; 1px #EBEAF6 dividers from
//                  the text to 15px short of the edge
//   spacing        7 between hero, tiles and list; 13 before Premium
//   Premium        unchanged (60 high, as the frame measures)
// The frame is a client account's page. The frame has no dark mode, so dark
// mode takes the app's tint families (teal .12, lavender .10) at the same
// geometry. Font sizes and weights are fitted to the frame's text widths.

type Entry = {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  to?: string;
  onClick?: () => void;
};

export default function More() {
  const navigate = useNavigate();
  const { user } = useApp();
  const unread = useUnread();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";
  const isClient = !isProfessional && !isBusiness;
  const [referralOpen, setReferralOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);

  const go = (e: Entry) => (e.onClick ? e.onClick() : navigate(e.to!));

  // The three tiles under the Mind hero (clients: the directory, Community and
  // Explore). Professionals and businesses have no Mind, directory or
  // Community (V6 / V9), so their page is the grouped list alone.
  const tiles: Entry[] = [
    { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/app/professionals" },
    { icon: CommunityLeafIcon, label: "Community", desc: "Forum discussions & fitness courses", to: "/app/forum" },
    { icon: ExploreLeafIcon, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/app/marketplace" },
  ];

  // The grouped list. The client rows are the frame's five, in its order;
  // the professional and business rows are the ones those accounts had
  // before (V6 / V8 / V9 / QA 12.0), in the same list style.
  const rows = (
    isClient
      ? [
          { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/app/profile" },
          { icon: CalendarDays, label: "Calendar", desc: "Your events, synced with your professional & gym", to: "/app/calendar" },
          { icon: MessageCircle, label: "Messages", desc: "Chat with your professionals", to: "/app/messages" },
          // Approved decision 9: the handover's reward wording.
          { icon: ReferralLeafIcon, label: "Referral", desc: "Share your code, earn rewards", onClick: () => setReferralOpen(true) },
          { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/app/settings" },
        ]
      : [
          isProfessional && { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/app/profile" },
          isBusiness && { icon: Building2, label: "Business Profile", desc: "Name, bio, location & reviews", to: "/app/business/profile" },
          isProfessional && { icon: MessageCircle, label: "Messages", desc: "Chat with your clients", to: "/app/messages" },
          isProfessional && { icon: HeartPulse, label: "Health Metrics", desc: "Client health data & clinical notes", to: "/app/professionals/health-metrics" },
          isProfessional && { icon: Banknote, label: "Payments", desc: "Your rates & accepted payment methods", onClick: () => setPaymentsOpen(true) },
          isProfessional && { icon: Globe2, label: "Your public listing", desc: "Specialty, bio & whether clients can find you", onClick: () => setListingOpen(true) },
          isBusiness && { icon: MessageCircle, label: "Messages", desc: "Your conversations", to: "/app/messages" },
          isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Schedule clients to professionals & classes", to: "/app/business/calendar" },
          isProfessional && { icon: ExploreLeafIcon, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/app/marketplace" },
          { icon: ReferralLeafIcon, label: "Referral", desc: "Share your code, earn rewards", onClick: () => setReferralOpen(true) },
          { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/app/settings" },
        ]
  ).filter(Boolean) as Entry[];

  return (
    <div>
      <p className="mb-[13px] text-[19px] font-bold tracking-[-0.03em] text-charcoal">More</p>

      {isClient && (
        <>
          {/* THE BRAIN IN DARK MODE. The asset is drawn for the light card: its
              leaves are dark teal at ~28% alpha, and its transparent area
              carries ~3,000 faint near-white specks. On a dark card the leaves
              sink and the specks show as grain. This matrix drops the alpha of
              anything with red in it (the specks; the leaves have none) and
              brightens the leaves 1.9x. A dark variant of the asset would
              still be cleaner; reported. */}
          <svg width="0" height="0" aria-hidden className="absolute">
            <filter id="more-brain-dark" colorInterpolationFilters="sRGB">
              <feColorMatrix type="matrix" values="1.9 0 0 0 0  0 1.9 0 0 0  0 0 1.9 0 0  -0.6 0 0 1 0" />
            </filter>
          </svg>
          {/* Mind: the hero. Habits, Journal and Meditation are all inside it. */}
          <button
            onClick={() => navigate("/app/mind")}
            className="tap relative w-full overflow-hidden text-left block bg-[#ECF5F3] dark:bg-[rgba(162,200,194,0.12)] animate-fade-slide-up"
            style={{ minHeight: 169, borderRadius: 18, marginBottom: 7 }}
          >
            <img
              src="/more-mind-brain.png"
              alt=""
              aria-hidden
              draggable={false}
              className="absolute pointer-events-none select-none dark:[filter:url(#more-brain-dark)]"
              style={{ top: 0, right: 0, width: 214, height: 169 }}
            />
            <span className="relative flex flex-col justify-center" style={{ minHeight: 169, padding: "16px 20px" }}>
              <span className="flex items-center" style={{ gap: 14 }}>
                <span className="text-[#32544D] dark:text-[#D5EAE5]" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  Mind
                </span>
                <ChevronRight size={18} strokeWidth={2.6} className="shrink-0 text-[#32544D] dark:text-[#D5EAE5]" />
              </span>
              <span className="block text-[#869595] dark:text-[#A5BDB9]" style={{ marginTop: 12, maxWidth: 160, fontSize: 17, fontWeight: 500, lineHeight: "22px" }}>
                Habits, journal &amp; meditation
              </span>
            </span>
          </button>

          <div className="grid grid-cols-3" style={{ gap: 9, marginBottom: 7 }}>
            {tiles.map((t) => (
              <button
                key={t.label}
                onClick={() => go(t)}
                className="tap flex flex-col items-center text-center bg-[#EBF5F2] dark:bg-[rgba(162,200,194,0.12)] animate-fade-slide-up"
                style={{ minHeight: 120, borderRadius: 14, padding: "18px 6px 12px" }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "#4F8F8A" }}>
                  <t.icon size={14} className="text-white" />
                </span>
                <span className="flex items-center justify-center text-charcoal" style={{ marginTop: 8, gap: 2, fontSize: 12.5, fontWeight: 700, lineHeight: "16px" }}>
                  {t.label}
                  <ChevronRight size={12} strokeWidth={2.6} className="shrink-0" />
                </span>
                <span className="text-[#8A9796] dark:text-[#9CB0AD]" style={{ marginTop: 2, fontSize: 10, lineHeight: "14px" }}>
                  {t.desc}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <div
        className="bg-[#F7F7FC] dark:bg-[rgba(174,161,220,0.10)] animate-fade-slide-up"
        style={{ borderRadius: 18, padding: "4px 0", marginBottom: 13 }}
      >
        {rows.map((r, i) => (
          <button
            key={r.label}
            onClick={() => go(r)}
            className="tap relative w-full flex items-center text-left"
            style={{ minHeight: 56.6, padding: "6.7px 15px 9.3px 14px", gap: 11 }}
          >
            {i > 0 && (
              <span
                aria-hidden
                className="absolute top-0 bg-[#EBEAF6] dark:bg-[rgba(174,161,220,0.16)]"
                style={{ left: 55, right: 15, height: 1 }}
              />
            )}
            <span className="flex items-center justify-center shrink-0" style={{ width: 30, height: 30, borderRadius: 10, background: "#8E7FD0" }}>
              <r.icon size={14} className="text-white" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-charcoal" style={{ fontSize: 12, fontWeight: 700, lineHeight: "16px" }}>
                {r.label}
              </span>
              <span className="block truncate" style={{ marginTop: 5, fontSize: 10, lineHeight: "13px", color: "#9A94B3" }}>
                {r.desc}
              </span>
            </span>
            <span className="flex items-center gap-2 shrink-0">
              {r.to === "/app/messages" && <UnreadBadge count={unread.total} />}
              <ChevronRight size={14} style={{ color: "#9A94B3" }} />
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={() => navigate("/app/subscription")}
        className="tap w-full flex items-center justify-between gap-3.5 rounded-[15px] px-[15px] py-[13px] text-left"
        // Literal #241F1B — not the theme-reactive `charcoal` token, which in
        // dark mode holds a near-white TEXT value rather than a fill colour
        // and would invert this into the one bright card among dark ones.
        style={{ background: "#241F1B" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: "rgba(174,161,220,.26)" }}>
            <PremiumLeafIcon size={15} style={{ color: "#C8BFE9" }} />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-white">Centium Premium</p>
            {/* Approved decision 9: the handover's MO1.4 wording. One line, as
                before: the frame wraps it, but its card is still 60 high with
                the second line 3px off the bottom edge (a wrap artifact; the
                frame note keeps Premium unchanged), and one line gives the
                same 60. */}
            <p className="text-[10px] text-white/60">AI logging, deeper insights &amp; rewards</p>
          </div>
        </div>
        <ChevronRight size={14} style={{ color: "#C8BFE9" }} className="shrink-0" />
      </button>

      <ReferralSheet open={referralOpen} onClose={() => setReferralOpen(false)} />
      {isProfessional && <PaymentsSheet open={paymentsOpen} onClose={() => setPaymentsOpen(false)} />}
      {isProfessional && <PublicListingSheet open={listingOpen} onClose={() => setListingOpen(false)} />}
    </div>
  );
}
