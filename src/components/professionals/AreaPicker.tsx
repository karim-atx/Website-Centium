import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { AREAS, REGIONS, type Area } from "../../services/geo/areas";

/**
 * Choosing a city or area in Lebanon instead of sharing a location: for a
 * client whose location is refused or unavailable, and for a professional
 * setting where they work. Each area is a centre point; the map only ever
 * works to about 1 km.
 */
export const AreaPicker: React.FC<{
  selectedId?: string | null;
  onPick: (area: Area) => void;
}> = ({ selectedId, onPick }) => {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return AREAS.filter((a) => !term || a.name.toLowerCase().includes(term) || a.region.toLowerCase().includes(term));
  }, [q]);

  return (
    <div className="flex flex-col">
      <label className="flex items-center gap-2 h-11 rounded-[14px] bg-cream-card border border-charcoal/10 px-3 mb-2">
        <Search size={16} className="text-charcoal-soft shrink-0" aria-hidden />
        <span className="sr-only">Search areas</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search a city or area"
          className="flex-1 min-w-0 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
        />
      </label>
      {REGIONS.map((region) => {
        const inRegion = shown.filter((a) => a.region === region);
        if (inRegion.length === 0) return null;
        return (
          <section key={region} aria-label={region} className="mb-1">
            <h3 className="text-xs font-bold uppercase tracking-wide text-charcoal-soft mt-2 mb-1">{region}</h3>
            {inRegion.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onPick(a)}
                aria-pressed={selectedId === a.id}
                className="tap w-full flex items-center justify-between gap-3 min-h-[48px] px-1 text-left text-sm font-semibold text-charcoal border-b border-charcoal/[0.06]"
              >
                {a.name}
                {selectedId === a.id && <Check size={16} className="text-primary-deep-text shrink-0" aria-hidden />}
              </button>
            ))}
          </section>
        );
      })}
      {shown.length === 0 && <p className="text-sm text-charcoal-faint text-center py-6">No areas match.</p>}
    </div>
  );
};
