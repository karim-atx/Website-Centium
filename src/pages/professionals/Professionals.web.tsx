import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronDown, List, Map as MapIcon } from "lucide-react";
import type { Enums } from "../../../lib/supabase/database.types";
import { useWebLayout } from "../../components/web/useWebLayout";
import { useApp } from "../../context/AppContext";
import { useWebDismiss } from "../../components/dashboard/web/useWebDismiss";
import { SUBTYPE_LABELS } from "../../components/professionals/subtypeLabels";
import { FilterPopup, FilterSummary, FilterTrigger } from "../../components/market/FilterPopup";
import { useFilter } from "../../components/market/useFilter";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { anyCountryChosen, chosenRadiusKm, chosenWhere, COUNTRY_OPTIONS, DISTANCE_OPTIONS, SORTS, WHERE_OPTIONS, type DirectorySort } from "./directoryFilterModel";
import { useDirectoryWeb } from "./web/useDirectoryWeb";
import { DirectoryListWeb, LinkedCardWeb } from "./web/DirectoryListWeb";
import { MapViewWeb } from "./web/MapViewWeb";
import { ReviewsWeb } from "./web/ReviewsWeb";
import { PR_WEB_CSS } from "./web/prWebStyles";
import { PrFrameWeb } from "./web/PrFrameWeb";
import { t, tk } from "../../i18n/core";

type Subtype = Enums<"professional_subtype">;

const DIRECTORY_FILTER_GROUPS = [
  { heading: tk("Distance"), options: DISTANCE_OPTIONS },
  { heading: tk("Where"), options: WHERE_OPTIONS },
  { heading: tk("Country"), options: COUNTRY_OPTIONS },
] as const;

// The Sort and filter choices survive the list → profile route change (the
// two routes mount the page afresh); List / Map and the category are in the URL.
let sortMemo: DirectorySort = "Best match";
let filterMemo: string[] = [];

const isSubtype = (s: string | null): s is Subtype => !!s && s in SUBTYPE_LABELS;

/**
 * Website viewport v1, WC-PR Professionals (WC-PR Professionals Web v3,
 * literal values; mobile C-PR / C-PR.1 / C-PR.2 / C-PR.3). One page for the
 * three routes:
 * - /app/professionals and /app/professionals/:id (WC-PR, WC-PR.1): a 64
 *   header (the title 24/32 600, -0.6px, its line 13/20 beside it), then,
 *   centred at most 1280 wide (24 above and below, 32 at the sides, 24 with
 *   the rail), a 5 : 7 grid (1 : 1 with the rail), 24 apart: the list column
 *   (List / Map, the category chips, the linked professional, the directory
 *   cards) beside the selected profile (the route's :id, else the first card);
 * - ?view=map (WC-PR.2): the nearest-first rows beside the map;
 * - /app/professionals/:id/reviews (WC-PR.3): 4 : 8, the summary and Write a
 *   review beside every review.
 * The page fills the window: the list and the profile scroll on their own.
 * Same data and behaviour as the mobile pages (Professionals,
 * ProfessionalDetail, ProfessionalReviews); no search box on the web (Karim).
 */
export default function ProfessionalsWeb() {
  const { id } = useParams<{ id?: string }>();
  const { pathname } = useLocation();
  const reviews = !!id && /\/reviews\/?$/.test(pathname);
  return (
    <>
      <style href="pr-web" precedence="default">{PR_WEB_CSS}</style>
      {reviews ? <ReviewsWeb id={id} /> : <DirectoryPageWeb selected={id ?? null} />}
    </>
  );
}

