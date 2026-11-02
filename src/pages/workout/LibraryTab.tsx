import { useEffect, useMemo, useRef, useState } from "react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { useApp } from "../../context/AppContext";
import { MUSCLE_GROUP_LABEL } from "../../utils/muscleGroups";
import { EXERCISE_TAGS, EXERCISE_TAG_LABEL } from "../../utils/exerciseTags";
import type { MuscleGroup, ExerciseClassification, ExerciseTag } from "../../types";
import { List, User, Search, RefreshCw, ChevronDown, AlertCircle } from "lucide-react";
import { CreateExerciseButton } from "../../components/workout/CreateExerciseButton";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "../../components/workout/CreateCustomExerciseSheet";
import { BuiltInExerciseSheet } from "../../components/workout/BuiltInExerciseSheet";
import { ExerciseInfoSheet } from "../../components/workout/ExerciseInfoSheet";
import { ExerciseHistorySheet } from "../../components/workout/ExerciseHistorySheet";
import type { FigureKey, ZoneKey } from "../../data/bodyZones";
import { BodyFigure } from "../../components/workout/BodyFigure";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { linePx, textPx } from "../../theme/textSize";
import { LoadErrorCard, SkeletonRows, YoursTag, matchesSearch, searchKey, useLibraryInk } from "../../components/workout/LibraryParts";
import { Toast } from "../../components/ui/Toast";
import { customExerciseUsage, isCustomExerciseRule } from "../../services/exercises";
import { inlineScrolled } from "../../utils/inlineScroll";
import { isRtl, t, tk, tn, tx } from "../../i18n/core";

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
  /** B3 exercises.aliases (catalogue rows only), searched with the name (WO2 S6). */
  aliases?: string[];
  isCustom: boolean;
}

const classificationLabel: Record<ExerciseClassification, string> = {
  barbell: tk("Barbell"),
  dumbbell: tk("Dumbbell"),
  machine_other: tk("Machine"),
  weighted_bodyweight: tk("Weighted Bodyweight"),
  assisted_bodyweight: tk("Assisted Bodyweight"),
  reps_only: tk("Reps Only"),
  cardio: tk("Cardio"),
  duration: tk("Duration"),
};

/**
 * A muscle, discipline or classification label in the app's language. The
 * labels are English constants (here and in utils/muscleGroups,
 * utils/exerciseTags); "Back" the muscle is not "Back" the button.
 */
const muscle = (label: string) => (label === "Back" ? tx("Back", "muscle") : t(label));

// WO5 / WO6 (Library › Body view): six figures — male, female, androgynous,
// front and back — chosen by the Profile sex setting, live (bodyMapVariant).
// Zones are per-figure masks traced to each figure's own art; see
// src/data/bodyZones.ts and scripts/body-zones/.
type FigureGender = "male" | "female" | "andro";
type BodySide = "front" | "back";

