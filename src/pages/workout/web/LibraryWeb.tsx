import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, List, Plus, RefreshCw, Search, User } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { Toast } from "../../../components/ui/Toast";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "../../../components/workout/CreateCustomExerciseSheet";
import { BuiltInExerciseSheet } from "../../../components/workout/BuiltInExerciseSheet";
import { ExerciseInfoSheet } from "../../../components/workout/ExerciseInfoSheet";
import { ExerciseHistorySheet } from "../../../components/workout/ExerciseHistorySheet";
import { LoadErrorCard, SkeletonRows, matchesSearch, searchKey } from "../../../components/workout/LibraryParts";
import { BODY_FIGURES, zoneMaskUrl, type FigureKey, type ZoneKey } from "../../../data/bodyZones";
import { MUSCLE_GROUP_LABEL } from "../../../utils/muscleGroups";
import { EXERCISE_TAGS, EXERCISE_TAG_LABEL } from "../../../utils/exerciseTags";
import { customExerciseUsage, isCustomExerciseRule } from "../../../services/exercises";
import type { ExerciseClassification, ExerciseTag, MuscleGroup } from "../../../types";
import { EmptyCard } from "./parts";
import { borderCard } from "./styles";
import { t, tk, tn, tx } from "../../../i18n/core";

// Website viewport v1 · WC-WO.2 Library and WC-WO.2.1 its body view (WC-WO
// Workout Web v13). One toolbar row (List / Body, search, the sorts, the
// Discipline filter, Create), then the list as even columns read top to
// bottom (8 rows a column, 7 beside the rail, 52 each, the letter or group
// heads between) scrolling sideways under a draggable pill scrollbar; or the
// body view: the figure panel and Muscle groups (one row, same scrollbar)
// beside the selected muscle's exercises, with a hover tint on the figure
// and the chips. The catalogue, search, sorting, the sheets (exercise, info,
// history, create) and their writes are the mobile Library's.

type ViewMode = "list" | "body";
type SortMode = "alphabetical" | "muscleGroup" | "classification";
type FigureGender = "male" | "female" | "andro";
type BodySide = "front" | "back";

