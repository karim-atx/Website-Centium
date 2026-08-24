import { useMemo, useState } from "react";
import { Chip } from "../../components/ui/Chip";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { exerciseLibrary } from "../../data/mockWorkouts";
import type { MuscleGroup, ExerciseClassification } from "../../types";
import { List, User, Search } from "lucide-react";
import clsx from "clsx";

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
  machine_other: "Machine / Other",
  weighted_bodyweight: "Weighted Bodyweight",
  assisted_bodyweight: "Assisted Bodyweight",
  reps_only: "Reps Only",
  cardio: "Cardio",
  duration: "Duration",
};

// Muscle groups that have a tappable zone on the front-facing body diagram —
// back/cardio/full_body/olympic/other aren't visible from the front, so
// they stay reachable only via List mode.
const bodyZones: MuscleGroup[] = ["shoulders", "chest", "bicep", "tricep", "core", "quads", "hamstrings"];

export default function ExerciseDatabaseTab() {
  const { customExercises } = useApp();
  const [view, setView] = useState<ViewMode>("list");
  const [sort, setSort] = useState<SortMode>("alphabetical");
  const [query, setQuery] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | null>(null);
  const [hoveredGroup, setHoveredGroup] = useState<MuscleGroup | null>(null);

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
    // muscleGroup
    const byGroup = new Map<MuscleGroup, DbExercise[]>();
    filteredByGroup.forEach((e) => {
      (e.muscleGroups.length ? e.muscleGroups : (["other"] as MuscleGroup[])).forEach((mg) => {
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
          className="w-full rounded-2xl bg-cream-soft pl-9 pr-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
        />
      </div>

      <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
        {(["list", "body"] as ViewMode[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx(
              "tap flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold",
              view === v ? "bg-sohati text-white" : "text-charcoal-faint"
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
                    <div key={e.name} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-charcoal">{e.name}</span>
                      <span className="text-[10px] font-semibold text-charcoal-faint">
                        {e.muscleGroups.map((mg) => muscleGroupLabel[mg]).join(", ")}
                      </span>
                    </div>
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
            Tap a muscle group to see its exercises.
          </p>
          <div className="flex justify-center mb-5">
            <svg viewBox="0 0 160 320" width={180} height={360}>
              <circle cx="80" cy="28" r="20" fill="#E4DEF5" />
              <rect x="60" y="50" width="40" height="14" rx="6" fill="#E4DEF5" />
              {/* shoulders */}
              <rect
                x="35"
                y="62"
                width="90"
                height="18"
                rx="9"
                fill={zoneFill("shoulders")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("shoulders")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "shoulders" ? null : "shoulders")}
              />
              {/* chest */}
              <rect
                x="52"
                y="78"
                width="56"
                height="38"
                rx="10"
                fill={zoneFill("chest")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("chest")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "chest" ? null : "chest")}
              />
              {/* core */}
              <rect
                x="58"
                y="118"
                width="44"
                height="46"
                rx="8"
                fill={zoneFill("core")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("core")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "core" ? null : "core")}
              />
              {/* left bicep */}
              <rect
                x="18"
                y="82"
                width="16"
                height="50"
                rx="8"
                fill={zoneFill("bicep")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("bicep")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "bicep" ? null : "bicep")}
              />
              {/* right bicep */}
              <rect
                x="126"
                y="82"
                width="16"
                height="50"
                rx="8"
                fill={zoneFill("bicep")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("bicep")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "bicep" ? null : "bicep")}
              />
              {/* left tricep (outer edge sliver) */}
              <rect
                x="10"
                y="82"
                width="7"
                height="50"
                rx="3"
                fill={zoneFill("tricep")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("tricep")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "tricep" ? null : "tricep")}
              />
              {/* right tricep */}
              <rect
                x="143"
                y="82"
                width="7"
                height="50"
                rx="3"
                fill={zoneFill("tricep")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("tricep")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "tricep" ? null : "tricep")}
              />
              {/* left quad */}
              <rect
                x="55"
                y="168"
                width="22"
                height="80"
                rx="10"
                fill={zoneFill("quads")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("quads")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "quads" ? null : "quads")}
              />
              {/* right quad */}
              <rect
                x="83"
                y="168"
                width="22"
                height="80"
                rx="10"
                fill={zoneFill("quads")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("quads")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "quads" ? null : "quads")}
              />
              {/* left hamstring (inner edge sliver) */}
              <rect
                x="48"
                y="168"
                width="7"
                height="80"
                rx="3"
                fill={zoneFill("hamstrings")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("hamstrings")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "hamstrings" ? null : "hamstrings")}
              />
              {/* right hamstring */}
              <rect
                x="105"
                y="168"
                width="7"
                height="80"
                rx="3"
                fill={zoneFill("hamstrings")}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroup("hamstrings")}
                onMouseLeave={() => setHoveredGroup(null)}
                onClick={() => setSelectedGroup(selectedGroup === "hamstrings" ? null : "hamstrings")}
              />
              {/* lower legs, decorative only */}
              <rect x="57" y="250" width="18" height="60" rx="8" fill="#EDEAF7" />
              <rect x="85" y="250" width="18" height="60" rx="8" fill="#EDEAF7" />
            </svg>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {bodyZones.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedGroup(selectedGroup === mg ? null : mg)}
                className={clsx(
                  "tap px-2.5 py-1 rounded-full text-[10px] font-semibold border",
                  selectedGroup === mg
                    ? "bg-sohati text-white border-sohati"
                    : "bg-cream-soft border-transparent text-charcoal-soft"
                )}
              >
                {muscleGroupLabel[mg]}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-charcoal-faint text-center mb-4">
            Not visible from the front — find these in List mode: Back, Cardio, Full Body, Olympic, Other.
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
                    <div key={e.name} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm font-medium text-charcoal">{e.name}</span>
                      {e.isCustom && <span className="text-[10px] font-semibold text-gold">Custom</span>}
                    </div>
                  ))
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
