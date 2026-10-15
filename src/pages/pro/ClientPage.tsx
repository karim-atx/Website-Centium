import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ClipboardList, History, MessageCircle, Tag, UserMinus, UserX } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { useOnline } from "../../hooks/useOnline";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Toast } from "../../components/ui/Toast";
import { CtaButton } from "../../components/ui/PinnedCta";
import { EmptyState } from "../../components/pro/EmptyState";
import { OfflineLine, ProCardSkeleton, ProError } from "../../components/pro/states";
import { CLIENT_TABS, pickTab, proClientPath, PRO_ROUTES, type ProLane } from "../../components/pro/subtypeLanes";
import { useClientPage } from "../../components/pro/client/useClientPage";
import { ClientHeader } from "../../components/pro/client/ClientHeader";
import { DietaryNeedsCard } from "../../components/pro/client/DietaryNeedsCard";
import { OverviewTab } from "../../components/pro/client/OverviewTab";
import { PlanTab } from "../../components/pro/client/PlanTab";
import { ProgressTab } from "../../components/pro/client/ProgressTab";
import { SessionsTab } from "../../components/pro/client/SessionsTab";
import { NotesTab } from "../../components/pro/client/NotesTab";
import { FilesTab } from "../../components/pro/client/FilesTab";
import { CarePlanTab } from "../../components/pro/client/CarePlanTab";
import { HealthRecordsTab } from "../../components/pro/client/HealthRecordsTab";
import { ChangeHistorySheet } from "../../components/pro/client/ChangeHistorySheet";
import { TagsSheet, EndCoachingPopup } from "../../components/pro/client/ClientActions";
import type { Tone } from "../../components/pro/client/kit";
import { addTag, CLIENT_STAGES, removeTag, setClientStage, STAGE_LABEL, type ClientStage } from "../../services/pro/clients";
import { askToShare, fetchPendingAccessRequests } from "../../services/pro/clientPage";
import { confirmHirePayment } from "../../services/hires/pro";
import { startThread } from "../../services/messaging";
import { shiftIso } from "../../services/pro/home";
import { time12 } from "../../utils/time12";
import type { AccessCategory } from "../../services/pro/access";

/**
 * Release 3 · the client page (/app/pro/clients/:id/:tab, CL2). The frames'
 * tab lists win over IMPLEMENTATION_FRONTEND's (FINAL_PLAN W3, CLIENT_TABS):
 * - Full coaching: Overview, Plan, Progress, Sessions, Notes, Files;
 * - Nutrition: Overview, Meal plan, Progress, Sessions, Notes, Files;
 * - Clinical overview: Overview, Care plan, Health records, Trends,
 *   Appointments, Notes (no Files tab in the CL2 v4 frames).
 * History is the CL4 sheet (⋮ and Notes › Change history).
 *
 * Header (cpHead6), the Dietary needs card on every lane (CL2 v3/v4), the
 * page tabs (r6b tabsScroll6: the lavender track r16 pad 6, tabs 38 high,
 * pad 0 12, r12, 12.5 / 700, scrolling).
 *
 * Kept from Release 2 (FINAL_PLAN 2.4): Remove client is End coaching (⋮,
 * two taps; the only thing that ends access, J5), communication preferences,
 * social handles, cycle phase and pregnancy in Overview › About, the Pending
 * payment banner in the header, and the clinical-note chips (now Notes, with
 * the J4 one-time import).
 */

const TAB_LABEL: Record<ProLane, Record<string, string>> = {
  full_coaching: { overview: "Overview", plan: "Plan", progress: "Progress", sessions: "Sessions", notes: "Notes", files: "Files" },
  nutrition: { overview: "Overview", plan: "Meal plan", progress: "Progress", sessions: "Sessions", notes: "Notes", files: "Files" },
  clinical_overview: { overview: "Overview", "care-plan": "Care plan", "health-records": "Health records", trends: "Trends", appointments: "Appointments", notes: "Notes" },
};

const STAGE_TONE: Record<ClientStage, Tone> = { onboarding: "onb", active: "act", paused: "pau", completed: "done" };

