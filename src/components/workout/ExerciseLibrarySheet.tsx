import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Chip } from "../ui/Chip";
import { exerciseLibrary, workoutCategories } from "../../data/mockWorkouts";
import { Search, Plus } from "lucide-react";

export const ExerciseLibrarySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
  alreadyAdded: string[];
}> = ({ open, onClose, onPick, alreadyAdded }) => {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");

  const filtered = useMemo(() => {
    return exerciseLibrary.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category ? e.category === category : true;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const pick = (name: string) => {
    onPick(name);
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        setQuery("");
        setCategory(null);
        setCustomName("");
        onClose();
      }}
      title="Exercise Library"
    >
      <div className="animate-fade-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…"
              className="w-full rounded-2xl bg-cream-soft pl-9 pr-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </div>
          <button
            onClick={() => customName.trim() && (pick(customName.trim()), setCustomName(""))}
            className="tap w-10 h-10 rounded-2xl bg-charcoal text-cream flex items-center justify-center shrink-0"
            aria-label="Add custom exercise"
            title="Type a name above, then tap here to add it as custom"
          >
            <Plus size={17} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
          <Chip active={category === null} onClick={() => setCategory(null)}>
            All
          </Chip>
          {workoutCategories.map((c) => (
            <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>

        <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar mb-4">
          {filtered.map((e) => {
            const added = alreadyAdded.includes(e.name);
            return (
              <button
                key={e.name}
                onClick={() => !added && pick(e.name)}
                disabled={added}
                className="tap w-full flex items-center justify-between rounded-2xl px-3.5 py-3 hover:bg-cream-soft text-left disabled:opacity-40"
              >
                <span className="text-sm font-medium text-charcoal">{e.name}</span>
                <span className="text-xs font-semibold text-sohati">{added ? "Added" : "+ Add"}</span>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-charcoal-faint py-8">
              No matches — add it as a custom exercise below.
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-charcoal/[0.06] pt-4">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customName.trim()) {
                pick(customName.trim());
                setCustomName("");
              }
            }}
            placeholder="Can't find it? Add a custom exercise…"
            className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </div>
      </div>
    </BottomSheet>
  );
};