// Zone keys are the handoff's own (plural) muscle names; MuscleGroup uses
// singular bicep/tricep. This is the only place that reconciles them.
const ZONE_KEY_TO_GROUP: Record<ZoneKey, MuscleGroup> = {
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

// The Body view's muscle names (chips, list header, zone buttons) — plural
// Biceps/Triceps, unlike the catalog's singular MUSCLE_GROUP_LABEL.
const ZONE_LABEL: Record<ZoneKey, string> = {
  shoulders: tk("Shoulders"),
  chest: tk("Chest"),
  back: "Back",
  biceps: tk("Biceps"),
  triceps: tk("Triceps"),
  forearms: tk("Forearms"),
  core: tk("Core"),
  glutes: tk("Glutes"),
  quads: tk("Quads"),
  hamstrings: tk("Hamstrings"),
  calves: tk("Calves"),
};

// The figure's caption and img alt: NAME[sex] + " " + ("Front" | "Back").
const FIGURE_NAME: Record<FigureGender, string> = {
  male: tk("Male"),
  female: tk("Female"),
  andro: tk("Androgynous"),
};

// The cb-fade entrance of the figure panel and the selected list.
const CB_FADE_KEYFRAMES =
  "@keyframes cb-fade { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }";

// The zones each side shows (front and back differ: chest/back, biceps/triceps).
const FRONT_ZONE_KEYS: ZoneKey[] = ["shoulders", "chest", "biceps", "forearms", "core", "quads", "calves"];
const BACK_ZONE_KEYS: ZoneKey[] = ["shoulders", "back", "triceps", "forearms", "glutes", "hamstrings", "calves"];

/**
 * Dark mode, as [light, dark]: the Body view's flip chip ink (primary.deeper
 * dark). The Discipline chevron is #ADA9A4 in both modes (WO2 #19, derived *).
 */
const COLORS = {
  flipInk: ["rgb(var(--th-5f5093))", "rgb(var(--th-c8bfe9))"],
  chevron: ["#ADA9A4", "#ADA9A4"],
} as const;

const SAVE_FAILED = tk("Couldn't save. Try again.");
/** A failed custom-exercise write: the rule it broke (B3, PB-O-32), else the WO2 toast. */
const saveFailure = (error: string) => (isCustomExerciseRule(error) ? error : SAVE_FAILED);

/**
 * WO2 #16-#18: a 30px smooth rounded rectangle, pad 0 11, 11.5/17.3 600, a
 * 0.5px border. Selected: #AEA1DC fill and border with white (dark #A991FE
 * with #0D0B1A); idle #5B5349 on white with #241F1B@11% (dark #B8B3C7 on
 * #1C1F28 with #F5F3FA@11%; 30% of ink under High contrast, --hair-11).
 */
const controlStyle = (on: boolean): React.CSSProperties => ({
  height: 30,
  borderRadius: 10,
  padding: "0 11px",
  fontSize: textPx(11.5),
  lineHeight: linePx(17.3),
  fontWeight: 600,
  whiteSpace: "nowrap",
  border: `0.5px solid ${on ? "rgb(var(--c-primary-fill))" : "var(--lib-hair-11)"}`,
  background: on ? "rgb(var(--c-primary-fill))" : "rgb(var(--c-cream-card))",
  color: on ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal-soft))",
});

/**
 * Workout › Library (v6 WO2), which replaces the old Exercise Database tab:
 * List view (search, sort, Discipline, the count with "· N yours", one card of
 * rows with the "Yours" tag after the user's own) and the Body view, kept as
 * ORIGINAL WO2. Loading rows, a Retry card and an empty search with "Create"
 * are ours (WO2 O2-O5).
 */
