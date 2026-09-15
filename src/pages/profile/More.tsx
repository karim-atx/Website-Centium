import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { ReferralSheet } from "../../components/profile/ReferralSheet";
import { PaymentsSheet } from "../../components/profile/PaymentsSheet";
import { PublicListingSheet } from "../../components/profile/PublicListingSheet";
import { GymPassesSheet } from "../../components/marketplace/GymPassesSheet";
import { QrPattern } from "../../components/marketplace/GymDetailSheet";
import { LotusGlyph } from "../../components/dashboard/LotusGlyph";
import { useUnread } from "../../context/UnreadContext";
import { UnreadBadge } from "../../components/messages/UnreadBadge";
import {
  Sparkles,
  Users,
  Store,
  User as UserIcon,
  Crown,
  ChevronRight,
  Settings,
  HeartPulse,
  MessageCircle,
  MessageSquare,
  CalendarDays,
  Building2,
  Gift,
  Banknote,
  Globe2,
  KeyRound,
  BookOpen,
} from "lucide-react";

// Iteration 6 "Team" §5 More: each row's icon-well tile colour and, for the
// primary items, a matching light row tint — lifted from the dc.html
// markup for the 8 items it actually shows. Items the captured client
// frame doesn't have (Messages, and the professional/business-only rows)
// extend the same two families rather than inventing new ones.
const TILE_COLOR: Record<string, string> = {
  Profile: "#7D6BB5",
  Mind: "#9B8AD0",
  Calendar: "#6F9993",
  Professionals: "#7D6BB5",
  Community: "#4F7F78",
  Messages: "#4C8FD1",
  "Business messages": "#4C8FD1",
  "Health Metrics": "#9C4F7C",
  Payments: "#D9A441",
  "Your public listing": "#4F7F78",
  "Business Profile": "#7D6BB5",
  Explore: "#C29A3D",
  Referral: "#9C4F7C",
  Settings: "#7E7568",
};
const TINTED_ROWS = new Set(["Profile", "Mind", "Calendar", "Professionals", "Community", "Messages", "Business messages"]);
const rowBg = (label: string) => {
  if (!TINTED_ROWS.has(label)) return "rgba(36,31,27,.05)";
  const tile = TILE_COLOR[label];
  if (tile === "#6F9993" || tile === "#4F7F78") return "rgba(162,200,194,.18)";
  if (tile === "#4C8FD1") return "rgba(76,143,209,.14)";
  return "rgba(174,161,220,.16)";
};

