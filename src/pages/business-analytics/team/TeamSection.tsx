import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { useAnalytics } from "../shell/AnalyticsContext";
import { AssignSheet } from "./AssignSheet";
import { CoverageView, issueRows } from "./CoverageView";
import { FixSheet } from "./FixSheet";
import { InviteSheet } from "./InviteSheet";
import { LoadView, PerformanceView, RepeatView } from "./MetricViews";
import { PayView } from "./PayView";
import { RatingsView } from "./RatingsView";
import { ScorecardView } from "./ScorecardView";
import { SeatsSheet, type SeatsMode } from "./SeatsSheet";
import { TeamIndex, type TileKey } from "./TeamIndex";
import { seatList } from "./helpers";
import type { Issue } from "./model";
import type { ClassRow } from "./teamData";
import { useTeam } from "./useTeam";
import { roleLabel, vocabFor } from "./vocab";
import "../shell/analytics.css";
import "./an5.css";

// AN5 · Analytics · Team: the index and its section pages, and the sheets
// they open. Views are local state (the source's `view`), so the Analytics
// chrome, range and section tabs stay put; Back returns to the page the user
// came from (AN5-045 S1).
//
// Two OURS screens open the Team agent's drawn OP1 pages instead of
// duplicating them: a used or pending seat opens Team › person
// (/app/business/employees/:id: role, availability, credentials, remove with
// its confirm), and the join-requests row opens Team › Join requests.

type View =
  | { k: "index" }
  | { k: TileKey }
  | { k: "card"; id: string; ratings: boolean; from: "performance" | "repeat" | "load" | "ratings" | "pay" | "index" };

const FROM_TITLE = { performance: "Instructor performance", repeat: "Return rate", load: "Teaching load", ratings: "Ratings", pay: "Pay", index: "Team" } as const;

