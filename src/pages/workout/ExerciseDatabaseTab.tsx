import { useEffect, useMemo, useState } from "react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { useApp } from "../../context/AppContext";
import { MUSCLE_GROUP_LABEL } from "../../utils/muscleGroups";
import { EXERCISE_TAGS, EXERCISE_TAG_LABEL } from "../../utils/exerciseTags";
import type { MuscleGroup, ExerciseClassification, ExerciseTag } from "../../types";
import { List, User, Search, RefreshCw, Plus, ChevronDown } from "lucide-react";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "../../components/workout/CreateCustomExerciseSheet";
import { BuiltInExerciseSheet } from "../../components/workout/BuiltInExerciseSheet";
import { ExerciseInfoSheet } from "../../components/workout/ExerciseInfoSheet";
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

/** WO2.1 control: a 30px smooth rounded rectangle; selected = #AEA1DC fill, white text. */
const controlStyle = (on: boolean): React.CSSProperties => ({
  height: 30,
  borderRadius: 10,
  padding: "0 11px",
  fontSize: 11.5,
  fontWeight: 600,
  whiteSpace: "nowrap",
  border: `1px solid ${on ? "#AEA1DC" : "rgba(36,31,27,0.11)"}`,
  background: on ? "#AEA1DC" : "#FFFFFF",
  color: on ? "#FFFFFF" : "#5B5349",
});

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
    noteFeatureMilestone,
  } = useApp();

  // Explorer milestone: "Browsing the shelves". One row per account for ever — the repeat is
  // a primary-key conflict the service treats as the success it is. This tab is the browsable library;
  // ExerciseLibrarySheet is a picker inside routine-building, which is being
  // handed a list rather than going to look at one.
  useEffect(() => {
    noteFeatureMilestone("exercise_library");
  }, [noteFeatureMilestone]);

  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  // WO2.1: one discipline at a time, from the Discipline popup (null = All).
  const [discipline, setDiscipline] = useState<ExerciseTag | null>(null);
  const [disciplineAnchor, setDisciplineAnchor] = useState<HTMLElement | null>(null);
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
  // The exercise opened from the list or the Body view: one of the user's
  // own opens the editable popup (WO11), a built-in one the view-only popup
  // (WO12) — catalog rows are no longer edited or duplicated from here.
  const [editingExercise, setEditingExercise] = useState<DbExercise | null>(null);
  // WO13: Exercise information, over whichever exercise popup opened it.
  const [info, setInfo] = useState<{ name: string; source: { id: string; kind: "catalog" | "custom" } | null } | null>(null);
  // A custom exercise not yet on the server (local id) has no row to read.
  const customSource = (e: DbExercise | null) =>
    e && /^[0-9a-f-]{36}$/i.test(e.id) ? { id: e.id, kind: "custom" as const } : null;

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

  /** Search, muscle group and discipline narrow together rather than replacing one another. */
  const filtered = useMemo(
    () => (discipline ? filteredByGroup.filter((e) => e.tags.includes(discipline)) : filteredByGroup),
    [filteredByGroup, discipline]
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
      {/* WO2.1: the List/Body toggle and "+ Create exercise" share one row
          (both views). CREATING A MOVEMENT IS A TOP-LEVEL ACTION, not
          something you reach by opening a stock exercise and saving it under
          another name — which was the only route to it from this tab. */}
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 12 }}>
        <div className="flex" style={{ height: 34, padding: 3, borderRadius: 12, background: "#F5F5F6" }}>
          {(["list", "body"] as ViewMode[]).map((v) => {
            const on = view === v;
            return (
              <button
                key={v}
                onClick={() => {
                  setView(v);
                  // V10 (QA 10.0): "switching between body and list resets selection"
                  setSelectedGroup(null);
                }}
                aria-pressed={on}
                className="tap flex items-center"
                style={{
                  height: 28,
                  borderRadius: 9,
                  padding: "0 13px",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  background: on ? "#AEA1DC" : "transparent",
                  color: on ? "#FFFFFF" : "#8C8378",
                }}
              >
                {v === "list" ? <List size={13} /> : <User size={13} />}
                {v === "list" ? "List" : "Body"}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setCreating(true)}
          className="tap flex items-center"
          style={{ height: 34, borderRadius: 12, padding: "0 16px", gap: 8, background: "#AEA1DC", color: "#FFFFFF", fontSize: 12.5, fontWeight: 700 }}
        >
          <Plus size={13} strokeWidth={2.4} /> Create exercise
        </button>
      </div>

      <div className="relative" style={{ marginBottom: 10 }}>
        <Search size={15} className="absolute top-1/2 -translate-y-1/2" style={{ left: 14, color: "#8C8378" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          aria-label="Search exercises"
          className="w-full text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ height: 40, borderRadius: 16, background: "#F5F5F6", paddingLeft: 36, paddingRight: 14, fontSize: 14 }}
        />
      </div>

      {view === "list" && (
        <>
          {/* WO2.1: sort and Discipline on one row, as smooth rounded
              rectangles. A DISCIPLINE IS NOT A MUSCLE, so it narrows
              alongside the body view's selection rather than replacing it. */}
          <div className="flex overflow-x-auto no-scrollbar" style={{ gap: 7, marginBottom: 12 }}>
            {(["alphabetical", "muscleGroup", "classification"] as SortMode[]).map((srt) => (
              <button key={srt} onClick={() => setSort(srt)} aria-pressed={sort === srt} className="tap flex-none" style={controlStyle(sort === srt)}>
                {srt === "alphabetical" ? "A–Z" : srt === "muscleGroup" ? "Muscle Group" : "Classification"}
              </button>
            ))}
            <button
              onClick={(e) => setDisciplineAnchor(e.currentTarget)}
              aria-haspopup="menu"
              className="tap flex-none flex items-center"
              style={{ ...controlStyle(!!discipline), gap: 5 }}
            >
              {discipline ? `Discipline: ${EXERCISE_TAG_LABEL[discipline]}` : "Discipline"}
              <ChevronDown size={12} style={{ color: discipline ? "#FFFFFF" : "#ADA9A4" }} />
            </button>
          </div>

          <p style={{ margin: "0 0 8px 2px", fontSize: 11, fontWeight: 500, color: "#8C8378" }}>
            {filtered.length} {filtered.length === 1 ? "exercise" : "exercises"}
          </p>

          <div className="space-y-5">
            {groups.map((g, i) => (
              <div key={g.label ?? i}>
                {g.label && <p className="section-label text-charcoal-faint mb-2">{g.label}</p>}
                <div
                  className="overflow-hidden bg-white divide-y divide-[rgba(36,31,27,0.07)]"
                  style={{ border: "1px solid rgba(36,31,27,0.11)", borderRadius: 18 }}
                >
                  {g.items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEditingExercise(e)}
                      className="tap w-full flex items-center justify-between text-left"
                      style={{ gap: 10, padding: "11px 16px" }}
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
                          <span className="truncate" style={{ fontSize: 14, lineHeight: "18px", fontWeight: 500, color: "#241F1B" }}>
                            {e.name}
                          </span>
                        </span>
                        {e.tags.length > 0 && (
                          <span className="block truncate" style={{ fontSize: 11, lineHeight: "14px", color: "#8C8378" }}>
                            {e.tags.map((t) => EXERCISE_TAG_LABEL[t]).join(" · ")}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
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

      {/* WO2.1: the Nutrient Summary filter popup — All plus every discipline
          the code knows, Mobility included. */}
      <PopupMenu<ExerciseTag | "all">
        open={!!disciplineAnchor}
        anchor={disciplineAnchor}
        onClose={() => setDisciplineAnchor(null)}
        options={[
          { value: "all", label: "All" },
          ...EXERCISE_TAGS.map((t) => ({ value: t, label: EXERCISE_TAG_LABEL[t] })),
        ]}
        selected={discipline ?? "all"}
        variant="filled"
        onSelect={(v) => setDiscipline(v === "all" ? null : v)}
      />

      {/* Creating from scratch and opening an existing one are two states of
          the same sheet, kept apart so the create form never inherits the
          fields of whatever was opened last. */}
      <CreateCustomExerciseSheet
        open={creating}
        onInfo={(name) => setInfo({ name, source: null })}
        onClose={() => setCreating(false)}
        onSave={(data: CustomExerciseData) => void addCustomExercise(data)}
      />

      <BuiltInExerciseSheet
        open={!!editingExercise && !editingExercise.isCustom}
        onClose={() => setEditingExercise(null)}
        exercise={editingExercise && !editingExercise.isCustom ? editingExercise : null}
        onInfo={() => editingExercise && setInfo({ name: editingExercise.name, source: { id: editingExercise.id, kind: "catalog" } })}
      />

      <CreateCustomExerciseSheet
        open={!!editingExercise?.isCustom}
        onInfo={(name) => setInfo({ name, source: customSource(editingExercise) })}
        onClose={() => setEditingExercise(null)}
        initial={editingExercise ?? undefined}
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
          if (editingExercise?.isCustom) void updateCustomExercise(editingExercise.id, data);
        }}
      />

      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} name={info?.name ?? ""} source={info?.source ?? null} />

    </div>
  );
}
