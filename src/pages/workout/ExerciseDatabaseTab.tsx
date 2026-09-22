import { useMemo, useState } from "react";
import { Chip } from "../../components/ui/Chip";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { MUSCLE_GROUP_LABEL } from "../../utils/muscleGroups";
import type { MuscleGroup, ExerciseClassification } from "../../types";
import { List, User, Search } from "lucide-react";
import clsx from "clsx";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "../../components/workout/CreateCustomExerciseSheet";
import { BODY_ZONES } from "../../data/bodyZones";

type ViewMode = "list" | "body";
type SortMode = "alphabetical" | "muscleGroup" | "classification";

interface DbExercise {
  /**
   * The row id: a catalog uuid, or a custom exercise's own id — which may
   * still be a local `cx…` for one that has never reached the server.
   * Carried so an edit can address the row it is editing; a custom exercise
   * used to be found again by its name, which the rename it was saving had
   * just changed.
   */
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  isCustom: boolean;
}

const classificationLabel: Record<ExerciseClassification, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine_other: "Machine",
  weighted_bodyweight: "Weighted Bodyweight",
  assisted_bodyweight: "Assisted Bodyweight",
  reps_only: "Reps Only",
  cardio: "Cardio",
  duration: "Duration",
};

// Item 12 (Workout › Library › Body view): six plain-color figure PNGs (see
// public/body/) with zone overlays positioned by the handoff's own literal
// per-figure percentages in src/data/bodyZones.ts — no currentColor
// masking, which would strip the artwork's line work and teal leaf mark.
type FigureGender = "male" | "female" | "andro";
type BodySide = "front" | "back";
type FigureKey = keyof typeof BODY_ZONES;

// BODY_ZONES keys are the handoff's own (plural) zone names; MuscleGroup
// uses singular bicep/tricep. This is the only place that reconciles them.
const ZONE_KEY_TO_GROUP: Record<keyof (typeof BODY_ZONES)[FigureKey], MuscleGroup> = {
  shoulders: "shoulders",
  chest: "chest",
  back: "back",
  biceps: "bicep",
  triceps: "tricep",
  forearms: "forearms",
  core: "core",
  glutes: "glutes",
  quads: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
};

// Zone keys valid per side — front and back have asymmetric pairs
// (chest/back, biceps/triceps); BODY_ZONES carries both uniformly per
// figure, so this list is what filters to the visually-correct set.
const FRONT_ZONE_KEYS: (keyof (typeof BODY_ZONES)[FigureKey])[] = [
  "shoulders",
  "chest",
  "biceps",
  "forearms",
  "core",
  "quads",
  "calves",
];
const BACK_ZONE_KEYS: (keyof (typeof BODY_ZONES)[FigureKey])[] = [
  "shoulders",
  "back",
  "triceps",
  "forearms",
  "glutes",
  "hamstrings",
  "calves",
];