export default function TeamSection() {
  const { range, setExport } = useAnalytics();
  const navigate = useNavigate();
  const { kind } = useBusiness();
  const vocab = vocabFor(kind);
  const state = useTeam(range);
  const [view, setView] = useState<View>({ k: "index" });
  const [status, setStatus] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [seatsMode, setSeatsMode] = useState<SeatsMode | null>(null);
  const [assign, setAssign] = useState<{ s: ClassRow; mode: "assign" | "reassign" } | null>(null);
  const [fix, setFix] = useState<Extract<Issue, { kind: "overlap" }> | null>(null);
  const [move, setMove] = useState<ClassRow | null>(null);
  const [requested, setRequested] = useState(0);
  const [lastFix, setLastFix] = useState<Extract<Issue, { kind: "overlap" }> | null>(null);

  const seats = useMemo(() => seatList(state), [state]);
  const usedN = seats.filter((s) => s.kind === "used").length;
  const pendingN = seats.filter((s) => s.kind === "pending").length;
  const freeN = seats.filter((s) => s.kind === "free").length;
  const people = useMemo(() => state.team?.people ?? [], [state.team]);

  const go = (v: View) => {
    setView(v);
    setStatus(null);
    window.scrollTo({ top: 0 });
  };

  // Export CSV: the current page's real rows (AN5-001 S8, AN5-023 S5).
  useEffect(() => {
    const s = state.stats;
    if (view.k === "coverage") {
      const nameOf = (id: string | null) => (id ? people.find((p) => p.id === id)?.name ?? state.leftNames.get(id) ?? "" : "");
      const rows: (string | number)[][] = [["Kind", "Class", "Date", "Start", "End", "Instructor", "Booked", "Capacity"]];
      for (const r of issueRows(state)) {
        const list = r.issue.kind === "overlap" ? [r.issue.a, r.issue.b] : [r.issue.cls];
        for (const c of list) rows.push([r.kind, c.title, c.date, c.start, c.end, nameOf(c.professionalId), c.booked, c.capacity]);
      }
      setExport({ filename: "centium-team-coverage.csv", rows });
    } else {
      const rows: (string | number)[][] = [["Name", "Role", "Status", "Classes taught", "Booked", "Capacity", "Fill rate", "Hours per week"]];
      for (const p of people) {
        const st = s?.perPerson.find((x) => x.person.id === p.id);
        rows.push([p.name, roleLabel(p.role), p.acceptedAt ? "On the team" : "Invited", st?.sessions ?? 0, st?.booked ?? 0, st?.capacity ?? 0, st?.fill == null ? "" : `${st.fill}%`, st?.hoursPerWeek ?? 0]);
      }
      setExport({ filename: "centium-team.csv", rows });
    }
    return () => setExport(null);
  }, [view.k, state, people, setExport]);

  const openInvite = () => {
    const seatsInfo = state.team?.seats;
    if (!seatsInfo) return;
    if (!seatsInfo.planActive) setSeatsMode("noplan");
    else if (freeN === 0) setSeatsMode("noseats");
    else setInvite(true);
  };
  const toCard = (from: Extract<View, { k: "card" }>["from"], ratings = false) => (id: string) => go({ k: "card", id, ratings, from });
  const back = () => go({ k: "index" });
  const plan = () => navigate("/app/business/more/subscription");

  let page: React.ReactNode;
  switch (view.k) {
    case "index":
      page = (
        <TeamIndex
          state={state}
          range={range}
          vocab={vocab}
          onTile={(k) => go({ k })}
          onInvite={openInvite}
          onAddSeats={() => setSeatsMode(state.team?.seats.planActive ? "add" : "noplan")}
          onSeat={(p) => navigate(`/app/business/employees/${p.id}`)}
          onRequests={() => navigate("/app/business/employees/requests")}
          onPlan={plan}
          requestedBlocks={requested}
        />
      );
      break;
    case "coverage":
      page = (
        <CoverageView
          state={state}
          vocab={vocab}
          status={status}
          onBack={back}
          onAssign={(s) => setAssign({ s, mode: "assign" })}
          onFix={(i) => setFix(i)}
        />
      );
      break;
    case "ratings":
      page = <RatingsView state={state} onBack={back} onCard={toCard("ratings", true)} />;
      break;
    case "pay":
      page = <PayView state={state} vocab={vocab} onBack={back} onCard={toCard("pay")} />;
      break;
    case "performance":
      page = <PerformanceView state={state} range={range} vocab={vocab} onBack={back} onCard={toCard("performance")} />;
      break;
    case "repeat":
      page = <RepeatView state={state} range={range} vocab={vocab} onBack={back} onCard={toCard("repeat")} />;
      break;
    case "load":
      page = <LoadView state={state} range={range} vocab={vocab} onBack={back} onCard={toCard("load")} />;
      break;
    case "card":
      page = (
        <ScorecardView
          state={state}
          range={range}
          personId={view.id}
          focusRatings={view.ratings}
          crumb={view.from === "index" ? "Team" : `Team › ${view.from === "performance" ? "Scorecard" : FROM_TITLE[view.from]}`}
          backLabel={`Back to ${FROM_TITLE[view.from]}`}
          onBack={() => go(view.from === "index" ? { k: "index" } : { k: view.from })}
        />
      );
      break;
  }

  const done = (text: string) => {
    setAssign(null);
    setFix(null);
    setMove(null);
    setStatus(text);
    state.reload();
  };

  return (
    <div className="an-scope">
      {page}

      <InviteSheet
        open={invite}
        businessId={state.businessId}
        businessCode={state.businessCode}
        freeSeats={freeN}
        vocab={vocab}
        onClose={() => setInvite(false)}
        onSent={state.reload}
        onNoSeats={() => {
          setInvite(false);
          setSeatsMode("noseats");
        }}
      />
      <SeatsSheet
        open={seatsMode !== null}
        mode={seatsMode ?? "add"}
        seats={state.team?.seats ?? null}
        used={usedN}
        pending={pendingN}
        onClose={() => setSeatsMode(null)}
        onPlan={plan}
        onRequested={(n) => setRequested((x) => x + n)}
      />
      <AssignSheet
        open={assign !== null}
        session={assign?.s ?? null}
        mode={assign?.mode ?? "assign"}
        businessId={state.businessId}
        people={people}
        classes={state.classes}
        vocab={vocab}
        onClose={() => setAssign(null)}
        onBack={() => {
          const wasReassign = assign?.mode === "reassign";
          setAssign(null);
          if (wasReassign && lastFix) setFix(lastFix);
        }}
        onDone={done}
        onInvite={() => {
          setAssign(null);
          openInvite();
        }}
        onMove={(s) => {
          setAssign(null);
          setMove(s);
        }}
      />
      <FixSheet
        open={fix !== null || move !== null}
        pair={move ? null : fix}
        move={move}
        people={people}
        classes={state.classes}
        onClose={() => {
          setFix(null);
          setMove(null);
        }}
        onReassign={(s) => {
          setLastFix(fix);
          setFix(null);
          setAssign({ s, mode: "reassign" });
        }}
        onDone={done}
      />
    </div>
  );
}
