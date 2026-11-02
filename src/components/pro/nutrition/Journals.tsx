import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, MessageCircle, Repeat, Send, ThumbsUp } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useClientAccess } from "../../../hooks/useClientAccess";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { INK, NO_ICON_SCALE } from "../proInk";
import { Avatar } from "../client/kit";
import { LockLine } from "../LockLine";
import { EmptyState } from "../EmptyState";
import { ComingSoonPill } from "../ComingSoon";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../states";
import { todayLocal } from "../../../utils/date";
import { askToShare } from "../../../services/pro/clientPage";
import {
  FEEDBACK_MAX,
  commentOnEntry,
  fetchClientGoal,
  fetchConflicts,
  fetchDiary,
  fetchMyFeedback,
  fetchMyTargets,
  type DiaryEntry,
  type Feedback,
  type Reaction,
} from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import { DietStrip, Flag, NuHead } from "./kit";
import { useDietaryNeeds, useNuRoster } from "./hooks";
import { useNutritionOverview, JOURNAL_DAYS } from "./useNutritionOverview";
import { SLOT_LABEL, SLOT_ORDER, dayDate, dayRange, daysAgo, journalBox, shiftDate, worstConflict, type ConflictRow, type QueueRow } from "./nutritionModel";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn, tx } from "../../../i18n/core";

/**
 * Release 3 · NU5 v2 "Food journal review queue" (source gen r6c.js
 * nuQueue6, r7.js nuQueue7): head "To review" / "Food journals", the
 * Waiting {n} / Reviewed tabs (36 high, 12), then a card per client (r20,
 * pad 12 14, avatar 38, name 14 / 700, when 11 text.tertiary, "{n} days
 * logged · {range}" 12 text.soft, the flag line 11.5).
 *
 * The diary reaches the professional only through the Food diary switch
 * (RLS on food_log_entries); a client who doesn't share it never appears.
 * A logged day is "reviewed" once you've left feedback on any of its entries:
 * the database has no review state of its own ("Mark reviewed" and the note
 * for the whole day are a backend gap, Coming soon).
 */
export const JournalQueue: React.FC<{ lane: ProLane; onBack: () => void; onOpen: (clientId: string, day: string) => void }> = ({ lane, onBack, onOpen }) => {
  const o = useNutritionOverview(lane);
  const [tab, setTab] = useState<"waiting" | "reviewed">("waiting");
  const today = todayLocal();
  const rows = tab === "waiting" ? o.waiting : o.reviewed;
  const byId = new Map(o.clients.map((c) => [c.clientId, c]));
  const targetOf = (id: string) => o.targets[id] ?? null;
  return (
    <div>
      <NuHead eyebrow={t("To review")} title={t("Food journals")} onBack={onBack} />
      <SegmentedTabs
        className="mb-3"
        tabHeight={36}
        labelSize={12}
        items={[
          { key: "waiting", label: o.loading ? t("Waiting") : t("Waiting {n}", { n: o.waiting.length }) },
          { key: "reviewed", label: tx("Reviewed", "journal") },
        ]}
        activeKey={tab}
        onChange={(k) => setTab(k as "waiting" | "reviewed")}
      />
      {o.error && o.offline && <OfflineLine />}
      {o.error && !o.offline && (
        <div style={{ marginBottom: 12 }}>
          <ProError onRetry={o.retry} />
        </div>
      )}
      {o.loading ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title={tab === "waiting" ? t("Nothing to review") : t("Nothing reviewed yet")}
          line={tab === "waiting" ? t("Days your clients log show here when they share their food diary with you.") : t("Days you've left feedback on show here.")}
        />
      ) : (
        rows.map((r) => {
          const c = byId.get(r.clientId);
          if (!c) return null;
          return <QueueCard key={r.clientId} row={r} name={c.name} avatarUrl={c.avatarUrl} today={today} hasTarget={!!targetOf(r.clientId)} onOpen={() => onOpen(r.clientId, r.lastDay)} />;
        })
      )}
    </div>
  );
};

