import React, { useMemo, useState } from "react";
import { Search, Check, AlertCircle } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { SegmentedTabs } from "../ui/SegmentedTabs";
import { Toast } from "../ui/Toast";
import { CreateExerciseButton } from "./CreateExerciseButton";
import { MUSCLE_GROUP_LABEL } from "../../utils/muscleGroups";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "./CreateCustomExerciseSheet";
import { BuiltInExerciseSheet } from "./BuiltInExerciseSheet";
import { ExerciseInfoSheet } from "./ExerciseInfoSheet";
import { ExerciseHistorySheet } from "./ExerciseHistorySheet";
import { LoadErrorCard, SkeletonRows, YoursTag, matchesSearch, searchKey, useLibraryInk } from "./LibraryParts";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { isUuid } from "../../services/food";
import { isCustomExerciseRule } from "../../services/exercises";
import { linePx, textPx } from "../../theme/textSize";
import type { ExerciseClassification, ExerciseTag, MuscleGroup } from "../../types";

export interface ExercisePick {
  name: string;
  muscleGroups?: CustomExerciseData["muscleGroups"];
  secondaryMuscleGroups?: CustomExerciseData["secondaryMuscleGroups"];
  classification?: CustomExerciseData["classification"];
  isCustom?: boolean;
  /**
   * THE PICK CARRIES ITS ROW ID NOW, which Phase 1 deliberately did not do
   * because nothing could store it yet. routine_exercises points at exactly
   * one of two tables and holds no name, so a routine has to record which row
   * a pick meant — and resolving that by name at save time would re-guess
   * something this list already knows for certain.
   *
   * Still absent for a custom exercise that has never reached the server (it
   * has no row id to carry), and the name fallback in services/routines covers
   * that as well as routines built before any of this existed.
   */
  exerciseId?: string;
  customExerciseId?: string;
}

/** One row of the list: a catalog movement or one of the user's own. */
interface LibraryRow {
  key: string;
  id?: string;
  name: string;
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  tags: ExerciseTag[];
  isCustom: boolean;
}

const SAVE_FAILED = "Couldn't save. Try again.";
/** A failed custom-exercise write: the rule it broke (B3, PB-O-32), else the toast's copy. */
const saveFailure = (error: string) => (isCustomExerciseRule(error) ? error : SAVE_FAILED);

/**
 * The Exercise Library sheet (v6 WO1.3), opened from a routine's Add
 * exercise, the routine editor, Replace (swipe and Exercise settings) and the
 * coach template builder: one component, every caller.
 *
 * Search and a compact "Create" share one row; the muscle-group filters are
 * the FO3-style teal sub-tabs in one scrolling row (built from the catalogue's
 * own groups, All first, alphabetical; primary movers only); the list is flat
 * rows with a 0.5px top hairline, the user's own first with a "Yours" tag, then
 * the catalogue, each with its first primary muscle and a separate "+ Add".
 * The name opens the exercise's detail, stacked over the sheet. The sheet
 * stays open after adding (the row turns "Added ✓"); in `mode="replace"` the
 * link reads "Replace" and the caller closes the sheet on the pick.
 */
