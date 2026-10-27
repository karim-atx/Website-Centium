import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Lock } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { useApp } from "../../context/AppContext";
import { ListSkeleton, ProError } from "../pro/states";
import { proClientPath, type ProLane } from "../pro/subtypeLanes";
import { typeLabel } from "../pro/profile/typeLabel";
import { averageOf, priceLabel, reviewerLabel } from "../pro/profile/profileModel";
import { useReviewsAboutMe } from "../../hooks/useProfessionalReviews";
import { useMyCv } from "../cv/useMyCv";
import { fetchMyProfile } from "../../services/professional-profile";
import { fetchPracticeTotals, type PracticeTotals } from "../../services/pro/practiceInsights";
import { fetchCategories } from "../../services/forum";
import { fetchAllWins, fetchMyPosts, fetchPromoItems, fetchWeekSlots, type MyPost, type PromoItem } from "../../services/share/sources";
import type { ItemKind } from "../../services/share";
import { GroupLabel, LockNote, PickRow, SHARE_ICONS } from "./shareKit";
import { ShareFlow } from "./ShareFlow";
import { useSharePro } from "./useSharePro";
import {
  clipQuote,
  fmtInt,
  milestoneCard,
  profileCard,
  promoCard,
  reachedMilestone,
  reviewCard,
  shareableWins,
  slotsCard,
  tipCard,
  winRowText,
  type CardSpec,
  type CardStat,
  type ClientWin,
  type WinKind,
  type WinSharingSetting,
} from "./shareCardModel";
import { fetchClientStages } from "../../services/pro/clients";

type Step = { at: "menu" } | { at: "wins"; kinds: WinKind[]; title: string } | { at: "reviews" } | { at: "promo" } | { at: "posts" };
type Flow = { spec: CardSpec; kind: ItemKind };

