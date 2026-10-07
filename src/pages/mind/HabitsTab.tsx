import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { PinnedCta, PinnedSlot } from "../../components/ui/PinnedCta";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { useApp } from "../../context/AppContext";
import { Check, EllipsisVertical, ListChecks, Pencil, Plus, Trash2, X } from "lucide-react";
import { StreakLeaf } from "../../components/icons/StreakLeaf";
import clsx from "clsx";
import { habitIcon, habitIconOptions } from "../../utils/icons";
import { shiftDate } from "../../utils/date";
import { WhiteMark } from "../../components/forum/parts";
import { textPx } from "../../theme/textSize";
import type { HabitIconKey, HabitItem } from "../../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COL = 28; // one day column, centre to centre (MO1.1.1)

// Foundations › Inputs, focused: border 1.5 px primary.accent (a 1 px border
// plus a 0.5 px ring, so nothing shifts), as on the Journal fields.
const FOCUS_RING =
  "focus:outline-none focus:border-primary-accent focus:shadow-[0_0_0_0.5px_rgb(var(--c-primary-accent))]";

/** The Monday-first week holding `today`, as yyyy-mm-dd. */
function weekOf(today: string): string[] {
  const dow = (new Date(`${today}T00:00:00`).getDay() + 6) % 7; // Mon = 0
  const monday = shiftDate(today, -dow);
  return DAY_NAMES.map((_, i) => shiftDate(monday, i));
}