interface DbExercise {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  tags: ExerciseTag[];
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
const muscle = (label: string) => (label === "Back" ? tx("Back", "muscle") : t(label));
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
const FIGURE_NAME: Record<FigureGender, string> = { male: tk("Male"), female: tk("Female"), andro: tk("Androgynous") };
const FRONT_ZONE_KEYS: ZoneKey[] = ["shoulders", "chest", "biceps", "forearms", "core", "quads", "calves"];
const BACK_ZONE_KEYS: ZoneKey[] = ["shoulders", "back", "triceps", "forearms", "glutes", "hamstrings", "calves"];
const SAVE_FAILED = tk("Couldn't save. Try again.");
const saveFailure = (error: string) => (isCustomExerciseRule(error) ? error : SAVE_FAILED);

const caps14: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#8C8378", whiteSpace: "nowrap" };

export default function LibraryWeb() {
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
  } = useApp();
  useEffect(() => {
    noteFeatureMilestone("exercise_library");
  }, [noteFeatureMilestone]);
  const { rail } = useWebLayout();
  const online = useOnline();
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [hoverZone, setHoverZone] = useState<ZoneKey | null>(null);
  const [discipline, setDiscipline] = useState<ExerciseTag | null>(null);
  const [disciplineAnchor, setDisciplineAnchor] = useState<HTMLElement | null>(null);
  const [creating, setCreating] = useState<string | null>(null);
  const startCreate = (name: string) => {
    if (!online) {
      setToast(SAVE_FAILED);
      return;
    }
    setCreating(name);
  };
  const [bodySide, setBodySide] = useState<BodySide>("front");
  const sideZoneKeys = bodySide === "front" ? FRONT_ZONE_KEYS : BACK_ZONE_KEYS;
  const selectedZoneKey = sideZoneKeys.find((k) => ZONE_KEY_TO_GROUP[k] === selectedGroup) ?? null;
  const figureGender: FigureGender = bodyMapVariant === "androgynous" ? "andro" : bodyMapVariant;
  const figureKey = `${figureGender}-${bodySide}` as FigureKey;
  const figureAlt =
    bodySide === "front" ? t("{figure}, front", { figure: t(FIGURE_NAME[figureGender]) }) : t("{figure}, back", { figure: t(FIGURE_NAME[figureGender]) });
  const [editingExercise, setEditingExercise] = useState<DbExercise | null>(null);
  const [info, setInfo] = useState<{ name: string; source: { id: string; kind: "catalog" | "custom" } | null } | null>(null);
  const [history, setHistory] = useState<{ name: string; match: { catalogId?: string; customId?: string } } | null>(null);
  const customSource = (e: DbExercise | null) => (e && /^[0-9a-f-]{36}$/i.test(e.id) ? { id: e.id, kind: "custom" as const } : null);
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
    const library = exerciseCatalog.map((e) => ({ id: e.id, name: e.name, muscleGroups: e.muscleGroups, secondaryMuscleGroups: e.secondaryMuscleGroups, classification: e.classification, tags: e.tags, aliases: e.aliases, isCustom: false }));
    const custom = customExercises.map((e) => ({ id: e.id ?? e.name, name: e.name, muscleGroups: e.muscleGroups ?? [], secondaryMuscleGroups: e.secondaryMuscleGroups ?? [], classification: e.classification, tags: e.tags ?? [], isCustom: true }));
    return [...custom, ...library];
  }, [exerciseCatalog, customExercises]);
  const searched = useMemo(() => {
    const q = searchKey(query);
    return all.filter((e) => matchesSearch(q, e.name, e.aliases));
  }, [all, query]);
  const filteredByGroup = useMemo(() => (selectedGroup ? searched.filter((e) => e.muscleGroups.includes(selectedGroup)) : searched), [searched, selectedGroup]);
  const filtered = useMemo(() => (discipline ? filteredByGroup.filter((e) => e.tags.includes(discipline)) : filteredByGroup), [filteredByGroup, discipline]);
  const yoursCount = filtered.filter((e) => e.isCustom).length;
  const loading = exerciseCatalog.length === 0 && !exerciseCatalogError;

  // The list's heads: the first letter for A–Z (reference), else the
  // muscle group or classification, as on mobile.
  const groups = useMemo(() => {
    if (sort === "alphabetical") {
      const byLetter = new Map<string, DbExercise[]>();
      [...filtered]
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach((e) => {
          const l = e.name.trim().charAt(0).toLocaleUpperCase() || "#";
          byLetter.set(l, [...(byLetter.get(l) ?? []), e]);
        });
      return [...byLetter.entries()].map(([label, items]) => ({ label, items }));
    }
    if (sort === "classification") {
      const byClass = new Map<ExerciseClassification, DbExercise[]>();
      filtered.forEach((e) => byClass.set(e.classification, [...(byClass.get(e.classification) ?? []), e]));
      return [...byClass.entries()]
        .sort((a, b) => t(classificationLabel[a[0]]).localeCompare(t(classificationLabel[b[0]])))
        .map(([key, items]) => ({ label: t(classificationLabel[key]), items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
    }
    const byGroup = new Map<MuscleGroup, DbExercise[]>();
    filtered.forEach((e) => e.muscleGroups.filter((mg) => mg !== "other").forEach((mg) => byGroup.set(mg, [...(byGroup.get(mg) ?? []), e])));
    return [...byGroup.entries()]
      .sort((a, b) => muscle(MUSCLE_GROUP_LABEL[a[0]]).localeCompare(muscle(MUSCLE_GROUP_LABEL[b[0]])))
      .map(([key, items]) => ({ label: muscle(MUSCLE_GROUP_LABEL[key]), items: items.sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [filtered, sort]);

  // Even columns, read top to bottom: PER rows a column, a head where a group starts or a column begins.
  const PER = rail ? 7 : 8;
  const columns = useMemo(() => {
    const flat = groups.flatMap((g) => g.items.map((e) => ({ e, head: g.label })));
    const out: { head: string | null; e: DbExercise; first: boolean }[][] = [];
    for (let i = 0; i < flat.length; i += PER) {
      const chunk = flat.slice(i, i + PER);
      out.push(chunk.map((r, j) => ({ e: r.e, head: j === 0 || chunk[j - 1].head !== r.head ? r.head : null, first: j === 0 })));
    }
    return out;
  }, [groups, PER]);

  const deleteImpact = (customExerciseId: string) => ({
    routines: usage?.id === customExerciseId ? usage.routines : routines.filter((r) => r.exercises.some((ex) => ex.customExerciseId === customExerciseId)).length,
    templates: workoutTemplates.filter((tpl) => tpl.exercises.some((ex) => ex.customExerciseId === customExerciseId)).length,
    hasPersonalRecord: Object.keys(personalRecords).some((name) => name === customExercises.find((c) => c.id === customExerciseId)?.name),
  });
  const flipSide = () => {
    setSelectedGroup(null);
    setHoverZone(null);
    setBodySide((s) => (s === "front" ? "back" : "front"));
  };

  const listRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const segBtn = (v: ViewMode, icon: React.ReactNode, label: string) => {
    const on = view === v;
    return (
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        title={label}
        onClick={() => {
          setView(v);
          setSelectedGroup(null);
          setHoverZone(null);
        }}
        className="grid place-items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
        style={{ width: 48, borderRadius: 9, background: on ? "#9A8CD6" : "transparent", color: on ? "#FFFFFF" : "#8C8378" }}
      >
        {icon}
      </button>
    );
  };
  const pill = (on: boolean): React.CSSProperties => ({
    flex: "none",
    height: 40,
    padding: "0 16px",
    borderRadius: 999,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 15,
    lineHeight: "24px",
    whiteSpace: "nowrap",
    border: `0.5px solid ${on ? "#9A8CD6" : "rgba(36,31,27,0.11)"}`,
    background: on ? "#9A8CD6" : "#FFFFFF",
    color: on ? "#FFFFFF" : "#5B5349",
    fontWeight: on ? 700 : 600,
  });

  const noMatch = !loading && !exerciseCatalogError && filtered.length === 0;

  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        <div className="flex" style={{ height: 40, padding: 4, borderRadius: 12, background: "#F5F5F6", boxSizing: "border-box", flex: "none" }}>
          {segBtn("list", <List size={20} />, t("List"))}
          {segBtn("body", <User size={20} />, t("Body"))}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 pointer-events-none" style={{ insetInlineStart: 14, color: "#8C8378" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search exercises…")}
            aria-label={t("Search exercises")}
            className="w-full placeholder:text-[#8C8378] focus:outline-none focus:ring-2 focus:ring-[#AEA1DC]/40"
            style={{ height: 40, boxSizing: "border-box", borderRadius: 14, background: "#F5F5F6", paddingInlineStart: 38, paddingInlineEnd: 14, fontSize: 15, lineHeight: "24px", color: "#241F1B" }}
          />
        </div>
        {view === "list" &&
          (["alphabetical", "muscleGroup", "classification"] as SortMode[]).map((s) => (
            <button key={s} type="button" onClick={() => setSort(s)} aria-pressed={sort === s} style={pill(sort === s)}>
              {s === "alphabetical" ? t("A–Z") : s === "muscleGroup" ? t("Muscle Group") : t("Classification")}
            </button>
          ))}
        {view === "list" && (
          <button type="button" onClick={(e) => setDisciplineAnchor(e.currentTarget)} aria-haspopup="menu" style={pill(!!discipline)}>
            {discipline ? t("Discipline: {name}", { name: muscle(EXERCISE_TAG_LABEL[discipline]) }) : t("Discipline")}
            <ChevronDown size={16} style={{ color: discipline ? "#FFFFFF" : "#ADA9A4" }} />
          </button>
        )}
        <button
          type="button"
          onClick={() => startCreate("")}
          className="flex items-center"
          style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#F0EDF9", color: "#5F5093", gap: 6, fontSize: 15, lineHeight: "24px", fontWeight: 600, flex: "none", whiteSpace: "nowrap" }}
        >
          <Plus size={16} />
          {t("Create")}
        </button>
      </div>

      {view === "list" && (
        <>
          {exerciseCatalogError && <LoadErrorCard card message={t("Couldn't load exercises.")} onRetry={retryExerciseCatalog} />}
          {loading && (
            <div style={{ ...borderCard, padding: "0 12px" }}>
              <SkeletonRows count={8} height={52} divided />
            </div>
          )}
          {noMatch ? (
            <EmptyCard style={{ gap: 8 }}>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>
                {query.trim() ? t("No exercises match '{query}'.", { query: query.trim() }) : t("No exercises match.")}
              </p>
              {query.trim() && (
                <button type="button" onClick={() => startCreate(query.trim())} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5" }}>
                  {t("Create '{query}'", { query: query.trim() })}
                </button>
              )}
            </EmptyCard>
          ) : (
            filtered.length > 0 && (
              <div className="flex flex-col" style={{ gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 500, color: "#8C8378" }}>
                  {tn(filtered.length, "{n} exercise", "{n} exercises")}
                  {yoursCount > 0 ? ` · ${t("{n} yours", { n: yoursCount })}` : ""}
                </p>
                <div ref={listRef} className="flex no-scrollbar" style={{ gap: 24, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
                  {columns.map((col, ci) => (
                    <div key={ci} className="flex flex-col" style={{ flex: "none", width: "calc((100% - 48px) / 3)" }}>
                      {col.map(({ e, head, first }) => (
                        <React.Fragment key={e.id + (head ?? "")}>
                          {head && <p style={{ margin: `${first ? 0 : 10}px 0 4px`, fontSize: 13, lineHeight: "20px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8C8378" }}>{head}</p>}
                          <button
                            type="button"
                            onClick={() => setEditingExercise(e)}
                            className="flex items-center text-start hover:!bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
                            style={{ flex: "none", height: 52, boxSizing: "border-box", gap: 10, padding: "0 4px", borderTop: "0.5px solid rgba(36,31,27,0.08)" }}
                          >
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center" style={{ gap: 6 }}>
                                <span className="truncate" title={e.name} style={{ fontSize: 15, lineHeight: "22px", fontWeight: 500, color: "#241F1B" }}>
                                  {e.name}
                                </span>
                                {e.isCustom && (
                                  <span style={{ flex: "none", borderRadius: 6, padding: "1px 6px", background: "#F0EDF9", color: "#5F5093", fontSize: 11, lineHeight: "16px", fontWeight: 700 }}>{t("Yours")}</span>
                                )}
                              </span>
                              <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                                {e.tags.length > 0 ? e.tags.map((tag) => muscle(EXERCISE_TAG_LABEL[tag])).join(" · ") : t(classificationLabel[e.classification])}
                              </span>
                            </span>
                            <ChevronRight size={16} style={{ color: "#A79E93", flex: "none" }} />
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  ))}
                </div>
                <PillScrollbar target={listRef} deps={[columns.length, rail]} />
              </div>
            )
          )}
        </>
      )}

      {view === "body" && (
        <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24, alignItems: "start" }}>
          <div className="min-w-0 flex flex-col" style={{ gap: 24 }}>
            <div className="relative flex flex-col overflow-hidden" style={{ background: "#FBFBFD", border: "1px solid rgba(174,161,220,0.3)", borderRadius: 18, paddingBottom: 44 }}>
              <div className="flex items-center justify-between" style={{ padding: "14px 16px 0" }}>
                <p style={caps14}>{bodySide === "front" ? t("Front view") : t("Back view")}</p>
                <button type="button" onClick={flipSide} className="flex items-center hover:!bg-[#F0EDF9]" style={{ height: 36, padding: "0 14px", borderRadius: 9, border: "1px solid #E7E6E6", background: "#FFFFFF", gap: 6, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#5F5093" }}>
                  <RefreshCw size={16} />
                  {bodySide === "front" ? tx("Back", "side") : t("Front")}
                </button>
              </div>
              <div className="grid place-items-center" style={{ paddingTop: 8 }}>
                <WebBodyFigure
                  key={figureKey}
                  figure={figureKey}
                  height={rail ? 330 : 420}
                  zones={sideZoneKeys}
                  selected={selectedZoneKey}
                  hover={hoverZone}
                  onHover={setHoverZone}
                  onSelect={(zone) => setSelectedGroup(zone ? ZONE_KEY_TO_GROUP[zone] : null)}
                  alt={figureAlt}
                  label={(zone) => muscle(ZONE_LABEL[zone])}
                />
              </div>
              <p className="absolute whitespace-nowrap" style={{ insetInlineStart: 14, bottom: 12, margin: 0, fontSize: 13, lineHeight: "20px", color: "#A79E93" }}>
                {figureAlt}
              </p>
            </div>
            <div className="flex flex-col" style={{ ...borderCard, padding: 16, gap: 10 }}>
              <p style={caps14}>{t("Muscle groups")}</p>
              <div ref={chipsRef} className="flex no-scrollbar" style={{ flexWrap: "nowrap", gap: 7, overflowX: "auto", scrollbarWidth: "none" }}>
                {sideZoneKeys.map((z) => {
                  const on = selectedZoneKey === z;
                  const hov = hoverZone === z && !on;
                  return (
                    <button
                      key={z}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedGroup(on ? null : ZONE_KEY_TO_GROUP[z])}
                      onMouseEnter={() => setHoverZone(z)}
                      onMouseLeave={() => setHoverZone(null)}
                      style={{ flex: "none", borderRadius: 8, padding: "8px 14px", fontSize: 15, lineHeight: "24px", whiteSpace: "nowrap", background: on ? "#A092E0" : hov ? "#F0EDF9" : "#FFFFFF", border: `1px solid ${on ? "#A092E0" : "#E7E6E6"}`, color: on ? "#FFFFFF" : "#241F1B", fontWeight: on ? 700 : 500 }}
                    >
                      {muscle(ZONE_LABEL[z])}
                    </button>
                  );
                })}
              </div>
              <PillScrollbar target={chipsRef} deps={[bodySide, rail]} />
            </div>
          </div>
          <div className="min-w-0 flex flex-col" style={{ ...borderCard, padding: 20, gap: 12, position: "sticky", top: 88, maxHeight: "calc(100dvh - 112px)" }}>
            {selectedZoneKey ? (
              <>
                <p style={{ margin: 0, flex: "none", fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{`${muscle(ZONE_LABEL[selectedZoneKey])} · ${tn(filtered.length, "{n} exercise", "{n} exercises")}`}</p>
                {filtered.length === 0 ? (
                  <div className="grid place-items-center" style={{ flex: "none", padding: 24, borderRadius: 12, background: "#F5F5F6" }}>
                    <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("No exercises for this group.")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col no-scrollbar" style={{ flex: "0 1 auto", minHeight: 0, overflow: "auto", scrollbarWidth: "none", gap: 8 }}>
                    {filtered.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEditingExercise(e)}
                        className="flex items-center justify-between text-start hover:!bg-[#FAFAFB]"
                        style={{ flex: "none", height: 52, boxSizing: "border-box", gap: 10, border: "1px solid rgba(36,31,27,0.1)", borderRadius: 12, padding: "0 16px" }}
                      >
                        <span className="min-w-0 truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                          {e.name}
                        </span>
                        <span style={{ flex: "none", whiteSpace: "nowrap", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t(classificationLabel[e.classification])}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center" style={{ flex: "none", padding: "40px 0" }}>
                <span className="grid place-items-center" style={{ width: 64, height: 64, borderRadius: 16, background: "#F0EDF9" }}>
                  <User size={30} strokeWidth={1.25} absoluteStrokeWidth style={{ color: "#7D67D9" }} />
                </span>
                <p style={{ margin: "14px 0 0", maxWidth: 320, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B", textWrap: "balance" } as React.CSSProperties}>{t("Select a muscle to see its exercises")}</p>
                <p style={{ margin: "4px 0 0", maxWidth: 320, fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#8C8378" }}>{t("Click a muscle on the figure, or pick one from Muscle groups.")}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <PopupMenu<ExerciseTag | "all">
        open={!!disciplineAnchor}
        anchor={disciplineAnchor}
        onClose={() => setDisciplineAnchor(null)}
        options={[{ value: "all", label: t("All") }, ...EXERCISE_TAGS.map((tag) => ({ value: tag, label: muscle(EXERCISE_TAG_LABEL[tag]) }))]}
        selected={discipline ?? "all"}
        variant="filled"
        onSelect={(v) => setDiscipline(v === "all" ? null : v)}
      />
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
          if (editingExercise?.isCustom) void updateCustomExercise(editingExercise.id, data).then((error) => error && setToast(saveFailure(error)));
        }}
      />
      <ExerciseHistorySheet open={!!history} onClose={() => setHistory(null)} name={history?.name ?? ""} match={history?.match ?? null} />
      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} name={info?.name ?? ""} source={info?.source ?? null} />
      <Toast open={!!toast} message={toast ? t(toast) : ""} icon={<AlertCircle size={16} style={{ color: "#C0392B" }} />} onExpire={() => setToast(null)} />
    </div>
  );
}

/**
 * The draggable pill scrollbar under a sideways-scrolling row (reference): a
 * 6 track (#AEA1DC at 25%) and the #AEA1DC thumb (hover #9A8CD6, at least
 * 32), dragged with the pointer. Hidden when everything fits.
 */
const PillScrollbar: React.FC<{ target: React.RefObject<HTMLDivElement | null>; deps: unknown[] }> = ({ target, deps }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [m, setM] = useState({ w: 100, p: 0 });
  const [dragging, setDragging] = useState(false);
  const measure = useCallback(() => {
    const el = target.current;
    if (!el || !el.scrollWidth) return;
    const w = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
    const max = el.scrollWidth - el.clientWidth;
    const rtl = getComputedStyle(el).direction === "rtl";
    const left = rtl ? -el.scrollLeft : el.scrollLeft;
    const p = max > 0 ? Math.min(1, Math.max(0, left / max)) : 0;
    setM((s) => (Math.abs(s.w - w) > 0.3 || Math.abs(s.p - p) > 0.004 ? { w, p } : s));
  }, [target]);
  useLayoutEffect(() => {
    const el = target.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps]);
  if (m.w >= 99.9) return null;
  const onDown = (e: React.PointerEvent) => {
    const el = target.current;
    const tr = trackRef.current;
    if (!el || !tr) return;
    e.preventDefault();
    const sx = e.clientX;
    const s0 = el.scrollLeft;
    const thumbPx = Math.max(32, (tr.clientWidth * el.clientWidth) / el.scrollWidth);
    const ratio = (el.scrollWidth - el.clientWidth) / Math.max(1, tr.clientWidth - thumbPx);
    setDragging(true);
    const mv = (ev: PointerEvent) => {
      el.scrollLeft = s0 + (ev.clientX - sx) * ratio;
    };
    const up = () => {
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      setDragging(false);
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };
  const width = `max(32px, ${m.w.toFixed(2)}%)`;
  return (
    <div ref={trackRef} aria-hidden style={{ flex: "none", position: "relative", height: 6, borderRadius: 999, background: "rgba(174,161,220,0.25)" }}>
      <span
        onPointerDown={onDown}
        className="hover:!bg-[#9A8CD6]"
        style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: `calc((100% - ${width}) * ${m.p.toFixed(4)})`, width, borderRadius: 999, background: "#AEA1DC", cursor: dragging ? "grabbing" : "grab", touchAction: "none", transition: "background-color .15s" }}
      />
    </div>
  );
};

/**
 * The body figure for the web (the mobile BodyFigure's art, masks and hit
 * test at the web size): the selected zone in lavender with its glow, and a
 * lighter tint on the zone under the pointer (or the hovered chip).
 */
const WebBodyFigure: React.FC<{
  figure: FigureKey;
  height: number;
  zones: ZoneKey[];
  selected: ZoneKey | null;
  hover: ZoneKey | null;
  onHover: (zone: ZoneKey | null) => void;
  onSelect: (zone: ZoneKey | null) => void;
  alt: string;
  label: (zone: ZoneKey) => string;
}> = ({ figure, height, zones, selected, hover, onHover, onSelect, alt, label }) => {
  const meta = BODY_FIGURES[figure];
  const width = Math.round((meta.width * height) / meta.height);
  const masks = useRef(new Map<string, Uint8ClampedArray>());
  useEffect(() => {
    let cancelled = false;
    for (const zone of zones) {
      const key = `${figure}-${zone}`;
      if (masks.current.has(key)) continue;
      const img = new Image();
      img.onload = () => {
        if (cancelled) return;
        const c = document.createElement("canvas");
        c.width = meta.width;
        c.height = meta.height;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, meta.width, meta.height).data;
        const alpha = new Uint8ClampedArray(meta.width * meta.height);
        for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
        masks.current.set(key, alpha);
      };
      img.src = zoneMaskUrl(figure, zone);
    }
    return () => {
      cancelled = true;
    };
  }, [figure, zones, meta.width, meta.height]);
  const zoneAt = (clientX: number, clientY: number, box: DOMRect): ZoneKey | null => {
    const x = Math.floor(((clientX - box.left) / box.width) * meta.width);
    const y = Math.floor(((clientY - box.top) / box.height) * meta.height);
    if (x < 0 || y < 0 || x >= meta.width || y >= meta.height) return null;
    for (const zone of zones) {
      const alpha = masks.current.get(`${figure}-${zone}`);
      if (alpha && alpha[y * meta.width + x] > 128) return zone;
    }
    return null;
  };
  const mask = (z: ZoneKey): React.CSSProperties => ({
    WebkitMaskImage: `url(${zoneMaskUrl(figure, z)})`,
    maskImage: `url(${zoneMaskUrl(figure, z)})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  });
  return (
    <div
      className="relative"
      dir="ltr"
      style={{ width, height, cursor: hover ? "pointer" : "default" }}
      onClick={(e) => {
        const zone = zoneAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
        if (zone) onSelect(zone === selected ? null : zone);
      }}
      onMouseMove={(e) => {
        const zone = zoneAt(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect());
        if (zone !== hover) onHover(zone);
      }}
      onMouseLeave={() => onHover(null)}
      role="group"
      aria-label={alt}
    >
      {hover && hover !== selected && meta.zones[hover] && <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "rgba(143,104,246,0.28)", ...mask(hover) }} />}
      {selected && meta.zones[selected] && (
        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ filter: "drop-shadow(0 0 4px rgba(143,104,246,0.6))" }}>
          <div className="body-zone-fill absolute inset-0" style={{ background: "rgba(143,104,246,0.6)", ...mask(selected), animation: "body-zone-shimmer 2.8s ease-in-out infinite" }} />
        </div>
      )}
      <style>{"@keyframes body-zone-shimmer { 0% { opacity: .8 } 50% { opacity: 1 } 100% { opacity: .8 } } @media (prefers-reduced-motion: reduce) { .body-zone-fill { animation: none !important } }"}</style>
      <img src={`/body/${figure}.png`} alt={alt} draggable={false} className="absolute inset-0 block w-full h-full select-none pointer-events-none" style={{ objectFit: "contain" }} />
      <div className="sr-only">
        {zones.map((zone) => (
          <button key={zone} type="button" aria-pressed={selected === zone} onClick={() => onSelect(selected === zone ? null : zone)}>
            {label(zone)}
          </button>
        ))}
      </div>
    </div>
  );
};
