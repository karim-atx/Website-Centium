import { useState } from "react";
import { Card } from "../../components/ui/Card";
import { SwipeActions } from "../../components/ui/SwipeActions";
import { PinnedCta, PinnedSlot } from "../../components/ui/PinnedCta";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { useApp } from "../../context/AppContext";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Check, EllipsisVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import { StreakLeaf } from "../../components/icons/StreakLeaf";
import clsx from "clsx";
import { habitIcon, habitIconOptions } from "../../utils/icons";
import { shiftDate } from "../../utils/date";
import { WhiteMark } from "../../components/forum/parts";
import { textPx } from "../../theme/textSize";
import type { HabitIconKey, HabitItem } from "../../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COL = 28; // one day column, centre to centre (MO1.1.1)

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
// ONLY TODAY IS TICKED HERE, as before: the week's earlier days show what was
// done and later days are empty. Ticking a past day would be a new ability
// (and would count toward achievements), so it waits for a decision.
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
  // D12: Edit and Delete without a swipe, from a long-press on the row or
  // its ⋮ button, in the shared dropdown menu.
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

  if (habitsLoading) {
    return (
      <div className="animate-fade-slide-up">
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Loading…</p>
        </Card>
      </div>
    );
  }

  const row = (h: HabitItem) => {
    const Icon = habitIcon[h.icon];
    const done = new Set(h.doneDates ?? []);
    if (editingId === h.id) {
      return (
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
            className="flex-1 min-w-0 rounded-lg bg-cream-soft border border-charcoal/10 px-2 py-1 text-sm"
          />
          <button onClick={() => saveRename(h.id)} className="tap text-xs font-semibold text-primary">
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
        onLongPress={(anchor) => setMenu({ habit: h, anchor })}
      >
        <div className="flex items-center h-[59px] pl-3 pr-2.5 bg-cream-card">
          {/* Tapping the habit still ticks today, as it always has. */}
          <button onClick={() => toggleHabit(h.id)} className="tap flex items-center gap-2.5 flex-1 min-w-0 text-left">
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
          </button>
          {/* D12: the keyboard and mouse path to Edit / Delete. */}
          <button
            onClick={(e) => setMenu({ habit: h, anchor: e.currentTarget })}
            aria-label={`${h.label}, more options`}
            aria-haspopup="menu"
            aria-expanded={menu?.habit.id === h.id}
            className="tap w-5 h-8 mr-0.5 rounded-md flex items-center justify-center shrink-0 text-charcoal-faint"
          >
            <EllipsisVertical size={16} />
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
                  {isToday ? (
                    <button
                      onClick={() => toggleHabit(h.id)}
                      aria-label={`${h.label}, today: ${ticked ? "done" : "not done"}`}
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
                      aria-label={`${DAY_NAMES[i]}: ${ticked ? "done" : future ? "upcoming" : "not done"}`}
                      role="img"
                      className={clsx(
                        "w-6 h-6 rounded-full flex items-center justify-center border",
                        ticked ? "bg-primary-fill border-primary-fill" : future ? "border-charcoal/[0.06]" : "border-charcoal/15 dark:border-[#807C93]"
                      )}
                    >
                      {ticked && <Check size={13} className="text-on-primary-fill" strokeWidth={3} />}
                    </span>
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
      {/* A FAILED READ OR WRITE SAYS SO, and leaves whatever is on screen
          alone. "No habits" and "the request failed" look identical once
          rendered, and only one of them is true. */}
      {habitsError && (
        <p className="mb-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {habitsError}
        </p>
      )}

      {habits.length === 0 && !habitsError && (
        <Card className="text-center py-7 mb-4">
          <p className="text-sm font-semibold text-charcoal mb-1">No habits yet</p>
          <p className="text-[12.5px] text-charcoal-soft leading-relaxed px-4">
            Add one of your own below, or start from a suggestion.
          </p>
        </Card>
      )}

      {/* MO1.1.1 #2: the week grid. A header band with the days (today
          marked), then one 60 pt row per habit (59 plus its divider). */}
      {habits.length > 0 && (
        // MO1.1.1 (2x frame): card r20; the header band #AEA1DC at 60%
        // (#CEC7EA), 58 tall over a 1 pt hairline, with the white CENTIUM
        // wordmark at its left (C-and-leaf mark 21 wide at x 32.5, ENTIUM
        // caps 9 tall, spread to x 152.5) and today's column running through
        // it; today's name #7D67D9, its date on a 26 × 22 #AB9ED7 tile.
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

      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
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
          the 48 pt button, or the 162 pt add panel. */}
      <div aria-hidden style={{ height: adding ? 174 : 60 }} />

      {adding ? (
        // MO1.1.1.1: "Tapping Add habit turns the button into the add panel.
        // ✓ saves, × cancels. The icon row scrolls horizontally."
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
                // MO1.1.1.1: 36 tall (level with the 36 pt ✓ and ×), about r14.
                className="flex-1 min-w-0 h-9 rounded-[14px] bg-cream-soft border border-charcoal/10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
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
          primary={{
            label: "Add habit",
            icon: <Plus size={15} />,
            // MO1.1.1 #3: filled #A198DF (--c-fill-cta, primary.cta.alt),
            // 13.5/700 white (decision 23); 48/r14 per C-01.
            className: "!text-[13.5px] !bg-[rgb(var(--c-fill-cta))]",
            onClick: () => setAdding(true),
          }}
        />
      )}
    </div>
  );
}