const QueueCard: React.FC<{ row: QueueRow; name: string; avatarUrl: string | null; today: string; hasTarget: boolean; onOpen: () => void }> = ({ row, name, avatarUrl, today, hasTarget, onOpen }) => {
  const flagged = (row.proteinUnder ?? 0) > 0;
  const n = row.days.length;
  return (
    <button type="button" onClick={onOpen} className="tap w-full flex text-start" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "12px 14px", marginBottom: 8, gap: 12 }}>
      <Avatar name={name} url={avatarUrl} size={38} tone={flagged ? "gold" : "pr"} />
      <span className="flex-1 min-w-0">
        <span className="flex justify-between" style={{ gap: 8 }}>
          <span style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>{name}</span>
          <span className="shrink-0" style={{ fontSize: textPx(11), color: INK.chT }}>{daysAgo(row.lastDay, today)}</span>
        </span>
        <span className="block" style={{ fontSize: textPx(12), color: INK.chS }}>{tn(n, "{n} day logged · {range}", "{n} days logged · {range}", { range: dayRange(row.days[0], row.lastDay) })}</span>
        {hasTarget && row.proteinUnder !== null && (
          <span className="block" style={{ fontSize: textPx(11.5), color: flagged ? INK.hi : INK.chF, fontWeight: flagged ? 600 : 400 }}>
            {flagged ? tn(n, "Protein under target {under} of {n} day", "Protein under target {under} of {n} days", { under: row.proteinUnder ?? 0 }) : t("Protein on target")}
          </span>
        )}
      </span>
    </button>
  );
};

/** English keys (tk); show them with t(). */
const REACTION_LABEL: Record<Reaction, string> = { like: tk("Great choice"), love: tk("Love this"), strong: tk("Strong choice"), question: tk("Question") };

/**
 * Release 3 · NU6 v3 "Journal entry · calories and protein boxes" (source gen
 * r13.js jBox13 / nuEntry13 over r6c.js nuEntry6, r7.js nuEntry7): head "Food
 * journal · {day_date}" / the client, the dietary-needs strip, the two boxes
 * (r18, 4 px accent, label 12 / 700, value 28 / 800, bar 8 filling toward the
 * target, "Target {n}" and what is left or over), then each entry (r18, slot
 * 11 / 800 caps, "{n} kcal · {n} g protein", name 14 / 600 with its
 * food_conflicts flag) with its feedback or the Great choice / Swap / Comment
 * actions (comment_on_food_entry; Great choice is the "like" reaction, Swap
 * and Comment send a note). The client's reply (food_log_feedback
 * client_reply) shows under it.
 *
 * Targets: the ones you set (my_client_nutrition_targets), else the client's
 * own when Progress is shared, else "No target set".
 */