export const ExerciseLibrarySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (pick: ExercisePick) => void;
  alreadyAdded: string[];
  /** "replace": swapping one exercise (WO1.3 K2): "+ Add" reads "Replace". */
  mode?: "add" | "replace";
}> = ({ open, onClose, onPick, alreadyAdded, mode = "add" }) => {
  const {
    exerciseCatalog,
    exerciseCatalogError,
    retryExerciseCatalog,
    customExercises,
    addCustomExercise,
    updateCustomExercise,
  } = useApp();
  const dark = useIsDark();
  const ink = useLibraryInk();
  const online = useOnline();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MuscleGroup | null>(null);
  // Create: null closed, else the name it opens with ("Create 'xyz'" prefills it).
  const [creating, setCreating] = useState<string | null>(null);
  const [detail, setDetail] = useState<LibraryRow | null>(null);
  const [info, setInfo] = useState<{ name: string; source: { id: string; kind: "catalog" | "custom" } | null } | null>(null);
  const [history, setHistory] = useState<{ name: string; match: { catalogId?: string; customId?: string } } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // THE TABS ARE THE CATALOG'S OWN MUSCLE GROUPS, built from what was
  // actually loaded rather than from a fixed list, so a tab can never offer a
  // filter that matches nothing (the handover keeps this repo rule).
  const categories = useMemo(() => {
    const present = new Set<MuscleGroup>();
    for (const e of exerciseCatalog) for (const mg of e.muscleGroups) present.add(mg);
    return [...present].sort((a, b) => MUSCLE_GROUP_LABEL[a].localeCompare(MUSCLE_GROUP_LABEL[b]));
  }, [exerciseCatalog]);

  // Primary movers only, never secondary — the same rule the Library tab
  // follows. Search is case- and accent-insensitive, by name or by the
  // catalogue's aliases (B3 PB-O-33).
  const rows = useMemo<LibraryRow[]>(() => {
    const q = searchKey(query);
    const keep = (name: string, groups: MuscleGroup[], aliases?: string[]) =>
      matchesSearch(q, name, aliases) && (category ? groups.includes(category) : true);
    const custom = customExercises
      .filter((e) => keep(e.name, e.muscleGroups ?? []))
      .map((e) => ({
        key: `c:${e.id ?? e.name}`,
        id: e.id,
        name: e.name,
        muscleGroups: e.muscleGroups ?? [],
        secondaryMuscleGroups: e.secondaryMuscleGroups ?? [],
        classification: e.classification,
        tags: e.tags ?? [],
        isCustom: true,
      }));
    const catalog = exerciseCatalog
      .filter((e) => keep(e.name, e.muscleGroups, e.aliases))
      .map((e) => ({
        key: `x:${e.id}`,
        id: e.id,
        name: e.name,
        muscleGroups: e.muscleGroups,
        secondaryMuscleGroups: e.secondaryMuscleGroups,
        classification: e.classification,
        tags: e.tags,
        isCustom: false,
      }));
    return [...custom, ...catalog];
  }, [customExercises, exerciseCatalog, query, category]);

  const loading = exerciseCatalog.length === 0 && !exerciseCatalogError;

  const pickOf = (r: LibraryRow): ExercisePick =>
    r.isCustom
      ? {
          name: r.name,
          classification: r.classification,
          muscleGroups: r.muscleGroups,
          secondaryMuscleGroups: r.secondaryMuscleGroups,
          isCustom: true,
          // Undefined while this one is still queued for upload.
          customExerciseId: isUuid(r.id ?? "") ? r.id : undefined,
        }
      : { name: r.name, classification: r.classification, muscleGroups: r.muscleGroups, secondaryMuscleGroups: r.secondaryMuscleGroups, exerciseId: r.id };

  const close = () => {
    setQuery("");
    setCategory(null);
    onClose();
  };

  const openCreate = (name: string) => {
    // Offline: nothing can be saved (WO1.3 O4).
    if (!online) {
      setToast(SAVE_FAILED);
      return;
    }
    setCreating(name);
  };

  // WO1.3 S3: on save the new exercise appears with "Yours" and is selected.
  const saveCreated = async (data: CustomExerciseData) => {
    const error = await addCustomExercise(data);
    if (error) {
      setToast(saveFailure(error));
      return;
    }
    onPick({
      name: data.name,
      classification: data.classification,
      muscleGroups: data.muscleGroups,
      secondaryMuscleGroups: data.secondaryMuscleGroups,
      isCustom: true,
    });
  };

  const tabs = [{ key: "all", label: "All" }, ...categories.map((c) => ({ key: c, label: MUSCLE_GROUP_LABEL[c] }))];
  const actionLabel = mode === "replace" ? "Replace" : "+ Add";

  return (
    <>
      <BottomSheet
        open={open}
        onClose={close}
        title="Exercise Library"
        // WO1.3 #56-#61: Part B chrome (0.5px outline, ring 1.1), X 13, the
        // title #7248F8 / dark #A991FE 20/30, body padding 16 16 0, the sheet
        // at its full height (740 of 844), no scrim blur (none drawn), swipe
        // the header down to close. Scrim rgba(36,31,27,0.4) in both modes (X-07).
        chrome="partB"
        tone={{ band: "var(--sheet-band)", border: "var(--sheet-border)", title: "var(--sheet-border)", body: "var(--sheet-body)" }}
        xSize={13}
        titleLineHeight={30}
        bodyPadding={{ top: 16, right: 16, bottom: 16, left: 16 }}
        fillHeight
        scrimBlur={false}
        swipeToClose
      >
        {/* #62-#66: search fills, Create compact on the right, gap 8. */}
        <div className="flex items-center" style={{ gap: 8 }}>
          <label
            className="flex-1 min-w-0 flex items-center bg-cream-soft border-[0.5px] border-charcoal/[0.06]"
            style={{ height: 42, borderRadius: 14, padding: "0 12px", gap: 8 }}
          >
            <Search size={16} className="shrink-0 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises"
              aria-label="Search exercises"
              className="flex-1 min-w-0 bg-transparent text-charcoal placeholder:text-charcoal-faint focus:outline-none"
              style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3) }}
            />
          </label>
          <CreateExerciseButton compact onClick={() => openCreate("")} />
        </div>

        {/* #67-#69: the teal sub-tabs, scrolling; dark track #242730 (V6-93),
            active #79A8A1 in both modes (V6-94). */}
        <SegmentedTabs
          className="mt-3"
          variant="teal"
          scroll
          items={tabs}
          activeKey={category ?? "all"}
          onChange={(k) => setCategory(k === "all" ? null : (k as MuscleGroup))}
          activeFillDark="#79A8A1"
        />

        <div style={{ marginTop: 9.5 }}>
          {rows.map((r, i) => {
            const added = mode === "add" && alreadyAdded.includes(r.name);
            const muscle = r.muscleGroups.find((m) => m !== "other") ?? r.muscleGroups[0];
            return (
              <div
                key={r.key}
                className={`flex items-center ${i > 0 ? "border-t-[0.5px] border-charcoal/[0.08]" : ""}`}
                style={{ padding: "13px 4px", gap: 10 }}
              >
                <button
                  type="button"
                  onClick={() => setDetail(r)}
                  className="tap flex-1 min-w-0 flex items-center text-left"
                  style={{ gap: 6 }}
                  aria-label={`${r.name}, details`}
                >
                  <span className="truncate" style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 500, color: "rgb(var(--c-charcoal))" }}>
                    {r.name}
                  </span>
                  {r.isCustom && <YoursTag />}
                </button>
                {muscle && (
                  <span className="shrink-0 text-charcoal-faint" style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400 }}>
                    {MUSCLE_GROUP_LABEL[muscle]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => !added && onPick(pickOf(r))}
                  aria-disabled={added}
                  aria-label={added ? `${r.name} added` : mode === "replace" ? `Replace with ${r.name}` : `Add ${r.name}`}
                  className="tap relative shrink-0 inline-flex items-center before:absolute before:-inset-x-[6px] before:-inset-y-[13px] before:content-['']"
                  style={{ gap: 3, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: ink }}
                >
                  {added ? (
                    <>
                      Added <Check size={12} strokeWidth={3} />
                    </>
                  ) : (
                    actionLabel
                  )}
                </button>
              </div>
            );
          })}

          {loading && <SkeletonRows count={8} height={46} divided />}

          {/* A FAILED LOAD IS NOT AN EMPTY LIBRARY, and it is said even when
              the user's own movements are still listed above (K1). */}
          {exerciseCatalogError && <LoadErrorCard message="Couldn't load exercises." onRetry={retryExerciseCatalog} />}

          {!loading && !exerciseCatalogError && rows.length === 0 && (
            <div className="flex flex-col items-center text-center" style={{ padding: "28px 0", gap: 8 }}>
              <p className="text-charcoal-faint" style={{ margin: 0, fontSize: textPx(13.5), lineHeight: linePx(20.3) }}>
                {query.trim() ? `No exercises match '${query.trim()}'.` : "No exercises match."}
              </p>
              {query.trim() && (
                <button
                  type="button"
                  onClick={() => openCreate(query.trim())}
                  className="tap relative before:absolute before:-inset-[12px] before:content-['']"
                  style={{ fontSize: textPx(12.5), lineHeight: linePx(18.8), fontWeight: 700, color: ink }}
                >
                  {`Create '${query.trim()}'`}
                </button>
              )}
            </div>
          )}
        </div>
      </BottomSheet>

      <CreateCustomExerciseSheet
        open={creating !== null}
        onClose={() => setCreating(null)}
        initial={creating ? { name: creating } : undefined}
        onSave={(data) => void saveCreated(data)}
      />

      {/* S6: the name opens the exercise's detail, over the library. */}
      <BuiltInExerciseSheet
        open={!!detail && !detail.isCustom}
        onClose={() => setDetail(null)}
        exercise={detail && !detail.isCustom ? detail : null}
        onInfo={() => detail?.id && setInfo({ name: detail.name, source: { id: detail.id, kind: "catalog" } })}
        onHistory={() => detail?.id && setHistory({ name: detail.name, match: { catalogId: detail.id } })}
      />
      <CreateCustomExerciseSheet
        open={!!detail?.isCustom}
        onClose={() => setDetail(null)}
        initial={detail?.isCustom ? detail : undefined}
        onInfo={(name) => setInfo({ name, source: detail && isUuid(detail.id ?? "") ? { id: detail.id!, kind: "custom" } : null })}
        onHistory={() => detail && setHistory({ name: detail.name, match: { customId: detail.id } })}
        onSave={(data) => {
          if (detail?.isCustom && detail.id) {
            void updateCustomExercise(detail.id, data).then((error) => error && setToast(saveFailure(error)));
          }
        }}
      />
      <ExerciseHistorySheet open={!!history} onClose={() => setHistory(null)} name={history?.name ?? ""} match={history?.match ?? null} />
      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} name={info?.name ?? ""} source={info?.source ?? null} />

      <Toast
        open={!!toast}
        message={toast ?? ""}
        icon={<AlertCircle size={16} style={{ color: dark ? "#F09A8E" : "#C0392B" }} />}
        onExpire={() => setToast(null)}
      />
    </>
  );
};
