import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { PinnedCta, PinnedSlot } from "../../components/ui/PinnedCta";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import { MindHeader } from "../../components/mind/MindHeader";
import { CentiumMark, EntiumWordmark } from "../../components/icons/CentiumMark";
import { useApp } from "../../context/AppContext";
import { Archive, Check, EllipsisVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { StreakLeaf } from "../../components/icons/StreakLeaf";
import clsx from "clsx";
import { habitIcon, habitIconOptions } from "../../utils/icons";
import { shiftDate } from "../../utils/date";
import { useIsDark } from "../../hooks/useIsDark";
import {
  DUPLICATE_HABIT,
  HABIT_LIMITS,
  HABIT_SAVE_FAILED as SAVE_FAILED,
  TOO_MANY_HABITS,
  habitShade,
  isDuplicateLabel,
  nextHabitColour,
} from "../../services/habits";
import type { HabitColour, HabitIconKey, HabitItem } from "../../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COL = 28; // one day column, centre to centre (MO1.1.1 #18: x 172.2 → 200.2)

/** OURS: the toast after Archive (the menu's B3 action), with Undo. */
const ARCHIVED = "Habit archived. Its history is kept.";
/** The panel's rule lines (O3, O4); anything else is the O5 / O4 copy. */
const PANEL_RULES = new Set([DUPLICATE_HABIT, TOO_MANY_HABITS]);

/** The Monday-first week holding `today`, as yyyy-mm-dd. */
function weekOf(today: string): string[] {
  const dow = (new Date(`${today}T00:00:00`).getDay() + 6) % 7; // Mon = 0
  const monday = shiftDate(today, -dow);
  return DAY_NAMES.map((_, i) => shiftDate(monday, i));
}

// The Habits page, v6 Part B MO1.1.1 (week grid) and MO1.1.1.1 (add panel).
// The checklists in design-handover/v5-partB/frame-check/MO1.1.1*.md hold the
// literal values; the row numbers below are theirs.
//
// HABITS ARE SERVER ROWS (habit_items + habit_completions): loading, empty and
// a read error that never reads as "you have none" (O1–O3). A failed WRITE
// puts things back and shows the handover's toast (O4); it never turns into
// the read's banner.
//
// ANY DAY OF THE WEEK UP TO TODAY IS TICKED (S2); later days are faint and
// inert. Habits has no fixed area (the handover scopes that rule to Journal,
// Achievements and Meditation), so its header scrolls.
//
// KEPT (K rows): the ⋮ and long-press menu, the keyboard path, per-circle
// accessible names, the achievement refresh after a tick, the tick revert, the
// unknown-icon fallback, Monday weeks. Edit opens the add panel prefilled (S5);
// Delete asks first with the handover's copy (S6, K3 data safety).
//
// DATABASE B3 (wired): the habit colour (PB-O-01): tapping a row's icon tile
// cycles lavender → teal → gold → rose → sky and saves at once (S3); in the
// panel the selected icon tile carries the colour and a second tap cycles it
// (MO1.1.1.1 S3). The server's rules come back as the checklist's copy:
// ATXA8 → "You can keep up to 30 habits.", ATXA9 → the duplicate-name line,
// ATXB0 (a tick outside this week) → the O4 toast. The 40-character name is
// the screen's rule (the database keeps 80). Archive (OURS, in the ⋮ and
// long-press menu) keeps a habit's history and frees its name and its place
// in the thirty; the toast offers Undo.
//
// DARK (V6-02, V6-92): a tick, the ✓ and the Plus on the primary fill keep the
// #0D0B1A ink (white is about 2.6:1 on #A991FE), and an empty ring for today or
// an earlier day keeps #807C93 (the drawn #F5F3FA@15% is about 1.6:1; a
// control outline needs 3:1).
export default function HabitsTab() {
  const {
    today,
    habits,
    habitsLoading,
    habitsError,
    habitSuggestions,
    toggleHabit,
    addHabit,
    updateHabit,
    setHabitColour,
    archiveHabit,
    removeHabit,
    reloadHabits,
    accessibility,
  } = useApp();
  const dark = useIsDark();
  // The tile and icon of a habit colour; null = lavender, the theme classes.
  const shadeOf = (c: HabitColour | undefined) => habitShade(c, dark, !!accessibility.highContrast);
  // The panel (MO1.1.1.1): closed, adding, or editing one habit (S5).
  const [panel, setPanel] = useState<{ mode: "add" } | { mode: "edit"; habit: HabitItem } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<HabitIconKey>(habitIconOptions[0].key);
  const [newColour, setNewColour] = useState<HabitColour>("lavender");
  const [saving, setSaving] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  // Deleting a habit erases its history and streak, so it asks first.
  const [deleting, setDeleting] = useState<HabitItem | null>(null);
  // D12: Edit and Delete without a swipe, from a long-press or right-click on
  // the row or its ⋮ button.
  const [menu, setMenu] = useState<{ habit: HabitItem; anchor: HTMLElement } | null>(null);
  // O4: a failed write (tick, colour, rename, delete) says so in the shared
  // toast; an archive says so with Undo (`undo` = the habit's id).
  const [toast, setToast] = useState<{ id: number; message: string; undo?: string } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  const week = weekOf(today);
  const todayIndex = week.indexOf(today);

  const failed = (message: string | null) => {
    if (message) setToast({ id: Date.now(), message: SAVE_FAILED });
  };

  const openAdd = () => {
    setNewLabel("");
    setNewIcon(habitIconOptions[0].key);
    setNewColour("lavender");
    setPanelError(null);
    setPanel({ mode: "add" });
  };
  const openEdit = (h: HabitItem) => {
    setNewLabel(h.label);
    setNewIcon(h.icon);
    setNewColour(h.colour ?? "lavender");
    setPanelError(null);
    setPanel({ mode: "edit", habit: h });
  };

  // S3: the next colour, saved at once; a refused write puts it back (O4).
  const cycleColour = (h: HabitItem) => void setHabitColour(h.id, nextHabitColour(h.colour)).then(failed);

  // B3 archive (OURS): off the list, history kept; Undo brings it back.
  const archive = (h: HabitItem) =>
    void archiveHabit(h.id).then((error) => {
      if (error) failed(error);
      else setToast({ id: Date.now(), message: ARCHIVED, undo: h.id });
    });
  const undoArchive = (id: string) => {
    setToast(null);
    void archiveHabit(id, false).then((error) => {
      if (error) setToast({ id: Date.now(), message: PANEL_RULES.has(error) ? error : SAVE_FAILED });
    });
  };
  const closePanel = () => {
    if (saving) return;
    setPanel(null);
    setPanelError(null);
  };

  const editingId = panel?.mode === "edit" ? panel.habit.id : undefined;
  const trimmed = newLabel.trim();
  // O3: the handover's duplicate check, ignoring case and outer spaces, before
  // the write (the server's ATXA9 says the same among active habits).
  const duplicate = trimmed !== "" && isDuplicateLabel(trimmed, habits, editingId);

  const save = async () => {
    if (saving || !panel || !trimmed) return;
    if (duplicate) {
      setPanelError(DUPLICATE_HABIT);
      return;
    }
    // O4 (OURS copy): up to 30 active habits, said before the write; the
    // server refuses a 31st too (B3 ATXA8), mapped to the same line.
    if (panel.mode === "add" && habits.length >= HABIT_LIMITS.maxHabits) {
      setPanelError(TOO_MANY_HABITS);
      return;
    }
    setSaving(true);
    setPanelError(null);
    const error =
      panel.mode === "edit"
        ? await updateHabit(panel.habit.id, { label: trimmed, icon: newIcon, colour: newColour })
        : await addHabit(trimmed, newIcon, newColour);
    setSaving(false);
    // S5 / O5: the panel closes only once the write landed; a failure keeps
    // it open with what was typed, the reason under the field (the B3
    // ATXA8 / ATXA9 rules as O4 / O3, anything else the O5 line).
    if (error) setPanelError(PANEL_RULES.has(error) ? error : SAVE_FAILED);
    else setPanel(null);
  };

  // S6: a tap outside the panel discards it (the panel's own controls, menus
  // and the on-screen keyboard are inside it or not pointer targets).
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[role='menu'], [role='dialog']")) return;
      closePanel();
    };
    // Registered on the next tick so the tap that opened the panel doesn't close it.
    const id = window.setTimeout(() => document.addEventListener("pointerdown", onDown), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDown);
    };
    // closePanel reads `saving`; re-bind when it changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, saving]);

  // The page's spacer follows the panel's real height (MO1.1.1.1 #40: one icon
  // row now, and Larger text grows it).
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!panel || !el) return;
    const write = () => setPanelHeight(el.offsetHeight);
    write();
    const ro = new ResizeObserver(write);
    ro.observe(el);
    return () => ro.disconnect();
  }, [panel]);

  // WHAT IS STILL ON OFFER (K2). A suggestion the account already has a habit
  // for is not offered again, matched on the label it would create.
  const taken = new Set(habits.map((h) => h.label.trim().toLowerCase()));
  const suggestions = habitSuggestions.filter((s) => !taken.has(s.label.toLowerCase()));

  const retry = async () => {
    setRetrying(true);
    await reloadHabits();
    setRetrying(false);
  };

  // MO1.1.1 O1 Loading: the header renders at once; three skeleton blocks
  // (full width × 96, r22, surface.soft #F5F5F6 / #242730, 10 apart) pulse
  // over 1.2 s, static under Reduce motion.
  if (habitsLoading) {
    return (
      <div className="animate-fade-slide-up" aria-busy="true">
        <MindHeader section="habits" fixed={false} />
        <span className="sr-only" role="status">Loading your habits…</span>
        <div aria-hidden className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-[22px] bg-cream-soft animate-skeleton-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const row = (h: HabitItem) => {
    const Icon = habitIcon[h.icon];
    const done = new Set(h.doneDates ?? []);
    const shade = shadeOf(h.colour);
    return (
      <SwipeActions
        radius={0}
        // #22–#25: 45 pt tiles, 10 in from the card, r12, 8 apart.
        tileMax={45}
        edgeInset={10}
        tileRadius={12}
        actions={[
          { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => openEdit(h) },
          { key: "delete", label: "Delete", icon: <Trash2 size={16} />, onClick: () => setDeleting(h), destructive: true },
        ]}
        keyboardLabel={`${h.label}. Arrow left for Edit and Delete`}
        onLongPress={(anchor) => setMenu({ habit: h, anchor })}
      >
        {/* #12: rows 59 + the 1 px divider (pitch 60); min-height so Larger
            text can wrap the name to two lines (O8). */}
        <div className="flex items-center min-h-[59px] pl-3 pr-[7px] bg-cream-card">
          <div className="flex items-center gap-2.5 flex-1 min-w-0 py-1.5">
            {/* #13 / #14 / S3: the 28 r8 tile in the habit's colour (lavender
                #F0EDF9 / #303141 with #7D6BB5 / #C3B3FB through the theme;
                teal, gold, rose, sky from habitShade), a button with a 44 pt
                target that cycles the colour and saves it at once. */}
            <button
              type="button"
              onClick={() => cycleColour(h)}
              aria-label={`${h.label} colour: ${h.colour ?? "lavender"}. Tap to change`}
              className={clsx(
                "tap relative w-7 h-7 rounded-lg flex items-center justify-center shrink-0 after:absolute after:-inset-2 after:content-['']",
                !shade && "bg-primary-pale"
              )}
              style={shade ? { background: shade.tile } : undefined}
            >
              <Icon size={14} className={shade ? undefined : "text-primary-dark"} style={shade ? { color: shade.ink } : undefined} aria-hidden />
            </button>
            <span className="min-w-0">
              {/* #15: 13/18 600; one line (two under Larger text), then an ellipsis. */}
              <span className="line-clamp-1 [.larger-text_&]:line-clamp-2 break-words text-[13px] leading-[18px] font-semibold text-charcoal">
                {h.label}
              </span>
              {/* #16 / #17: a 16 pt chip 3 under the name, pad 1 6, 10/14
                  700, #5B5349 / #B8B3C7 on #EAF4F2 / #293339, after the
                  outlined lavender leaf 11 tall (decision 24). */}
              {h.streakDays > 0 && (
                <span className="mt-[3px] min-h-4 w-fit flex items-center gap-0.5 text-[10px] leading-[14px] font-bold text-charcoal-soft bg-teal-pale rounded-full px-1.5 py-px">
                  <StreakLeaf variant="outline" height={11} className="text-primary-dark dark:text-primary-deep-text" /> {h.streakDays}
                </span>
              )}
            </span>
          </div>
          {/* K1 (D12 restore round): the keyboard and mouse path to Edit /
              Delete, a 16 pt ⋮ in text.muted in a 20 pt column (the day
              columns keep their pitch), 44 tall. */}
          <button
            type="button"
            onClick={(e) => setMenu({ habit: h, anchor: e.currentTarget })}
            aria-label={`${h.label}, more options`}
            aria-haspopup="menu"
            aria-expanded={menu?.habit.id === h.id}
            className="tap w-5 h-11 mr-0.5 rounded-md flex items-center justify-center shrink-0 text-charcoal-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-accent"
          >
            <EllipsisVertical size={16} aria-hidden />
          </button>
          <div className="flex shrink-0 self-stretch -my-px">
            {week.map((day, i) => {
              const ticked = done.has(day);
              const isToday = i === todayIndex;
              const future = i > todayIndex;
              return (
                <span
                  key={day}
                  // #6: today's column #AEA1DC@10% / #A991FE@10%, through the rows and the band.
                  className={clsx("flex items-center justify-center", isToday && "bg-primary/10")}
                  style={{ width: COL }}
                >
                  {!future ? (
                    <button
                      onClick={() => void toggleHabit(h.id, day).then(failed)}
                      aria-label={`${h.label}, ${isToday ? "today" : DAY_NAMES[i]}: ${ticked ? "done" : "not done"}`}
                      aria-pressed={ticked}
                      className={clsx(
                        // #18 / #29: 24 rings, 1 pt; done #AEA1DC / #A991FE.
                        "tap w-6 h-6 rounded-full flex items-center justify-center border",
                        ticked ? "bg-primary-fill border-primary-fill" : "border-charcoal/15 dark:border-[#807C93]"
                      )}
                    >
                      {ticked && <Check size={13} className="text-on-primary-fill" strokeWidth={3} />}
                    </button>
                  ) : (
                    // #20: later days, a faint ring, not a control.
                    <span
                      aria-label={`${DAY_NAMES[i]}: upcoming`}
                      role="img"
                      className="w-6 h-6 rounded-full flex items-center justify-center border border-charcoal/[0.06]"
                    />
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </SwipeActions>
    );
  };

  const deletingSubtitle = "Its streak and history are removed.";

  return (
    <div className="animate-fade-slide-up">
      <MindHeader section="habits" fixed={false} />

      {/* O3 / O5: the read failed (or the device is offline). A banner under
          the header with Retry; whatever was loaded stays on screen. */}
      {habitsError && (
        <div role="alert" className="mb-2.5 flex items-center gap-3 rounded-xl bg-status-high-bg p-3">
          <p className="flex-1 min-w-0 text-[12px] leading-4 font-semibold text-status-high">
            Couldn't load. Check your connection.
          </p>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
            className="tap relative shrink-0 text-[12px] leading-4 font-bold text-status-high after:absolute after:-inset-3 after:content-['']"
          >
            {retrying ? <Loader2 size={14} className="animate-spin" aria-label="Retrying" /> : "Retry"}
          </button>
        </div>
      )}

      {/* #5: the week grid, 358 wide, r24, 1 pt #AEA1DC / #A991FE outline.
          The header band and its week stay on the empty state too (O2). */}
      {(habits.length > 0 || !habitsError) && (
        <div className="rounded-[24px] border border-primary bg-cream-card overflow-hidden mb-4">
          {/* #7: the band, 58 + a 1 pt hairline, #AEA1DC@60% / #A991FE@60%. */}
          <div className="flex items-center h-[59px] pl-3.5 pr-[7px] border-b border-charcoal/[0.04] bg-primary/60">
            {/* #8 / #9: the white mark 24 × 24, then the white "ENTIUM"
                wordmark 91.6 × 10, 6 apart; white in every theme. */}
            <span className="flex-1 min-w-0 overflow-hidden flex items-center gap-1.5" role="img" aria-label="Centium">
              <span aria-hidden className="w-6 h-6 flex items-center justify-center shrink-0">
                <CentiumMark height={24} variant="white" />
              </span>
              <EntiumWordmark height={10} className="text-white" style={{ overflow: "visible" }} />
            </span>
            <div className="flex shrink-0 self-stretch -mb-px">
              {week.map((day, i) => {
                const isToday = i === todayIndex;
                return (
                  <span
                    key={day}
                    className={clsx("flex flex-col items-center justify-center", isToday && "bg-primary/10")}
                    style={{ width: COL }}
                  >
                    {/* #10: 10/12 600 #8C8378 / #B8B3C7; today #7D67D9 (K8). */}
                    <span
                      className={clsx(
                        "text-[10px] leading-[12px] font-semibold",
                        isToday ? "text-primary-accent" : "text-charcoal-faint"
                      )}
                    >
                      {DAY_NAMES[i]}
                    </span>
                    {/* #11: 26 × 26 r9, 13/19.5 700; today on the #AB9ED7 tile. */}
                    <span
                      className={clsx(
                        "mt-[3px] h-[26px] min-w-[26px] rounded-[9px] flex items-center justify-center text-[13px] leading-[19.5px] font-bold tabular-nums",
                        isToday ? "bg-[rgb(var(--c-fill-day))] text-on-primary-fill" : "text-charcoal"
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          {habits.length > 0 ? (
            <div className="divide-y divide-charcoal/[0.04]">
              {habits.map((h) => (
                <div key={h.id}>{row(h)}</div>
              ))}
            </div>
          ) : (
            // O2: the grid header stays; two centred lines in its body.
            <div className="flex flex-col items-center text-center px-6 py-8">
              <p className="text-[15px] font-bold text-charcoal">No habits yet</p>
              <p className="mt-1 text-[12px] font-medium text-charcoal-faint">Add one to start a streak</p>
            </div>
          )}
        </div>
      )}

      {/* K2 (D12 restore round): Edit / Delete without a swipe, and (B3,
          OURS) Archive between them: history kept, name and place freed. */}
      <PopupMenu<"edit" | "archive" | "delete">
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        rowLineHeight={16}
        options={[
          { value: "edit", label: "Edit", icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "archive", label: "Archive", icon: <Archive size={15} strokeWidth={1.75} /> },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={(v) => {
          if (!menu) return;
          if (v === "edit") openEdit(menu.habit);
          else if (v === "archive") archive(menu.habit);
          else setDeleting(menu.habit);
        }}
      />

      {/* S6 / K3: the handover's delete confirm (data safety). */}
      <ConfirmCard
        open={!!deleting}
        title="Delete habit?"
        subtitle={deleting ? deletingSubtitle : undefined}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) void removeHabit(deleting.id).then(failed);
          setDeleting(null);
        }}
      />

      {/* O4: a failed tick, colour, edit or delete; or an archive with Undo. */}
      <Toast
        open={!!toast}
        message={toast?.message ?? ""}
        tone={toast?.undo ? "default" : "error"}
        onUndo={toast?.undo ? () => undoArchive(toast.undo!) : undefined}
        onExpire={() => setToast(null)}
      />

      {/* The page's own padding covers 112 of the room a pinned item needs:
          the 44 pt button (56 more), or the panel (its height + 12). */}
      <div aria-hidden style={{ height: panel ? panelHeight + 12 : 56 }} />

      {panel ? (
        // MO1.1.1.1 #40: the panel, 358 wide, r20, pad 12 0 12 14, 1 px
        // #241F1B@8% / #F5F3FA@8%, the soft shadow in light only.
        <PinnedSlot aboveKeyboard>
          <div
            ref={panelRef}
            role="group"
            aria-label={panel.mode === "edit" ? "Edit habit" : "Add habit"}
            className="rounded-[20px] bg-cream-card border border-charcoal/[0.08] shadow-soft dark:shadow-none pt-3 pb-3 pl-3.5"
          >
            {/* #41: "Icon", 9/13.5 700, 1.8 tracking, uppercase, 42% ink. */}
            <p className="mb-1.5 text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42]">Icon</p>
            {/* #42–#57: the app's 20 icons (D-1) in one scrolling row, 38 r11
                tiles 46 apart, 18 icons in #5B5349 / #B8B3C7; the first on
                the panel padding (its ring has 2 px of room). */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar -ml-0.5 pl-0.5 pr-3.5 py-[3px] [-webkit-overflow-scrolling:touch]">
              {habitIconOptions.map((opt) => {
                const Icon = habitIcon[opt.key];
                const selected = newIcon === opt.key;
                // S3 (OURS placement, D7): the selected tile wears the habit's
                // colour; tapping it again cycles the colour.
                const shade = selected ? shadeOf(newColour) : null;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => (selected ? setNewColour(nextHabitColour(newColour)) : setNewIcon(opt.key))}
                    aria-label={selected ? `${opt.label}, ${newColour}. Tap again to change colour` : opt.label}
                    aria-pressed={selected}
                    className={clsx(
                      "tap shrink-0 w-[38px] h-[38px] rounded-[11px] flex items-center justify-center",
                      // S1 (OURS fill): selected #F0EDF9 / #303141 (or the
                      // habit's colour) with a 2 px primary ring.
                      selected ? clsx("ring-2 ring-primary", !shade && "bg-primary-pale") : "bg-cream-soft"
                    )}
                    style={shade ? { background: shade.tile } : undefined}
                  >
                    <Icon
                      size={18}
                      strokeWidth={1.75}
                      className={selected ? (shade ? undefined : "text-primary-dark") : "text-charcoal-soft"}
                      style={shade ? { color: shade.ink } : undefined}
                    />
                  </button>
                );
              })}
            </div>

            {/* #58–#64: offers, not seeded rows (K3); one the account already
                has is not offered (K2). Hidden while editing. Tapping one
                fills the name and the icon (S4); ✓ creates it. */}
            {panel.mode === "add" && suggestions.length > 0 && (
              <>
                <p className="mt-2.5 mb-[5px] text-[9px] leading-[13.5px] font-bold tracking-[1.8px] uppercase text-charcoal/[0.42]">
                  Suggestions
                </p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pr-3.5">
                  {suggestions.map((s) => {
                    const Icon = habitIcon[s.icon];
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setNewLabel(s.label);
                          setNewIcon(s.icon);
                          setPanelError(null);
                        }}
                        className="tap shrink-0 flex items-center gap-1.5 h-[26px] rounded-full bg-cream-soft px-3 text-[12px] leading-[18px] font-semibold text-charcoal-soft"
                      >
                        <Icon size={13} className="text-primary-dark" />
                        {s.label}
                        <Plus size={12} className="text-charcoal-faint" />
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="flex items-center gap-2 mt-2.5 pr-3.5">
              {/* #82: 36 tall, r12, surface.soft, 1 px 10% border; up to 40
                  characters (V6-143). */}
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
                  if (e.key === "Escape") closePanel();
                }}
                placeholder="New habit…"
                aria-label={panel.mode === "edit" ? "Habit name" : "New habit"}
                aria-invalid={!!panelError || undefined}
                aria-describedby={panelError ? "habit-panel-error" : undefined}
                className={clsx(
                  "flex-1 min-w-0 min-h-9 rounded-xl bg-cream-soft border px-3 text-sm text-charcoal placeholder:text-charcoal-faint",
                  "focus:outline-none focus:border-primary-accent focus:shadow-[0_0_0_0.5px_rgb(var(--c-primary-accent))]",
                  panelError === DUPLICATE_HABIT ? "!border-status-high" : "border-charcoal/10"
                )}
              />
              {/* #83 / #84: ✓ 36 r12 on the primary fill; disabled at 40%
                  while the name is empty (O1); a spinner while saving (O2). */}
              <button
                type="button"
                onClick={() => void save()}
                aria-label={panel.mode === "edit" ? "Save changes" : "Save habit"}
                aria-disabled={!trimmed || undefined}
                aria-busy={saving || undefined}
                className={clsx(
                  "tap w-9 h-9 rounded-xl bg-primary-fill text-on-primary-fill flex items-center justify-center shrink-0",
                  !trimmed && "opacity-40 cursor-default"
                )}
              >
                {saving ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Check size={15} />}
              </button>
              {/* #85 / #86 */}
              <button
                type="button"
                onClick={closePanel}
                aria-label="Close"
                className="tap w-9 h-9 rounded-xl bg-cream-soft text-charcoal-faint flex items-center justify-center shrink-0"
              >
                <X size={15} />
              </button>
            </div>
            {/* O3 / O4 / O5: 11/600 in danger under the field row. */}
            {panelError && (
              <p id="habit-panel-error" role="alert" className="mt-1.5 pr-3.5 text-[11px] leading-4 font-semibold text-status-high">
                {panelError}
              </p>
            )}
          </div>
        </PinnedSlot>
      ) : (
        <PinnedCta
          // #40 / #41: 44 tall, r12, #A198DF / #A991FE, 13.5/20.3 700, Plus 15.
          size="base"
          primary={{
            label: "Add habit",
            icon: <Plus size={15} />,
            className: "!text-[13.5px] !leading-[20.3px] !bg-[rgb(var(--c-fill-cta))]",
            onClick: openAdd,
          }}
        />
      )}
    </div>
  );
}
