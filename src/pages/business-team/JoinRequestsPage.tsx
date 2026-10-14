import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Inbox, UserX } from "lucide-react";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { copyText } from "../../components/business-more/share";
import { respondJoinRequest, type JoinRequest } from "../../services/business-team/team";
import { Avatar, BackRow, Notice, TeamScope, isOfflineNow, useTeamToast } from "./parts";
import { SeatsFullSheet } from "./TeamSheets";
import { requestedWhen, seatCounts, teamTitle } from "./teamLogic";
import type { TeamData } from "./useTeamData";

// OP1-123 / 124 (requests), 126 (deny confirm), 127 (approve with no free
// seat), 128 (approved toast), 129 (no requests). B6: respond_join_request
// checks the seat first (ATXC0) and approval adds an UNACCEPTED employment,
// so the professional still accepts in their own app (B0).

export function JoinRequestsPage({ data }: { data: TeamData }) {
  const navigate = useNavigate();
  const { kind, requests, requestsError, code, people, capacity, today } = data;
  const [toast, showToast] = useTeamToast();
  const [deny, setDeny] = useState<JoinRequest | null>(null);
  const [full, setFull] = useState<JoinRequest | null>(null);
  const [busy, setBusy] = useState<{ id: string; approve: boolean } | null>(null);
  const offline = isOfflineNow();
  const counts = seatCounts(people ?? [], capacity?.capacity ?? 0);
  const list = requests ?? [];
  const n = list.length;

  const answer = async (r: JoinRequest, approve: boolean) => {
    if (busy) return;
    if (approve && counts.free <= 0) return setFull(r);
    setBusy({ id: r.id, approve });
    const res = await respondJoinRequest(r.id, approve, r.name);
    setBusy(null);
    setDeny(null);
    if (!res.ok) {
      if (res.reason === "no_seats") return setFull(r);
      if (res.reason === "gone") {
        data.setRequests(list.filter((x) => x.id !== r.id));
        return showToast(res.message, true);
      }
      return showToast(res.message, true);
    }
    data.setRequests(list.filter((x) => x.id !== r.id));
    showToast(approve ? `Approved. ${r.name} joins your team once they accept.` : "Request denied.");
    data.reload();
  };

  return (
    <TeamScope detail>
      <BackRow label={teamTitle(kind, data.kindKnown)} onBack={() => navigate("/app/business/employees")} />
      <div className="tm-dhead">
        <span className="tm-dav tile" aria-hidden>
          <Inbox size={26} strokeWidth={1.8} />
        </span>
        <div className="tm-dhead-b">
          <p className="tm-dname">
            <b>Join requests</b>
          </p>
          <p className="tm-ds1">{n === 0 ? "Nobody is waiting" : n === 1 ? "1 professional wants to join" : `${n} professionals want to join`}</p>
          <p className="tm-ds2">
            {n === 0 ? `Professionals enter your business ID ${code ?? ""} to ask to join.`.replace(" ID  to", " ID to") : `They entered your business ID ${code ?? ""}`}
          </p>
        </div>
      </div>

      {offline ? (
        <Notice message="You're offline. Requests show when you're back online." />
      ) : (
        requestsError && <Notice message="Couldn't load join requests. Try again." onRetry={data.reload} />
      )}

      {n > 0 && (
        <p className="tm-rq-line">
          {data.readOnly ? "Only the owner can approve or deny a request." : "Approving someone adds them to your team and uses a free seat once they accept."}
        </p>
      )}

      {requests === null && !requestsError && (
        <div className="tm-rq-card" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="tm-rq">
              <div className="tm-rq-top">
                <span className="tm-av" style={{ opacity: 0.5 }} />
                <div style={{ flex: 1 }}>
                  <div className="tm-skel" style={{ width: "50%" }} />
                  <div className="tm-skel" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {requests !== null && (
        <div className="tm-rq-card">
          {list.map((r) => (
            <div key={r.id} className="tm-rq">
              <div className="tm-rq-top">
                <Avatar name={r.name} url={r.avatarUrl} className="tm-av" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="tm-rq-n">{r.name}</p>
                  <p className="tm-rq-w">{requestedWhen(r.createdAt, today)}</p>
                </div>
              </div>
              {!data.readOnly && <div className="tm-rq-btns">
                <button
                  type="button"
                  className={busy?.id === r.id && !busy.approve ? "tm-deny busy tap" : "tm-deny tap"}
                  disabled={offline || !!busy}
                  onClick={() => setDeny(r)}
                >
                  Deny
                </button>
                <button
                  type="button"
                  className={busy?.id === r.id && busy.approve ? "tm-ok busy tap" : "tm-ok tap"}
                  disabled={offline || !!busy}
                  onClick={() => void answer(r, true)}
                >
                  <Check size={15} strokeWidth={2.6} />
                  Approve
                </button>
              </div>}
            </div>
          ))}
          {n === 0 && (
            <div className="tm-empty">
              <span className="tm-empty-tile">
                <Inbox size={22} />
              </span>
              <p className="tm-empty-t">No join requests</p>
              <p className="tm-empty-b">When a professional enters your business ID, their request shows here for you to approve.</p>
              {code && (
                <button
                  type="button"
                  className="tm-link tap"
                  onClick={() => void copyText(code).then((ok) => showToast(ok ? "Business ID copied." : "Couldn't copy. Try again.", !ok))}
                >
                  Copy business ID
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <ConfirmCard
        open={!!deny}
        layout="stacked"
        tone="destructive"
        destructiveFill="solid"
        cancelVariant="outlined"
        initialFocus="cancel"
        scrimBlur
        icon={<UserX size={20} strokeWidth={2.2} />}
        title={`Deny ${deny?.name ?? ""}'s request?`}
        subtitle="They won't join your team. They can send a new request later."
        confirmLabel={busy ? "Denying…" : "Deny request"}
        cancelLabel="Keep it"
        busy={!!busy}
        onCancel={() => setDeny(null)}
        onConfirm={() => deny && void answer(deny, false)}
      />
      <SeatsFullSheet open={!!full} onClose={() => setFull(null)} counts={counts} approveName={full?.name ?? null} />
      {toast}
    </TeamScope>
  );
}