export default function ExerciseDatabaseTab() {
  const {
    exerciseCatalog,
    exerciseCatalogError,
    customExercises,
    addCustomExercise,
    updateCustomExercise,
    removeCustomExercise,
    user,
  } = useApp();
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const sideZoneKeys = bodySide === "front" ? FRONT_ZONE_KEYS : BACK_ZONE_KEYS;
  const bodyZones = sideZoneKeys.map((k) => ZONE_KEY_TO_GROUP[k]);
  // Item 12: male → male figure pair, female → female figure pair, anything
  // else (other/unset/no sex on record) → the androgynous pair.
  const figureGender: FigureGender =
    user.sex === "male" ? "male" : user.sex === "female" ? "female" : "andro";
  const figureKey = `${figureGender}-${bodySide}` as FigureKey;
  // V8 (QA 8.0): "ability to edit each exercise if pressed on in the
  // library" — a custom exercise is edited in place; a stock library
  // exercise is saved as a new custom one instead of mutating shared data.
  const [editingExercise, setEditingExercise] = useState<DbExercise | null>(null);

  const all: DbExercise[] = useMemo(() => {
    const library = exerciseCatalog.map((e) => ({
      id: e.id,
      name: e.name,
      muscleGroups: e.muscleGroups,
      secondaryMuscleGroups: e.secondaryMuscleGroups,
      classification: e.classification,
      isCustom: false,
    }));
    const custom = customExercises.map((e) => ({
      // An exercise still waiting to be uploaded has no id of its own, so it
      // falls back to the name it has always been keyed by.
      id: e.id ?? e.name,
      name: e.name,
      muscleGroups: e.muscleGroups ?? [],
      secondaryMuscleGroups: e.secondaryMuscleGroups ?? [],
      classification: e.classification,
      isCustom: true,
    }));
    return [...custom, ...library];
  }, [exerciseCatalog, customExercises]);

  const searched = useMemo(
    () => all.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())),
    [all, query]
  );

  // §6.4: "When filtering by muscle group, only go with the main muscle
  // group selection" — matches primary `muscleGroups` only, never secondary.
  const filteredByGroup = useMemo(
    () => (selectedGroup ? searched.filter((e) => e.muscleGroups.includes(selectedGroup)) : searched),
    [searched, selectedGroup]
  );

  const groups = useMemo(() => {
    if (sort === "alphabetical") {
      return [{ label: null, items: [...filteredByGroup].sort((a, b) => a.name.localeCompare(b.name)) }];
    }
    if (sort === "classification") {
      const byClass = new Map<ExerciseClassification, DbExercise[]>();
      filteredByGroup.forEach((e) => {
        const list = byClass.get(e.classification) ?? [];
        list.push(e);
        byClass.set(e.classification, list);
      });
      return Array.from(byClass.entries())
        .sort((a, b) => classificationLabel[a[0]].localeCompare(classificationLabel[b[0]]))
        .map(([key, items]) => ({
          label: classificationLabel[key],
          items: items.sort((a, b) => a.name.localeCompare(b.name)),
        }));
    }
    // muscleGroup — the generic "Other" catch-all is excluded from this
    // grouping per QA.
    const byGroup = new Map<MuscleGroup, DbExercise[]>();
    filteredByGroup.forEach((e) => {
      e.muscleGroups
        .filter((mg) => mg !== "other")
        .forEach((mg) => {
          const list = byGroup.get(mg) ?? [];
          list.push(e);
          byGroup.set(mg, list);
        });
    });
    return Array.from(byGroup.entries())
      .sort((a, b) => MUSCLE_GROUP_LABEL[a[0]].localeCompare(MUSCLE_GROUP_LABEL[b[0]]))
      .map(([key, items]) => ({
        label: MUSCLE_GROUP_LABEL[key],
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filteredByGroup, sort]);

  // Design refinement §6.4.2: highlight fills — idle transparent, hover a
  // translucent lavender wash, selected a stronger lavender fill. Values
  // differ slightly by theme so they hold against the dark ground too.
  // Item 12: front/back have different zone sets, so the current selection
  // clears on every flip rather than being carried over.
  const flipSide = () => {
    setSelectedGroup(null);
    setBodySide((s) => (s === "front" ? "back" : "front"));
  };

  return (
    <div className="animate-fade-slide-up">
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          className="w-full rounded-2xl bg-cream-soft pl-9 pr-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
        {(["list", "body"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => {
              setView(v);
              // V10 (QA 10.0): "switching between body and list resets selection"
              setSelectedGroup(null);
            }}
            className={clsx(
              "tap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold",
              view === v ? "bg-primary text-white" : "text-charcoal-faint"
            )}
          >
            {v === "list" ? <List size={13} /> : <User size={13} />}
            {v === "list" ? "List" : "Body"}
          </button>
        ))}
      </div>

      {view === "list" && (
        <>
          <div className="flex gap-2 mb-4">
            {(["alphabetical", "muscleGroup", "classification"] as SortMode[]).map((s) => (
              <Chip key={s} active={sort === s} onClick={() => setSort(s)}>
                {s === "alphabetical" ? "A–Z" : s === "muscleGroup" ? "Muscle Group" : "Classification"}
              </Chip>
            ))}
          </div>

          <div className="space-y-5">
            {groups.map((g, i) => (
              <div key={g.label ?? i}>
                {g.label && <p className="section-label text-charcoal-faint mb-2">{g.label}</p>}
                <Card padded={false} className="divide-y divide-charcoal/[0.06]">
                  {g.items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEditingExercise(e)}
                      className="tap w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-sm font-medium text-charcoal">{e.name}</span>
                      {e.isCustom && <span className="text-[10px] font-semibold text-gold shrink-0">Custom</span>}
                    </button>
                  ))}
                </Card>
              </div>
            ))}
            {/* SAID WHENEVER IT HAPPENED, not only when nothing is left to
                show. A user with three of their own movements and an
                unreachable catalog would otherwise be looking at a
                three-exercise library with no hint that 52 are missing. */}
            {exerciseCatalogError && (
              <p className="text-center text-sm text-status-high py-4">{exerciseCatalogError}</p>
            )}
            {!exerciseCatalogError && groups.every((g) => g.items.length === 0) && (
              <p className="text-center text-sm text-charcoal-faint py-8">No exercises match.</p>
            )}
          </div>
        </>
      )}

      {view === "body" && (
        <>
          <p className="text-xs text-charcoal-faint mb-3 text-center">
            Tap a muscle group to see its exercises — {bodySide === "front" ? "front" : "back"} view.
          </p>

          {/* Item 12: figure panel — plain-color <img> (no recoloring, which
              would strip the line work and teal leaf mark) with a Front/Back
              toggle top-right and %-positioned zone overlays above it. */}
          <div className="relative flex justify-center mb-3">
            <div className="relative" style={{ width: 220, maxWidth: "100%" }}>
              <img
                key={figureKey}
                src={`/body/${figureKey}.png`}
                alt=""
                draggable={false}
                className="block w-full h-auto select-none pointer-events-none"
              />
              <div className="absolute inset-0">
                {sideZoneKeys.map((zoneKey) => {
                  const group = ZONE_KEY_TO_GROUP[zoneKey];
                  const selected = selectedGroup === group;
                  return BODY_ZONES[figureKey][zoneKey].map((rect, i) => (
                    <button
                      key={`${zoneKey}-${i}`}
                      aria-label={MUSCLE_GROUP_LABEL[group]}
                      onClick={() => setSelectedGroup(selected ? null : group)}
                      className="tap absolute"
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.w}%`,
                        height: `${rect.h}%`,
                        borderRadius: 6,
                        backgroundColor: selected ? "rgba(143,104,246,0.34)" : "transparent",
                        border: selected ? "1.5px solid rgba(95,80,147,0.75)" : "1.5px solid transparent",
                        transition: "background-color 0.15s ease, border-color 0.15s ease",
                      }}
                    />
                  ));
                })}
              </div>

              <div className="absolute top-0 right-0 flex items-center gap-0.5 bg-cream-soft rounded-full p-0.5">
                {(["front", "back"] as BodySide[]).map((side) => (
                  <button
                    key={side}
                    onClick={() => {
                      if (side === bodySide) return;
                      flipSide();
                    }}
                    className={clsx(
                      "tap px-2 py-1 rounded-full text-[10px] font-semibold capitalize",
                      bodySide === side ? "bg-primary text-white" : "text-charcoal-faint"
                    )}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {bodyZones.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedGroup(selectedGroup === mg ? null : mg)}
                className={clsx(
                  "tap px-2.5 py-1 text-[10px] font-semibold border transition-colors",
                  selectedGroup === mg
                    ? "text-white border-transparent"
                    : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
                style={{
                  borderRadius: 8,
                  backgroundColor: selectedGroup === mg ? "#A092E0" : undefined,
                }}
              >
                {MUSCLE_GROUP_LABEL[mg]}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-charcoal-faint text-center mb-4">
            Not shown on either picture — find these in List mode: Cardio, Olympic.
          </p>

          {selectedGroup && (
            <div>
              <p className="section-label text-charcoal-faint mb-2">{MUSCLE_GROUP_LABEL[selectedGroup]}</p>
              <Card padded={false} className="divide-y divide-charcoal/[0.06]">
                {filteredByGroup.length === 0 ? (
                  <p className="text-sm text-charcoal-faint text-center py-6">No exercises for this group.</p>
                ) : (
                  filteredByGroup.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEditingExercise(e)}
                      className="tap w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-sm font-medium text-charcoal">{e.name}</span>
                      {e.isCustom && <span className="text-[10px] font-semibold text-gold">Custom</span>}
                    </button>
                  ))
                )}
              </Card>
            </div>
          )}
        </>
      )}

      <CreateCustomExerciseSheet
        open={!!editingExercise}
        onClose={() => setEditingExercise(null)}
        initial={editingExercise ?? undefined}
        duplicateFromStock={!!editingExercise && !editingExercise.isCustom}
        // Only a custom exercise can be deleted, and only from here: this tab
        // is the one place the user's own movements are listed and opened.
        onDelete={
          editingExercise?.isCustom
            ? () => {
                void removeCustomExercise(editingExercise.id);
                setEditingExercise(null);
              }
            : undefined
        }
        onSave={(data: CustomExerciseData) => {
          if (!editingExercise) return;
          if (editingExercise.isCustom) {
            void updateCustomExercise(editingExercise.id, data);
          } else {
            // A catalog row is shared and no client role can write to it, so
            // editing one has always saved a new custom exercise instead.
            void addCustomExercise(data);
          }
        }}
      />
    </div>
  );
}
