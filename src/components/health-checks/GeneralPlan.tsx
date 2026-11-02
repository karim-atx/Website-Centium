import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, Check, ChevronLeft, ChevronRight, Clock, Minus, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { HealthDisclaimer } from "../ui/HealthDisclaimer";
import { FixedHeader } from "../ui/FixedHeader";
import { PinnedCta } from "../ui/PinnedCta";
import { PopupMenu } from "../ui/PopupMenu";
import { SwipeActions } from "../ui/SwipeActions";
import { Toast } from "../ui/Toast";
import { PersonalReminderSheet } from "../reminders/PersonalReminderSheet";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { textPx, linePx } from "../../theme/textSize";
import { SCREENING_COPY, bmiOf, screeningLastChecked, screeningRows, type ScreeningRow } from "../../services/health-checks/screening";
import { cadenceOf, checkState, customCadence, type CheckState } from "../../services/health-checks/checkStatus";
import { checkStoreActions, useHealthCheckStore, type CheckReminder } from "../../services/health-checks/checkStore";
import { PREGNANCY_CHECKS_COPY, PREGNANCY_SCHEDULE, pregnancyChecksDone, pregnancyComingUp } from "../../services/pregnancy/checks";
import { gestationOn } from "../../services/pregnancy/weeks";
import * as PG from "../../services/pregnancy/guidance";
import { formatShortDate, localDayOf, todayLocal } from "../../utils/date";
import { fetchNotificationPrefs } from "../../services/preferences";
import { hairAt, isoDay } from "../health/log/LogSheetParts";
import { CheckTile, InfoBox } from "./HealthCheckParts";
import { CheckFormPopup, CheckReminderSheet, HideOrDeletePopup, HiddenChecksSheet, MarkDonePopup, type CheckOption } from "./HealthCheckPopups";
import { t, tn, tx } from "../../i18n/core";

// HE1.8 "Your health checks" (health-b-handover.md 79-203), the general
// plan of the neutral /app/health/checks route, and the pregnancy schedule
// in its place while a pregnancy is tracked (K2, restyled, wording verbatim).
//
// NEVER MENTIONS OR REVEALS the other plan this route can show: nothing here
// reads, names or links that setting (K4).
//
// What is stored and what is not: see services/health-checks/checkStore.ts.
// Until Database stage B2 lands, the check circle, swipe Edit / Delete,
// "+ Add a check" and the Hidden checks menu are not shown; the row's status
// and Last come from the user's own records (blood pressure readings, lab
// results), as before. The "Set a personal reminder" row always opens the
// generic personal reminder (V6-80, as on main); per-check reminders (B2/B4,
// HE1.8.2) open from a row's menu ("remind"), its bell and the edit form.

const STATUS_INK: Record<CheckState["tone"], [string, string]> = {
  good: ["#357A4D", "#7FC79C"],
  due: ["#C2453F", "#E8837C"],
  // #6B6570 is 3.2:1 on #1C1F28: lifted to #A39DAA in dark (HE1.8 O5).
  neutral: ["#6B6570", "#A39DAA"],
};

type Row = CheckOption & { who?: string; state: CheckState; doneOn: string | null; hasReminder: boolean };

/** Next due as yyyy-mm-dd: done date + interval months, never before today; today when either is unknown. */
function nextDueDay(doneOn: string | null, months: number | undefined, today: string): string {
  if (!doneOn || !months) return today;
  const d = new Date(+doneOn.slice(0, 4), +doneOn.slice(5, 7) - 1 + months, +doneOn.slice(8, 10));
  const iso = isoDay(d);
  return iso < today ? today : iso;
}

/** Fixed header (HE1.8 #1-#3): back 36 (chevron 20 #5B5349), gap 6, title 24/30 700 ls-0.5; ⋮ 36 on the right when given. */
const HeaderRow: React.FC<{ title: string; onBack: () => void; menu?: React.ReactNode }> = ({ title, onBack, menu }) => (
  <FixedHeader paddingBottom={10}>
    <div className="flex items-center" style={{ gap: 6, marginInlineStart: -7.5, minHeight: 36 }}>
      <button
        type="button"
        onClick={onBack}
        aria-label={t("Back")}
        className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
        style={{ width: 36, height: 36 }}
      >
        <ChevronLeft size={20} className="text-charcoal-soft rtl:-scale-x-100" aria-hidden />
      </button>
      <h1 className="flex-1 min-w-0 text-charcoal line-clamp-2" style={{ fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 700, letterSpacing: -0.5 }}>
        {title}
      </h1>
      {menu}
    </div>
  </FixedHeader>
);