const inMonth = (iso: string, now: Date) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Release 3 · W8 SH4 "What do you want to share?" (source/gen/r31.js
 * picker31), a BottomSheet over Public profile: "Pick what to turn into a
 * card. You'll choose the format and style next." (12.5 / 1.5 text.soft);
 * the client-wins group (Full coaching, Nutrition only: the client is asked
 * first, so a win opens that client's page where the ask is made); "Your
 * practice": Practice milestone, A review, Your profile, A programme (or meal
 * plan), course or package (not Clinical overview), Open slots, A Community
 * post; the lock note. Rows: 32 r10 tiles, 14 / 600, 11 text.faint, chevron.
 *
 * Karim's answer 4: Nutrition's wins are the logging streak and a meal plan
 * completed (the frame's "Meal-plan adherence · 87%" is not drawn).
 * Addition: "Profile link" opens MO15 Share profile (kept), since this sheet
 * now sits where its Share button was.
 */
export const WhatToShareSheet: React.FC<{ open: boolean; onClose: () => void; lane: ProLane; onProfileLink?: () => void }> = ({ open, onClose, lane, onProfileLink }) => {
  const { authUserId, user, professionalClients } = useApp();
  const navigate = useNavigate();
  const pro = useSharePro();
  const { reviews, loading: reviewsLoading } = useReviewsAboutMe();
  const { cv } = useMyCv();
  const [step, setStep] = useState<Step>({ at: "menu" });
  const [flow, setFlow] = useState<Flow | null>(null);
  const [wins, setWins] = useState<ClientWin[] | null | "error">(null);
  // 815efc5 W8-2: a Never allow client's wins aren't offered (a failed read hides nothing; ask_to_share_win still refuses).
  const [sharing, setSharing] = useState<Map<string, WinSharingSetting>>(new Map());
  const [totals, setTotals] = useState<PracticeTotals | null | undefined | "error">(undefined);
  const [slots, setSlots] = useState<string[] | null | undefined | "error">(undefined);
  const [promo, setPromo] = useState<PromoItem[] | null | "error">(null);
  const [posts, setPosts] = useState<MyPost[] | null | "error">(null);
  const [cats, setCats] = useState<Map<string, string>>(new Map());
  const [own, setOwn] = useState<{ location: string | null; specialty: string | null; monthlyRate: number | null; consultationRate: number | null } | null>(null);
  const clinical = lane === "clinical_overview";
  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    if (!open || !authUserId) return;
    let live = true;
    if (!clinical)
      void Promise.all([fetchAllWins(), fetchClientStages()]).then(([r, s]) => {
        if (!live) return;
        if (s.ok) setSharing(new Map(s.data.map((x) => [x.clientId, x.winSharing])));
        setWins(r.ok ? r.data : "error");
      });
    void fetchPracticeTotals().then((r) => live && setTotals(r.ok ? r.data : "error"));
    void fetchWeekSlots(authUserId, new Date()).then((r) => live && setSlots(r.ok ? r.data : "error"));
    void fetchMyProfile(authUserId).then((r) => live && r.ok && r.profile && setOwn(r.profile));
    return () => {
      live = false;
    };
  }, [open, authUserId, clinical]);

  const loadPromo = () => {
    if (!authUserId || clinical) return;
    setPromo(null);
    void fetchPromoItems(authUserId, lane === "nutrition" ? "nutrition" : "full_coaching").then((r) => setPromo(r.ok ? r.data : "error"));
  };
  const loadPosts = () => {
    setPosts(null);
    void fetchCategories().then((r) => r.ok && setCats(new Map(r.value.map((c) => [c.key, c.name]))));
    void fetchMyPosts().then((r) => setPosts(r.ok ? r.data : "error"));
  };

  const close = () => {
    setStep({ at: "menu" });
    setFlow(null);
    onClose();
  };

  const nameOf = (clientId: string) => professionalClients.find((c) => c.clientId === clientId)?.name ?? "A client";
  const monthWins = Array.isArray(wins) ? shareableWins(wins, sharing).filter((w) => inMonth(w.occurredAt, now)) : [];
  const of = (kinds: WinKind[]) => monthWins.filter((w) => kinds.includes(w.kind));
  const winGroups: { kinds: WinKind[]; label: string; icon: keyof typeof SHARE_ICONS; tone: "gold" | "pr" | "teal"; sub: () => string }[] =
    lane === "nutrition"
      ? [
          { kinds: ["logging_streak"], label: "Logging streak", icon: "leaf", tone: "teal", sub: () => `${plural(of(["logging_streak"]).length, "milestone", "milestones")} this month` },
          { kinds: ["meal_plan_complete"], label: "Meal plan complete", icon: "flag", tone: "pr", sub: () => `${plural(new Set(of(["meal_plan_complete"]).map((w) => w.clientId)).size, "client", "clients")} this month` },
        ]
      : [
          {
            kinds: ["pr"],
            label: "Strength PR",
            icon: "trophy",
            tone: "gold",
            sub: () => {
              const w = of(["pr"])[0];
              const t = w ? winRowText(w) : null;
              return w && t ? `${nameOf(w.clientId)} · ${t.title.replace(/^New PR · /, "")}` : "No PRs this month";
            },
          },
          { kinds: ["programme_complete"], label: "Programme complete", icon: "flag", tone: "pr", sub: () => `${plural(new Set(of(["programme_complete"]).map((w) => w.clientId)).size, "client", "clients")} this month` },
          { kinds: ["streak", "logging_streak", "consistency"], label: "Streak or consistency", icon: "leaf", tone: "teal", sub: () => `${plural(of(["streak", "logging_streak", "consistency"]).length, "milestone", "milestones")} this month` },
        ];

  const t = totals && totals !== "error" ? totals : null;
  const milestone = t ? reachedMilestone(t.sessionsDelivered) : null;
  const avg = averageOf(reviews);
  const counted = reviews.filter((r) => !r.redactedAt);
  const published = counted.filter((r) => (r.body ?? "").trim());

  const openMilestone = () => {
    if (!t || milestone == null) return;
    setFlow({ spec: milestoneCard({ ...t, sessionsDelivered: milestone }), kind: "milestone" });
  };
  const openProfile = () => {
    const rate = own?.monthlyRate ? { value: priceLabel(own.monthlyRate), label: "a month" } : own?.consultationRate ? { value: priceLabel(own.consultationRate), label: "a session" } : null;
    setFlow({
      spec: profileCard({
        name: pro?.name ?? user.firstName ?? "",
        eyebrow: lane === "full_coaching" ? "Train with me" : "Work with me",
        headline: cv?.profile.headline?.trim() || own?.specialty || null,
        role: [typeLabel(user.professionalSubtype), own?.location].filter(Boolean).join(" · "),
        averageRating: counted.length >= 1 ? avg : null,
        reviewCount: counted.length,
        clients: t ? t.clientsCoached : null,
        price: rate,
      }),
      kind: "profile",
    });
  };
  const openSlots = () => {
    if (!Array.isArray(slots) || !slots.length) return;
    setFlow({ spec: slotsCard(slots, own?.location ?? null), kind: "slot" });
  };
  const openPromo = (p: PromoItem) => {
    const stats: CardStat[] = [];
    if (p.kind === "course") {
      stats.push({ key: "price", value: priceLabel(p.price ?? 0), label: "full course" });
      if (p.lessons) stats.push({ key: "course_lessons", value: String(p.lessons), label: p.lessons === 1 ? "lesson" : "lessons" });
      if (p.rating != null && (p.ratings ?? 0) > 0) stats.push({ key: "rating", value: p.rating.toFixed(1), label: plural(p.ratings ?? 0, "rating", "ratings") });
    }
    if (p.kind === "package") {
      stats.push({ key: "price", value: priceLabel(p.price ?? 0), label: p.priceIsMonthly === "monthly" ? "a month" : "per period" });
      if (p.sessions) stats.push({ key: "package_sessions", value: String(p.sessions), label: p.sessions === 1 ? "session" : "sessions" });
    }
    if (p.kind === "programme" && p.weeks) stats.push({ key: "programme_weeks", value: String(p.weeks), label: p.weeks === 1 ? "week" : "weeks" });
    const meta = p.kind === "course" ? [plural(p.weeks ?? 0, "week", "weeks"), p.level].filter(Boolean).join(" · ") : p.kind === "programme" ? [p.level].filter(Boolean).join(" · ") || "Programme" : p.kind === "meal_plan" ? `${plural(p.days ?? 0, "day", "days")} plan` : plural(p.sessions ?? 0, "session", "sessions");
    setFlow({ spec: promoCard({ kind: p.kind, title: p.title, meta, stats }), kind: p.kind });
  };

  const back = () => setStep({ at: "menu" });

  const list = (items: { id: string; label: string; sub: string; icon: keyof typeof SHARE_ICONS; tone: "gold" | "pr" | "teal"; onClick: () => void }[] | null | "error", empty: string, retry: () => void) =>
    items === "error" ? (
      <ProError onRetry={retry} />
    ) : items === null ? (
      <ListSkeleton rows={3} />
    ) : items.length === 0 ? (
      <p style={{ fontSize: textPx(12.5), color: INK.chF, padding: "12px 0" }}>{empty}</p>
    ) : (
      <div>
        {items.map((x) => (
          <PickRow key={x.id} icon={SHARE_ICONS[x.icon]} tone={x.tone} label={x.label} sub={x.sub} onClick={x.onClick} />
        ))}
      </div>
    );

  let title = "What do you want to share?";
  let body: React.ReactNode;
  if (step.at === "wins") {
    title = step.title;
    const ws = of(step.kinds);
    body = (
      <>
        <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS, marginBottom: 10 }}>The client is asked first. Pick a win to open it on the client's page.</p>
        {list(
          wins === "error" ? "error" : wins === null ? null : ws.map((w) => {
            const rt = winRowText(w);
            return { id: w.winId, label: rt?.title ?? "", sub: nameOf(w.clientId), icon: rt?.icon ?? "trophy", tone: rt?.tone ?? "pr", onClick: () => {
              close();
              navigate(proClientPath(w.clientId, "progress"));
            } };
          }),
          "No wins of this kind this month.",
          () => void fetchAllWins().then((r) => setWins(r.ok ? r.data : "error"))
        )}
      </>
    );
  } else if (step.at === "reviews") {
    title = "A review";
    body = list(
      reviewsLoading && !reviews.length ? null : published.map((r) => ({ id: r.id, label: `"${clipQuote(r.body ?? "", 60)}"`, sub: `${reviewerLabel(r.reviewerName)} · ${r.rating} star${r.rating === 1 ? "" : "s"}`, icon: "star" as const, tone: "gold" as const, onClick: () => setFlow({ spec: reviewCard({ rating: r.rating, body: clipQuote(r.body ?? ""), reviewer: reviewerLabel(r.reviewerName) }), kind: "review" }) })),
      "Written reviews show here after clients review you.",
      () => undefined
    );
  } else if (step.at === "promo") {
    title = lane === "nutrition" ? "A meal plan, course or package" : "A programme, course or package";
    body = list(
      promo === "error" ? "error" : promo === null ? null : promo.map((p) => ({ id: `${p.kind}-${p.id}`, label: p.title, sub: p.sub, icon: "book-open" as const, tone: "pr" as const, onClick: () => openPromo(p) })),
      "Your programmes, published courses and packages show here.",
      loadPromo
    );
  } else if (step.at === "posts") {
    title = "A Community post";
    body = list(
      posts === "error" ? "error" : posts === null ? null : posts.map((p) => ({ id: p.id, label: p.title || clipQuote(p.body, 60), sub: cats.get(p.categoryKey) ?? "Community", icon: "lightbulb" as const, tone: "gold" as const, onClick: () => setFlow({ spec: tipCard((user.firstName ?? "").split(" ")[0] || "me", clipQuote(p.body), cats.get(p.categoryKey) ?? null), kind: "content" }) })),
      "Posts you publish in the Community under your name show here.",
      loadPosts
    );
  } else {
    body = (
      <>
        <p style={{ fontSize: textPx(12.5), lineHeight: 1.5, color: INK.chS }}>Pick what to turn into a card. You'll choose the format and style next.</p>
        {!clinical && (
          <>
            <GroupLabel>Client wins · the client is asked first</GroupLabel>
            {wins === "error" ? (
              <ProError onRetry={() => void fetchAllWins().then((r) => setWins(r.ok ? r.data : "error"))} />
            ) : (
              winGroups.map((g) => (
                <PickRow key={g.label} icon={SHARE_ICONS[g.icon]} tone={g.tone} label={g.label} sub={wins === null ? "Loading…" : g.sub()} onClick={() => setStep({ at: "wins", kinds: g.kinds, title: g.label })} />
              ))
            )}
          </>
        )}
        <GroupLabel>Your practice</GroupLabel>
        <PickRow
          icon={SHARE_ICONS.trophy}
          tone="pr"
          label="Practice milestone"
          sub={totals === undefined ? "Loading…" : milestone != null ? `${fmtInt(milestone)} sessions delivered` : "Shows after your first 10 sessions"}
          onClick={milestone != null ? openMilestone : undefined}
        />
        <PickRow icon={SHARE_ICONS.star} tone="gold" label="A review" sub="From your public reviews" onClick={() => setStep({ at: "reviews" })} />
        <PickRow icon={SHARE_ICONS["user-round"]} tone="teal" label="Your profile" sub="Card with your QR code" onClick={pro ? openProfile : undefined} />
        {onProfileLink && <PickRow icon={Link2} tone="teal" label="Profile link" sub="Copy or send your link" onClick={onProfileLink} />}
        {!clinical && (
          <PickRow
            icon={SHARE_ICONS["book-open"]}
            tone="pr"
            label={lane === "nutrition" ? "A meal plan, course or package" : "A programme, course or package"}
            sub="From your Library"
            onClick={() => {
              loadPromo();
              setStep({ at: "promo" });
            }}
          />
        )}
        <PickRow
          icon={SHARE_ICONS["calendar-days"]}
          tone="teal"
          label="Open slots"
          sub={slots === undefined ? "Loading…" : slots === "error" ? "Couldn't load your availability" : slots === null ? "Add a session type to show open slots" : slots.length ? "From your availability" : "No open slots left this week"}
          onClick={Array.isArray(slots) && slots.length ? openSlots : undefined}
        />
        <PickRow
          icon={SHARE_ICONS.lightbulb}
          tone="gold"
          label="A Community post"
          sub="Your published tips"
          onClick={() => {
            loadPosts();
            setStep({ at: "posts" });
          }}
        />
        <LockNote icon={Lock}>
          {clinical
            ? "Clinical overview shares only your profile, reviews, availability and Community posts. Results, vitals, diagnoses, care plans and medications are never shareable."
            : "Health records, results, vitals, diagnoses, care plans and medications are never shareable."}
        </LockNote>
      </>
    );
  }

  return (
    <>
      <BottomSheet open={open && !flow} onClose={close} onBack={step.at === "menu" ? undefined : back} title={title} size="tall" titleWrap>
        {body}
      </BottomSheet>
      {flow && pro && <ShareFlow open onClose={close} spec={flow.spec} pro={pro} kind={flow.kind} />}
    </>
  );
};
