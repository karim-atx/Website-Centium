import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  Armchair,
  BarChart3,
  Bike,
  Dumbbell,
  Flag,
  Flame,
  Footprints,
  Gauge,
  HeartPulse,
  Leaf,
  Salad,
  Scale,
  Shield,
  Trophy,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { useWebLayout } from "../../components/web/useWebLayout";
import { Column, SecondaryGroups, type SecondaryGroup } from "../../components/web/WebSecondaryLayout";
import { BizButton, BizNote, BizRow, BizSection } from "../../components/business-more/kit";
import { PaneHeader, PaneWebOn } from "../../components/business-more/paneWeb";
import { usePanePad } from "../../components/business-more/paneWebScope";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { DataSharingSection } from "../../components/professionals/DataSharingSection";
import { ProfessionalCodeCard } from "../../components/profile/ProfessionalCodeCard";
import { CycleTrackingRow } from "../../components/profile/CycleTrackingRow";
import { HealthChecksSetting } from "../../components/health-checks/HealthChecksSetting";
import { LicencePendingTag } from "../../components/professionals/LicencePendingTag";
import { ReferralPopup } from "../../components/profile/ReferralPopup";
import { initials } from "../../components/professionals/typeColour";
import { SharingYourWinsRow } from "../../components/share/client/SharingYourWinsSheet";
import { fetchLinkedProfessionals, type LinkedProfessional } from "../../services/consent";
import type { ActivityLevel, Goal } from "../../types";
import { t, tk } from "../../i18n/core";
import More from "./More";

// Website viewport v1 · the client More column (handover section 4, Karim's
// decision 4; ST Settings Web ui "client": frames WC-MO_goals-default,
// _activity-level, _recovery-sensitive-experience, _connected-professionals,
// _professionals-empty). Every row of the mobile More has its own sidebar
// entry on web (Mind, Professionals, Community, Explore, Profile, Calendar,
// Messages, Referral, Settings, Centium Premium), so none is listed; the
// column holds the design's three groups instead: Training plan (Goals,
// Activity Level), Safety & content (Recovery-sensitive experience) and
// Professionals (Connected professionals). The pane edits each with the
// same data and saves as the mobile Profile's sheets and cards. No plan card
// (Premium is a sidebar entry). The selected item is ?item= (Goals first).
//
// The column is the shell's own (WebSecondaryLayout's Column and
// SecondaryGroups: 360 / 300, padding 24, title 28/36, grouped cards #F7F7FC
// r18, rows 60 with a 40 #8E7FD0 tile).

// The goal and activity options, as GoalsEditSheet and ActivityLevelSheet list them.
const GOALS: { value: Goal; label: string; icon: LucideIcon }[] = [
  { value: "lose_weight", label: tk("Lose weight"), icon: Scale },
  { value: "build_muscle", label: tk("Build muscle"), icon: Dumbbell },
  { value: "get_stronger", label: tk("Get stronger"), icon: TrendingUp },
  { value: "improve_nutrition", label: tk("Improve my nutrition"), icon: Salad },
  { value: "improve_fitness", label: tk("Improve my fitness"), icon: Activity },
  { value: "improve_health", label: tk("Improve my overall health"), icon: HeartPulse },
  { value: "track_health", label: tk("Track my health"), icon: BarChart3 },
  { value: "live_healthier", label: tk("Live healthier"), icon: Leaf },
];
/** Hidden while recovery-sensitive mode is on (GoalsEditSheet's triggeringGoals). */
const TRIGGERING: Goal[] = ["lose_weight"];
const LEVELS: { value: ActivityLevel; label: string; desc: string; icon: LucideIcon }[] = [
  { value: "sedentary", label: tk("Sedentary"), desc: tk("Little to no exercise"), icon: Armchair },
  { value: "light", label: tk("Lightly active"), desc: tk("1–3 workouts a week"), icon: Footprints },
  { value: "moderate", label: tk("Moderately active"), desc: tk("3–5 workouts a week"), icon: Bike },
  { value: "very_active", label: tk("Very active"), desc: tk("6–7 workouts a week"), icon: Flame },
  { value: "athlete", label: tk("Athlete"), desc: tk("Structured training daily"), icon: Trophy },
];

type Key = "goals" | "activity" | "recovery" | "pros";

