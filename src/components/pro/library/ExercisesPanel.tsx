import React, { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useOnline } from "../../../hooks/useOnline";
import { MUSCLE_GROUP_LABEL } from "../../../utils/muscleGroups";
import { isUuid } from "../../../services/food";
import { isCustomExerciseRule } from "../../../services/exercises";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { Toast } from "../../ui/Toast";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "../../workout/CreateCustomExerciseSheet";
import { BuiltInExerciseSheet } from "../../workout/BuiltInExerciseSheet";
import { ExerciseInfoSheet } from "../../workout/ExerciseInfoSheet";
import { ExerciseHistorySheet } from "../../workout/ExerciseHistorySheet";
import { LoadErrorCard, SkeletonRows, YoursTag, matchesSearch, searchKey } from "../../workout/LibraryParts";
import { linePx, textPx } from "../../../theme/textSize";
import type { ExerciseClassification, ExerciseTag, MuscleGroup, WorkoutTemplate } from "../../../types";
import { INK } from "../proInk";
import { t, tk, tn } from "../../../i18n/core";

const CLASSIFICATION: Record<ExerciseClassification, string> = {
  barbell: tk("Barbell"),
  dumbbell: tk("Dumbbell"),
  machine_other: tk("Machine / Other"),
  weighted_bodyweight: tk("Weighted Bodyweight"),
  assisted_bodyweight: tk("Assisted Bodyweight"),
  reps_only: tk("Reps Only"),
  cardio: tk("Cardio"),
  duration: tk("Duration"),
};

interface Row {
  key: string;
  id?: string;
  name: string;
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  tags: ExerciseTag[];
  isCustom: boolean;
}

/**
 * Release 3 · W5 Library › Exercises (TR10 v3, TR15): the exercise database
 * and the professional's own custom exercises, the patterns of the client's
 * LibraryTab / ExerciseLibrarySheet (same catalogue, same search by name or
 * alias, primary muscle chips built from what loaded, the user's own first
 * with "Yours"). The search is the Library's own field above; Create opens
 * CreateCustomExerciseSheet (TR15), which saves to the professional's
 * custom_exercise_library_items through AppContext's addCustomExercise — the
 * rows assign_template_to_client copies into a client's library. Each row's
 * meta: primary muscle · classification · "used in {n} templates" (counted
 * from the professional's own templates).
 */