export const JournalEntryView: React.FC<{ lane: ProLane; clientId: string; day: string | null; onBack: () => void; onDay: (day: string) => void }> = ({ lane, clientId, day, onBack, onDay }) => {
  const { authUserId } = useApp();
  const dark = useIsDark();
  const today = todayLocal();
  const { clients } = useNuRoster(lane);
  const client = clients?.find((c) => c.clientId === clientId) ?? null;
  const access = useClientAccess(clientId);
  const diet = useDietaryNeeds(clientId, access);
  const diaryShared = access.has("food_diary");
  const [data, setData] = useState<{ entries: DiaryEntry[]; feedback: Feedback[]; target: { kcal: number; protein: number } | null; error: boolean; offline: boolean } | null>(null);
  const [nonce, setNonce] = useState(0);
  const [conflicts, setConflicts] = useState<Record<string, ConflictRow[] | null>>({});
  const [composer, setComposer] = useState<{ entry: DiaryEntry; kind: "swap" | "comment" } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!authUserId || !diaryShared) return;
    let live = true;
    void Promise.all([fetchDiary([clientId], shiftDate(today, -(JOURNAL_DAYS - 1)), today), fetchMyFeedback(authUserId, [clientId]), fetchMyTargets(clientId), access.has("progress") ? fetchClientGoal(clientId) : Promise.resolve(null)]).then(([d, f, t, g]) => {
      if (!live) return;
      const mine = t.ok ? t.data : null;
      const own = g && g.ok ? g.data : null;
      const src = mine ? { calories: mine.calories, proteinPct: mine.proteinPct } : own ? { calories: own.calories, proteinPct: own.proteinPct } : null;
      const target = src ? { kcal: src.calories, protein: Math.round((src.calories * src.proteinPct) / 100 / 4) } : null;
      if (!d.ok || !f.ok) {
        setData((prev) => ({ entries: prev?.entries ?? [], feedback: prev?.feedback ?? [], target, error: true, offline: (!d.ok && d.offline) || (!f.ok && f.offline) }));
        return;
      }
      setData({ entries: d.data, feedback: f.data, target, error: false, offline: false });
    });
    return () => {
      live = false;
    };
    // access.has reads the same answer as diaryShared / progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, clientId, diaryShared, nonce, today]);

  const days = useMemo(() => [...new Set((data?.entries ?? []).map((e) => e.date))].sort(), [data]);
  const current = day && days.includes(day) ? day : days[days.length - 1] ?? day ?? today;
  const entries = useMemo(
    () => (data?.entries ?? []).filter((e) => e.date === current).sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot) || a.createdAt.localeCompare(b.createdAt)),
    [data, current]
  );

  useEffect(() => {
    const todo = entries.filter((e) => conflicts[e.id] === undefined);
    if (!todo.length) return;
    let live = true;
    void Promise.all(todo.map(async (e) => [e.id, await fetchConflicts(clientId, e.foodId ? { kind: "food", refId: e.foodId } : e.customFoodId ? { kind: "custom_food", refId: e.customFoodId } : null, e.name)] as const)).then(
      (pairs) => live && setConflicts((p) => ({ ...p, ...Object.fromEntries(pairs) }))
    );
    return () => {
      live = false;
    };
  }, [entries, clientId, conflicts]);

  const first = client?.firstName ?? "";
  const name = client?.name ?? "";
  const head = <NuHead eyebrow={t("Food journal · {date}", { date: dayDate(current) })} title={name || t("Food journal")} onBack={onBack} />;

  if (access.loading) return <div>{head}<ProCardSkeleton lines={3} /></div>;
  if (!diaryShared) {
    return (
      <div>
        {head}
        <LockLine
          what={t("Food diary")}
          clientFirstName={first || t("Your client")}
          action={
            <button type="button" onClick={() => void askToShare(clientId, "food_diary").then((r) => setMsg(r.ok ? t("Asked.") : r.message))} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(11.5), fontWeight: 700, color: INK.prDeep }}>
              {t("Ask to share")}
            </button>
          }
        />
        {msg && <p style={{ marginTop: 8, fontSize: textPx(12), color: INK.chF }}>{msg}</p>}
      </div>
    );
  }

  const fbFor = (id: string) => (data?.feedback ?? []).filter((f) => f.entryId === id);
  const totals = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, protein: a.protein + e.protein }), { kcal: 0, protein: 0 });
  const react = async (entry: DiaryEntry, reaction: Reaction) => {
    const r = await commentOnEntry(entry.id, null, reaction);
    if (!r.ok) setMsg(r.message);
    reload();
  };

  return (
    <div>
      {head}
      <DietStrip name={name} {...diet} />
      {data?.error && data.offline && <OfflineLine />}
      {data?.error && !data.offline && (
        <div style={{ marginBottom: 12 }}>
          <ProError onRetry={reload} />
        </div>
      )}
      {days.length > 1 && (
        <div className="flex overflow-x-auto no-scrollbar" style={{ gap: 6, padding: "5px 0", margin: "-5px 0 7px" }} role="tablist" aria-label={t("Day")}>
          {days.map((d) => {
            const on = d === current;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onDay(d)}
                className="tap relative whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[5px] before:content-['']"
                style={{ flex: "none", minHeight: 34, padding: "0 12px", borderRadius: 12, fontSize: textPx(12.5), fontWeight: 700, background: on ? "rgb(var(--c-seg-active))" : "var(--c-pro-tab-idle)", color: on ? "rgb(var(--c-on-primary-fill))" : "var(--c-pro-tab-idle-ink)" }}
              >
                {dayDate(d)}
              </button>
            );
          })}
        </div>
      )}
      {!data ? (
        <ProCardSkeleton lines={4} height={180} />
      ) : (
        <>
          <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
            <JBox label={t("Calories")} value={Math.round(totals.kcal).toLocaleString(appLocale("en-GB"))} unit={t("kcal")} target={data.target?.kcal ?? null} raw={totals.kcal} accent={dark ? "#C3B3FB" : "#7D6BB5"} unitTarget="" />
            <JBox label={t("Protein")} value={String(Math.round(totals.protein))} unit={t("g")} target={data.target?.protein ?? null} raw={totals.protein} accent="#7D6BB5" unitTarget={` ${t("g")}`} />
          </div>
          {entries.length === 0 ? (
            <EmptyState icon={BookOpenCheck} title={t("Nothing logged")} line={t("{name} hasn't logged anything on this day.", { name: first || t("Your client") })} />
          ) : (
            entries.map((e) => {
              const fb = fbFor(e.id);
              return (
                <div key={e.id} style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 14px", marginBottom: 8 }}>
                  <div className="flex justify-between" style={{ gap: 8 }}>
                    <span style={{ fontSize: textPx(11), fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: INK.chF }}>{SLOT_LABEL[e.slot] === "Snacks" ? t("Snack") : t(SLOT_LABEL[e.slot])}</span>
                    <span style={{ fontSize: textPx(11), color: INK.chT, whiteSpace: "nowrap" }}>{t("{kcal} kcal · {protein} g protein", { kcal: Math.round(e.kcal), protein: Math.round(e.protein) })}</span>
                  </div>
                  <p style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, marginTop: 4, overflowWrap: "anywhere" }}>
                    {e.name}
                    <Flag row={worstConflict(conflicts[e.id] ?? [])} />
                  </p>
                  {fb.length > 0 ? (
                    fb.map((f) => <FeedbackBox key={f.id} f={f} first={first} dark={dark} />)
                  ) : (
                    <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
                      {(
                        [
                          [ThumbsUp, t("Great choice"), () => void react(e, "like")],
                          [Repeat, t("Swap"), () => setComposer({ entry: e, kind: "swap" })],
                          [MessageCircle, t("Comment"), () => setComposer({ entry: e, kind: "comment" })],
                        ] as const
                      ).map(([Icon, label, act]) => (
                        <button key={label} type="button" onClick={act} className="tap relative inline-flex items-center whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[6px] before:content-['']" style={{ gap: 4, minHeight: 32, padding: "0 10px", borderRadius: 10, background: INK.soft, fontSize: textPx(11.5), fontWeight: 700, color: INK.chS }}>
                          <Icon size={12} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 4, borderRadius: 14, background: INK.soft, padding: "10px 12px" }}>
            <span style={{ fontSize: textPx(12), color: INK.chS }}>{t("A note for the whole day and Mark reviewed. A day counts as reviewed once you've left feedback on it.")}</span>
            <ComingSoonPill />
          </div>
          {msg && (
            <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
              {msg}
            </p>
          )}
        </>
      )}
      <Composer
        open={!!composer}
        title={composer?.kind === "swap" ? t("Swap suggestion") : t("Comment")}
        entryName={composer?.entry.name ?? ""}
        onClose={() => setComposer(null)}
        onSend={async (body) => {
          if (!composer) return null;
          const r = await commentOnEntry(composer.entry.id, body, null);
          if (!r.ok) return r.message;
          reload();
          return null;
        }}
      />
    </div>
  );
};

const JBox: React.FC<{ label: string; value: string; unit: string; target: number | null; raw: number; accent: string; unitTarget: string }> = ({ label, value, unit, target, raw, accent, unitTarget }) => {
  const dark = useIsDark();
  const b = journalBox(raw, target);
  return (
    <div className="flex-1 min-w-0 relative overflow-hidden" style={{ borderRadius: 18, background: INK.card, border: `1px solid ${b.over ? (dark ? "rgba(240,154,142,0.4)" : "rgba(192,57,43,0.3)") : INK.bCard}`, padding: "14px 14px 12px" }}>
      <span aria-hidden className="absolute" style={{ insetInlineStart: 0, top: 0, bottom: 0, width: 4, background: accent }} />
      <p style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chS }}>{label}</p>
      <p className="flex items-baseline flex-wrap" style={{ gap: 4, marginTop: 6 }}>
        <span style={{ fontSize: textPx(28), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: INK.ch }}>{value}</span>
        <span style={{ fontSize: textPx(13), fontWeight: 700, color: INK.chF }}>{unit}</span>
      </p>
      <span className="block overflow-hidden" style={{ height: 8, borderRadius: 9999, background: INK.soft, marginTop: 10 }}>
        <span className="block" style={{ height: "100%", width: `${b.pct}%`, borderRadius: 9999, background: b.over ? INK.hi : accent }} />
      </span>
      <p className="flex justify-between flex-wrap" style={{ gap: 6, fontSize: textPx(11), color: INK.chF, marginTop: 6 }}>
        <span>{target ? t("Target {n}", { n: `${Math.round(target).toLocaleString(appLocale("en-GB"))}${unitTarget}` }) : t("No target set")}</span>
        {b.left && <b style={{ color: b.over ? INK.hi : INK.good, whiteSpace: "nowrap" }}>{b.left}</b>}
      </p>
    </div>
  );
};

const FeedbackBox: React.FC<{ f: Feedback; first: string; dark: boolean }> = ({ f, first, dark }) => {
  const great = f.reaction === "like" || f.reaction === "love" || f.reaction === "strong";
  const title = f.reaction ? t(REACTION_LABEL[f.reaction]) : t("Comment");
  const Icon = great ? ThumbsUp : MessageCircle;
  const ink = great ? INK.good : INK.prDeep;
  return (
    <div style={{ marginTop: 10, borderRadius: 12, background: dark ? "#2B2C3A" : "#F6F5FB", padding: "9px 12px" }}>
      <p className="flex items-center" style={{ gap: 5, fontSize: textPx(11), fontWeight: 800, color: ink }}>
        <Icon size={12} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
        {t("{title} · You", { title })}
      </p>
      {f.body && <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.45, marginTop: 3, overflowWrap: "anywhere" }}>{f.body}</p>}
      {f.clientReply && (
        <p style={{ fontSize: textPx(12.5), color: INK.ch, lineHeight: 1.45, marginTop: 6, overflowWrap: "anywhere" }}>
          <b>{t("{name}:", { name: first || t("Client") })}</b> {f.clientReply}
        </p>
      )}
    </div>
  );
};

const Composer: React.FC<{ open: boolean; title: string; entryName: string; onClose: () => void; onSend: (body: string) => Promise<string | null> }> = ({ open, title, entryName, onClose, onSend }) => {
  const [v, setV] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setV("");
      setErr(null);
    }
  }, [open]);
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <CtaButton
          className="w-full"
          size="sheet"
          icon={<Send size={15} />}
          label={t("Send")}
          loading={busy}
          disabled={!v.trim()}
          onClick={async () => {
            setBusy(true);
            const e = await onSend(v);
            setBusy(false);
            if (e) setErr(e);
            else onClose();
          }}
        />
      }
    >
      <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 8, overflowWrap: "anywhere" }}>{entryName}</p>
      <textarea
        value={v}
        maxLength={FEEDBACK_MAX}
        rows={4}
        onChange={(e) => setV(e.target.value)}
        aria-label={title}
        className="w-full outline-none resize-none"
        style={{ borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch }}
      />
      {err && (
        <p role="alert" style={{ marginTop: 8, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};