export function GeneralPlan() {
  const navigate = useNavigate();
  const back = useBack();
  const dark = useIsDark();
  const { authUserId, user, bloodMarkers, bloodPressure, pregnancy, recoverySensitive, recoveryModePending } = useApp();
  const store = useHealthCheckStore(authUserId);
  // Round D O12: a failed load says so when it's the connection.
  const online = useOnline();
  // B2 / B4 are on the stack: the stored-state entry points show once the account's checks have loaded.
  const ready = store.status === "ready";
  // HE1.8.2 #61: the account's Allow notifications (A2 rule), read only where a reminder can be set.
  const [notificationsOff, setNotificationsOff] = useState(false);
  useEffect(() => {
    if (!ready || !authUserId) return;
    let live = true;
    void fetchNotificationPrefs(authUserId).then((r) => {
      if (live && r.status === "ok") setNotificationsOff(!r.prefs.allow);
    });
    return () => {
      live = false;
    };
  }, [ready, authUserId]);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [markFor, setMarkFor] = useState<Row | null>(null);
  const [formFor, setFormFor] = useState<{ editing: Row | null } | null>(null);
  const [hideFor, setHideFor] = useState<Row | null>(null);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [remindFor, setRemindFor] = useState<{ initial: CheckReminder; editing: boolean } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ row: Row; anchor: HTMLElement } | null>(null);
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);
  const [menuEl, menuBtn] = useState<HTMLButtonElement | null>(null);

  const today = todayLocal();
  const latestBpDay = bloodPressure[0] ? localDayOf(bloodPressure[0].recordedAt) : null;
  const gestation = pregnancy ? gestationOn(today, pregnancy) : null;
  // Not known yet counts as on: nothing body-size related may show by mistake (K3).
  const recovery = recoverySensitive || recoveryModePending;
  const card = { borderRadius: 18, border: `0.5px solid ${hairAt(dark, 0.08)}` } as const;
  const sub = { fontSize: textPx(10.5), lineHeight: "15.8px", fontWeight: 600 } as const;

  // ---- the reminder row (HE1.8 #50-#54) ---------------------------------
  const reminderRow = (
    <button
      type="button"
      // V6-80 / release review LOST #1: always the generic personal reminder (one per
      // account, topic-free), as on main, so a saved one can be changed or turned off;
      // per-check reminders (HE1.8.2) open from a row's menu, its bell and the edit form.
      onClick={() => setReminderOpen(true)}
      className="tap relative w-full flex items-center bg-cream-card text-start"
      style={{ ...card, marginTop: 10, minHeight: 58, paddingBlock: "10px", paddingInline: "12px 40px", gap: 12 }}
    >
      <span className="shrink-0 grid place-items-center bg-th-f0edf9 dark:bg-th-303141 text-th-7d6bb5 dark:text-primary-deep-text" style={{ width: 32, height: 32, borderRadius: 10 }}>
        <Bell size={17} aria-hidden strokeWidth={1.9} />
      </span>
      <span className="text-charcoal" style={{ fontSize: textPx(13.5), lineHeight: "20.3px", fontWeight: 600 }}>
        {t("Set a personal reminder")}
      </span>
      <ChevronRight size={17} className="absolute text-charcoal-faint rtl:-scale-x-100" style={{ insetInlineEnd: 14.5, top: "50%", marginTop: -8.5 }} aria-hidden />
    </button>
  );

  // ---- pregnancy schedule (K2: kept, restyled, wording verbatim) --------
  if (pregnancy && gestation && !gestation.implausible) {
    const done = pregnancyChecksDone(bloodMarkers, pregnancy);
    const next = pregnancyComingUp(gestation.week, done);
    return (
      <div style={{ paddingBottom: 96 }}>
        <HeaderRow title={PREGNANCY_CHECKS_COPY.heading} onBack={() => navigate("/app/health")} />
        {/* The pregnancy warning signs sit on top (board: "urgent-signs card on
            top"): pre-eclampsia can show symptoms before a reading does. */}
        <div className="rounded-[18px] bg-status-high-bg px-4 py-3.5" style={{ marginTop: 2 }}>
          <p className="flex items-center gap-2 text-[12px] font-bold text-charcoal">
            <AlertTriangle size={14} className="text-status-high shrink-0" />
            {PG.URGENT_TITLE}
          </p>
          <ul className="mt-2 space-y-1 list-disc ps-5 text-[11.5px] leading-[1.45] text-charcoal-soft">
            {PG.URGENT_SIGNS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] font-bold text-charcoal">{PG.URGENT_ACTION}</p>
        </div>
        <InfoBox style={{ marginTop: 12 }}>
          <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(12), lineHeight: "18px" }}>
            {PREGNANCY_CHECKS_COPY.intro}
          </p>
          <p className="text-charcoal-soft" style={{ margin: "6px 0 0", fontSize: textPx(11), lineHeight: "16.5px" }}>
            {PG.PROVIDER_FIRST}
          </p>
        </InfoBox>
        {next && (
          <div className="bg-cream-card" style={{ ...card, marginTop: 12, padding: "12px 14px" }}>
            <p className="text-charcoal-faint" style={{ margin: 0, fontSize: textPx(11), lineHeight: "14px", fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase" }}>
              {t("Coming up")}
            </p>
            <p className="text-charcoal" style={{ margin: "4px 0 0", fontSize: textPx(13.5), lineHeight: "18px", fontWeight: 600 }}>
              {PREGNANCY_CHECKS_COPY.comingUp(next.weekLabel, next.short)}
            </p>
          </div>
        )}
        <section className="bg-cream-card overflow-hidden" style={{ ...card, marginTop: 12 }}>
          {PREGNANCY_SCHEDULE.map((c, i) => (
            <div key={c.id} style={{ paddingBlock: "10px", paddingInline: "12px 14px", borderTop: i > 0 ? `0.5px solid ${hairAt(dark, 0.05)}` : undefined }}>
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-charcoal" style={{ margin: 0, fontSize: textPx(13.5), lineHeight: "18px", fontWeight: 600 }}>
                  {c.when}
                </p>
                {done.has(c.id) && (
                  <span className="flex items-center whitespace-nowrap" style={{ ...sub, fontWeight: 700, gap: 3, color: STATUS_INK.good[dark ? 1 : 0] }}>
                    <Check size={12} aria-hidden /> {t(PREGNANCY_CHECKS_COPY.done)}
                  </span>
                )}
                {c.id === "every" && (
                  <span className="whitespace-nowrap tabular-nums text-charcoal-faint" style={sub}>
                    {latestBpDay ? t("Last checked {date}", { date: formatShortDate(new Date(`${latestBpDay}T00:00:00`), { day: "numeric", month: "short", year: "numeric" }) }) : t(SCREENING_COPY.notYet)}
                  </span>
                )}
              </div>
              <p className="text-charcoal-faint" style={{ margin: "2px 0 0", fontSize: textPx(11), lineHeight: "15px" }}>
                {recovery && c.whatRecoverySensitive ? c.whatRecoverySensitive : c.what}
              </p>
            </div>
          ))}
        </section>
        <p className="text-charcoal-soft" style={{ margin: "10px 0 0", fontSize: textPx(11), lineHeight: "16.5px" }}>
          {PREGNANCY_CHECKS_COPY.contacts}
        </p>
        {reminderRow}
        <HealthDisclaimer className="mt-[18px]" />
        <PersonalReminderSheet open={reminderOpen} onClose={() => setReminderOpen(false)} />
      </div>
    );
  }

  // ---- the general plan --------------------------------------------------
  const suggested: ScreeningRow[] = screeningRows({ age: user.age, sex: user.sex, bmi: bmiOf(user.heightCm, user.weightKg), recoverySensitive: recovery });
  const reminderFor = (id: string) => ready && store.reminders.some((r) => r.checkId === id);
  const toRow = (r: ScreeningRow): Row => {
    const fromRecords = screeningLastChecked(r, { latestBpDay, markers: bloodMarkers });
    const doneOn = ready ? (store.done[r.id] ?? null) : null;
    // Newest of the records and the marked date; with storage, a check the
    // app has no records for is known "not yet" until it is marked.
    let last: string | null | undefined = fromRecords;
    if (ready) {
      const known = [fromRecords, doneOn].filter((d): d is string => !!d).sort();
      last = known.length ? known[known.length - 1] : null;
    }
    const cadence = cadenceOf(r);
    const name = r.title;
    const frequency = r.frequency.charAt(0).toUpperCase() + r.frequency.slice(1);
    return { id: r.id, name, frequency, cadence, who: r.who, state: checkState(cadence, last, today), doneOn, hasReminder: reminderFor(r.id) };
  };
  const allSuggested = suggested.map(toRow);
  const visible = allSuggested.filter((r) => !(ready && store.hidden.includes(r.id)));
  const hiddenRows = allSuggested.filter((r) => ready && store.hidden.includes(r.id));
  const customRows: Row[] = ready
    ? store.custom.map((c) => {
        const cadence = customCadence(c.intervalMonths);
        const doneOn = store.done[c.id] ?? null;
        return {
          id: c.id,
          name: c.name,
          frequency: c.intervalMonths === 12 ? t("Every year") : tn(c.intervalMonths ?? 0, "Every {n} month", "Every {n} months"),
          cadence,
          custom: true,
          state: checkState(cadence, doneOn, today),
          doneOn,
          hasReminder: reminderFor(c.id),
        };
      })
    : [];
  const rows = [...visible, ...customRows];
  const options: CheckOption[] = [...allSuggested, ...customRows];
  const noAge = typeof user.age !== "number";

  function openReminder(row?: Row) {
    const existing = row ? store.reminders.find((r) => r.checkId === row.id) : undefined;
    if (existing) return setRemindFor({ initial: existing, editing: true });
    const first = row ?? rows.find((r) => !store.reminders.some((x) => x.checkId === r.id)) ?? rows[0];
    if (!first) return;
    const plus7 = new Date();
    plus7.setDate(plus7.getDate() + 7);
    const date = isoDay(plus7);
    setRemindFor({ initial: { checkId: first.id, date: date < today ? today : date, time: "09:00", repeat: { kind: "none" } }, editing: false });
  }

  const hideNow = async (row: Row) => {
    const r = await (row.custom ? checkStoreActions.deleteCustom(row.id) : checkStoreActions.hide(row.id));
    if (r.ok && !row.custom) setToast({ message: t("Check hidden."), undo: () => void checkStoreActions.show(row.id) });
    return r;
  };

  const rowView = (row: Row, i: number) => {
    const ink = STATUS_INK[row.state.tone][dark ? 1 : 0];
    const StatusIcon = row.state.tone === "good" ? Check : row.state.tone === "due" ? Clock : Minus;
    const done = !!row.doneOn;
    const body = (
      <div
        className="flex items-center bg-cream-card"
        style={{ minHeight: 72, paddingBlock: "10px", paddingInline: "12px 14px", gap: 10, borderTop: i > 0 ? `0.5px solid ${hairAt(dark, 0.05)}` : undefined }}
      >
        {ready && (
          <button
            type="button"
            onClick={() => setMarkFor(row)}
            aria-label={done ? t("{name}: done. Change or undo", { name: row.name }) : t("Mark {name} as done", { name: row.name })}
            className="tap relative shrink-0 grid place-items-center rounded-full before:absolute before:-inset-[10px] before:content-['']"
            style={{
              width: 24,
              height: 24,
              background: done ? STATUS_INK.good[dark ? 1 : 0] : "transparent",
              border: done ? "none" : `1.1px solid ${hairAt(dark, 0.3)}`,
            }}
          >
            {done && <Check size={14} color="#FFFFFF" strokeWidth={2.6} aria-hidden />}
          </button>
        )}
        <CheckTile id={row.custom ? "custom" : row.id} />
        <div className="flex-1 min-w-0">
          <p className="text-charcoal line-clamp-2" style={{ margin: 0, fontSize: textPx(13.5), lineHeight: "18px", fontWeight: 600 }}>
            {row.name}
          </p>
          <p className="text-charcoal-faint" style={{ margin: "2px 0 0", fontSize: textPx(11), lineHeight: "15px" }}>
            {row.frequency}
          </p>
          {/* K5 / V6-09: the approved "who" line, for screen readers. */}
          {row.who && <span className="sr-only">{row.who}</span>}
        </div>
        <div className="shrink-0 flex flex-col items-end text-end" style={{ gap: 2 }}>
          <span className="flex items-center whitespace-nowrap" style={{ gap: 3, color: ink, ...sub, fontWeight: 700 }}>
            <StatusIcon size={12} aria-hidden strokeWidth={2.4} />
            {t(row.state.word)}
          </span>
          {row.state.last !== null && (
            <span className="whitespace-nowrap tabular-nums" style={sub}>
              <span className="text-charcoal-faint">{t("Last")}</span> <span className="text-charcoal-soft">{t(row.state.last)}</span>
            </span>
          )}
          {row.state.next !== null && (
            <span className="flex items-center whitespace-nowrap tabular-nums" style={{ ...sub, gap: 3 }}>
              <span className="text-charcoal-faint">{tx("Next", "next due")}</span> <span className="text-charcoal-soft">{t(row.state.next)}</span>
              {row.hasReminder && (
                <button
                  type="button"
                  onClick={() => openReminder(row)}
                  aria-label={t("Reminder for {name}", { name: row.name })}
                  className="tap relative grid place-items-center text-th-7d6bb5 dark:text-primary-deep-text before:absolute before:-inset-[16px] before:content-['']"
                >
                  <Bell size={11} aria-hidden />
                </button>
              )}
            </span>
          )}
        </div>
      </div>
    );
    if (!ready) return <div key={row.id}>{body}</div>;
    return (
      <SwipeActions
        key={row.id}
        radius={0}
        tileMax={45}
        tileRadius={12}
        edgeInset={8.5}
        keyboardLabel={row.name}
        onLongPress={(el) => setRowMenu({ row, anchor: el })}
        actions={[
          { key: "edit", label: t("Edit"), icon: <Pencil size={16} />, onClick: () => setFormFor({ editing: row }) },
          { key: "delete", label: row.custom ? t("Delete") : t("Hide"), icon: <Trash2 size={16} />, destructive: true, onClick: () => setHideFor(row) },
        ]}
      >
        {body}
      </SwipeActions>
    );
  };

  return (
    <div style={{ paddingBottom: ready ? 176 : 96 }}>
      <HeaderRow
        title={t(SCREENING_COPY.cardTitle)}
        onBack={() => (window.history.length > 1 ? back() : navigate("/app/health"))}
        menu={
          ready ? (
            <button
              ref={menuBtn}
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t("More options")}
              aria-haspopup="menu"
              className="tap shrink-0 grid place-items-center rounded-full relative before:absolute before:-inset-1 before:content-['']"
              style={{ width: 36, height: 36, marginInlineEnd: -7.5 }}
            >
              <MoreVertical size={20} className="text-charcoal-soft" aria-hidden />
            </button>
          ) : undefined
        }
      />

      {/* KEEP-SAFETY (release review): main's framing line under the title, verbatim. */}
      <p className="text-charcoal-soft" data-checks-subtitle style={{ margin: "0 0 8px", fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600 }}>
        {SCREENING_COPY.cardSubtitle}
      </p>
      <InfoBox style={{ marginTop: 2 }}>
        <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(12), lineHeight: "18px" }}>
          {SCREENING_COPY.intro}
        </p>
      </InfoBox>

      {rows.length > 0 ? (
        <section className="bg-cream-card overflow-hidden" style={{ ...card, marginTop: 12 }} aria-label={t("Your checks")}>
          {rows.map(rowView)}
        </section>
      ) : (
        <div className="text-center" style={{ marginTop: 24 }}>
          <p className="text-charcoal-soft" style={{ margin: 0, fontSize: textPx(13), lineHeight: "19.5px" }}>
            {noAge && hiddenRows.length === 0 ? t("Add your date of birth in Profile to see checks for your age.") : t("No checks to show. Add a check you want to keep track of.")}
          </p>
          {hiddenRows.length > 0 && (
            <button
              type="button"
              onClick={() => setHiddenOpen(true)}
              className="tap text-th-7d6bb5 dark:text-primary-deep-text"
              style={{ marginTop: 6, minHeight: 32, fontSize: textPx(13), lineHeight: "19.5px", fontWeight: 700 }}
            >
              {t("Show hidden checks")}
            </button>
          )}
        </div>
      )}

      {store.status === "error" && (
        <p role="alert" className="text-status-high" style={{ margin: "10px 0 0", fontSize: textPx(12), lineHeight: "17.4px", fontWeight: 600 }}>
          {online ? t("Couldn't load your checks.") : t(OFFLINE_MESSAGE)}{" "}
          <button type="button" onClick={store.retry} className="tap underline" style={{ fontWeight: 700 }}>
            {t("Retry")}
          </button>
        </p>
      )}
      {reminderRow}
      <HealthDisclaimer className="mt-[18px]" />

      {ready && (
        <PinnedCta
          primary={{
            label: t("Add a check"),
            icon: <Plus size={16} aria-hidden />,
            onClick: () => setFormFor({ editing: null }),
            style: { background: "rgb(var(--c-fill-pinned))" },
          }}
        />
      )}

      {/* V6-80: the generic personal reminder stays behind the row for everyone. */}
      <PersonalReminderSheet open={reminderOpen} onClose={() => setReminderOpen(false)} />

      <MarkDonePopup
        open={!!markFor}
        onClose={() => setMarkFor(null)}
        check={markFor}
        doneOn={markFor?.doneOn ?? null}
        today={today}
        onSave={(day) => checkStoreActions.markDone(markFor!.id, day)}
        onUndo={() => checkStoreActions.undoDone(markFor!.id)}
      />
      <CheckFormPopup
        open={!!formFor}
        onClose={() => setFormFor(null)}
        options={options}
        editing={formFor?.editing ?? null}
        doneOn={formFor?.editing?.doneOn ?? null}
        remindOn={!!formFor?.editing?.hasReminder}
        remindersReady={ready}
        notificationsOff={notificationsOff}
        today={today}
        onSave={async ({ checkId, otherName, intervalMonths, doneOn, remind }) => {
          let id = checkId;
          const editingCustom = formFor?.editing?.custom ? formFor.editing.id : undefined;
          if (otherName !== null) {
            const r = await checkStoreActions.saveCustom(
              { id: editingCustom, name: otherName, intervalMonths, doneOn: editingCustom ? undefined : doneOn },
              allSuggested.map((s) => s.name)
            );
            if (!r.ok) return r;
            id = r.id ?? null;
          }
          if (!id) return { ok: false, message: t("Couldn't save. Try again.") };
          const steps: Promise<{ ok: boolean; message?: string }>[] = [];
          if (otherName === null || editingCustom) steps.push(doneOn ? checkStoreActions.markDone(id, doneOn) : checkStoreActions.undoDone(id));
          // Shown again if it had been hidden and is chosen from the list.
          steps.push(checkStoreActions.show(id));
          // S3: a reminder at Next due, 9:00 AM (today when Next is not known).
          const has = store.reminders.some((r) => r.checkId === id);
          if (remind && !has) {
            const months = otherName !== null ? intervalMonths : (options.find((o) => o.id === id)?.cadence as { months?: number } | undefined)?.months;
            steps.push(checkStoreActions.setReminder({ checkId: id, date: nextDueDay(doneOn, months, today), time: "09:00", repeat: { kind: "none" } }));
          }
          if (!remind && has) steps.push(checkStoreActions.removeReminder(id));
          const results = await Promise.all(steps);
          return results.find((x) => !x.ok) ?? { ok: true };
        }}
      />
      <HideOrDeletePopup open={!!hideFor} onClose={() => setHideFor(null)} check={hideFor} onConfirm={() => hideNow(hideFor!)} />
      <HiddenChecksSheet open={hiddenOpen} onClose={() => setHiddenOpen(false)} hidden={hiddenRows} onShow={(id) => checkStoreActions.show(id)} />
      {remindFor && (
        <CheckReminderSheet
          open={!!remindFor}
          onClose={() => setRemindFor(null)}
          checks={rows}
          initial={remindFor.initial}
          editing={remindFor.editing}
          notificationsOff={notificationsOff}
          today={today}
          onSave={(r) => checkStoreActions.setReminder(r)}
          onRemove={(id) => checkStoreActions.removeReminder(id)}
        />
      )}
      <PopupMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={menuEl}
        width={172}
        options={[{ value: "hidden", label: t("Hidden checks ({n})", { n: hiddenRows.length }) }]}
        onSelect={() => {
          setMenuOpen(false);
          setHiddenOpen(true);
        }}
      />
      <PopupMenu
        open={!!rowMenu}
        onClose={() => setRowMenu(null)}
        anchor={rowMenu?.anchor ?? null}
        width={172}
        options={[
          { value: "edit", label: t("Edit") },
          { value: "hide", label: rowMenu?.row.custom ? t("Delete") : t("Hide"), destructive: !!rowMenu?.row.custom },
          ...(ready ? [{ value: "remind", label: t("Set a reminder") }] : []),
        ]}
        onSelect={(v) => {
          const row = rowMenu?.row;
          setRowMenu(null);
          if (!row) return;
          if (v === "edit") setFormFor({ editing: row });
          if (v === "hide") setHideFor(row);
          if (v === "remind") openReminder(row);
        }}
      />
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        onUndo={toast?.undo ? () => { toast.undo?.(); setToast(null); } : undefined}
        onExpire={() => setToast(null)}
      />
    </div>
  );
}
