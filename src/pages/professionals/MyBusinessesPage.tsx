import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Check, ChevronRight, LogOut, Send, X } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { Toast } from "../../components/ui/Toast";
import { useApp } from "../../context/AppContext";
import {
  acceptEmployment,
  fetchMyEmployments,
  fetchMyJoinRequests,
  removeMyEmployment,
  requestToJoin,
  type MyEmployment,
  type MyJoinRequest,
} from "../../services/business-team/employment";
import { formatDisplayDate, localDayOf } from "../../utils/date";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { chooseConsoleBusiness, invalidateConsoleAccess, staffAreas, type StaffArea } from "../../services/business-console";

// v6 Batch 4 · B0 consent, the professional's side (OURS: not drawn in the
// handover). A business that adds a professional (an invite, or approving
// their join request) creates an UNACCEPTED employment; this page is where
// the professional sees it (my_business_employments) and accepts
// (accept_business_employment) or declines (deleting their own row). A
// professional may work for several businesses. They can also ask to join a
// business by its business ID (request_to_join_business, B6).
//
// Accepting turns off the professional's public directory listing the first
// time they join a team (business_employees_sync_affiliation), so the page
// says so before they accept.
//
// B7 · THE WAY INTO THE CONSOLE FOR STAFF. Each team lists the console areas
// the owner's permissions open (services/business-console staffAreas); a tap
// makes that business the console's current one and opens the area. A team
// with no permissions says the owner turns them on.

/** Role names (B6 business_role) for "Invited … · as {role}". */
const ROLE_NAME: Record<string, string> = {
  instructor: "Instructor",
  trainer: "Personal trainer",
  front_desk: "Front desk",
  manager: "Manager",
  staff: "Staff",
  shop_assistant: "Shop assistant",
};