export default function ClientPage() {
  const { id = "", tab } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const { lane } = useProSubtype();
  const { authUserId, removeProfessionalClient, refreshRoster, rosterLoading } = useApp();
  const data = useClientPage(id, lane);
  const [toast, setToast] = useState<string | null>(null);
  const [moreEl, setMoreEl] = useState<HTMLElement | null>(null);
  const [stageEl, setStageEl] = useState<HTMLElement | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [asked, setAsked] = useState<AccessCategory[]>([]);

  useEffect(() => {
    if (!authUserId || !id) return;
    let live = true;
    void fetchPendingAccessRequests(authUserId, id).then((c) => live && setAsked(c));
    return () => {
      live = false;
    };
  }, [authUserId, id]);

  const nowKey = `${data.today} ${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`;
  const next = useMemo(() => (data.sessions ?? []).find((s) => `${s.date} ${s.startTime}` >= nowKey) ?? null, [data.sessions, nowKey]);

  if (!lane) return null;
  const tabs = CLIENT_TABS[lane];
  const current = pickTab(tabs, tab);
  if (tab !== undefined && tab !== current) return <Navigate to={proClientPath(id, current)} replace />;
  const patient = lane === "clinical_overview";

  if (data.missing) {
    return (
      <div>
        <EmptyState icon={UserX} title={patient ? "Not one of your patients" : "Not one of your clients"} line="They may have ended the connection, or the link is out of date." />
        <div className="flex" style={{ marginTop: 8 }}>
          <CtaButton className="flex-1" size="page" label={patient ? "Back to patients" : "Back to clients"} onClick={() => navigate(PRO_ROUTES.clients)} />
        </div>
      </div>
    );
  }
  if (!data.rel) {
    if (!rosterLoading && data.access.error) return <ProError onRetry={() => { void refreshRoster(); data.reload(); }} />;
    return (
      <div className="flex flex-col" style={{ gap: 12 }}>
        <ProCardSkeleton lines={3} height={120} />
        <ProCardSkeleton lines={4} height={260} />
      </div>
    );
  }

  const message = async () => {
    if (!online) return setToast("You're offline. Try again when you're connected.");
    const r = await startThread(id);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setToast(r.message);
  };
  // W4: Add session opens on the calendar with this client chosen.
  const schedule = () => navigate(`${PRO_ROUTES.calendar}?new=1&client=${encodeURIComponent(id)}`);
  const ask = async (c: AccessCategory) => {
    if (asked.includes(c)) return setToast(`You've already asked. It's waiting for ${data.firstName}.`);
    const r = await askToShare(id, c);
    if (r.ok) {
      setAsked((a) => [...a, c]);
      setToast(`Asked ${data.firstName} to share.`);
    } else setToast(r.message);
  };
  const go = (t: string) => navigate(proClientPath(id, t), { replace: true });

  const stage = data.stage?.stage ?? "active";
  const followDue = patient && !!data.carePlan?.plan?.followUps.some((f) => (f.status === "planned" || f.status === "booked") && f.dueOn <= data.today);
  const attention = stage === "active" && !!data.flags && (data.flags.atRisk || data.flags.goneQuiet);
  const status: { label: string; tone: Tone } = followDue ? { label: "Follow-up due", tone: "att" } : attention ? { label: "Needs attention", tone: "att" } : { label: STAGE_LABEL[stage], tone: STAGE_TONE[stage] };
  const nextLabel = next ? `${next.date === data.today ? "Today" : next.date === shiftIso(data.today, 1) ? "Tomorrow" : new Date(`${next.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${time12(next.startTime)}` : null;
  const sharesAnything = !!data.access.access && (data.access.access.categories.length > 0 || data.access.access.imagingSharedCount > 0 || data.access.access.resultSharedCount > 0);

  return (
    <div>
      <ClientHeader
        name={data.name}
        avatarUrl={data.rel.avatarUrl}
        patient={patient}
        status={status}
        isNew={stage === "onboarding" && !sharesAnything}
        joinedAt={data.stage?.joinedAt ?? data.rel.joinedAt}
        next={nextLabel}
        tags={data.stage?.tags ?? []}
        pendingHires={data.pendingHires}
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate(PRO_ROUTES.clients))}
        onMessage={() => void message()}
        onSchedule={schedule}
        onMore={setMoreEl}
        onTags={() => setTagsOpen(true)}
        onConfirmPayment={async (h) => {
          const r = await confirmHirePayment(h.id, h.planName);
          if (!r.ok) return r.message;
          setToast(`Payment confirmed. ${data.firstName} is now active on ${h.planName}.`);
          data.reload();
          return null;
        }}
      />
      {(data.access.offline || data.stageError) && <OfflineLine />}
      <DietaryNeedsCard clientId={id} firstName={data.firstName} access={data.access} compact onAsk={() => void ask("allergies_dietary")} asked={asked.includes("allergies_dietary")} />

      <SegmentedTabs
        className="mb-3"
        items={tabs.map((t) => ({ key: t, label: TAB_LABEL[lane][t] ?? t }))}
        activeKey={current}
        onChange={go}
        scroll
        scrollMinWidth={0}
        scrollTabPadding="0 12px"
        tabHeight={38}
      />

      {current === "overview" && <OverviewTab data={data} lane={lane} onMessage={() => void message()} onSchedule={schedule} onAsk={(c) => void ask(c)} />}
      {current === "plan" && <PlanTab data={data} lane={lane} onAsk={(c) => void ask(c)} />}
      {(current === "progress" || current === "trends") && <ProgressTab data={data} lane={lane} onAsk={(c) => void ask(c)} />}
      {(current === "sessions" || current === "appointments") && <SessionsTab data={data} patient={patient} onSchedule={schedule} />}
      {current === "notes" && <NotesTab data={data} lane={lane} onHistory={() => setHistoryOpen(true)} />}
      {current === "files" && <FilesTab data={data} />}
      {current === "care-plan" && <CarePlanTab data={data} onNotes={() => go("notes")} onCalendar={schedule} onAskDiet={() => void ask("allergies_dietary")} dietAsked={asked.includes("allergies_dietary")} />}
      {current === "health-records" && <HealthRecordsTab data={data} onAsk={(c) => void ask(c)} asked={asked} onNote={() => go("notes")} onCarePlan={() => go("care-plan")} />}

      <PopupMenu
        open={!!moreEl}
        onClose={() => setMoreEl(null)}
        anchor={moreEl}
        options={[
          { value: "history", label: "Change history", icon: <History size={15} /> },
          { value: "stage", label: "Change stage", icon: <ClipboardList size={15} /> },
          { value: "tags", label: "Tags", icon: <Tag size={15} /> },
          { value: "message", label: "Message", icon: <MessageCircle size={15} /> },
          { value: "end", label: "End coaching", icon: <UserMinus size={15} />, destructive: true },
        ]}
        onSelect={(v) => {
          if (v === "history") setHistoryOpen(true);
          else if (v === "stage") setStageEl(moreEl);
          else if (v === "tags") setTagsOpen(true);
          else if (v === "message") void message();
          else setEnding(true);
        }}
        width={200}
        align="right"
      />
      <PopupMenu
        open={!!stageEl}
        onClose={() => setStageEl(null)}
        anchor={stageEl}
        heading="Stage"
        options={CLIENT_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s], note: s === stage ? "Now" : undefined }))}
        selected={stage}
        onSelect={async (v) => {
          if (v === stage) return;
          const r = await setClientStage(id, v as ClientStage);
          if (!r.ok) return setToast(r.message);
          setToast(`${data.firstName} is now ${STAGE_LABEL[v as ClientStage]}. What they share is unchanged.`);
          data.reload();
        }}
        width={220}
        align="right"
      />
      <ChangeHistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} clientId={id} firstName={data.firstName} />
      <TagsSheet
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        targets={[{ clientId: id, name: data.name, tags: data.stage?.tags ?? [] }]}
        known={(data.stage?.tags ?? []).map((t) => ({ tag: t, count: 1 }))}
        onApply={async (changes) => {
          if (!authUserId) return "Couldn't save. Try again.";
          for (const ch of changes) {
            for (const t of ch.add) {
              const r = await addTag(authUserId, ch.clientId, t);
              if (!r.ok) return r.message;
            }
            for (const t of ch.remove) {
              const r = await removeTag(authUserId, ch.clientId, t);
              if (!r.ok) return r.message;
            }
          }
          data.reload();
          return null;
        }}
      />
      <EndCoachingPopup
        name={ending ? data.name : null}
        patient={patient}
        onClose={() => setEnding(false)}
        onEnd={async () => {
          if (!online) return "You're offline. Try again when you're connected.";
          const r = await removeProfessionalClient(data.rel!.id);
          if (!r.ok) return r.message ?? "Couldn't end coaching. Try again.";
          setEnding(false);
          navigate(PRO_ROUTES.clients, { replace: true });
          return null;
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
