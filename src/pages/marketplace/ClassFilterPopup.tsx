import { useState } from "react";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { t } from "../../i18n/core";
import { FilterPopup, FilterSummary, FilterTrigger, type FilterGroup } from "../../components/market/FilterPopup";

// Market + Share 3.0 · W2 · the Classes tab's filter row (C-MO.4.3 `classes`,
// `classFilterOpen`, `classFiltered`; Client Explore Screens lines 224–238 and
// 259–271): the count line "Friday, October 16 · 5 classes" 12 / 600 --faint
// with the 36 filter trigger at its right (margin-top 12, space-between, gap
// 12); under it, while a choice is on, the summary chip (margin-top 10) with
// "Show all". The popup is the W1 FilterPopup (232 card, group headings, the
// menuitemcheckbox rows, Done); its state machine (toggleFilter, closeFilter,
// clearFilter, toggleOption) is the board's, through useFilter in Discover.

export interface ClassFilterState {
  open: boolean;
  selected: string[];
  active: boolean;
  summary: string;
  toggleFilter: () => void;
  closeFilter: () => void;
  clearFilter: () => void;
  toggleOption: (v: string) => void;
}

export function ClassFilterPopup({ countLine, groups, filter }: { countLine: string; groups: readonly FilterGroup[]; filter: ClassFilterState }) {
  const m = marketPalette(useIsDark());
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  return (
    <>
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, lineHeight: "normal" }}>
        <span role="status" style={{ fontSize: textPx(12), fontWeight: 600, color: m.faint, minWidth: 0 }}>
          {countLine}
        </span>
        <FilterTrigger ref={setAnchor} active={filter.active} open={filter.open} onPress={filter.toggleFilter} label={t("Filter classes")} />
      </div>
      {filter.active ? <FilterSummary summary={filter.summary} onShowAll={filter.clearFilter} style={{ marginTop: 10 }} /> : null}
      <FilterPopup open={filter.open} anchor={anchor} groups={groups} selected={filter.selected} onToggle={filter.toggleOption} onClose={filter.closeFilter} />
    </>
  );
}
