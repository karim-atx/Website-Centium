import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ClipboardList, FilePlus2, Plus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { useOnline } from "../../../hooks/useOnline";
import { useBack } from "../../../hooks/useBack";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { INK } from "../proInk";
import { ListCard, SectionHead, SoftLine } from "../client/kit";
import { ComingSoonPill } from "../ComingSoon";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../states";
import { ErrorLine, Fab } from "../library/libraryUi";
import { CHead } from "./moKit";
import { createWeeklyCheckIn, fetchForms, type FormAssignment, type FormSummary } from "../../../services/pro/forms";
import { PRO_ROUTES, type ProLane } from "../subtypeLanes";
import { FORMS_PATH, checkInLine, intakeLine, LANE_TEMPLATES } from "./formsList";
import type { FormKind } from "./formModel";

export { FORMS_PATH };

const CardRow: React.FC = () => <ProCardSkeleton lines={2} />;

/**
 * Release 3 · MO29 Forms (gen/r18.js forms18): CHead "Forms" / "What clients
 * fill in, and when"; the Intake / Check-ins tabs (segTabs h40, 13, 14
 * under); "Your forms" (listCard6: clipboard-list or calendar-check rows,
 * "Sent manually · {n} questions" / "Every week · {weekday} {time} · {n}
 * clients"); "Templates from Centium" (file-plus-2 rows with "Use"); the +
 * (fab10, "New form").
 *
 * Lanes: check-ins are Full coaching and Nutrition only (can_write_form;
 * HANDOVER d "Check-ins: Hidden" for Clinical overview), so Clinical shows
 * intake forms without the tabs. The only template the database holds is
 * the Weekly check-in (create_weekly_check_in_template); the other lane
 * templates the frames list have no questions anywhere, so they show Coming
 * soon instead of Use. Forms are never sent automatically on hire yet
 * (Karim kept intake on accept for a later release), so every intake form is
 * "Sent manually".
 */
export const FormsHome: React.FC = () => {
  const { authUserId } = useApp();
  const { lane } = useProSubtype();
  const online = useOnline();
  const navigate = useNavigate();
  const back = useBack(PRO_ROUTES.more);
  const [tab, setTab] = useState<FormKind>(() => (new URLSearchParams(window.location.search).get("tab") === "check-ins" ? "check_in" : "intake"));
  const [data, setData] = useState<{ forms: FormSummary[]; assignments: FormAssignment[] } | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const checkIns = lane === "full_coaching" || lane === "nutrition";
  const kind: FormKind = checkIns ? tab : "intake";

  const load = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchForms(authUserId).then((r) => {
      if (!live) return;
      if (r.ok) {
        setData(r.data);
        setState("ok");
      } else setState(r.offline ? "offline" : "error");
    });
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  const pickTab = (k: string) => {
    const next = k === "check_in" ? "check_in" : "intake";
    setTab(next);
    navigate(next === "check_in" ? `${FORMS_PATH}?tab=check-ins` : FORMS_PATH, { replace: true });
  };

  const addWeekly = async () => {
    if (busy) return;
    if (!online) return setErr("You're offline. Try again when you're connected.");
    setBusy(true);
    setErr(null);
    const r = await createWeeklyCheckIn();
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    navigate(`${FORMS_PATH}/${r.id}`);
  };

  const mine = (data?.forms ?? []).filter((f) => f.kind === kind);
  const templates = lane ? LANE_TEMPLATES[lane as ProLane].filter((t) => t.kind === kind) : [];

  return (
    <div style={{ paddingBottom: 120 }}>
      <CHead title="Forms" sub="What clients fill in, and when" onBack={back} />
      {checkIns && (
        <SegmentedTabs
          className="mb-[14px]"
          items={[
            { key: "intake", label: "Intake" },
            { key: "check_in", label: "Check-ins" },
          ]}
          activeKey={kind}
          onChange={pickTab}
          tabHeight={40}
          labelSize={13}
        />
      )}
      {state === "offline" && data && <OfflineLine />}
      {err && <ErrorLine>{err}</ErrorLine>}

      <SectionHead label="Your forms" />
      {state === "loading" && !data ? (
        <ListSkeleton rows={2} row={CardRow} />
      ) : !data ? (
        <ProError onRetry={load} />
      ) : mine.length ? (
        <ListCard
          rows={mine.map((f) => ({
            key: f.id,
            icon: f.kind === "intake" ? ClipboardList : CalendarCheck,
            title: f.title,
            meta: f.kind === "intake" ? intakeLine(f) : checkInLine(f, data.assignments),
            onClick: () => navigate(`${FORMS_PATH}/${f.id}`),
          }))}
        />
      ) : (
        <SoftLine icon={kind === "intake" ? ClipboardList : CalendarCheck}>
          {kind === "intake" ? "No intake forms yet. Start one with + or from a template." : "No check-ins yet. Start one with + or from the Weekly check-in template."}
        </SoftLine>
      )}

      {templates.length > 0 && (
        <>
          <div style={{ height: 4 }} />
          <SectionHead label="Templates from Centium" />
          <ListCard
            rows={templates.map((t) => ({
              key: t.title,
              icon: FilePlus2,
              title: t.title,
              meta: t.meta,
              trailing: t.weekly ? (
                <button
                  type="button"
                  onClick={() => void addWeekly()}
                  disabled={busy}
                  aria-label={`Use ${t.title}`}
                  className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']"
                  style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, opacity: busy ? 0.5 : 1 }}
                >
                  Use
                </button>
              ) : (
                <ComingSoonPill />
              ),
            }))}
          />
        </>
      )}
      <Fab label="New form" icon={Plus} onClick={() => navigate(`${FORMS_PATH}/new/${kind === "check_in" ? "check-in" : "intake"}`)} />
    </div>
  );
};