export default function LibraryTab() {
  const {
    exerciseCatalog,
    exerciseCatalogError,
    retryExerciseCatalog,
    customExercises,
    addCustomExercise,
    updateCustomExercise,
    removeCustomExercise,
    bodyMapVariant,
    routines,
    workoutTemplates,
    personalRecords,
    noteFeatureMilestone,
    accessibility,
  } = useApp();

  // Explorer milestone: "Browsing the shelves". One row per account for ever — the repeat is
  // a primary-key conflict the service treats as the success it is. This tab is the browsable library;
  // ExerciseLibrarySheet is a picker inside routine-building, which is being
  // handed a list rather than going to look at one.
  useEffect(() => {
    noteFeatureMilestone("exercise_library");
  }, [noteFeatureMilestone]);

  const dark = useIsDark();
  const tabColor = (key: keyof typeof COLORS) => COLORS[key][dark ? 1 : 0];
  const ink = useLibraryInk();
  const online = useOnline();
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  // WO2.1: one discipline at a time, from the Discipline popup (null = All).
  const [discipline, setDiscipline] = useState<ExerciseTag | null>(null);
  // Decision 10: the filter row keeps scrolling at 360, with a fade at the
  // right edge while more controls sit off-screen.
  const filterRowRef = useRef<HTMLDivElement>(null);
  const [filterMore, setFilterMore] = useState(false);
  const measureFilterRow = () => {
    const el = filterRowRef.current;
    setFilterMore(!!el && inlineScrolled(el) + el.clientWidth < el.scrollWidth - 1);
  };
  useEffect(() => {
    measureFilterRow();
    window.addEventListener("resize", measureFilterRow);
    return () => window.removeEventListener("resize", measureFilterRow);
  }, [discipline]);
  const [disciplineAnchor, setDisciplineAnchor] = useState<HTMLElement | null>(null);
  // Create: null closed, else the name it opens with ("Create 'xyz'" prefills it).
  const [creating, setCreating] = useState<string | null>(null);
  const startCreate = (name: string) => {
    // Offline: nothing can be saved (WO2 O5).
    if (!online) {
      setToast(SAVE_FAILED);
      return;
    }
    setCreating(name);
  };
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const sideZoneKeys = bodySide === "front" ? FRONT_ZONE_KEYS : BACK_ZONE_KEYS;
  const selectedZoneKey = sideZoneKeys.find((k) => ZONE_KEY_TO_GROUP[k] === selectedGroup);
  const selectedMuscleLabel = selectedZoneKey
    ? muscle(ZONE_LABEL[selectedZoneKey])
    : selectedGroup
      ? muscle(MUSCLE_GROUP_LABEL[selectedGroup])
      : "";
  // 03 bodyMapVariant: Male → male, Female → female, Other → androgynous,
  // derived from the Profile sex setting so it switches live.
  const figureGender: FigureGender = bodyMapVariant === "androgynous" ? "andro" : bodyMapVariant;
  const figureKey = `${figureGender}-${bodySide}` as FigureKey;
  const figureAlt =
    bodySide === "front" ? t("{figure}, front", { figure: t(FIGURE_NAME[figureGender]) }) : t("{figure}, back", { figure: t(FIGURE_NAME[figureGender]) });
  // The exercise opened from the list or the Body view: one of the user's
  // own opens the editable popup (WO11), a built-in one the view-only popup
  // (WO12) — catalog rows are no longer edited or duplicated from here.
  const [editingExercise, setEditingExercise] = useState<DbExercise | null>(null);
  // WO13: Exercise information, over whichever exercise popup opened it.
  const [info, setInfo] = useState<{ name: string; source: { id: string; kind: "catalog" | "custom" } | null } | null>(null);
  // WO14: Exercise history, likewise over the popup that opened it.
  const [history, setHistory] = useState<{ name: string; match: { catalogId?: string; customId?: string } } | null>(null);
  // A custom exercise not yet on the server (local id) has no row to read.
  const customSource = (e: DbExercise | null) =>
    e && /^[0-9a-f-]{36}$/i.test(e.id) ? { id: e.id, kind: "custom" as const } : null;
  // B3 custom_exercise_usage: how many of the user's own routines use the
  // custom exercise that is open, counted on the server for the delete
  // confirm; null until it answers (or for a local-only movement), when the
  // routines in memory are counted instead.
  const [usage, setUsage] = useState<{ id: string; routines: number } | null>(null);
  const usageId = editingExercise?.isCustom ? customSource(editingExercise)?.id ?? null : null;
  useEffect(() => {
    if (!usageId) return;
    let live = true;
    void customExerciseUsage(usageId).then((n) => {
      if (live && n !== null) setUsage({ id: usageId, routines: n });
    });
    return () => {
      live = false;
    };
  }, [usageId]);

  const all: DbExercise[] = useMemo(() => {
    const library = exerciseCatalog.map((e) => ({
      id: e.id,
      name: e.name,
      muscleGroups: e.muscleGroups,
      secondaryMuscleGroups: e.secondaryMuscleGroups,
      classification: e.classification,
      tags: e.tags,
      aliases: e.aliases,
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
    // Case- and accent-insensitive, by name or alias (WO2 S6, B3 PB-O-33).
    () => {
      const q = searchKey(query);
      return all.filter((e) => matchesSearch(q, e.name, e.aliases));
    },
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

  const yoursCount = filtered.filter((e) => e.isCustom).length;
  // The catalogue's first read has not answered yet (WO2 O4).
  const loading = exerciseCatalog.length === 0 && !exerciseCatalogError;

  const groups = useMemo(() => {
    if (sort === "alphabetical") {
      // WO2 #22-#26: the user's own first ("Yours"), then the catalogue, each A–Z.
      return [{ label: null, items: [...filtered].sort((a, b) => Number(b.isCustom) - Number(a.isCustom) || a.name.localeCompare(b.name)) }];
    }
    if (sort === "classification") {
      const byClass = new Map<ExerciseClassification, DbExercise[]>();
      filtered.forEach((e) => {
        const list = byClass.get(e.classification) ?? [];
        list.push(e);
        byClass.set(e.classification, list);
      });
      return Array.from(byClass.entries())
        .sort((a, b) => t(classificationLabel[a[0]]).localeCompare(t(classificationLabel[b[0]])))
        .map(([key, items]) => ({
          label: t(classificationLabel[key]),
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
      .sort((a, b) => muscle(MUSCLE_GROUP_LABEL[a[0]]).localeCompare(muscle(MUSCLE_GROUP_LABEL[b[0]])))
      .map(([key, items]) => ({
        label: muscle(MUSCLE_GROUP_LABEL[key]),
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
    routines:
      usage?.id === customExerciseId
        ? usage.routines
        : routines.filter((r) => r.exercises.some((ex) => ex.customExerciseId === customExerciseId)).length,
    templates: workoutTemplates.filter((tpl) =>
      tpl.exercises.some((ex) => ex.customExerciseId === customExerciseId)
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
    // WO2 #17 / #21: the 0.5px border #241F1B@11% / dark #F5F3FA@11% (literal; the shared
    // --hair-11 is 10% in dark), 30% of ink under High contrast.
    <div
      className="animate-fade-slide-up"
      style={{ "--lib-hair-11": accessibility.highContrast ? "var(--hair-11)" : dark ? "rgba(245, 243, 250, 0.11)" : "rgba(36, 31, 27, 0.11)" } as React.CSSProperties}
    >
      {/* WO2.1: the List/Body toggle and "+ Create exercise" share one row
          (both views). CREATING A MOVEMENT IS A TOP-LEVEL ACTION, not
          something you reach by opening a stock exercise and saving it under
          another name — which was the only route to it from this tab. */}
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 12 }}>
        <div className="flex" style={{ height: 34, padding: 3, borderRadius: 12, background: "rgb(var(--c-cream-soft))" }}>
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
                  fontSize: textPx(12),
                  fontWeight: 700,
                  background: on ? "rgb(var(--c-primary-fill))" : "transparent",
                  color: on ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal-muted))",
                }}
              >
                {/* WO2 #9: drawn #FFFFFF in dark; V6-02 keeps the label ink #0D0B1A. */}
                {v === "list" ? <List size={13} /> : <User size={13} />}
                {v === "list" ? t("List") : t("Body")}
              </button>
            );
          })}
        </div>
        <CreateExerciseButton onClick={() => startCreate("")} />
      </div>

      <div className="relative" style={{ marginBottom: 10 }}>
        <Search size={15} className="absolute top-1/2 -translate-y-1/2" style={{ insetInlineStart: 14, color: "rgb(var(--c-charcoal-muted))" }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Search exercises…")}
          aria-label={t("Search exercises")}
          className="w-full text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ height: 40, borderRadius: 16, background: "rgb(var(--c-cream-soft))", paddingInlineStart: 36, paddingInlineEnd: 14, fontSize: textPx(14), lineHeight: linePx(21) }}
        />
      </div>

      {view === "list" && (
        <>
          {/* WO2.1: sort and Discipline on one row, as smooth rounded
              rectangles. A DISCIPLINE IS NOT A MUSCLE, so it narrows
              alongside the body view's selection rather than replacing it. */}
          <div className="relative" style={{ marginBottom: 12 }}>
          {/* 7px of padding (offset by the margin) keeps the controls' 44px
              hit areas inside the scroller, which would otherwise clip them. */}
          <div
            ref={filterRowRef}
            onScroll={measureFilterRow}
            className="flex scroll-row no-scrollbar"
            style={{ gap: 7, padding: "7px 0", margin: "-7px 0" }}
          >
            {(["alphabetical", "muscleGroup", "classification"] as SortMode[]).map((srt) => (
              <button key={srt} onClick={() => setSort(srt)} aria-pressed={sort === srt} className="tap flex-none" style={controlStyle(sort === srt)}>
                {srt === "alphabetical" ? t("A–Z") : srt === "muscleGroup" ? t("Muscle Group") : t("Classification")}
              </button>
            ))}
            <button
              onClick={(e) => setDisciplineAnchor(e.currentTarget)}
              aria-haspopup="menu"
              className="tap flex-none flex items-center"
              style={{ ...controlStyle(!!discipline), gap: 5 }}
            >
              {discipline ? t("Discipline: {name}", { name: muscle(EXERCISE_TAG_LABEL[discipline]) }) : t("Discipline")}
              <ChevronDown size={12} style={{ color: discipline ? "#FFFFFF" : tabColor("chevron") }} />
            </button>
          </div>
          {filterMore && (
            <span
              aria-hidden
              className="absolute top-0 bottom-0 end-0 pointer-events-none"
              style={{ width: 28, background: `linear-gradient(to ${isRtl() ? "left" : "right"}, rgb(var(--c-cream) / 0), rgb(var(--c-cream)))` }}
            />
          )}
          </div>

          {/* WO2 #20: "{n} exercises · {k} yours", the suffix only while the
              filtered list holds some of the user's own (O1). */}
          <p style={{ marginBlock: "0 8px", marginInline: "2px 0", fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 500, color: "rgb(var(--c-charcoal-muted))" }}>
            {tn(filtered.length, "{n} exercise", "{n} exercises")}
            {yoursCount > 0 ? ` · ${t("{n} yours", { n: yoursCount })}` : ""}
          </p>

          <div className="space-y-5">
            {loading && (
              <div className="overflow-hidden bg-cream-card" style={{ border: "0.5px solid var(--lib-hair-11)", borderRadius: 18, padding: "0 12px" }}>
                <SkeletonRows count={8} height={44} divided />
              </div>
            )}
            {groups.map((g, i) =>
              g.items.length === 0 ? null : (
              <div key={g.label ?? i}>
                {g.label && <p className="section-label text-charcoal-faint mb-2">{g.label}</p>}
                {/* WO2 #21 / #25: a 0.5px #241F1B@11% card, 0.5px @7% dividers. */}
                <div
                  className="overflow-hidden bg-cream-card divide-y-[0.5px] divide-charcoal/[0.07]"
                  style={{ border: "0.5px solid var(--lib-hair-11)", borderRadius: 18 }}
                >
                  {g.items.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEditingExercise(e)}
                      className="tap w-full flex items-center justify-between text-start"
                      style={{ gap: 10, padding: "11px 16px", minHeight: 44 }}
                    >
                      <span className="min-w-0">
                        <span className="flex items-center" style={{ gap: 6 }}>
                          <span className="truncate" style={{ fontSize: textPx(14), lineHeight: linePx(18), fontWeight: 500, color: "rgb(var(--c-charcoal))" }}>
                            {e.name}
                          </span>
                          {/* YOUR OWN MOVEMENT, MARKED: the "Yours" tag after
                              the name (WO2 #24), the one kind of row the user
                              can edit and delete. */}
                          {e.isCustom && <YoursTag />}
                        </span>
                        {e.tags.length > 0 && (
                          <span className="block truncate" style={{ fontSize: textPx(11), lineHeight: linePx(14), color: "rgb(var(--c-charcoal-muted))" }}>
                            {e.tags.map((tag) => muscle(EXERCISE_TAG_LABEL[tag])).join(" · ")}
                          </span>
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              )
            )}
            {/* SAID WHENEVER IT HAPPENED, not only when nothing is left to
                show. A user with three of their own movements and an
                unreachable catalog would otherwise be looking at a
                three-exercise library with no hint that 52 are missing. */}
            {exerciseCatalogError && <LoadErrorCard card message={t("Couldn't load exercises.")} onRetry={retryExerciseCatalog} />}
            {!loading && !exerciseCatalogError && groups.every((g) => g.items.length === 0) && (
              <div className="flex flex-col items-center text-center" style={{ padding: "28px 0", gap: 8 }}>
                <p className="text-charcoal-faint" style={{ margin: 0, fontSize: textPx(13.5), lineHeight: linePx(20.3) }}>
                  {query.trim() ? t("No exercises match '{query}'.", { query: query.trim() }) : t("No exercises match.")}
                </p>
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => startCreate(query.trim())}
                    className="tap relative before:absolute before:-inset-[12px] before:content-['']"
                    style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 700, color: ink }}
                  >
                    {t("Create '{query}'", { query: query.trim() })}
                  </button>
                )}
              </div>
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
                fontSize: textPx(11),
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgb(var(--c-charcoal-muted))",
              }}
            >
              {bodySide === "front" ? t("Front view") : t("Back view")}
            </p>
            <button
              onClick={flipSide}
              className="tap flex items-center gap-1.5"
              style={{
                height: 32,
                padding: "0 13px",
                borderRadius: 9,
                border: "1px solid rgb(var(--c-border-option))",
                background: "rgb(var(--c-surface-raised))",
                fontSize: textPx(12),
                fontWeight: 700,
                color: tabColor("flipInk"),
              }}
            >
              <RefreshCw size={13} strokeWidth={2} />
              {bodySide === "front" ? tx("Back", "side") : t("Front")}
            </button>
          </div>

          {/* WO5 / WO6 figure panel: the figure's own line art over its own
              zone masks (the highlight sits beneath the lines), in a
              376px-tall box sized to the art's proportions, and the figure's
              name captioned bottom-left. The panel stays light in dark mode
              (Mobile v5.1 R3 exception): the art is near-black line work on
              white fills, an illustration that would vanish on a dark panel. */}
          <div
            className="relative w-full flex items-center justify-center overflow-hidden"
            style={{
              height: 404,
              background: "#FBFBFD",
              border: "1px solid rgb(var(--th-aea1dc) / 0.3)",
              borderRadius: 18,
              animation: "cb-fade .3s ease both",
            }}
          >
            <BodyFigure
              key={figureKey}
              figure={figureKey}
              zones={sideZoneKeys}
              selected={selectedZoneKey ?? null}
              onSelect={(zone) => setSelectedGroup(zone ? ZONE_KEY_TO_GROUP[zone] : null)}
              alt={figureAlt}
              label={(zone) => muscle(ZONE_LABEL[zone])}
            />
            <p className="absolute" style={{ insetInlineStart: 12, bottom: 10, margin: 0, fontSize: textPx(10), color: "#A79E93" }}>
              {figureAlt}
            </p>
          </div>

          <p
            style={{
              margin: "16px 0 8px",
              fontSize: textPx(11),
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgb(var(--c-charcoal-muted))",
            }}
          >
            {t("Muscle groups")}
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
                    fontSize: textPx(13),
                    whiteSpace: "nowrap",
                    ...(selected
                      ? // The board's #A092E0 in light, primary-fill in dark.
                        { background: "rgb(var(--c-fill-chip))", border: "1px solid rgb(var(--c-fill-chip))", color: "rgb(var(--c-on-primary-fill))", fontWeight: 700 }
                      : { background: "rgb(var(--c-surface-raised))", border: "1px solid rgb(var(--c-border-option))", color: "rgb(var(--c-charcoal))", fontWeight: 500 }),
                  }}
                >
                  {muscle(ZONE_LABEL[zoneKey])}
                </button>
              );
            })}
          </div>

          {/* CentiumBodyView.dc.html: the selected muscle's exercises — a
              plain 13px header and separate bordered rows, each naming its
              classification on the right. */}
          {selectedGroup && (
            <div style={{ marginTop: 16, animation: "cb-fade .3s ease both" }}>
              <p style={{ margin: "0 0 8px", fontSize: textPx(13), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>
                {`${selectedMuscleLabel} · ${tn(filtered.length, "{n} exercise", "{n} exercises")}`}
              </p>
              {filtered.length === 0 ? (
                <p className="text-sm text-charcoal-faint text-center py-6">{t("No exercises for this group.")}</p>
              ) : (
                <div className="flex flex-col" style={{ gap: 6 }}>
                  {filtered.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setEditingExercise(e)}
                      className="tap w-full flex items-center justify-between text-start"
                      style={{
                        gap: 10,
                        border: "1px solid rgb(var(--c-charcoal) / 0.1)",
                        borderRadius: 12,
                        padding: "11px 13px",
                      }}
                    >
                      <span style={{ fontSize: textPx(13.5), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>{e.name}</span>
                      <span style={{ fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>{t(classificationLabel[e.classification])}</span>
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
          { value: "all", label: t("All") },
          ...EXERCISE_TAGS.map((tag) => ({ value: tag, label: muscle(EXERCISE_TAG_LABEL[tag]) })),
        ]}
        selected={discipline ?? "all"}
        variant="filled"
        onSelect={(v) => setDiscipline(v === "all" ? null : v)}
      />

      {/* Creating from scratch and opening an existing one are two states of
          the same sheet, kept apart so the create form never inherits the
          fields of whatever was opened last. */}
      <CreateCustomExerciseSheet
        open={creating !== null}
        initial={creating ? { name: creating } : undefined}
        onInfo={(name) => setInfo({ name, source: null })}
        onHistory={() => setHistory({ name: t("New Custom Exercise"), match: {} })}
        onClose={() => setCreating(null)}
        onSave={(data: CustomExerciseData) => void addCustomExercise(data).then((error) => error && setToast(saveFailure(error)))}
      />

      <BuiltInExerciseSheet
        open={!!editingExercise && !editingExercise.isCustom}
        onClose={() => setEditingExercise(null)}
        exercise={editingExercise && !editingExercise.isCustom ? editingExercise : null}
        onInfo={() => editingExercise && setInfo({ name: editingExercise.name, source: { id: editingExercise.id, kind: "catalog" } })}
        onHistory={() => editingExercise && setHistory({ name: editingExercise.name, match: { catalogId: editingExercise.id } })}
      />

      <CreateCustomExerciseSheet
        open={!!editingExercise?.isCustom}
        onInfo={(name) => setInfo({ name, source: customSource(editingExercise) })}
        onHistory={() => editingExercise && setHistory({ name: editingExercise.name, match: { customId: editingExercise.id } })}
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
          if (editingExercise?.isCustom)
            void updateCustomExercise(editingExercise.id, data).then((error) => error && setToast(saveFailure(error)));
        }}
      />

      <ExerciseHistorySheet open={!!history} onClose={() => setHistory(null)} name={history?.name ?? ""} match={history?.match ?? null} />
      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} name={info?.name ?? ""} source={info?.source ?? null} />

      <Toast
        open={!!toast}
        message={toast ? t(toast) : ""}
        icon={<AlertCircle size={16} style={{ color: dark ? "#F09A8E" : "#C0392B" }} />}
        onExpire={() => setToast(null)}
      />

    </div>
  );
}
