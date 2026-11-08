import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Apple, Archive, Check, ClipboardList, Dumbbell, EllipsisVertical, Flame, Footprints, Leaf, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { useWebDismiss } from "../../../components/dashboard/web/useWebDismiss";
import { useFreeLimit } from "../../../components/premium/useFreeLimit";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { Toast } from "../../../components/ui/Toast";
import { limitReachedText, ownHabitCount } from "../../../services/premium/g2";
import {
  COACH_HABIT_LOCKED,
  getCoachHabits,
  DUPLICATE_HABIT,
  HABIT_COLOURS,
  HABIT_LIMITS,
  HABIT_SAVE_FAILED as SAVE_FAILED,
  TOO_MANY_HABITS,
  habitShade,
  isDuplicateLabel,
  nextHabitColour,
} from "../../../services/habits";
import { habitBestStreak } from "../../../services/habits/streak";
import { habitIcon, habitIconOptions } from "../../../utils/icons";
import { shiftDate } from "../../../utils/date";
import type { HabitColour, HabitIconKey, HabitItem, Streak } from "../../../types";
import { appLocale } from "../../../i18n/format";
import { t, tk, tn, tx } from "../../../i18n/core";
import { MindSectionWeb } from "./MindSectionWeb";
import { mindCaps, mindPrimary } from "./mindWebStyles";
import { useEscCancel } from "./useEscCancel";

const ARCHIVED = tk("Habit archived. Its history is kept.");
const PANEL_RULE = (e: string) => e === DUPLICATE_HABIT || e === TOO_MANY_HABITS || e === limitReachedText("habits");
const COLOUR_NAME: Record<HabitColour, string> = { lavender: tk("Lavender"), teal: tk("Teal"), gold: tk("Gold"), rose: tk("Rose"), sky: tk("Sky") };
const AUTO_LABEL: Record<NonNullable<Streak["category"]>, string> = { logging: tk("Logging"), movement: tk("Movement"), workout: tk("Workout"), nutrition: tk("Nutrition") };
const AUTO_ICON: Record<NonNullable<Streak["category"]>, typeof Flame> = { logging: ClipboardList, movement: Footprints, workout: Dumbbell, nutrition: Apple };
const line = (i: number) => (i ? "0.5px solid rgba(36,31,27,0.08)" : "none");

function weekOf(today: string): string[] {
  const dow = (new Date(`${today}T00:00:00`).getDay() + 6) % 7;
  const monday = shiftDate(today, -dow);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => shiftDate(monday, i));
}
const dayLabel = (day: string, width: "narrow" | "long") => new Date(`${day}T00:00:00`).toLocaleDateString(appLocale(), { weekday: width });

/**
 * Website viewport v1, WC-MI.1 Habits (WC-MI Mind Web v5, screen "habits",
 * literal values). The header's Add habit (40, #9A8CD6); an 8 : 4 grid (at 1024
 * too): the habit list (r20, 0.5px border; rows at least 64: the 40 tile
 * r12 with its 20 icon, the name 17/24 600 over "N day streak · best M"
 * 13/20, this week's seven 30-wide columns (the day 11/600 over a 22 dot:
 * filled in the habit's ink, else a 1.5 ring in its tile colour), the 28
 * today check and the ⋮) beside Auto-tracked (caps label, 56 rows with a 36
 * tile and the count 20/800 #4F7F78, the note under it). Adding opens the
 * inline card above the list (the 44 name field and its X, the colour dots
 * 28 and Add habit 40). Same data, rules and menus as mobile: the past days
 * of the week tick, the icon tile cycles the colour, ⋮ has Edit / Archive /
 * Delete (a coach's habit only Archive), Delete asks first.
 */
