import { useMemo, useState } from "react";
import { Chip } from "../../components/ui/Chip";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { exerciseLibrary } from "../../data/mockWorkouts";
import type { MuscleGroup, ExerciseClassification } from "../../types";
import { List, User, Search, RotateCw } from "lucide-react";
import clsx from "clsx";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "../../components/workout/CreateCustomExerciseSheet";

type ViewMode = "list" | "body";
type SortMode = "alphabetical" | "muscleGroup" | "classification";

interface DbExercise {
  name: string;
  muscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  isCustom: boolean;
}

const muscleGroupLabel: Record<MuscleGroup, string> = {
  back: "Back",
  bicep: "Bicep",
  cardio: "Cardio",
  chest: "Chest",
  core: "Core",
  full_body: "Full Body",
  hamstrings: "Hamstrings",
  olympic: "Olympic",
  other: "Other",
  quads: "Quads",
  shoulders: "Shoulders",
  tricep: "Tricep",
};

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

// V7 (QA 7.0): two pictures (front/back) instead of one stick figure — a
// rotating arrow swaps between them, each highlighting the muscle groups
// actually visible from that side. cardio/full_body/olympic stay list-only
// (no single body zone represents them).
const frontZones: MuscleGroup[] = ["shoulders", "chest", "bicep", "core", "quads"];
const backZones: MuscleGroup[] = ["shoulders", "back", "tricep", "hamstrings"];

// V8 (QA 8.0): "replace the stick figure with a more detailed anatomical
// model" — tap zones are now body-shaped paths (tapered limbs, a rounded
// torso) layered over a matching silhouette, instead of plain rectangles.
type BodyZone =
  | { group: MuscleGroup; shape: "rect"; x: number; y: number; w: number; h: number; rx: number }
  | { group: MuscleGroup; shape: "path"; d: string };

const frontZoneRects: BodyZone[] = [
  { group: "shoulders", shape: "rect", x: 35, y: 62, w: 90, h: 18, rx: 9 },
  { group: "chest", shape: "path", d: "M52 78 Q80 70 108 78 L106 112 Q80 122 54 112 Z" },
  { group: "core", shape: "path", d: "M58 116 Q80 122 102 116 L98 160 Q80 168 62 160 Z" },
  { group: "bicep", shape: "path", d: "M18 82 Q16 100 18 118 Q22 130 30 132 L34 84 Z" },
  { group: "bicep", shape: "path", d: "M142 82 Q144 100 142 118 Q138 130 130 132 L126 84 Z" },
  { group: "quads", shape: "path", d: "M56 166 Q66 172 76 166 L74 246 L58 246 Z" },
  { group: "quads", shape: "path", d: "M104 166 Q94 172 84 166 L86 246 L102 246 Z" },
];

const backZoneRects: BodyZone[] = [
  { group: "shoulders", shape: "rect", x: 35, y: 62, w: 90, h: 18, rx: 9 },
  { group: "back", shape: "path", d: "M52 78 Q80 70 108 78 L106 112 L102 160 Q80 168 58 160 L54 112 Z" },
  { group: "tricep", shape: "path", d: "M18 82 Q16 100 18 118 Q22 130 30 132 L34 84 Z" },
  { group: "tricep", shape: "path", d: "M142 82 Q144 100 142 118 Q138 130 130 132 L126 84 Z" },
  { group: "hamstrings", shape: "path", d: "M56 166 Q66 172 76 166 L74 246 L58 246 Z" },
  { group: "hamstrings", shape: "path", d: "M104 166 Q94 172 84 166 L86 246 L102 246 Z" },
];

