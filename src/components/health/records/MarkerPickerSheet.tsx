import { partBSheetTone } from "../log/LogSheetParts";
import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { textPx, linePx } from "../../../theme/textSize";
import { prefillRange, searchMarkers, type CatalogueMarker } from "../../../services/labs/catalogueLogic";
import { useHealthMode, hairline, fieldFill, deepInk, rangeText, rowRule, SectionCaps, INK, INK_FAINT } from "./kit";

// OURS-marker-picker: tapping a marker name on HE1.9.2.2 (or the Marker field
// of OURS-add-result) opens the standard list as a search sheet; the unit and
// range fill in on pick. "Other" keeps a marker that is not on the list
// (repo MarkerEntryRow behaviour, kept: HE1.9.2.2 K4).

const CATEGORY_LABEL: Record<string, string> = {
  blood_count: "Blood count",
  lipids: "Lipids",
  liver: "Liver",
  kidney: "Kidney",
  hormones: "Hormones",
  metabolic: "Metabolic",
  other: "Other",
};
const ORDER = ["blood_count", "lipids", "liver", "kidney", "hormones", "metabolic", "other"];

export const MarkerPickerSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  catalogue: CatalogueMarker[] | null;
  sex: string | null | undefined;
  onPick: (marker: CatalogueMarker) => void;
  onOther: (name: string) => void;
}> = ({ open, onClose, catalogue, sex, onPick, onOther }) => {
  const { dark, hc } = useHealthMode();
  const [query, setQuery] = useState("");
  const q = query.trim();
  const groups = useMemo(() => {
    const list = catalogue ? (q ? searchMarkers(q, catalogue) : catalogue) : [];
    const by = new Map<string, CatalogueMarker[]>();
    for (const m of list) by.set(m.category, [...(by.get(m.category) ?? []), m]);
    return [...by.entries()]
      .sort((a, b) => ORDER.indexOf(a[0]) - ORDER.indexOf(b[0]))
      .map(([cat, items]) => ({ cat, items: items.sort((a, b) => a.displayName.localeCompare(b.displayName)) }));
  }, [catalogue, q]);
  const close = () => {
    setQuery("");
    onClose();
  };
  const matchedAlias = (m: CatalogueMarker) => {
    if (!q) return null;
    const lq = q.toLowerCase();
    if (m.displayName.toLowerCase().includes(lq)) return null;
    return m.aliases.find((a) => a.includes(lq)) ?? null;
  };

  return (
    <BottomSheet open={open} onClose={close} title="Choose a marker" chrome="partB" tone={partBSheetTone(dark)} size="tall">
      <label
        className="flex items-center"
        style={{ height: 42, borderRadius: 12, padding: "0 12px", gap: 8, background: fieldFill(dark), border: `0.5px solid ${hairline(dark, hc, 0.06)}` }}
      >
        <Search size={16} style={{ color: INK_FAINT }} aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markers, e.g. HbA1c"
          aria-label="Search markers"
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint"
          style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), color: INK }}
        />
      </label>
      {catalogue && groups.length === 0 && (
        <p style={{ marginTop: 14, fontSize: textPx(12), lineHeight: linePx(18), color: INK_FAINT }}>{`No markers match '${q}'.`}</p>
      )}
      {groups.map((g) => (
        <section key={g.cat}>
          <SectionCaps style={{ margin: "18px 0 6px" }}>{CATEGORY_LABEL[g.cat] ?? g.cat}</SectionCaps>
          {g.items.map((m, i) => {
            const r = prefillRange(m, sex, m.canonicalUnit, null);
            const alias = matchedAlias(m);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() => {
                  onPick(m);
                  close();
                }}
                className="tap w-full text-left block"
                style={{ minHeight: 48, padding: "6px 14px 6px 2px", borderTop: i ? rowRule(dark, hc, 0.08) : undefined }}
              >
                <span className="block" style={{ fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: INK }}>
                  {m.displayName}
                </span>
                <span className="block" style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 500, color: INK_FAINT }}>
                  {[m.canonicalUnit, r ? rangeText(r.low, r.high) : null].filter(Boolean).join(" · ")}
                  {alias ? ` · ${alias}` : ""}
                </span>
              </button>
            );
          })}
        </section>
      ))}
      <button
        type="button"
        onClick={() => {
          onOther(q);
          close();
        }}
        className="tap w-full text-left"
        style={{ minHeight: 48, marginTop: 10, padding: "0 2px", fontSize: textPx(13.5), lineHeight: linePx(20.3), fontWeight: 600, color: deepInk(dark) }}
      >
        {q ? `Other: "${q}"` : "Other (not on the list)"}
      </button>
    </BottomSheet>
  );
};
