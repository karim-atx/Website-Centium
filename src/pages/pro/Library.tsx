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
import { t, tk } from "../../i18n/core";
import { useIsWeb } from "../../components/web/useWebLayout";
import { MobileFrame } from "../../components/web/WebLayout";
import { ProPageBodyWeb, ProPageHeaderWeb } from "../../components/pro/web/ProPageWeb";
import { ClientTabBodyWeb, ClientTabsWeb } from "../../components/pro/web/ClientPageWeb";

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
  programmes: tk("Programmes"),
  "meal-plans": tk("Meal plans"),
};

export default function Library() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { search } = useLocation();
  const current = pickTab(LIBRARY_TABS, tab);
  const web = useIsWeb();
  if (tab !== undefined && tab !== current)
    return <Navigate to={`${PRO_ROUTES.library}/${current}`} replace />;
  // An inner screen (a programme, a plan builder, journals...) has its own back header.
  const inner =
    current === "programmes"
      ? programmesDetailOpen(new URLSearchParams(search))
      : isMealPlansSubview(search);
  const content = current === "programmes" ? <ProgrammesTab /> : <LibraryMealPlans />;
  // Website viewport (WP-LI.1, WP-LI.2): the two lists get the page header, the equal tabs and their sections across
  // the page; an inner screen (a programme, a client's copy, a builder) keeps its mobile screen in the centred column.
  // WP-LI.7.3: a meal plan's builder spans the page (its own web header; Week view by default); Journals and
  // Targets are list-detail pages (the same components as WP-NU-MP.2 / .4).
  const q = new URLSearchParams(search);
  if (web && current === "meal-plans" && (q.get("plan") || q.get("area") === "journals" || q.get("area") === "targets")) return content;
  // WP-LI.3 to .3.3: a programme, its Progress, a client's copy and a workout log are web pages of their own.
  if (web && current === "programmes" && ["template", "progress", "copy", "log"].includes(q.get("view") ?? "")) return content;
  if (web && inner) return <MobileFrame>{content}</MobileFrame>;
  const webTabs = <ClientTabsWeb label={t("Library")} items={LIBRARY_TABS.map((k) => ({ key: k, label: t(LABEL[k]) }))} active={current} onChange={(k) => navigate(`${PRO_ROUTES.library}/${k}`, { replace: true })} />;
  // WP-LI.1 / WP-LI.6: the Programmes list is its own web page (search, Filter and New programme in the header).
  if (web && current === "programmes") return <ProgrammesTab webTabs={webTabs} />;
  if (web)
    return (
      <div>
        <ProPageHeaderWeb title={t("Library")} />
        <ProPageBodyWeb>
          {webTabs}
          <ClientTabBodyWeb columns={2}>{content}</ClientTabBodyWeb>
        </ProPageBodyWeb>
      </div>
    );
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
            {t("Library")}
          </h1>
          <SegmentedTabs
            className="mb-3"
            items={LIBRARY_TABS.map((k) => ({ key: k, label: t(LABEL[k]) }))}
            activeKey={current}
            onChange={(k) =>
              navigate(`${PRO_ROUTES.library}/${k}`, { replace: true })
            }
          />
        </>
      )}
      {content}
    </div>
  );
}