export default function ExerciseDatabaseTab() {
  const { customExercises, addCustomExercise, updateCustomExercise } = useApp();
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroup | null>(null);
  const [bodySide, setBodySide] = useState<"front" | "back">("front");
  const bodyZones = bodySide === "front" ? frontZones : backZones;
  // V8 (QA 8.0): "ability to edit each exercise if pressed on in the
  // library" — a custom exercise is edited in place; a stock library
  // exercise is saved as a new custom one instead of mutating shared data.
  const [editingExercise, setEditingExercise] = useState<DbExercise | null>(null);

  const all: DbExercise[] = useMemo(() => {
    const library = exerciseLibrary.map((e) => ({
      name: e.name,
      muscleGroups: e.muscleGroups,
      classification: e.classification,
      isCustom: false,
    }));
    const custom = customExercises.map((e) => ({
      name: e.name,
      muscleGroups: e.muscleGroups ?? [],
      classification: e.classification,
      isCustom: true,
    }));
    return [...custom, ...library];
  }, [customExercises]);

  const searched = useMemo(
    () => all.filter((e) => e.name.toLowerCase().includes(query.toLowerCase())),
    [all, query]
  );

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
      .sort((a, b) => muscleGroupLabel[a[0]].localeCompare(muscleGroupLabel[b[0]]))
      .map(([key, items]) => ({
        label: muscleGroupLabel[key],
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filteredByGroup, sort]);

  const zoneFill = (zone: MuscleGroup) =>
    selectedGroup === zone ? "#7D6BB5" : hoveredGroup === zone ? "#AEA1DC" : "#D9D3EC";

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
            onClick={() => setView(v)}
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
                {g.label && (
                  <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                    {g.label}
                  </p>
                )}
                <Card padded={false} className="divide-y divide-charcoal/[0.04]">
                  {g.items.map((e) => (
                    <button
                      key={e.name}
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
            {groups.every((g) => g.items.length === 0) && (
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
          <div className="flex justify-center mb-3">
            <svg viewBox="0 0 160 320" width={180} height={360}>
              {/* decorative silhouette base, same for both sides */}
              <circle cx="80" cy="26" r="18" fill="#EDEAF7" />
              <rect x="72" y="41" width="16" height="14" rx="5" fill="#EDEAF7" />
              <path d="M40 66 Q80 52 120 66 L124 108 Q80 120 36 108 Z" fill="#EDEAF7" />
              <path d="M56 104 Q80 112 104 104 L100 152 Q80 160 60 152 Z" fill="#EDEAF7" />
              <path d="M22 70 Q16 100 20 132 L34 130 Q32 98 36 72 Z" fill="#EDEAF7" />
              <path d="M138 70 Q144 100 140 132 L126 130 Q128 98 124 72 Z" fill="#EDEAF7" />
              <path d="M58 150 Q80 158 102 150 L98 250 L84 250 L80 180 L76 250 L62 250 Z" fill="#EDEAF7" />

              {(bodySide === "front" ? frontZoneRects : backZoneRects).map((z, i) =>
                z.shape === "rect" ? (
                  <rect
                    key={`${z.group}-${i}`}
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx={z.rx}
                    fill={zoneFill(z.group)}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredGroup(z.group)}
                    onMouseLeave={() => setHoveredGroup(null)}
                    onClick={() => setSelectedGroup(selectedGroup === z.group ? null : z.group)}
                  />
                ) : (
                  <path
                    key={`${z.group}-${i}`}
                    d={z.d}
                    fill={zoneFill(z.group)}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredGroup(z.group)}
                    onMouseLeave={() => setHoveredGroup(null)}
                    onClick={() => setSelectedGroup(selectedGroup === z.group ? null : z.group)}
                  />
                )
              )}
            </svg>
          </div>

          <div className="flex justify-center mb-5">
            <button
              onClick={() => {
                setBodySide((s) => (s === "front" ? "back" : "front"));
                setHoveredGroup(null);
              }}
              className="tap flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary-pale rounded-full px-3.5 py-1.5"
            >
              <RotateCw size={13} /> Switch to {bodySide === "front" ? "back" : "front"} view
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {bodyZones.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedGroup(selectedGroup === mg ? null : mg)}
                className={clsx(
                  "tap px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                  selectedGroup === mg
                    ? "bg-primary text-white border-primary"
                    : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
              >
                {muscleGroupLabel[mg]}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-charcoal-faint text-center mb-4">
            Not shown on either picture — find these in List mode: Cardio, Full Body, Olympic.
          </p>

          {selectedGroup && (
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                {muscleGroupLabel[selectedGroup]}
              </p>
              <Card padded={false} className="divide-y divide-charcoal/[0.04]">
                {filteredByGroup.length === 0 ? (
                  <p className="text-sm text-charcoal-faint text-center py-6">No exercises for this group.</p>
                ) : (
                  filteredByGroup.map((e) => (
                    <button
                      key={e.name}
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
        onSave={(data: CustomExerciseData) => {
          if (!editingExercise) return;
          if (editingExercise.isCustom) {
            updateCustomExercise(editingExercise.name, data);
          } else {
            addCustomExercise(data);
          }
        }}
      />
    </div>
  );
}