export const ExercisesPanel: React.FC<{ query: string; templates: WorkoutTemplate[]; creating: boolean; onCreatingChange: (open: boolean) => void }> = ({ query, templates, creating, onCreatingChange }) => {
  const { exerciseCatalog, exerciseCatalogError, retryExerciseCatalog, customExercises, addCustomExercise, updateCustomExercise } = useApp();
  const dark = useIsDark();
  const online = useOnline();
  const [category, setCategory] = useState<MuscleGroup | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [info, setInfo] = useState<{ name: string; source: { id: string; kind: "catalog" | "custom" } | null } | null>(null);
  const [history, setHistory] = useState<{ name: string; match: { catalogId?: string; customId?: string } } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const categories = useMemo(() => {
    const present = new Set<MuscleGroup>();
    for (const e of exerciseCatalog) for (const mg of e.muscleGroups) present.add(mg);
    return [...present].sort((a, b) => t(MUSCLE_GROUP_LABEL[a]).localeCompare(t(MUSCLE_GROUP_LABEL[b])));
  }, [exerciseCatalog]);

  const usage = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of templates) {
      if (t.isPublic) continue;
      const seen = new Set<string>();
      for (const e of t.exercises) {
        const id = e.exerciseId ?? e.customExerciseId;
        if (id && !seen.has(id)) {
          seen.add(id);
          m.set(id, (m.get(id) ?? 0) + 1);
        }
      }
    }
    return m;
  }, [templates]);

  const rows = useMemo<Row[]>(() => {
    const q = searchKey(query);
    const keep = (name: string, groups: MuscleGroup[], aliases?: string[]) => matchesSearch(q, name, aliases) && (category ? groups.includes(category) : true);
    const custom = customExercises
      .filter((e) => keep(e.name, e.muscleGroups ?? []))
      .map((e) => ({ key: `c:${e.id ?? e.name}`, id: e.id, name: e.name, muscleGroups: e.muscleGroups ?? [], secondaryMuscleGroups: e.secondaryMuscleGroups ?? [], classification: e.classification, tags: e.tags ?? [], isCustom: true }));
    const catalog = exerciseCatalog
      .filter((e) => keep(e.name, e.muscleGroups, e.aliases))
      .map((e) => ({ key: `x:${e.id}`, id: e.id, name: e.name, muscleGroups: e.muscleGroups, secondaryMuscleGroups: e.secondaryMuscleGroups, classification: e.classification, tags: e.tags, isCustom: false }));
    return [...custom, ...catalog];
  }, [customExercises, exerciseCatalog, query, category]);

  const loading = exerciseCatalog.length === 0 && !exerciseCatalogError;
  const saveFailure = (error: string) => (isCustomExerciseRule(error) ? error : tk("Couldn't save. Try again."));

  const saveCreated = async (data: CustomExerciseData) => {
    if (!online) {
      setToast(tk("Couldn't save. Try again."));
      return;
    }
    const error = await addCustomExercise(data);
    if (error) setToast(saveFailure(error));
  };

  const meta = (r: Row) => {
    const muscle = r.muscleGroups.find((m) => m !== "other") ?? r.muscleGroups[0];
    const n = r.id ? usage.get(r.id) ?? 0 : 0;
    return [muscle ? t(MUSCLE_GROUP_LABEL[muscle]) : null, t(CLASSIFICATION[r.classification]), n ? tn(n, "used in {n} template", "used in {n} templates") : null].filter(Boolean).join(" · ");
  };

  return (
    <div>
      <SegmentedTabs
        variant="teal"
        scroll
        items={[{ key: "all", label: t("All") }, ...categories.map((c) => ({ key: c, label: t(MUSCLE_GROUP_LABEL[c]) }))]}
        activeKey={category ?? "all"}
        onChange={(k) => setCategory(k === "all" ? null : (k as MuscleGroup))}
        activeFillDark="#79A8A1"
      />
      <div style={{ marginTop: 9.5 }}>
        {rows.map((r, i) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setDetail(r)}
            className={`tap w-full flex flex-col text-start ${i > 0 ? "border-t-[0.5px] border-charcoal/[0.08]" : ""}`}
            style={{ padding: "12px 4px", minHeight: 44 }}
            aria-label={t("{name}, details", { name: r.name })}
          >
            <span className="flex items-center" style={{ gap: 6 }}>
              <span className="truncate" style={{ fontSize: textPx(14), lineHeight: linePx(21), fontWeight: 500, color: INK.ch }}>{r.name}</span>
              {r.isCustom && <YoursTag />}
            </span>
            <span style={{ fontSize: textPx(11.5), color: INK.chF }}>{meta(r)}</span>
          </button>
        ))}
        {loading && <SkeletonRows count={8} height={46} divided />}
        {exerciseCatalogError && <LoadErrorCard message={t("Couldn't load exercises.")} onRetry={retryExerciseCatalog} />}
        {!loading && !exerciseCatalogError && rows.length === 0 && (
          <p className="text-center" style={{ padding: "28px 0", fontSize: textPx(13.5), color: INK.chF }}>
            {t("No matches. Use Create exercise above to add your own.")}
          </p>
        )}
      </div>

      <CreateCustomExerciseSheet open={creating} onClose={() => onCreatingChange(false)} initial={query.trim() && rows.length === 0 ? { name: query.trim() } : undefined} onSave={(d) => void saveCreated(d)} />
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
          if (detail?.isCustom && detail.id) void updateCustomExercise(detail.id, data).then((error) => error && setToast(saveFailure(error)));
        }}
      />
      <ExerciseHistorySheet open={!!history} onClose={() => setHistory(null)} name={history?.name ?? ""} match={history?.match ?? null} />
      <ExerciseInfoSheet open={!!info} onClose={() => setInfo(null)} name={info?.name ?? ""} source={info?.source ?? null} />
      <Toast open={!!toast} message={toast ? t(toast) : ""} icon={<AlertCircle size={16} style={{ color: dark ? "#F09A8E" : "#C0392B" }} />} onExpire={() => setToast(null)} />
    </div>
  );
};
