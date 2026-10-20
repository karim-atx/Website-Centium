import {
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { textPx } from "../../theme/textSize";
import { INK } from "../../components/pro/proInk";
import {
  LIBRARY_TABS,
  PRO_ROUTES,
  pickTab,
} from "../../components/pro/subtypeLanes";
import { ProgrammesTab } from "../../components/pro/library/ProgrammesTab";
import { LibraryMealPlans } from "../../components/pro/nutrition/LibraryMealPlans";
import { programmesDetailOpen } from "../../components/pro/library/libraryModel";
import { isMealPlansSubview } from "../../components/pro/nutrition/nav";

/**
 * Release 3 · Library (/app/pro/library/:tab, Full coaching only; TR1 v7 and
 * NU1 v6 Full coaching). gen/r6c.js plansHead6 as round 9 left it (r9.js
 * plansHead9: no header button, the "+" is each tab's floating button): the
 * title 19 / 700, line 28.5, -0.03em, 13 below; the Programmes / Meal plans
 * segmented tabs, 12 below. Each tab's content is its own component
 * (components/pro/library, components/pro/nutrition); their inner screens
 * (search params) have their own back header, so the title and tabs hide there.
 */
const LABEL: Record<(typeof LIBRARY_TABS)[number], string> = {
  programmes: "Programmes",
  "meal-plans": "Meal plans",
};

export default function Library() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const current = pickTab(LIBRARY_TABS, tab);
  if (tab !== undefined && tab !== current)
    return <Navigate to={`${PRO_ROUTES.library}/${current}`} replace />;
  // An inner screen (a programme, a plan builder, journals...) has its own back header.
  const inner =
    current === "programmes"
      ? programmesDetailOpen(new URLSearchParams(search))
      : isMealPlansSubview(search);
  return (
    <div>
      {!inner && (
        <>
          <h1
            style={{
              fontSize: textPx(19),
              lineHeight: 1.5,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: INK.ch,
              marginBottom: 13,
            }}
          >
            Library
          </h1>
          <SegmentedTabs
            className="mb-3"
            items={LIBRARY_TABS.map((k) => ({ key: k, label: LABEL[k] }))}
            activeKey={current}
            onChange={(k) =>
              navigate(`${PRO_ROUTES.library}/${k}`, { replace: true })
            }
          />
        </>
      )}
      {current === "programmes" ? <ProgrammesTab /> : <LibraryMealPlans />}
    </div>
  );
}