export default function MyBusinessesPage() {
  const { user, authUserId } = useApp();
  const navigate = useNavigate();
  const access = useConsoleAccess();
  const openArea = (businessId: string, a: StaffArea) => {
    if (authUserId) chooseConsoleBusiness(authUserId, businessId);
    navigate(a.to);
  };
  const [list, setList] = useState<MyEmployment[] | null>(null);
  const [requests, setRequests] = useState<MyJoinRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "decline" | "leave"; e: MyEmployment } | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [emp, req] = await Promise.all([fetchMyEmployments(), fetchMyJoinRequests()]);
    if (emp.ok) {
      setList(emp.value);
      setError(null);
    } else setError(emp.message);
    if (req.ok) setRequests(req.value);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (user.accountType !== "professional") {
    return (
      <div>
        <PageHeader title="Your businesses" showBack />
        <Card>
          <p className="text-sm text-charcoal-soft">Business teams are for professional accounts.</p>
        </Card>
      </div>
    );
  }

  const invites = (list ?? []).filter((e) => !e.acceptedAt);
  const teams = (list ?? []).filter((e) => e.acceptedAt);

  const accept = async (e: MyEmployment) => {
    setBusy(e.businessId);
    const r = await acceptEmployment(e.businessId);
    setBusy(null);
    if (!r.ok) return setToast(r.message);
    setToast(`You joined ${e.businessName}.`);
    invalidateConsoleAccess();
    await load();
  };

  const remove = async () => {
    if (!confirm) return;
    const { e, kind } = confirm;
    setBusy(e.businessId);
    const r = await removeMyEmployment(e.businessId);
    setBusy(null);
    setConfirm(null);
    if (!r.ok) return setToast(r.message);
    setToast(kind === "decline" ? `You declined ${e.businessName}'s invitation.` : `You left ${e.businessName}.`);
    invalidateConsoleAccess();
    await load();
  };

  const send = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return setCodeError("A business ID has 6 letters and numbers.");
    setSending(true);
    setCodeError(null);
    const r = await requestToJoin(c);
    setSending(false);
    if (!r.ok) return setCodeError(r.message);
    setCode("");
    setToast("Request sent. You join once the business approves and you accept.");
    await load();
  };

  return (
    <div>
      <PageHeader title="Your businesses" subtitle="Teams you work with" showBack />

      {error && (
        <div className="mb-4 rounded-2xl bg-status-high-bg px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-[12.5px] leading-[18px] text-status-high">{error}</p>
          <button type="button" className="tap min-h-[44px] text-[12.5px] font-bold text-primary-dark" onClick={() => void load()}>
            Retry
          </button>
        </div>
      )}

      {list === null && !error && <p className="text-sm text-charcoal-faint mb-4">Loading…</p>}

      {invites.length > 0 && (
        <>
          <p className="section-label text-charcoal-faint mb-2.5">Invitations</p>
          <div className="space-y-2.5 mb-6">
            {invites.map((e) => (
              <Card key={e.businessId} className="animate-fade-slide-up">
                <div className="flex items-center gap-3">
                  <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-primary-dark" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal">{`${e.businessName} invited you to their team`}</p>
                    <p className="text-xs text-charcoal-faint">{`Invited ${formatDisplayDate(localDayOf(e.invitedAt))}` + (e.role && ROLE_NAME[e.role] ? ` · as ${ROLE_NAME[e.role]}` : "")}</p>
                  </div>
                </div>
                {e.message && (
                  <blockquote className="mt-3 rounded-xl bg-cream-soft px-3.5 py-2.5 text-[12.5px] leading-[18px] text-charcoal whitespace-pre-line">
                    <span className="block text-[11px] font-semibold text-charcoal-faint mb-1">{`Message from ${e.businessName}`}</span>
                    {e.message}
                  </blockquote>
                )}
                <p className="text-xs text-charcoal-soft mt-3 leading-[17px]">
                  {`Accepting lets ${e.businessName} schedule you and see your licences. While you're on a team, your public listing in the directory is turned off. You can leave at any time.`}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Button variant="outline" disabled={busy === e.businessId} onClick={() => setConfirm({ kind: "decline", e })}>
                    <X size={15} /> Decline
                  </Button>
                  <Button disabled={busy === e.businessId} onClick={() => void accept(e)}>
                    <Check size={15} /> {busy === e.businessId ? "Accepting…" : "Accept"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {list !== null && (
        <>
          <p className="section-label text-charcoal-faint mb-2.5">Your teams</p>
          <div className="space-y-2.5 mb-6">
            {teams.map((e) => {
              const seat = access.seats.find((s) => s.businessId === e.businessId && !s.isOwner) ?? null;
              const areas = seat ? staffAreas(seat) : [];
              return (
                <Card key={e.businessId} className="animate-fade-slide-up">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-primary-dark" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-charcoal truncate">{e.businessName}</p>
                      <p className="text-xs text-charcoal-faint">{`Joined ${formatDisplayDate(localDayOf(e.acceptedAt!))}` + (e.role && ROLE_NAME[e.role] ? ` · ${ROLE_NAME[e.role]}` : "")}</p>
                    </div>
                    <Button variant="outline" size="sm" disabled={busy === e.businessId} onClick={() => setConfirm({ kind: "leave", e })}>
                      <LogOut size={13} /> Leave
                    </Button>
                  </div>
                  {access.ready && (
                    <div className="mt-3 pt-1 border-t border-charcoal/[0.06]">
                      {areas.length === 0 ? (
                        <p className="text-xs text-charcoal-faint pt-2 leading-[17px]">{`${e.businessName}'s owner hasn't turned on anything you can do in their business console yet.`}</p>
                      ) : (
                        <ul aria-label={`What you can do at ${e.businessName}`}>
                          {areas.map((a) => (
                            <li key={a.key}>
                              <button
                                type="button"
                                onClick={() => openArea(e.businessId, a)}
                                className="tap w-full min-h-[48px] flex items-center gap-3 text-left"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block text-[13px] font-semibold text-charcoal">{a.label}</span>
                                  <span className="block text-[11.5px] leading-[16px] text-charcoal-faint">{a.desc}</span>
                                </span>
                                <ChevronRight size={16} aria-hidden className="text-charcoal-faint shrink-0" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
            {teams.length === 0 && (
              <Card className="text-center py-6">
                <p className="text-sm text-charcoal-faint">You're not on a business's team yet.</p>
              </Card>
            )}
          </div>
        </>
      )}

      <p className="section-label text-charcoal-faint mb-2.5">Ask to join a business</p>
      <Card className="mb-6">
        <label htmlFor="join-code" className="block text-xs font-semibold text-charcoal-soft mb-1.5">
          Business ID
        </label>
        <div className="flex gap-2">
          <input
            id="join-code"
            value={code}
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder="ABC234"
            aria-invalid={!!codeError}
            aria-describedby={codeError ? "join-code-err" : "join-code-help"}
            onChange={(ev) => {
              setCode(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              setCodeError(null);
            }}
            className={`flex-1 min-w-0 h-11 rounded-xl bg-cream-soft px-3.5 text-sm font-bold tracking-[0.1em] text-charcoal outline-none focus-visible:ring-2 focus-visible:ring-primary ${codeError ? "ring-[1.5px] ring-status-high" : ""}`}
          />
          <Button disabled={sending || code.length === 0} onClick={() => void send()}>
            <Send size={14} /> {sending ? "Sending…" : "Send request"}
          </Button>
        </div>
        {codeError ? (
          <p id="join-code-err" className="text-xs font-semibold text-status-high mt-2">
            {codeError}
          </p>
        ) : (
          <p id="join-code-help" className="text-xs text-charcoal-faint mt-2">
            Ask the business for their 6-character ID. They approve your request, then you accept here.
          </p>
        )}
        {requests.length > 0 && (
          <div className="mt-3 pt-3 border-t border-charcoal/[0.06] space-y-1.5">
            {requests.map((r) => (
              <p key={r.id} className="text-xs text-charcoal-soft">
                {`${r.businessName} · request sent ${formatDisplayDate(localDayOf(r.createdAt))} · waiting for them to approve`}
              </p>
            ))}
          </div>
        )}
      </Card>

      <ConfirmCard
        open={!!confirm}
        layout="stacked"
        tone="destructive"
        destructiveFill="solid"
        cancelVariant="outlined"
        initialFocus="cancel"
        title={confirm?.kind === "decline" ? `Decline ${confirm.e.businessName}'s invitation?` : `Leave ${confirm?.e.businessName ?? ""}?`}
        subtitle={
          confirm?.kind === "decline"
            ? "They can invite you again later."
            : "You lose access to their business. Your own account and clients stay."
        }
        confirmLabel={confirm?.kind === "decline" ? "Decline" : "Leave"}
        cancelLabel="Keep it"
        busy={!!busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void remove()}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