// The Habits tab, mobile v5.1 MO1.1.1 (week grid) and MO1.1.1.1 (add panel).
//
// HABITS ARE SERVER ROWS NOW (habit_items + habit_completions), so this screen
// has the three states every other server-backed screen has: loading, empty,
// and an error that never reads as "you have none". A tick is a row dated with
// the user's own local date, which is why the same boxes look the same on a
// phone and a laptop.
//
// ANY DAY OF THE WEEK UP TO TODAY IS TICKED HERE (the frame ticks earlier
// days; handover-complete pass, 7 October 2026). Later days are faint and
// can't be ticked. A past tick counts toward achievements like any other.
//
// HANDOVER-COMPLETE PASS: Edit and Delete are the swipe tiles (a mouse can
// drag them open and the keyboard opens them with ArrowLeft on a focused
// row), and the habit's name is not a tick target. Deleting still asks first:
// it erases the habit's history (data safety).
//
// RESTORE ROUND (user, 7 October 2026): the ⋮ and the long-press /
// right-click menu are back (D12), with the same Edit / Delete as before, in
// Foundations' dropdown with the folder options' 36 pt rows. The ⋮ is the
// mouse and keyboard path; the swipe tiles stay.
//
// LIGHT MODE KEEPS THE COLOURS OF WHAT EACH PART REPLACED (decision 15): the
// round check, the icon tile and the streak chip are the old row's. Parts new
// since the redesign take the frame's own colours (decision 22): the header
// band and wordmark, today's column and date tile, and the filled pinned Add
// habit. Edit and Delete sit behind a
// swipe, as in Journal and Workout › History. Dark mode is the v5.1 set; a
// tick there is the dark filled-control ink on the purple (white measured
// about 2.6:1 on #A991FE). An empty ring for today or an earlier day is
// #807C93 in dark: 4.1:1 on the card and 3.2:1 on the today column in every
// accent (a control's outline needs 3:1). Later days stay faint: they can't
// be ticked. Light mode is unchanged (A26).
export default function HabitsTab() {
  const {
    today,
    habits,
    habitsLoading,
    habitsError,
    habitSuggestions,
    toggleHabit,
    addHabit,
    removeHabit,
    renameHabit,
  } = useApp();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState<HabitIconKey>(habitIconOptions[0].key);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  // Deleting a habit erases its history and streak, so it asks first (the
  // same confirm as a Journal folder).
  const [deleting, setDeleting] = useState<HabitItem | null>(null);
  // D12: Edit and Delete without a swipe, from a long-press or right-click
  // on the row or its ⋮ button, in the shared dropdown menu.
  const [menu, setMenu] = useState<{ habit: HabitItem; anchor: HTMLElement } | null>(null);
  const startEdit = (h: HabitItem) => {
    setEditingId(h.id);
    setEditDraft(h.label);
  };

  const week = weekOf(today);
  const todayIndex = week.indexOf(today);

  const create = () => {
    if (!newLabel.trim()) return;
    addHabit(newLabel.trim(), newIcon);
    setNewLabel("");
    setNewIcon(habitIconOptions[0].key);
    setAdding(false);
  };

  const saveRename = (id: string) => {
    if (editDraft.trim()) renameHabit(id, editDraft.trim());
    setEditingId(null);
  };

  // WHAT IS STILL ON OFFER. A suggestion the account already has a habit for
  // is not offered again, matched on the label the suggestion would create.
  const taken = new Set(habits.map((h) => h.label.trim().toLowerCase()));
  const suggestions = habitSuggestions.filter((s) => !taken.has(s.label.toLowerCase()));

  // MO1.1.1 Loading: skeleton blocks at the anatomy positions, fill
  // surface.soft, each block's radius: the grid card (r20) with its 59 pt
  // header band, then rows of a 28 pt icon tile (r8), the name and the seven
  // 24 pt circles at a 28 pt pitch.
  if (habitsLoading) {
    return (
      <div className="animate-fade-slide-up" aria-busy="true">
        <span className="sr-only" role="status">Loading your habits…</span>
        <div aria-hidden className="rounded-[20px] overflow-hidden border border-charcoal/[0.08]">
          <div className="h-[59px] bg-cream-soft" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center h-[60px] pl-3 pr-2.5 border-t border-charcoal/[0.04]">
              <span className="w-7 h-7 rounded-lg bg-cream-soft shrink-0" />
              <span className="ml-2.5 h-3 w-20 rounded bg-cream-soft" />
              <span className="ml-auto flex shrink-0">
                {DAY_NAMES.map((d) => (
                  <span key={d} className="flex items-center justify-center" style={{ width: COL }}>
                    <span className="w-6 h-6 rounded-full bg-cream-soft" />
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const row = (h: HabitItem) => {
    const Icon = habitIcon[h.icon];
    const done = new Set(h.doneDates ?? []);
    if (editingId === h.id) {
      return (
        // Not drawn: the rename row (the board's "Swipe a habit left to
        // rename"), built from Foundations › Inputs (44, r12, surface.soft,
        // 14/600, focused border 1.5 primary.accent) and a text action
        // (13/700 primary.accent).
        <div className="flex items-center gap-2.5 h-[59px] pl-3 pr-3 bg-cream-card">
          <span className="w-7 h-7 rounded-lg bg-primary-pale flex items-center justify-center shrink-0">
            <Icon size={14} className="text-primary-dark" />
          </span>
          <input
            autoFocus
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editDraft.trim()) saveRename(h.id);
              if (e.key === "Escape") setEditingId(null);
            }}
            aria-label={`Rename ${h.label}`}
            className={`flex-1 min-w-0 h-11 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 text-sm font-semibold text-charcoal ${FOCUS_RING}`}
          />
          <button onClick={() => saveRename(h.id)} className="tap h-11 px-1 text-[13px] font-bold text-primary-accent">
            Save
          </button>
        </div>
      );
    }
    return (
      <SwipeActions
        radius={0}
        tileMax={45}
        edgeInset={10}
        actions={[
          {
            key: "edit",
            label: "Edit",
            icon: <Pencil size={16} />,
            onClick: () => startEdit(h),
          },
          { key: "delete", label: "Delete", icon: <Trash2 size={16} />, onClick: () => setDeleting(h), destructive: true },
        ]}
        keyboardLabel={`${h.label}. Arrow left for Edit and Delete`}
        onLongPress={(anchor) => setMenu({ habit: h, anchor })}
      >
        <div className="flex items-center h-[59px] pl-3 pr-2.5 bg-cream-card">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-primary-pale flex items-center justify-center shrink-0">
              <Icon size={14} className="text-primary-dark" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] leading-[18px] font-medium text-charcoal">{h.label}</span>
              {/* MO1.1.1 (2x frame): a 16 pt chip 3 pt under the name, the
                  count 10.5 pt, after the handover's leaf outlined in lavender, about
                  6 × 11 pt with a 1 pt stroke (decision 9 superseded). */}
              {h.streakDays > 0 && (
                <span className="mt-[3px] h-4 inline-flex items-center gap-0.5 text-[10.5px] leading-none font-bold text-charcoal-soft dark:text-teal-deep-text bg-teal-pale rounded-full px-1.5">
                  <StreakLeaf variant="outline" height={11} className="text-primary-dark dark:text-primary-deep-text" /> {h.streakDays}
                </span>
              )}
            </span>
          </div>
          {/* D12 (restore round): the keyboard and mouse path to Edit /
              Delete. The 16 pt ⋮ in text.muted (its pre-redesign colour) keeps
              its 20 pt column so the seven day columns keep their pitch; the
              target is 44 tall. */}
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
          <div className="flex shrink-0">
            {week.map((day, i) => {
              const ticked = done.has(day);
              const isToday = i === todayIndex;
              const future = i > todayIndex;
              return (
                <span
                  key={day}
                  // Today's column: #F7F5FB on the frame, #AEA1DC at about 10%
                  // (new since the redesign, decision 22).
                  className={clsx("flex items-center justify-center h-[59px]", isToday && "bg-th-aea1dc/[0.102] dark:bg-primary-pale")}
                  style={{ width: COL }}
                >
                  {!future ? (
                    <button
                      onClick={() => toggleHabit(h.id, day)}
                      aria-label={`${h.label}, ${isToday ? "today" : DAY_NAMES[i]}: ${ticked ? "done" : "not done"}`}
                      aria-pressed={ticked}
                      className={clsx(
                        "tap w-6 h-6 rounded-full flex items-center justify-center border",
                        ticked ? "bg-primary-fill border-primary-fill" : "border-charcoal/15 dark:border-[#807C93]"
                      )}
                    >
                      {ticked && <Check size={13} className="text-on-primary-fill" strokeWidth={3} />}
                    </button>
                  ) : (
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

  return (
    <div className="animate-fade-slide-up">
      {/* MO1.1.1 Empty: Foundations › Empty state (56 primary.tint tile, 26
          thin-stroke icon in primary.accent, title 15/700, one line 12.5/500
          text.muted, max width 260); the pinned Add habit stays below. The
          board names no icon: ListChecks (UNSPECIFIED). */}
      {habits.length === 0 && !habitsError && (
        <div className="flex flex-col items-center text-center py-8">
          <span className="w-14 h-14 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-accent">
            <ListChecks size={26} strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-charcoal mt-3">No habits yet</p>
          <p className="text-[12.5px] font-medium text-charcoal-muted mt-1 leading-relaxed max-w-[260px]">
            Add one of your own below, or start from a suggestion.
          </p>
        </div>
      )}

      {/* MO1.1.1 #2: the week grid. A header band with the days (today
          marked), then one 60 pt row per habit (59 plus its divider). */}
      {habits.length > 0 && (
        // MO1.1.1 (2x frame): card r20; the header band #AEA1DC at 60%
        // (#CEC7EA), 58 tall over a 1 pt hairline, with the white CENTIUM
        // wordmark at its left (C-and-leaf mark 21 wide at x 32.5, ENTIUM
        // caps 9 tall, spread to x 152.5) and today's column running through
        // it; today's name #7D67D9, its date on a 26 × 22 #AB9ED7 tile.
        // The outline keeps the pre-redesign card's 11% hairline in light (the
        // list card existed at 4fdc109: decision 22's light-colour rule; the
        // frame draws 1 px #AEA1DC).
        <Card padded={false} className="overflow-hidden !rounded-[20px]">
          <div className="flex items-center h-[59px] pl-3 pr-2.5 border-b border-charcoal/[0.04] bg-primary/60 dark:bg-primary-pale">
            <span className="flex-1 min-w-0 overflow-hidden flex items-center gap-[7px] pl-1" role="img" aria-label="Centium">
              <WhiteMark width={21} />
              <span
                aria-hidden
                className="text-white font-semibold uppercase leading-none whitespace-nowrap"
                style={{ fontSize: textPx(12.5), letterSpacing: "0.73em" }}
              >
                entium
              </span>
            </span>
            <div className="flex shrink-0 self-stretch">
              {week.map((day, i) => {
                const isToday = i === todayIndex;
                return (
                  <span
                    key={day}
                    className={clsx("flex flex-col items-center justify-center", isToday && "bg-th-aea1dc/[0.102] dark:bg-transparent")}
                    style={{ width: COL }}
                  >
                    <span
                      className={clsx(
                        "text-[10px] leading-[13px] font-semibold",
                        isToday ? "text-primary-accent" : "text-charcoal-faint"
                      )}
                    >
                      {DAY_NAMES[i]}
                    </span>
                    <span
                      className={clsx(
                        "mt-[3px] h-[22px] min-w-[26px] rounded-lg flex items-center justify-center text-[13px] tabular-nums",
                        isToday ? "bg-[rgb(var(--c-fill-day))] text-on-primary-fill font-semibold" : "font-bold text-charcoal"
                      )}
                    >
                      {Number(day.slice(8))}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="divide-y divide-charcoal/[0.04]">
            {habits.map((h) => (
              <div key={h.id}>{row(h)}</div>
            ))}
          </div>
        </Card>
      )}

      {/* MO1.1.1 Error: an inline line in danger under the affected element
          (the grid it failed to load or change). A failed read or write says
          so and leaves whatever is on screen alone: "no habits" and "the
          request failed" look identical once rendered. */}
      {habitsError && (
        <p role="alert" className="mt-2.5 text-[11.5px] leading-4 font-medium text-status-high">
          {habitsError}
        </p>
      )}

      {/* D12 (restore round): a habit's Edit / Delete without a swipe, in
          Foundations' dropdown with MO1.1.2.1's 36 pt rows. Delete still asks
          first, as the swipe tile does. */}
      <PopupMenu<"edit" | "delete">
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        rowLineHeight={16}
        options={[
          { value: "edit", label: "Edit", icon: <Pencil size={15} strokeWidth={1.75} /> },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
        ]}
        onSelect={(v) => {
          if (!menu) return;
          if (v === "edit") startEdit(menu.habit);
          else setDeleting(menu.habit);
        }}
      />

      {/* Not drawn: deleting erases the habit's history and streak, so it
          asks first (data safety). */}
      <ConfirmCard
        open={!!deleting}
        title="Delete this habit?"
        subtitle={
          deleting
            ? deleting.streakDays > 0
              ? `${deleting.label}, its history and its ${deleting.streakDays}-day streak`
              : `${deleting.label} and its history`
            : undefined
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) removeHabit(deleting.id);
          setDeleting(null);
        }}
      />

      {/* The page's own padding covers 112 of the room a pinned item needs:
          the 44 pt button, or the 162 pt add panel. */}
      <div aria-hidden style={{ height: adding ? 174 : 56 }} />

      {adding ? (
        // MO1.1.1.1: "Tapping Add habit turns the button into the add panel.
        // ✓ saves, × cancels. The icon row scrolls horizontally." The
        // border keeps the pre-redesign add form's 11% hairline in light
        // (decision 22's light-colour rule; the frame draws 8%).
        <PinnedSlot aboveKeyboard>
          <Card padded={false} elevated className="rounded-[20px] py-3 pl-3.5">
            {/* SUGGESTIONS, NOT SEEDED ROWS. These five used to be written into
                every new account as habits it appeared to have made. Tapping
                one creates it — at which point it is the user's, and stops
                being offered. */}
            {suggestions.length > 0 && (
              <>
                <p className="mb-1.5 text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42] dark:text-charcoal/[0.55]">
                  Suggestions
                </p>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pr-3.5 mb-2">
                  {suggestions.map((s) => {
                    const Icon = habitIcon[s.icon];
                    return (
                      <button
                        key={s.label}
                        onClick={() => addHabit(s.label, s.icon)}
                        className="tap shrink-0 flex items-center gap-1.5 h-[26px] rounded-full bg-cream-soft px-3 text-[12px] font-semibold text-charcoal-soft"
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
            <div className="flex gap-2 overflow-x-auto no-scrollbar pr-3.5 py-0.5 pl-0.5">
              {habitIconOptions.map((opt) => {
                const Icon = habitIcon[opt.key];
                return (
                  <button
                    key={opt.key}
                    onClick={() => setNewIcon(opt.key)}
                    aria-label={opt.label}
                    aria-pressed={newIcon === opt.key}
                    className={clsx(
                      // MO1.1.1.1 (2x frame): 36 pt tiles, 44 apart.
                      "tap shrink-0 w-9 h-9 rounded-xl flex items-center justify-center",
                      newIcon === opt.key ? "bg-primary-pale ring-2 ring-primary" : "bg-cream-soft"
                    )}
                  >
                    <Icon size={16} strokeWidth={1.75} className="text-primary-dark" />
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 mt-2 pr-3.5">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") create();
                  if (e.key === "Escape") setAdding(false);
                }}
                placeholder="New habit…"
                aria-label="New habit"
                // MO1.1.1.1: 36 tall (level with the 36 pt ✓ and ×), about
                // r14; focused, Foundations › Inputs' 1.5 primary.accent border.
                className={`flex-1 min-w-0 h-9 rounded-[14px] bg-cream-soft border border-charcoal/10 px-3 text-sm ${FOCUS_RING}`}
              />
              <button
                onClick={create}
                aria-label="Save habit"
                className="tap w-9 h-9 rounded-xl bg-primary-fill text-on-primary-fill flex items-center justify-center shrink-0"
              >
                <Check size={15} />
              </button>
              <button
                onClick={() => setAdding(false)}
                aria-label="Close"
                className="tap w-9 h-9 rounded-xl bg-cream-soft text-charcoal-faint flex items-center justify-center shrink-0"
              >
                <X size={15} />
              </button>
            </div>
          </Card>
        </PinnedSlot>
      ) : (
        <PinnedCta
          // MO1.1.1 #3: 44 tall, radius 12 (the frame; C-01 no longer applies).
          size="base"
          primary={{
            label: "Add habit",
            icon: <Plus size={15} />,
            // MO1.1.1 #3: filled #A198DF (--c-fill-cta, primary.cta.alt),
            // 13.5/700 white (decision 23).
            className: "!text-[13.5px] !bg-[rgb(var(--c-fill-cta))]",
            onClick: () => setAdding(true),
          }}
        />
      )}
    </div>
  );
}