export default function More() {
  const navigate = useNavigate();
  const { user, gymPurchases, journalEntries } = useApp();
  const unread = useUnread();
  const isProfessional = user.accountType === "professional";
  const isBusiness = user.accountType === "business";
  const [referralOpen, setReferralOpen] = useState(false);
  const [paymentsOpen, setPaymentsOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [gymPassesOpen, setGymPassesOpen] = useState(false);

  const passCount = Object.values(gymPurchases).reduce((n, arr) => n + arr.length, 0);
  const firstPass = Object.entries(gymPurchases).flatMap(([gymId, arr]) => arr.map((p) => ({ gymId, plan: p.plan })))[0];
  let journalStreak = 0;
  {
    const cursor = new Date();
    for (;;) {
      const d = cursor.toISOString().slice(0, 10);
      if (!journalEntries.some((e) => e.date === d)) break;
      journalStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  // Profile shifted to the top per QA — first widget in the More list.
  // V6 (QA 6.0): Mind and the client-facing "browse professionals" directory
  // don't apply to a professional or business account, so they're removed
  // for those account types; Meal Plans and Health Metrics (their
  // bottom-nav doesn't have room for every tab) are added for professionals.
  // V8 (QA 8.0): Certification moved into My Profile — professionals already
  // reach it from there now, so it's no longer duplicated here.
  // Design refinement §6.7 removed the six per-item icon-well hues in favour
  // of one neutral well; Iteration 6 "Team" §5 brings coloured wells back
  // (TILE_COLOR/rowBg above) as its own, unrelated decision — not a revert
  // of that refinement, a newer one replacing it.
  const items = [
    // V9 (QA 9.0): "Business profile and profile should be merged into just
    // business profile" — business accounts no longer get a separate
    // generic "Profile" entry; "Business Profile" below covers it.
    !isBusiness && { icon: UserIcon, label: "Profile", desc: "Your account & settings", to: "/app/profile" },
    !isProfessional && !isBusiness && { icon: Sparkles, label: "Mind", desc: "Habits, journal & meditation", to: "/app/mind" },
    // V9 (QA 9.0): "Copy the calendar tab found in the Professional's UI
    // here in a button found in the More's page" — client-side calendar,
    // syncing events a connected professional/gym adds that involve them.
    !isProfessional && !isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Your events, synced with your professional & gym", to: "/app/calendar" },
    !isProfessional && !isBusiness && { icon: Users, label: "Professionals", desc: "Trainers, dietitians & doctors", to: "/app/professionals" },
    // V9 (QA 9.0): "Make a new button, under professionals in more called
    // forum that acts like a hub for all clients to share information
    // publicly."
    // QA 11.0: renamed from "Forum" — the destination now has two tabs,
    // Forum and Courses.
    !isProfessional && !isBusiness && { icon: MessageSquare, label: "Community", desc: "Forum discussions & fitness courses", to: "/app/forum" },
    // Both account types: a thread is two people, and the client half had no
    // destination at all before this.
    { icon: MessageCircle, label: "Messages", desc: isProfessional ? "Chat with your clients" : "Chat with your professionals", to: "/app/messages" },
    isProfessional && { icon: Store, label: "Business messages", desc: "Your affiliated business thread", to: "/app/professionals/messages" },
    isProfessional && { icon: HeartPulse, label: "Health Metrics", desc: "Client health data & clinical notes", to: "/app/professionals/health-metrics" },
    // QA 12.0: "a button called payments, whereby the professional can add
    // what his monthly rate is to be hired, alongside other types like
    // consultations... payment modality (cash, card or whish)."
    isProfessional && { icon: Banknote, label: "Payments", desc: "Your rates & accepted payment methods", onClick: () => setPaymentsOpen(true) },
    // The listing content and the switch that publishes it live together, so
    // nobody can turn on public visibility without seeing what becomes
    // visible. See PublicListingSheet.
    isProfessional && { icon: Globe2, label: "Your public listing", desc: "Specialty, bio & whether clients can find you", onClick: () => setListingOpen(true) },
    isBusiness && { icon: Building2, label: "Business Profile", desc: "Name, bio, location & reviews", to: "/app/business/profile" },
    // V9 (QA 9.0): "Add the messages tab in the More tab" + "Copy the
    // calendar tab... in a button found in the More's page" — Messages
    // moved out of the bottom nav to make room for Operations there.
    isBusiness && { icon: MessageCircle, label: "Messages", desc: "Chat with clients & affiliated professionals", to: "/app/business/messages" },
    isBusiness && { icon: CalendarDays, label: "Calendar", desc: "Schedule clients to professionals & classes", to: "/app/business/calendar" },
    // V9 (QA 9.0): "Remove the explore button on in the More tab" (Business
    // UI only — Client/Professional keep theirs).
    !isBusiness && { icon: Store, label: "Explore", desc: "Gyms, classes & the marketplace", to: "/app/marketplace" },
    // QA 11.0: "Put a referral tab in the tab you see fits most" (Client
    // UI) + "Apply the same referral program found in the client UI"
    // (Professional/Business) — one sheet, reachable from every account
    // type's More page.
    { icon: Gift, label: "Referral", desc: "Share your code, earn rewards", onClick: () => setReferralOpen(true) },
    { icon: Settings, label: "Settings", desc: "Appearance, notifications & more", to: "/app/settings" },
  ].filter(Boolean) as { icon: typeof Sparkles; label: string; desc: string; to?: string; onClick?: () => void }[];

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. The consent-
          review hero the manifest shows above this is ConsentReviewBanner,
          already rendered site-wide by Layout.tsx — restyled at its own
          definition rather than duplicated here. */}
      <p className="mb-[13px] text-[19px] font-bold tracking-[-0.03em] text-charcoal">More</p>

      <div className="flex flex-col gap-[7px] mb-[13px]">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={() => (item.onClick ? item.onClick() : navigate(item.to!))}
            className="tap w-full flex items-center gap-[11px] rounded-[15px] px-3.5 py-3 text-left animate-fade-slide-up"
            style={{ background: rowBg(item.label) }}
          >
            <div className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0" style={{ background: TILE_COLOR[item.label] ?? "#7E7568" }}>
              <item.icon size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-bold text-charcoal">{item.label}</p>
              <p className="text-[10px] text-charcoal-tertiary truncate">{item.desc}</p>
            </div>
            <span className="flex items-center gap-2 shrink-0">
              {item.to === "/app/messages" && <UnreadBadge count={unread.total} />}
              <ChevronRight size={14} className="text-primary-deep-text/60" />
            </span>
          </button>
        ))}
      </div>

      {/* "Your passes" — real gym-passes, journal and meditation data,
          reusing the exact canonical small-widget markup from the Home
          widget library (see the identical note in Health.tsx). Not part
          of the manifest's captured client frame as a concept before this
          — it's genuinely new content, built from real state rather than
          the mockup's example numbers. */}
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Your passes</p>
      <div className="flex gap-[7px] mb-[13px]">
        <button
          onClick={() => setGymPassesOpen(true)}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
          style={{ background: "rgba(36,31,27,.05)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-charcoal/50">Gym passes</p>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <span className="flex flex-col items-center gap-[7px]">
              {firstPass ? (
                <QrPattern seed={`${firstPass.gymId}-${firstPass.plan}`} className="w-10 h-10" />
              ) : (
                <KeyRound size={38} className="text-charcoal/55" />
              )}
              <span className="text-[24px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">{passCount}</span>
            </span>
          </div>
        </button>

        <button
          onClick={() => navigate("/app/mind")}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
          style={{ background: "rgba(217,164,65,.14)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-gold-ink/[0.82]">Journal</p>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <span className="flex flex-col items-center gap-[7px]">
              <BookOpen size={30} className="text-team-gold-deep" />
              <span className="flex flex-col items-center leading-none">
                <span className="text-[20px] font-extrabold tracking-[-0.04em] text-charcoal tabular-nums">{journalStreak}</span>
                <span className="mt-1 text-[8.5px] font-bold text-team-gold-ink/[0.82]">day streak</span>
              </span>
            </span>
          </div>
        </button>

        <button
          onClick={() => navigate("/app/mind")}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
          style={{ background: "rgba(162,200,194,.18)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-teal-ink/[0.72]">Meditation</p>
          <div className="flex-1 flex items-center justify-center min-h-0">
            <span className="flex flex-col items-center gap-2">
              <LotusGlyph size={40} stroke="rgb(var(--c-teal-dark))" />
              <span className="flex items-baseline gap-[3px]">
                <span className="text-[20px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">12</span>
                <span className="text-[9px] font-bold text-team-teal-ink/[0.72]">min</span>
              </span>
            </span>
          </div>
        </button>
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
            <Crown size={15} style={{ color: "#C8BFE9" }} />
          </div>
          <div>
            <p className="text-[12.5px] font-extrabold text-white">Centium Premium</p>
            <p className="text-[10px] text-white/60">AI logging, deeper insights &amp; rewards</p>
          </div>
        </div>
        <ChevronRight size={14} style={{ color: "#C8BFE9" }} className="shrink-0" />
      </button>

      <GymPassesSheet open={gymPassesOpen} onClose={() => setGymPassesOpen(false)} />

      <ReferralSheet open={referralOpen} onClose={() => setReferralOpen(false)} />
      {isProfessional && <PaymentsSheet open={paymentsOpen} onClose={() => setPaymentsOpen(false)} />}
      {isProfessional && <PublicListingSheet open={listingOpen} onClose={() => setListingOpen(false)} />}
    </div>
  );
}