const GoalsPane: React.FC = () => {
  const { user, updateProfile } = useApp();
  const hideNumbers = useHideNumbers();
  const [selected, setSelected] = useState<Goal[]>(user.goals);
  const visible = hideNumbers ? GOALS.filter((g) => !TRIGGERING.includes(g.value)) : GOALS;
  const toggle = (g: Goal) => setSelected((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  return (
    <>
      <PaneHeader title={t("Goals")} sub={goalLine(user.goals)} />
      <BizSection label={t("Edit Goals")}>
        {visible.map((g) => (
          <BizRow key={g.value} icon={g.icon} title={t(g.label)} radio={{ selected: selected.includes(g.value) }} onClick={() => toggle(g.value)} />
        ))}
      </BizSection>
      <BizButton label={t("Save")} disabled={selected.length === 0} onClick={() => updateProfile({ goals: selected.length ? selected : user.goals })} />
    </>
  );
};

const ActivityPane: React.FC = () => {
  const { user, updateProfile } = useApp();
  const [selected, setSelected] = useState<ActivityLevel>(user.activityLevel);
  return (
    <>
      <PaneHeader title={t("Activity Level")} sub={levelLabel(user.activityLevel)} />
      <BizSection label={t("Activity Level")}>
        {LEVELS.map((l) => (
          <BizRow key={l.value} icon={l.icon} title={t(l.label)} desc={t(l.desc)} radio={{ selected: selected === l.value }} onClick={() => setSelected(l.value)} />
        ))}
      </BizSection>
      <BizButton label={t("Save")} onClick={() => updateProfile({ activityLevel: selected })} />
    </>
  );
};

/** The mobile Profile's Safety & content card, as a pane: the switch and its lines, Cycle tracking and Health checks. */
const RecoveryPane: React.FC = () => {
  const { recoverySensitive, setRecoverySensitive, setRecoverySensitiveIntroSeen } = useApp();
  const navigate = useNavigate();
  const [justOn, setJustOn] = useState(false);
  return (
    <>
      <PaneHeader title={t("Recovery-sensitive experience")} sub={t("Safety & content")} />
      <BizSection label={t("Safety & content")}>
        <BizRow
          icon={Shield}
          title={t("Recovery-sensitive experience")}
          desc={
            recoverySensitive
              ? t("Personalize food tracking to reduce number-focused and potentially triggering content. Numbers like calories, weight and streaks are hidden, and you can change this at any time.")
              : undefined
          }
          toggle={{
            checked: recoverySensitive,
            label: t("Recovery-sensitive experience"),
            onChange: (v) => {
              setRecoverySensitive(v);
              if (v) {
                setJustOn(true);
                setRecoverySensitiveIntroSeen(false);
                window.setTimeout(() => setJustOn(false), 6000);
              }
            },
          }}
        />
      </BizSection>
      {justOn && (
        <p role="status" style={{ margin: 0, maxWidth: 640, borderRadius: 16, background: "#F0EDF9", padding: "12px 16px", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093" }}>
          {t("Your experience has been updated: calorie totals, weight-related content, deficit language, and streaks are hidden. Meal logging can focus on meals, notes, feelings, and hunger/fullness instead.")}
        </p>
      )}
      <BizNote>{t("Saved to your account, so it's the same on every device you sign in on. Professionals you work with are never told whether it's on.")}</BizNote>
      <p style={{ margin: "8px 0 0", maxWidth: "72ch", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
        {t("This isn't clinical care. If tracking feels unhelpful right now, consider discussing it with a")}{" "}
        <button type="button" onClick={() => navigate("/app/professionals")} className="underline hover:text-[#5F5093]" style={{ fontWeight: 600, color: "#7D67D9" }}>
          {t("professional")}
        </button>
        .
      </p>
      <div style={{ maxWidth: 640 }}>
        <CycleTrackingRow />
        <div style={{ marginTop: 16 }}>
          <HealthChecksSetting />
        </div>
      </div>
    </>
  );
};

const ProsPane: React.FC<{ pros: LinkedProfessional[]; reload: () => void }> = ({ pros, reload }) => {
  const { authUserId } = useApp();
  const [sharingFor, setSharingFor] = useState<LinkedProfessional | null>(null);
  return (
    <>
      <PaneHeader title={pros.length > 0 ? t("Connected professionals") : t("Professionals")} sub={pros.length > 0 ? t("Manage data sharing") : undefined} />
      {pros.length > 0 && (
        <BizSection label={t("Connected professionals")}>
          {pros.map((p) => (
            <BizRow
              key={p.professionalId}
              initials={initials(p.name)}
              title={p.name}
              desc={t("Manage data sharing")}
              extra={p.licenceVerified === false ? <LicencePendingTag className="mt-1" /> : undefined}
              onClick={() => setSharingFor(p)}
            />
          ))}
        </BizSection>
      )}
      {/* The repo's code box (preview, confirm, redeem) and "Sharing your wins", kept whole. */}
      <div style={{ maxWidth: 640 }}>
        <ProfessionalCodeCard onConnected={reload} />
        <SharingYourWinsRow me={authUserId} connectedCount={pros.length} className="mt-4" />
      </div>
      <BottomSheet open={!!sharingFor} onClose={() => setSharingFor(null)} title={t("Data sharing")}>
        {sharingFor && <DataSharingSection professionalId={sharingFor.professionalId} />}
      </BottomSheet>
    </>
  );
};

const goalLine = (goals: Goal[]) =>
  GOALS.filter((g) => goals.includes(g.value))
    .map((g) => t(g.label))
    .join(", ");
const levelLabel = (l: ActivityLevel) => {
  const found = LEVELS.find((x) => x.value === l);
  return found ? t(found.label) : "";
};

function ClientMoreWeb() {
  const { user, authUserId } = useApp();
  const { rail } = useWebLayout();
  const pad = usePanePad();
  const [params, setParams] = useSearchParams();
  const [pros, setPros] = useState<LinkedProfessional[]>([]);
  const customer = user.accountType === "customer";
  // ?open=referral (an ambassador notice) opens the Referral popup, as on mobile; ?open=recovery the Safety & content pane.
  const [referralOpen, setReferralOpen] = useState(() => params.get("open") === "referral");

  const load = () => {
    void fetchLinkedProfessionals().then((r) => r.status === "ok" && setPros(r.professionals));
  };
  useEffect(() => {
    if (!customer || !authUserId) return;
    let cancelled = false;
    void fetchLinkedProfessionals().then((r) => !cancelled && r.status === "ok" && setPros(r.professionals));
    return () => {
      cancelled = true;
    };
  }, [customer, authUserId]);

  const goals = goalLine(user.goals);
  const level = levelLabel(user.activityLevel);
  const groups: SecondaryGroup[] = [
    {
      label: tk("Training plan"),
      items: [
        { key: "goals", label: tk("Goals"), desc: goals, descTitle: goals, icon: Flag },
        { key: "activity", label: tk("Activity Level"), desc: level, descTitle: level, icon: Gauge },
      ],
    },
    { label: tk("Safety & content"), items: [{ key: "recovery", label: tk("Recovery-sensitive experience"), desc: t("Safety & content"), descTitle: t("Safety & content"), icon: Shield }] },
    ...(customer
      ? [
          {
            label: tk("Professionals"),
            items: [{ key: "pros", label: pros.length > 0 ? tk("Connected professionals") : tk("Professionals"), desc: t("Manage data sharing"), descTitle: t("Manage data sharing"), icon: Users, badge: pros.length }],
          },
        ]
      : []),
  ];
  const keys = groups.flatMap((g) => g.items.map((i) => i.key as Key));
  const asked = (params.get("open") === "recovery" ? "recovery" : params.get("item")) as Key | null;
  const selected: Key = asked && keys.includes(asked) ? asked : "goals";
  const pick = (k: Key) => setParams(k === "goals" ? {} : { item: k }, { replace: true });

  return (
    <div className="flex overflow-hidden" style={{ height: "100dvh" }} data-web-frame="client-more">
      <Column title={t("More")} secW={rail ? 300 : 360}>
        <SecondaryGroups title={t("More")} groups={groups} selected={selected} navPb={24} onSelect={(it) => pick(it.key as Key)} />
      </Column>
      <div className="flex-1 min-w-0 h-full overflow-y-auto" style={{ scrollbarWidth: "thin" }} data-web-pane>
        <PaneWebOn>
          <div
            key={selected}
            className="flex flex-col [&>*+*]:mt-[28px] [&>[data-pane-label]+*]:mt-0"
            style={{ maxWidth: 880, boxSizing: "border-box", padding: `${pad.top}px ${pad.x}px ${pad.bottom}px` }}
          >
            {selected === "goals" && <GoalsPane />}
            {selected === "activity" && <ActivityPane />}
            {selected === "recovery" && <RecoveryPane />}
            {selected === "pros" && <ProsPane pros={pros} reload={load} />}
          </div>
        </PaneWebOn>
      </div>
      <ReferralPopup
        open={referralOpen}
        onClose={() => {
          setReferralOpen(false);
          if (params.has("open")) setParams({}, { replace: true });
        }}
      />
    </div>
  );
}

/** /app/more from 1024px: the client More column and pane; business and professional accounts keep their own. */
export default function MoreWeb() {
  const { user } = useApp();
  if (user.accountType === "business" || user.accountType === "professional") return <More />;
  return <ClientMoreWeb />;
}