function DirectoryPageWeb({ selected }: { selected: string | null }) {
  const navigate = useNavigate();
  const { user } = useApp();
  const { rail } = useWebLayout();
  const [params, setParams] = useSearchParams();
  const view: "list" | "map" = params.get("view") === "map" ? "map" : "list";
  const typeParam = params.get("type");
  const type: Subtype | null = isSubtype(typeParam) ? typeParam : null;

  const filter = useFilter({ open: false, selected: filterMemo });
  useEffect(() => {
    filterMemo = filter.selected;
  }, [filter.selected]);
  const [sort, setSortState] = useState<DirectorySort>(sortMemo);
  const setSort = (s: DirectorySort) => {
    sortMemo = s;
    setSortState(s);
  };
  const [filterAnchor, setFilterAnchor] = useState<HTMLButtonElement | null>(null);
  const [sortEl, setSortEl] = useState<HTMLButtonElement | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const nothing = useRef<HTMLElement | null>(null);
  // Esc closes the filter card (the sort menu is PopupMenu, which has its own); focus goes back to the trigger.
  useWebDismiss(filter.open, filter.closeFilter, nothing);

  const maxKm = chosenRadiusKm(filter.selected);
  const where = useMemo(() => chosenWhere(filter.selected), [filter.selected]);
  const anyCountry = anyCountryChosen(filter.selected);
  const dir = useDirectoryWeb({ type, maxKm, sort, where, anyCountry });
  const isRanked = !!dir.ranked;

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value == null) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const linkedListed = !!dir.linkedId && (dir.listings ?? []).some((l) => l.profileId === dir.linkedId);
  const [linkedSheet, setLinkedSheet] = useState(false);

  const showSortFilter = (isRanked && view === "list") || view === "map";
  const segs: { k: "list" | "map"; label: string; Icon: typeof List }[] = [
    { k: "list", label: t("List"), Icon: List },
    { k: "map", label: t("Map"), Icon: MapIcon },
  ];
  const cats: { k: Subtype | null; label: string }[] = [{ k: null, label: t("All") }, ...(Object.keys(SUBTYPE_LABELS) as Subtype[]).map((k) => ({ k, label: t(SUBTYPE_LABELS[k]) }))];

  const top = (
    <>
      <div role="tablist" aria-label={t("List or map")} data-pr-views className="flex" style={{ flex: "none", gap: 5, padding: 5, borderRadius: 14, background: "#F5F4FE" }}>
        {segs.map(({ k, label, Icon }) => {
          const on = view === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setParam("view", k === "map" ? "map" : null)}
              className={on ? "pr-web-focus flex items-center justify-center" : "pr-web-seg flex items-center justify-center"}
              style={{ flex: 1, height: 30, borderRadius: 10, gap: 7, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A79AD5" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
            >
              <Icon size={16} strokeWidth={1.75} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
      <div role="tablist" aria-label={t("Categories")} data-pr-cats className="pr-web-noscroll flex" style={{ flex: "none", gap: 5, padding: 5, borderRadius: 14, background: "#F4F3F9", overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain", touchAction: "pan-x pan-y pinch-zoom" }}>
        {cats.map(({ k, label }) => {
          const on = type === k;
          return (
            <button
              key={k ?? "all"}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={(e) => {
                e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" });
                setParam("type", k);
              }}
              className={on ? "pr-web-focus flex items-center justify-center" : "pr-web-seg flex items-center justify-center"}
              style={{ flex: "1 0 auto", height: 30, padding: "0 14px", borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap", background: on ? "#A198DF" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Kept (DJ; not drawn on the web frame): the ranked list's Sort and the Distance / Where / Country filter, as on mobile. */}
      {showSortFilter && (
        <div className="flex items-center justify-between" style={{ flex: "none", gap: 10 }}>
          {isRanked && view === "list" ? (
            <div className="flex items-center" style={{ gap: 10, minWidth: 0 }}>
              <button
                ref={setSortEl}
                type="button"
                aria-haspopup="menu"
                aria-expanded={sortOpen}
                onClick={() => setSortOpen((o) => !o)}
                className="pr-web-hover flex items-center whitespace-nowrap"
                style={{ height: 36, paddingInlineStart: 14, paddingInlineEnd: 10, borderRadius: 12, border: "0.5px solid rgba(36,31,27,0.1)", gap: 4, fontSize: 13, fontWeight: 700, color: "#5B5349", flex: "none" }}
              >
                {t("Sort: {sort}", { sort: t(sort) })}
                <ChevronDown size={14} aria-hidden />
              </button>
              <p className="truncate" style={{ margin: 0, minWidth: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {sort === "Nearest" ? t("Nearest first, measured on this device.") : t("Best match first: Centium work history, reviews and distance.")}
              </p>
            </div>
          ) : (
            <span />
          )}
          <FilterTrigger ref={setFilterAnchor} active={filter.active} open={filter.open} onPress={filter.toggleFilter} label={t("Filter professionals")} />
        </div>
      )}
      {filter.active && showSortFilter && <FilterSummary summary={filter.summary} onShowAll={filter.clearFilter} style={{ flex: "none" }} />}

      {(!!dir.linkedId || !!user.linkedProfessionalCode) && (
        <LinkedCardWeb
          id={dir.linkedId}
          detail={dir.linkedDetail}
          error={dir.linkedError}
          sheetOpen={linkedSheet}
          onCloseSheet={() => setLinkedSheet(false)}
          onOpen={() => {
            if (linkedListed && dir.linkedId) navigate(`/app/professionals/${encodeURIComponent(dir.linkedId)}`);
            else setLinkedSheet(true);
          }}
        />
      )}
    </>
  );

  return (
    <PrFrameWeb title={t("Professionals")} sub={t("Trainers, dietitians, physiotherapists & doctors")} subInk="#8C8378" lFr={rail ? 1 : 5} rFr={rail ? 1 : 7}>
      {view === "map" ? (
        <MapViewWeb top={top} subtype={type} maxKm={maxKm} where={where} anyCountry={anyCountry} listings={dir.listings} />
      ) : (
        <DirectoryListWeb top={top} dir={dir} type={type} selected={selected} filtering={!!type || (isRanked && filter.active)} maxKm={maxKm} />
      )}
      <FilterPopup open={filter.open} anchor={filterAnchor} groups={DIRECTORY_FILTER_GROUPS} selected={filter.selected} onToggle={filter.toggleOption} onClose={filter.closeFilter} />
      <PopupMenu
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        anchor={sortEl}
        heading={t("Sort by")}
        align="left"
        options={SORTS.map((s) => ({ value: s, label: t(s) }))}
        selected={sort}
        onSelect={(v) => {
          setSort(v);
          setSortOpen(false);
        }}
        width={200}
      />
    </PrFrameWeb>
  );
}
