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
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  isCustom: boolean;
}

const muscleGroupLabel: Record<MuscleGroup, string> = {
  back: "Back",
  bicep: "Bicep",
  calves: "Calves",
  cardio: "Cardio",
  chest: "Chest",
  core: "Core",
  forearms: "Forearms",
  glutes: "Glutes",
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

// Design refinement §6.4/§6.5: real anatomical line art (masked PNGs, see
// public/body/) with contoured, body-clipped highlight zones — replacing
// the flat silhouette blobs + rectangle/path hit zones. Order per §6.4.6
// (chips, bidirectional hover with the figure).
const frontZones: MuscleGroup[] = ["shoulders", "chest", "bicep", "forearms", "core", "quads", "calves"];
const backZones: MuscleGroup[] = ["shoulders", "back", "tricep", "forearms", "glutes", "hamstrings", "calves"];

interface ZoneEllipse {
  group: MuscleGroup;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

// §6.4.3 — coordinates in the artwork's own 186×390 box, matching the
// front/back masks 1:1 at any render size.
const frontZoneEllipses: ZoneEllipse[] = [
  { group: "shoulders", cx: 52, cy: 77, rx: 14, ry: 16 },
  { group: "shoulders", cx: 134, cy: 77, rx: 14, ry: 16 },
  { group: "chest", cx: 75, cy: 83, rx: 18, ry: 18 },
  { group: "chest", cx: 111, cy: 83, rx: 18, ry: 18 },
  { group: "bicep", cx: 46, cy: 108, rx: 11, ry: 21 },
  { group: "bicep", cx: 140, cy: 108, rx: 11, ry: 21 },
  { group: "forearms", cx: 40, cy: 140, rx: 9, ry: 18 },
  { group: "forearms", cx: 146, cy: 140, rx: 9, ry: 18 },
  { group: "core", cx: 93, cy: 118, rx: 19, ry: 20 },
  { group: "core", cx: 93, cy: 154, rx: 17, ry: 21 },
  { group: "quads", cx: 71, cy: 200, rx: 16, ry: 34 },
  { group: "quads", cx: 115, cy: 200, rx: 16, ry: 34 },
  { group: "quads", cx: 68, cy: 240, rx: 13, ry: 18 },
  { group: "quads", cx: 118, cy: 240, rx: 13, ry: 18 },
  { group: "calves", cx: 69, cy: 292, rx: 11, ry: 25 },
  { group: "calves", cx: 117, cy: 292, rx: 11, ry: 25 },
];

const backZoneEllipses: ZoneEllipse[] = [
  { group: "shoulders", cx: 52, cy: 79, rx: 14, ry: 16 },
  { group: "shoulders", cx: 134, cy: 79, rx: 14, ry: 16 },
  { group: "back", cx: 93, cy: 80, rx: 25, ry: 15 },
  { group: "back", cx: 78, cy: 118, rx: 18, ry: 31 },
  { group: "back", cx: 108, cy: 118, rx: 18, ry: 31 },
  { group: "tricep", cx: 46, cy: 109, rx: 11, ry: 21 },
  { group: "tricep", cx: 140, cy: 109, rx: 11, ry: 21 },
  { group: "forearms", cx: 40, cy: 140, rx: 9, ry: 18 },
  { group: "forearms", cx: 146, cy: 140, rx: 9, ry: 18 },
  { group: "glutes", cx: 80, cy: 183, rx: 16, ry: 23 },
  { group: "glutes", cx: 106, cy: 183, rx: 16, ry: 23 },
  { group: "hamstrings", cx: 71, cy: 232, rx: 16, ry: 30 },
  { group: "hamstrings", cx: 115, cy: 232, rx: 16, ry: 30 },
  { group: "hamstrings", cx: 70, cy: 264, rx: 13, ry: 14 },
  { group: "hamstrings", cx: 116, cy: 264, rx: 13, ry: 14 },
  { group: "calves", cx: 70, cy: 298, rx: 12, ry: 26 },
  { group: "calves", cx: 116, cy: 298, rx: 12, ry: 26 },
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
      secondaryMuscleGroups: e.secondaryMuscleGroups ?? [],
      classification: e.classification,
      isCustom: false,
    }));
    const custom = customExercises.map((e) => ({
      name: e.name,
      muscleGroups: e.muscleGroups ?? [],
      secondaryMuscleGroups: e.secondaryMuscleGroups ?? [],
      classification: e.classification,
      isCustom: true,
    }));
    return [...custom, ...library];
  }, [customExercises]);

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
      .sort((a, b) => muscleGroupLabel[a[0]].localeCompare(muscleGroupLabel[b[0]]))
      .map(([key, items]) => ({
        label: muscleGroupLabel[key],
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [filteredByGroup, sort]);

  // Design refinement §6.4.2: highlight fills — idle transparent, hover a
  // translucent lavender wash, selected a stronger lavender fill. Values
  // differ slightly by theme so they hold against the dark ground too.
  const zoneFill = (zone: MuscleGroup) => {
    if (selectedGroup === zone) return "var(--zone-selected)";
    if (hoveredGroup === zone) return "var(--zone-hover)";
    return "transparent";
  };

  const flipSide = () => {
    const next = bodySide === "front" ? "back" : "front";
    const nextZones = next === "front" ? frontZones : backZones;
    // §6.4.5: keep the selection only if it exists on the destination side.
    setSelectedGroup((g) => (g && nextZones.includes(g) ? g : null));
    setHoveredGroup(null);
    setBodySide(next);
  };

  const ellipses = bodySide === "front" ? frontZoneEllipses : backZoneEllipses;
  const fillAsset = bodySide === "front" ? "/body/centium-body-front-fill.png" : "/body/centium-body-back-fill.png";
  const lineAsset = bodySide === "front" ? "/body/centium-body-front.png" : "/body/centium-body-back.png";
  const maskId = `centBody-${bodySide}`;

  return (
    <div className="animate-fade-slide-up">
      <style>{`
        :root { --zone-hover: rgba(174,161,220,0.42); --zone-selected: rgba(125,107,181,0.55); }
        .dark { --zone-hover: rgba(195,179,251,0.30); --zone-selected: rgba(169,145,254,0.50); }
      `}</style>
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
            {/* §6.4.1/§6.4.2: line art as a CSS mask (colour comes from
                currentColor via the mask trick below), highlights clipped
                to the body silhouette via an SVG mask built from the
                "-fill" asset. key={bodySide} forces a full remount on
                flip — §6.4.4's fix for the cross-fade-flash bug (sharing
                one subtree across front/back let React reuse ellipse N's
                DOM node for a different muscle and carry its lit fill). */}
            <div className="relative" style={{ width: 186, height: 390 }}>
              <div
                className="absolute inset-0 text-charcoal-soft"
                style={{
                  backgroundColor: "currentColor",
                  maskImage: `url(${lineAsset})`,
                  maskSize: "contain",
                  maskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskImage: `url(${lineAsset})`,
                  WebkitMaskSize: "contain",
                  WebkitMaskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  pointerEvents: "none",
                }}
              />
              <svg viewBox="0 0 186 390" width={186} height={390} className="absolute inset-0">
                <defs>
                  <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="186" height="390">
                    <image href={fillAsset} x="0" y="0" width="186" height="390" preserveAspectRatio="xMidYMid meet" />
                  </mask>
                </defs>
                <g key={bodySide} mask={`url(#${maskId})`}>
                  {ellipses.map((z, i) => (
                    <ellipse
                      key={`${bodySide}-${z.group}-${i}`}
                      cx={z.cx}
                      cy={z.cy}
                      rx={z.rx}
                      ry={z.ry}
                      fill={zoneFill(z.group)}
                      className="cursor-pointer"
                      style={{ transition: "fill 0.18s ease" }}
                      onMouseEnter={() => setHoveredGroup(z.group)}
                      onMouseLeave={() => setHoveredGroup(null)}
                      onClick={() => setSelectedGroup(selectedGroup === z.group ? null : z.group)}
                    />
                  ))}
                </g>
              </svg>
            </div>
          </div>

          <div className="flex justify-center mb-5">
            <button
              onClick={flipSide}
              className="tap flex items-center gap-1.5 text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3.5 py-1.5"
            >
              <RotateCw size={13} /> Switch to {bodySide === "front" ? "back" : "front"} view
            </button>
          </div>

          {/* §6.4.6: hover is bidirectional — hovering a chip lights its
              muscle, hovering a muscle lights its chip (via hoveredGroup). */}
          <div className="flex flex-wrap justify-center gap-1.5 mb-5">
            {bodyZones.map((mg) => (
              <button
                key={mg}
                onClick={() => setSelectedGroup(selectedGroup === mg ? null : mg)}
                onMouseEnter={() => setHoveredGroup(mg)}
                onMouseLeave={() => setHoveredGroup(null)}
                className={clsx(
                  "tap px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors",
                  selectedGroup === mg
                    ? "bg-primary text-white border-primary"
                    : hoveredGroup === mg
                    ? "bg-primary-pale border-primary text-primary-deep-text"
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
              <p className="section-label text-charcoal-faint mb-2">{muscleGroupLabel[selectedGroup]}</p>
              <Card padded={false} className="divide-y divide-charcoal/[0.06]">
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
