import { useMemo, useState } from "react";
import { Chip } from "../../components/ui/Chip";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { MUSCLE_GROUP_LABEL } from "../../utils/muscleGroups";
import { EXERCISE_TAG_LABEL, tagsPresentIn } from "../../utils/exerciseTags";
import type { MuscleGroup, ExerciseClassification, ExerciseTag } from "../../types";
import { List, User, Search, RefreshCw, Plus } from "lucide-react";
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
  tags: ExerciseTag[];
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

// Master handover item 12: the Body view's muscle names (zone buttons'
// aria-labels, chips, list header) — plural Biceps/Triceps, unlike the
// catalog's singular MUSCLE_GROUP_LABEL used by the List view.
const ZONE_LABEL: Record<keyof (typeof BODY_ZONES)[FigureKey], string> = {
  shoulders: "Shoulders",
  chest: "Chest",
  back: "Back",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  core: "Core",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

// Item 12: each figure renders in a 376px-tall box whose width is
// imageWidth x 376 / imageHeight (public/body/*.png natural sizes), rounded
// to a whole pixel as CentiumBodyView.dc.html's figW does.
const FIGURE_BOX_WIDTH: Record<FigureKey, number> = {
  "male-front": Math.round(245 * (376 / 593)),
  "male-back": Math.round(282 * (376 / 595)),
  "female-front": Math.round(278 * (376 / 579)),
  "female-back": Math.round(282 * (376 / 584)),
  "andro-front": Math.round(308 * (376 / 593)),
  "andro-back": Math.round(298 * (376 / 593)),
};

// CentiumBodyView.dc.html: the figure's caption and img alt, built as
// NAME[sex] + " " + ("Front" | "Back").
const FIGURE_NAME: Record<FigureGender, string> = {
  male: "Male",
  female: "Female",
  andro: "Androgynous",
};

// CentiumBodyView.dc.html's cb-fade entrance (figure panel and selected
// list): no existing Tailwind animation matches it (fade-slide-up moves 12px
// over 0.45s), so its keyframes are carried verbatim.
const CB_FADE_KEYFRAMES =
  "@keyframes cb-fade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }";

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
    routines,
    workoutTemplates,
    personalRecords,
  } = useApp();
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [selectedTags, setSelectedTags] = useState<ExerciseTag[]>([]);
  const [creating, setCreating] = useState(false);
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const sideZoneKeys = bodySide === "front" ? FRONT_ZONE_KEYS : BACK_ZONE_KEYS;
  const selectedZoneKey = sideZoneKeys.find((k) => ZONE_KEY_TO_GROUP[k] === selectedGroup);
  const selectedMuscleLabel = selectedZoneKey
    ? ZONE_LABEL[selectedZoneKey]
    : selectedGroup
      ? MUSCLE_GROUP_LABEL[selectedGroup]
      : "";
  // Item 12: male → male figure pair, female → female figure pair, anything
  // else (other/unset/no sex on record) → the androgynous pair.
  const figureGender: FigureGender =
    user.sex === "male" ? "male" : user.sex === "female" ? "female" : "andro";
  const figureKey = `${figureGender}-${bodySide}` as FigureKey;
  const figureAlt = `${FIGURE_NAME[figureGender]} ${bodySide === "front" ? "Front" : "Back"}`;
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
      tags: e.tags,
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
      tags: e.tags ?? [],
      isCustom: true,
    }));
    return [...custom, ...library];
  }, [exerciseCatalog, customExercises]);

  /** Only the tags something actually carries — see tagsPresentIn. */
  const availableTags = useMemo(() => tagsPresentIn(all), [all]);

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

  /**
   * The three filters narrow together rather than replacing one another.
   *
   * SEVERAL TAGS ARE AN "ANY", not an "all". Picking CrossFit and Running
   * asks for the movements from either discipline — nothing is both, so an
   * "all" would return an empty list from two perfectly reasonable taps.
   */
  const filtered = useMemo(
    () =>
      selectedTags.length === 0
        ? filteredByGroup
        : filteredByGroup.filter((e) => e.tags.some((t) => selectedTags.includes(t))),
    [filteredByGroup, selectedTags]
  );

  const groups = useMemo(() => {
    if (sort === "alphabetical") {
      return [{ label: null, items: [...filtered].sort((a, b) => a.name.localeCompare(b.name)) }];
    }
    if (sort === "classification") {
      const byClass = new Map<ExerciseClassification, DbExercise[]>();
      filtered.forEach((e) => {
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
    filtered.forEach((e) => {
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
  }, [filtered, sort]);

  // Design refinement §6.4.2: highlight fills — idle transparent, hover a
  // translucent lavender wash, selected a stronger lavender fill. Values
  // differ slightly by theme so they hold against the dark ground too.
  // Item 12: front/back have different zone sets, so the current selection
  // clears on every flip rather than being carried over.
  /**
   * What deleting one of the user's movements would take with it.
   *
   * Counted rather than described: "removed from 2 routines" is a fact the
   * user can weigh, and "removed from any routines that use it" is a form of
   * words. The routines and templates are already in memory; the FK
   * behaviour behind each number is documented on deleteCustomExercise.
   */
  const deleteImpact = (customExerciseId: string) => ({
    routines: routines.filter((r) =>
      r.exercises.some((ex) => ex.customExerciseId === customExerciseId)
    ).length,
    templates: workoutTemplates.filter((t) =>
      t.exercises.some((ex) => ex.customExerciseId === customExerciseId)
    ).length,
    // personal_records CASCADEs on this column, so a record for the movement
    // goes when the movement does.
    hasPersonalRecord: Object.keys(personalRecords).some(
      (name) => name === customExercises.find((c) => c.id === customExerciseId)?.name
    ),
  });

  const flipSide = () => {
    setSelectedGroup(null);
    setBodySide((s) => (s === "front" ? "back" : "front"));
  };

  return (
    <div className="animate-fade-slide-up">
      {/* CREATING A MOVEMENT IS A TOP-LEVEL ACTION, not something you reach
          by opening a stock exercise and saving it under another name — which
          was the only route to it from this tab. */}
      <div className="flex items-center justify-between mb-3">
        <p className="section-label text-charcoal-faint">
          {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="tap flex items-center gap-1.5 text-xs font-bold text-white bg-primary rounded-full"
          style={{ padding: "7px 13px" }}
        >
          <Plus size={13} /> Create exercise
        </button>
      </div>

      <div className="relative mb-3">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          className="w-full rounded-2xl bg-cream-soft pl-9 pr-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* THE CHIPS ARE THE TAGS THE DATA HAS, not the tags the schema allows.
          `mobility` is legal and carried by nothing, and a chip that always
          returns an empty list is a control the user has to try before
          learning it does nothing. It appears by itself the day something
          carries it.

          A DISCIPLINE IS NOT A MUSCLE, so these sit apart from the body view's
          selection and narrow alongside it rather than replacing it. */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap mb-4" style={{ gap: 6 }}>
          {availableTags.map((tag) => {
            const on = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTags((prev) =>
                    on ? prev.filter((t) => t !== tag) : [...prev, tag]
                  )
                }
                aria-pressed={on}
                className="tap transition-colors"
                style={{
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  border: `1px solid ${on ? "#7D6BB5" : "#E7E7EC"}`,
                  background: on ? "#7D6BB5" : "#FFFFFF",
                  color: on ? "#FFFFFF" : "#241F1B",
                }}
              >
                {EXERCISE_TAG_LABEL[tag]}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="tap text-[11.5px] font-semibold text-charcoal-soft"
              style={{ padding: "6px 4px" }}
            >
              Clear
            </button>
          )}
        </div>
      )}


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
                      style={{ gap: 10 }}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center" style={{ gap: 6 }}>
                          {/* YOUR OWN MOVEMENT, MARKED BY A BADGE rather than
                              by a word in the corner. The list mixes 60-odd
                              catalog rows with a handful of the user's own,
                              and the one thing they can edit and delete
                              should be the one thing that looks different. */}
                          {e.isCustom && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#8A6318",
                                background: "rgba(200,145,43,0.16)",
                                borderRadius: 5,
                                padding: "2px 5px",
                              }}
                            >
                              Yours
                            </span>
                          )}
                          <span className="text-sm font-medium text-charcoal truncate">{e.name}</span>
                        </span>
                        {e.tags.length > 0 && (
                          <span className="block text-[10.5px] text-charcoal-faint truncate">
                            {e.tags.map((t) => EXERCISE_TAG_LABEL[t]).join(" · ")}
                          </span>
                        )}
                      </span>
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
          <style>{CB_FADE_KEYFRAMES}</style>

          {/* CentiumBodyView.dc.html: header row — the side's caps label on
              the left, the Front/Back flip chip on the right. */}
          <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
            <p
              className="whitespace-nowrap"
              style={{
                margin: 0,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "#8C8378",
              }}
            >
              {bodySide === "front" ? "Front view" : "Back view"}
            </p>
            <button
              onClick={flipSide}
              className="tap flex items-center gap-1.5"
              style={{
                height: 32,
                padding: "0 13px",
                borderRadius: 9,
                border: "1px solid #E5E6EB",
                background: "#FAFAFB",
                fontSize: 12,
                fontWeight: 700,
                color: "#5F5093",
              }}
            >
              <RefreshCw size={13} strokeWidth={2} />
              {bodySide === "front" ? "Back" : "Front"}
            </button>
          </div>

          {/* Master handover item 12: figure panel — a plain <img> (never a
              CSS mask or currentColor, which would recolour the line art and
              lose the teal leaf) in a 376px-tall box sized to the image's own
              proportions, zone overlays centred on each zone's x/y, and the
              figure's name captioned bottom-left. */}
          <div
            className="relative w-full flex items-center justify-center overflow-hidden"
            style={{
              height: 404,
              background: "#FBFBFD",
              border: "1px solid rgba(174,161,220,0.3)",
              borderRadius: 18,
              animation: "cb-fade .3s ease both",
            }}
          >
            <div className="relative" style={{ width: FIGURE_BOX_WIDTH[figureKey], height: 376 }}>
              <img
                key={figureKey}
                src={`/body/${figureKey}.png`}
                alt={figureAlt}
                draggable={false}
                className="absolute inset-0 block w-full h-full select-none pointer-events-none"
                style={{ objectFit: "contain" }}
              />
              {sideZoneKeys.map((zoneKey) => {
                const group = ZONE_KEY_TO_GROUP[zoneKey];
                const selected = selectedGroup === group;
                return BODY_ZONES[figureKey][zoneKey].map((rect, i) => (
                  <button
                    key={`${zoneKey}-${i}`}
                    title={ZONE_LABEL[zoneKey]}
                    aria-label={ZONE_LABEL[zoneKey]}
                    onClick={() => setSelectedGroup(selected ? null : group)}
                    className="tap absolute"
                    style={{
                      left: `${rect.x}%`,
                      top: `${rect.y}%`,
                      width: `${rect.w}%`,
                      height: `${rect.h}%`,
                      transform: "translate(-50%,-50%)",
                      borderRadius: "50%",
                      padding: 0,
                      backgroundColor: selected ? "rgba(143,104,246,0.34)" : "rgba(143,104,246,0)",
                      border: selected ? "1.5px solid rgba(95,80,147,0.75)" : "1.5px solid rgba(143,104,246,0)",
                      transition: "background-color .18s ease, border-color .18s ease",
                    }}
                  />
                ));
              })}
            </div>
            <p className="absolute" style={{ left: 12, bottom: 10, margin: 0, fontSize: 10, color: "#A79E93" }}>
              {figureAlt}
            </p>
          </div>

          <p
            style={{
              margin: "16px 0 8px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#8C8378",
            }}
          >
            Muscle groups
          </p>
          <div className="flex flex-wrap" style={{ gap: 7 }}>
            {sideZoneKeys.map((zoneKey) => {
              const mg = ZONE_KEY_TO_GROUP[zoneKey];
              const selected = selectedGroup === mg;
              return (
                <button
                  key={zoneKey}
                  onClick={() => setSelectedGroup(selected ? null : mg)}
                  className="tap transition-colors"
                  style={{
                    borderRadius: 8,
                    padding: "8px 14px",
                    fontSize: 13,
                    whiteSpace: "nowrap",
                    ...(selected
                      ? { background: "#A092E0", border: "1px solid #A092E0", color: "#FFFFFF", fontWeight: 700 }
                      : { background: "#FAFAFB", border: "1px solid #E5E6EB", color: "#241F1B", fontWeight: 500 }),
                  }}
                >
                  {ZONE_LABEL[zoneKey]}
                </button>
              );
            })}
          </div>

          {/* CentiumBodyView.dc.html: the selected muscle's exercises — a
              plain 13px header and separate bordered rows, each naming its
              classification on the right. */}
          {selectedGroup && (
            <div style={{ marginTop: 16, animation: "cb-fade .3s ease both" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#241F1B" }}>
                {`${selectedMuscleLabel} · ${filtered.length} ${filtered.length === 1 ? "exercise" : "exercises"}`}
              </p>
              {filtered.length === 0 ? (
                <p className="text-sm text-charcoal-faint text-center py-6">No exercises for this group.</p>
              ) : (
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {filtered.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEditingExercise(e)}
                      className="tap w-full flex items-center justify-between text-left"
                      style={{
                        gap: 10,
                        border: "1px solid rgba(36,31,27,0.1)",
                        borderRadius: 12,
                        padding: "11px 13px",
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#241F1B" }}>{e.name}</span>
                      <span style={{ fontSize: 11, color: "#8C8378" }}>{classificationLabel[e.classification]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Creating from scratch and opening an existing one are two states of
          the same sheet, kept apart so the create form never inherits the
          fields of whatever was opened last. */}
      <CreateCustomExerciseSheet
        open={creating}
        onClose={() => setCreating(false)}
        onSave={(data: CustomExerciseData) => void addCustomExercise(data)}
      />

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
        impact={editingExercise?.isCustom ? deleteImpact(editingExercise.id) : undefined}
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
