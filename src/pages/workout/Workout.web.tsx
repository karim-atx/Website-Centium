import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Library, Plus } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../components/web/useWebLayout";
import { CreateRoutineSheet } from "../../components/workout/CreateRoutineSheet";
import { BrowseProgramsSheet } from "../../components/workout/BrowseProgramsSheet";
import { PersonalRecordReviewSheet } from "../../components/workout/PersonalRecordReviewSheet";
import RoutinesWeb from "./web/RoutinesWeb";
import LibraryWeb from "./web/LibraryWeb";
import HistoryWeb from "./web/HistoryWeb";
import MetricsWeb from "./web/MetricsWeb";
import { WebTabs } from "./web/parts";
import { button40 } from "./web/styles";
import { t } from "../../i18n/core";

type Tab = "routines" | "library" | "history" | "metrics";

// Website viewport v1 · WC-WO Workout (WC-WO Workout Web v13), from 1024px
// wide. The 64 page header (the title 24/32 600, -0.6px; on Routines, Browse
// starter programs and Create routine, 40), then within 1280 (padding 24 and
// the side margin, 32 or 24 beside the rail) the four tabs (Segmented Tabs
// v8, 40) and the tab, 24 under them. The tab links (?tab=history,
// ?tab=routines) are the mobile page's. Below 1024 the mobile Workout renders.

export default function WorkoutWeb() {
  const { rail } = useWebLayout();
  const margin = rail ? 24 : 32;
  const [params] = useSearchParams();
  const linked = params.get("tab");
  const [tab, setTab] = useState<Tab>(linked === "history" ? "history" : "routines");
  const [seenLink, setSeenLink] = useState(params.toString());
  if (seenLink !== params.toString()) {
    setSeenLink(params.toString());
    if (linked === "history") setTab("history");
    else if (linked === "routines" || params.get("start") === "today") setTab("routines");
  }
  const [createOpen, setCreateOpen] = useState(false);
  const [createFolder, setCreateFolder] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  const tabs: { key: Tab; label: string }[] = [
    { key: "routines", label: t("Routines") },
    { key: "library", label: t("Library") },
    { key: "history", label: t("History") },
    { key: "metrics", label: t("Metrics") },
  ];

  return (
    <div data-web-page="workout" className="bg-white" style={{ minHeight: "100dvh" }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between bg-white"
        style={{ height: 64, boxSizing: "border-box", gap: 24, paddingInline: margin, borderBottom: "1px solid rgba(36,31,27,0.06)" }}
      >
        <h1 style={{ margin: 0, fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px", color: "#241F1B" }}>{t("Workout")}</h1>
        {tab === "routines" && (
          <div className="flex" style={{ gap: 8 }}>
            <button
              type="button"
              onClick={() => setBrowseOpen(true)}
              className="hover:!bg-[#F5F5F6] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ ...button40, border: "0.5px solid rgba(143,104,246,0.28)", background: "#FFFFFF", color: "#241F1B" }}
            >
              <Library size={18} color="#5B5349" />
              {t("Browse starter programs")}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateFolder(null);
                setCreateOpen(true);
              }}
              className="hover:scale-[0.98] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AEA1DC]"
              style={{ ...button40, border: "none", background: "#A198DF", color: "#FFFFFF" }}
            >
              <Plus size={18} color="#FFFFFF" />
              {t("Create routine")}
            </button>
          </div>
        )}
      </header>
      <div className="mx-auto flex flex-col" style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: `24px ${margin}px`, gap: 24 }}>
        <WebTabs items={tabs} active={tab} onChange={setTab} label={t("Workout")} />
        <div role="tabpanel" aria-label={tabs.find((x) => x.key === tab)?.label}>
          {tab === "routines" && (
            <RoutinesWeb
              onCreateRoutine={(folderId) => {
                setCreateFolder(folderId);
                setCreateOpen(true);
              }}
            />
          )}
          {tab === "library" && <LibraryWeb />}
          {tab === "history" && <HistoryWeb />}
          {tab === "metrics" && <MetricsWeb />}
        </div>
      </div>

      <CreateRoutineSheet open={createOpen} onClose={() => setCreateOpen(false)} folderId={createFolder} />
      <BrowseProgramsSheet open={browseOpen} onClose={() => setBrowseOpen(false)} />
      <PersonalRecordReviewSheet />
    </div>
  );
}