export default function HabitsWeb() {
  const {
    today,
    habits,
    habitsLoading,
    habitsError,
    habitSuggestions,
    streaks,
    toggleHabit,
    addHabit,
    updateHabit,
    setHabitColour,
    archiveHabit,
    removeHabit,
    reloadHabits,
    accessibility,
    authUserId,
  } = useApp();
  const dark = useIsDark();
  const hideNumbers = useHideNumbers();
  const { blocked } = useFreeLimit();
  const hc = !!accessibility.highContrast;
  const shadeOf = (c: HabitColour | undefined) => habitShade(c, dark, hc) ?? { tile: "#F0EDF9", ink: "#7D6BB5" };

  const [coachOf, setCoachOf] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void getCoachHabits(authUserId).then((m) => !cancelled && setCoachOf(m));
    return () => {
      cancelled = true;
    };
  }, [authUserId, habits.length]);
  const fromCoach = (h: HabitItem) => !!coachOf[h.id];

  const [panel, setPanel] = useState<{ mode: "add" } | { mode: "edit"; habit: HabitItem } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<HabitIconKey>(habitIconOptions[0].key);
  const [newColour, setNewColour] = useState<HabitColour>("lavender");
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<HabitItem | null>(null);
  useEscCancel(!!deleting, () => setDeleting(null), () => openerRef.current);
  const [menu, setMenu] = useState<{ habit: HabitItem; anchor: HTMLElement } | null>(null);
  const [toast, setToast] = useState<{ id: number; message: string; undo?: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  // What opened the card (Add habit, or the row's ⋮ for Edit): focus goes back there when it closes.
  const openerRef = useRef<HTMLElement | null>(null);
  const refocus = () => window.setTimeout(() => openerRef.current?.isConnected && openerRef.current.focus({ preventScroll: true }), 0);

  const week = weekOf(today);
  const todayIndex = week.indexOf(today);
  const failed = (message: string | null) => {
    if (message) setToast({ id: Date.now(), message: SAVE_FAILED });
  };

  const openAdd = () => {
    if (blocked("habits", ownHabitCount(habits, (id) => !!coachOf[id]))) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    setNewLabel("");
    setNewIcon(habitIconOptions[0].key);
    setNewColour("lavender");
    setPanelError(null);
    setPanel({ mode: "add" });
  };
  const openEdit = (h: HabitItem, opener?: HTMLElement) => {
    openerRef.current = opener ?? null;
    setNewLabel(h.label);
    setNewIcon(h.icon);
    setNewColour(h.colour ?? "lavender");
    setPanelError(null);
    setPanel({ mode: "edit", habit: h });
  };
  const closePanel = () => {
    if (saving) return;
    setPanel(null);
    setPanelError(null);
    refocus();
  };
  // Esc closes the card and focus goes back to what opened it (section 3).
  useWebDismiss(!!panel && !menu && !deleting, closePanel, panelRef);

  const cycleColour = (h: HabitItem) =>
    fromCoach(h) ? setToast({ id: Date.now(), message: COACH_HABIT_LOCKED }) : void setHabitColour(h.id, nextHabitColour(h.colour)).then(failed);
  const archive = (h: HabitItem) =>
    void archiveHabit(h.id).then((error) => {
      if (error) failed(error);
      else setToast({ id: Date.now(), message: ARCHIVED, undo: h.id });
    });
  const undoArchive = (id: string) => {
    setToast(null);
    void archiveHabit(id, false).then((error) => {
      if (error) setToast({ id: Date.now(), message: PANEL_RULE(error) ? error : SAVE_FAILED });
    });
  };

  const editingId = panel?.mode === "edit" ? panel.habit.id : undefined;
  const trimmed = newLabel.trim();
  const duplicate = trimmed !== "" && isDuplicateLabel(trimmed, habits, editingId);
  const save = async () => {
    if (saving || !panel || !trimmed) return;
    if (duplicate) return setPanelError(DUPLICATE_HABIT);
    if (panel.mode === "add" && habits.length >= HABIT_LIMITS.maxHabits) return setPanelError(TOO_MANY_HABITS);
    setSaving(true);
    setPanelError(null);
    const error = panel.mode === "edit" ? await updateHabit(panel.habit.id, { label: trimmed, icon: newIcon, colour: newColour }) : await addHabit(trimmed, newIcon, newColour);
    setSaving(false);
    if (error) setPanelError(PANEL_RULE(error) ? error : SAVE_FAILED);
    else {
      setPanel(null);
      refocus();
    }
  };

  // A click outside the card discards it (as mobile's tap outside).
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[role='menu'], [role='dialog'], [data-mind-cta]")) return;
      closePanel();
    };
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDown);
    };
    // closePanel reads `saving`; re-bind when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, saving]);

  const taken = new Set(habits.map((h) => h.label.trim().toLowerCase()));
  const suggestions = habitSuggestions.filter((s) => !taken.has(s.label.toLowerCase()) && !taken.has(t(s.label).toLowerCase()));
  const autoStreaks = hideNumbers ? [] : streaks.filter((s) => s.auto);

  const retry = async () => {
    setRetrying(true);
    await reloadHabits();
    setRetrying(false);
  };

  const row = (h: HabitItem, i: number) => {
    const Icon = habitIcon[h.icon];
    const shade = shadeOf(h.colour);
    const done = new Set(h.doneDates ?? []);
    const best = Math.max(habitBestStreak(h.doneDates ?? []), h.streakDays);
    return (
      <div key={h.id} data-mind-habit-row className="flex items-center" style={{ flex: "none", minHeight: 64, gap: 14, padding: "0 16px", borderTop: line(i) }}>
        <button
          type="button"
          onClick={() => cycleColour(h)}
          aria-label={t("{habit} colour: {colour}. Click to change", { habit: h.label, colour: t(COLOUR_NAME[h.colour ?? "lavender"]) })}
          className="mind-web-focus grid place-items-center"
          style={{ width: 40, height: 40, borderRadius: 12, flex: "none", background: shade.tile }}
        >
          <Icon size={20} strokeWidth={1.75} color={shade.ink} aria-hidden />
        </button>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span title={h.label} className="block truncate" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
            {h.label}
          </span>
          {!hideNumbers && (
            <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
              {tn(h.streakDays, "{n} day streak", "{n} day streak")} · {t("best {n}", { n: best })}
            </span>
          )}
        </span>
        <div className="flex" style={{ gap: 6, flex: "none" }}>
          {week.map((day, k) => {
            const on = done.has(day);
            const future = k > todayIndex;
            const name = k === todayIndex ? t("today") : dayLabel(day, "long");
            const dot: CSSProperties = { width: 22, height: 22, borderRadius: 999, boxSizing: "border-box", background: on ? shade.ink : "transparent", border: on ? "none" : `1.5px solid ${shade.tile}`, display: "block" };
            return (
              <span key={day} className="flex flex-col items-center" style={{ width: 30, gap: 4 }}>
                <span aria-hidden style={{ fontSize: 11, fontWeight: 600, color: "#71685E", lineHeight: "16px" }}>{dayLabel(day, "narrow")}</span>
                {future ? (
                  <span role="img" aria-label={t("{day}: upcoming", { day: dayLabel(day, "long") })} style={{ ...dot, opacity: 0.5 }} />
                ) : (
                  <button
                    type="button"
                    onClick={() => void toggleHabit(h.id, day).then(failed)}
                    aria-pressed={on}
                    aria-label={on ? t("{habit}, {day}: done", { habit: h.label, day: name }) : t("{habit}, {day}: not done", { habit: h.label, day: name })}
                    className="mind-web-focus"
                    style={{ ...dot, padding: 0 }}
                  />
                )}
              </span>
            );
          })}
        </div>
        <button
          type="button"
          data-habit-today
          onClick={() => void toggleHabit(h.id, today).then(failed)}
          aria-pressed={h.done}
          aria-label={h.done ? t("{habit}, today: done", { habit: h.label }) : t("{habit}, today: not done", { habit: h.label })}
          className="mind-web-focus grid place-items-center"
          style={{ width: 28, height: 28, borderRadius: 999, boxSizing: "border-box", flex: "none", background: h.done ? "#4F7F78" : "transparent", border: h.done ? "none" : "1.5px solid rgba(111,153,147,0.5)" }}
        >
          {h.done && <Check size={14} strokeWidth={3} color="#FFFFFF" aria-hidden />}
        </button>
        <button
          type="button"
          onClick={(e) => setMenu({ habit: h, anchor: e.currentTarget })}
          aria-label={t("{habit}, more options", { habit: h.label })}
          aria-haspopup="menu"
          aria-expanded={menu?.habit.id === h.id}
          className="mind-web-back grid place-items-center"
          style={{ width: 28, height: 36, borderRadius: 8, flex: "none", marginInlineStart: -6 }}
        >
          <EllipsisVertical size={18} color="#71685E" aria-hidden />
        </button>
      </div>
    );
  };

  return (
    <MindSectionWeb title={t("Habits")} sub={t("Track your daily habits")} cta={{ label: t("Add habit"), onClick: () => (panel ? panelRef.current?.querySelector("input")?.focus() : openAdd()) }}>
      {habitsError && (
        <div role="alert" className="flex items-center" style={{ gap: 12, borderRadius: 12, padding: 12, background: "#FBE7E4", color: "#C0392B" }}>
          <p style={{ margin: 0, flex: 1, minWidth: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600 }}>{t("Couldn't load. Check your connection.")}</p>
          <button type="button" onClick={() => void retry()} disabled={retrying} className="mind-web-focus" style={{ fontSize: 13, fontWeight: 700, height: 36, padding: "0 8px", borderRadius: 8 }}>
            {retrying ? <Loader2 size={14} className="animate-spin" aria-label={t("Retrying")} /> : t("Retry")}
          </button>
        </div>
      )}
      {/* 8 : 4 at both sizes: the reference's 1 : 1 at 1024 leaves a habit's name a few px wide beside the week (the fit rule wins; no 1024 frame is drawn for Habits). */}
      <div data-mind-habits-grid style={{ display: "grid", gridTemplateColumns: "minmax(0,8fr) minmax(0,4fr)", gap: 24, alignItems: "start" }}>
        <div className="flex flex-col" style={{ minWidth: 0, gap: 12 }}>
          {panel && (
            <div
              ref={panelRef}
              tabIndex={-1}
              role="group"
              data-habit-panel
              aria-label={panel.mode === "edit" ? t("Edit habit") : t("Add habit")}
              className="flex flex-col"
              style={{ flex: "none", borderRadius: 18, border: "1px solid #AEA1DC", padding: "14px 16px", gap: 12, outline: "none" }}
            >
              <div className="flex items-center" style={{ gap: 10 }}>
                <input
                  autoFocus
                  value={newLabel}
                  maxLength={HABIT_LIMITS.labelMax}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                    setPanelError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void save();
                  }}
                  placeholder={t("New habit…")}
                  aria-label={panel.mode === "edit" ? t("Habit name") : t("New habit")}
                  aria-invalid={!!panelError || undefined}
                  aria-describedby={panelError ? "habit-web-error" : undefined}
                  style={{ flex: 1, minWidth: 0, height: 44, borderRadius: 12, background: "#F5F5F6", padding: "0 14px", fontSize: 15, color: "#241F1B", border: panelError === DUPLICATE_HABIT ? "1px solid #C0392B" : "1px solid transparent", outline: "none" }}
                />
                <button type="button" onClick={closePanel} aria-label={t("Close")} className="mind-web-back grid place-items-center" style={{ width: 36, height: 36, borderRadius: 999, flex: "none" }}>
                  <X size={16} color="#71685E" aria-hidden />
                </button>
              </div>
              <div className="scroll-row mind-web-noscroll flex" style={{ gap: 8, padding: 2, margin: -2 }}>
                {habitIconOptions.map((opt) => {
                  const Icon = habitIcon[opt.key];
                  const sel = newIcon === opt.key;
                  const shade = shadeOf(newColour);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setNewIcon(opt.key)}
                      aria-label={tx(opt.label, "icon")}
                      aria-pressed={sel}
                      className="mind-web-focus grid place-items-center"
                      style={{ width: 36, height: 36, borderRadius: 10, flex: "none", background: sel ? shade.tile : "#F5F5F6", outline: sel ? "2px solid #AEA1DC" : "none", outlineOffset: 0 }}
                    >
                      <Icon size={18} strokeWidth={1.75} color={sel ? shade.ink : "#5B5349"} aria-hidden />
                    </button>
                  );
                })}
              </div>
              {panel.mode === "add" && suggestions.length > 0 && (
                <div className="scroll-row mind-web-noscroll flex" style={{ gap: 8 }}>
                  {suggestions.map((s) => {
                    const Icon = habitIcon[s.icon];
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setNewLabel(t(s.label));
                          setNewIcon(s.icon);
                          setPanelError(null);
                        }}
                        className="mind-web-focus flex items-center whitespace-nowrap"
                        style={{ flex: "none", height: 36, gap: 6, padding: "0 12px", borderRadius: 10, background: "#F5F4FE", fontSize: 13, fontWeight: 600, color: "#5B5349" }}
                      >
                        <Icon size={16} color="#7D6BB5" aria-hidden />
                        {t(s.label)}
                        <Plus size={14} color="#71685E" aria-hidden />
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center" style={{ gap: 10 }}>
                {HABIT_COLOURS.map((c) => {
                  const sel = newColour === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColour(c)}
                      aria-label={t(COLOUR_NAME[c])}
                      aria-pressed={sel}
                      className="mind-web-focus"
                      style={{ width: 28, height: 28, borderRadius: 999, background: shadeOf(c).ink, outline: sel ? "2px solid #241F1B" : "none", outlineOffset: 2, flex: "none" }}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => void save()}
                  aria-disabled={!trimmed || undefined}
                  aria-busy={saving || undefined}
                  className="mind-web-press"
                  style={{ ...mindPrimary, marginInlineStart: "auto", padding: "0 18px", opacity: trimmed ? 1 : 0.5, cursor: trimmed ? "pointer" : "default" }}
                >
                  {saving && <Loader2 size={16} className="animate-spin" aria-hidden />}
                  {panel.mode === "edit" ? t("Save changes") : t("Add habit")}
                </button>
              </div>
              {panelError && (
                <p id="habit-web-error" role="alert" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>
                  {t(panelError)}
                </p>
              )}
            </div>
          )}

          {habitsLoading && habits.length === 0 ? (
            <div aria-busy="true" className="flex flex-col" style={{ gap: 10 }}>
              <span className="sr-only" role="status">{t("Loading your habits…")}</span>
              {[0, 1, 2].map((i) => (
                <div key={i} aria-hidden className="bg-cream-soft animate-skeleton-pulse" style={{ height: 64, borderRadius: 20 }} />
              ))}
            </div>
          ) : habits.length > 0 ? (
            <div data-mind-habit-list className="flex flex-col overflow-hidden" style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)" }}>
              {habits.map(row)}
            </div>
          ) : (
            !habitsError && (
              <div className="flex flex-col items-center justify-center text-center" style={{ flex: "none", padding: "40px 24px", borderRadius: 20, background: "#F5F5F6", gap: 6 }}>
                <span className="grid place-items-center" style={{ width: 64, height: 64, borderRadius: 16, background: "#F0EDF9" }}>
                  <Leaf size={30} strokeWidth={1.5} color="#7D6BB5" aria-hidden />
                </span>
                <p style={{ margin: "10px 0 0", fontSize: 17, fontWeight: 700, color: "#241F1B" }}>{t("No habits yet")}</p>
                <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#71685E" }}>{hideNumbers ? t("Add one to get started") : t("Add a habit to start a streak.")}</p>
              </div>
            )
          )}
        </div>

        <aside data-mind-habits-auto className="flex flex-col" style={{ minWidth: 0, gap: 12 }}>
          {autoStreaks.length > 0 && (
            <>
              <p style={mindCaps}>{t("Auto-tracked")}</p>
              <div className="flex flex-col overflow-hidden" style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)" }}>
                {autoStreaks.map((s, i) => {
                  const Icon = s.category ? AUTO_ICON[s.category] : Flame;
                  const label = s.category ? t(AUTO_LABEL[s.category]) : s.label.replace(/\s*streak$/i, "");
                  return (
                    <div key={s.id} className="flex items-center" style={{ flex: "none", minHeight: 56, gap: 12, padding: "0 16px", borderTop: line(i) }}>
                      <span className="grid place-items-center" style={{ width: 36, height: 36, borderRadius: 10, background: "#F0EDF9", flex: "none" }}>
                        <Icon size={18} strokeWidth={1.75} color="#7D6BB5" aria-hidden />
                      </span>
                      <span className="truncate" style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 600, color: "#241F1B" }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#4F7F78", fontVariantNumeric: "tabular-nums" }}>{s.days}</span>
                    </div>
                  );
                })}
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("Auto streaks count from what you log across the app.")}</p>
            </>
          )}
        </aside>
      </div>

      <PopupMenu<"edit" | "archive" | "delete">
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        rowLineHeight={16}
        options={[
          menu && fromCoach(menu.habit)
            ? { value: "edit", label: t("Edit"), icon: <Pencil size={15} strokeWidth={1.75} />, disabled: true, note: t(COACH_HABIT_LOCKED) }
            : { value: "edit", label: t("Edit"), icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "archive", label: t("Archive"), icon: <Archive size={15} strokeWidth={1.75} /> },
          { value: "delete", label: t("Delete"), icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true, disabled: !!menu && fromCoach(menu.habit) },
        ]}
        onSelect={(v) => {
          if (!menu) return;
          if (v === "edit") openEdit(menu.habit, menu.anchor);
          else if (v === "archive") archive(menu.habit);
          else {
            openerRef.current = menu.anchor;
            setDeleting(menu.habit);
          }
        }}
      />
      <ConfirmCard
        open={!!deleting}
        title={t("Delete habit?")}
        subtitle={deleting ? t("Its streak and history are removed.") : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void removeHabit(deleting.id).then(failed);
          setDeleting(null);
        }}
      />
      <Toast
        open={!!toast}
        message={toast ? t(toast.message) : ""}
        tone={toast?.undo ? "default" : "error"}
        onUndo={toast?.undo ? () => undoArchive(toast.undo!) : undefined}
        onExpire={() => setToast(null)}
      />
    </MindSectionWeb>
  );
}
