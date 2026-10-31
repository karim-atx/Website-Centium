import React, { useCallback, useEffect, useId, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronDown, ChevronUp, CircleCheck, MessageCircle, Send, UserPlus, UserRound, UserX, Users, X } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { useBack } from "../../../hooks/useBack";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton, PinnedCta } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { Avatar, Chip, ListCard, SectionHead, SoftLine } from "../client/kit";
import { EmptyState } from "../EmptyState";
import { ListSkeleton, OfflineLine, ProCardSkeleton, ProError } from "../states";
import { ErrorLine } from "../library/libraryUi";
import { TopToast } from "../forms/moKit";
import { ReferSheet } from "./ReferSheet";
import { PopupMenu } from "../../ui/PopupMenu";
import { ProField } from "../addclient/fields";
import { canDispute, canWithdraw, declineReasonText, firstName, receivedChip, REFERRAL_DECLINE_REASONS, sentChip, typeLabel, whenWord, type ReferralDeclineReason } from "./careModel";
import {
  REASON_MAX,
  disputeReferral,
  fetchColleagues,
  fetchLinks,
  fetchReferrals,
  removeLink,
  requestLink,
  respondLink,
  respondReferral,
  searchColleagues,
  withdrawReferral,
  type CareLink,
  type Colleague,
  type Referral,
} from "../../../services/pro/careNetwork";
import { startThread } from "../../../services/messaging";
import { proClientPath, PRO_ROUTES } from "../subtypeLanes";
import { time12 } from "../../../utils/time12";

const OFFLINE = "You're offline. Try again when you're connected.";
type Tab = "received" | "sent" | "network";
const TONES = ["pr", "sky", "gold", "teal"] as const;
const CardRow: React.FC = () => <ProCardSkeleton lines={3} height={150} />;
const clock = (d: Date) => time12(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);

/**
 * Release 3 · MO7 v3 Care network (gen/r15.js careNet15, careCard15,
 * referStep15, referSent15): pageHead "Care network" / "Referrals between
 * you and colleagues" with the tabs pulled 8 up (segTabs h38, 12.5, 14
 * under); Received cards, Sent rows, Network; the pinned "Refer a client".
 *
 * Backend truths the screen keeps (HANDOVER_API DB-6, DECISIONS "Care
 * network"):
 * - a referral reaches the colleague only after the client agrees (CU23);
 *   until then Sent says "Waiting for {client}";
 * - accepting doesn't add the client to your roster (Release A: connecting
 *   is the client's own second decision, connect_from_referral, where they
 *   pick what to share), so the toast says the colleague was told, not
 *   "added to your clients";
 * - Release A: a decline can say why (respond_care_referral p_reason):
 *   the frame's reason dropdown, Other with its own words (at most 500),
 *   optional. Both professionals read it ("Declined Oct 6 · Outside my
 *   specialty"). Not wired: the frame's "Suggest someone (optional)" (no
 *   column) and "{client} is told the referral was not taken up" (the
 *   client isn't told of a decline yet: W7-6), so the popup doesn't say it;
 * - nothing of the client's data is passed on, so no "shared" chips;
 * - either side can send a referral to support (dispute_care_referral);
 *   support handles it as "Care network" (never "Referral disputes").
 */
export const CareNetworkScreen: React.FC = () => {
  const { authUserId, professionalClients } = useApp();
  const online = useOnline();
  const navigate = useNavigate();
  const back = useBack(PRO_ROUTES.more);
  const dark = useIsDark();
  const [tab, setTab] = useState<Tab>("received");
  const [refs, setRefs] = useState<{ received: Referral[]; sent: Referral[] } | null>(null);
  const [links, setLinks] = useState<CareLink[] | null>(null);
  const [people, setPeople] = useState<Record<string, Colleague>>({});
  const [state, setState] = useState<"loading" | "ok" | "error" | "offline">("loading");
  const [nonce, setNonce] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; icon: typeof Send } | null>(null);
  const [decline, setDecline] = useState<Referral | null>(null);
  const [actions, setActions] = useState<Referral | null>(null);
  const [dispute, setDispute] = useState<Referral | null>(null);
  const [refer, setRefer] = useState(false);
  const [adding, setAdding] = useState(false);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void Promise.all([fetchReferrals(authUserId), fetchLinks(authUserId)]).then(async ([r, l]) => {
      if (!live) return;
      if (!r.ok || !l.ok) return setState((!r.ok && r.offline) || (!l.ok && l.offline) ? "offline" : "error");
      setRefs(r.data);
      setLinks(l.data);
      setState("ok");
      const ids = [...r.data.received.map((x) => x.fromId), ...r.data.sent.map((x) => x.toId), ...l.data.map((x) => x.other)];
      const found = await fetchColleagues(ids);
      if (live) setPeople(found);
    });
    return () => {
      live = false;
    };
  }, [authUserId, nonce]);

  const clientName = (id: string) => professionalClients.find((c) => c.clientId === id)?.name ?? null;
  const inRoster = (id: string) => professionalClients.some((c) => c.clientId === id);
  const proName = (id: string) => people[id]?.name ?? null;

  const run = async (key: string, fn: () => Promise<{ ok: true } | { ok: false; message: string }>, done: string, icon: typeof Send = CircleCheck) => {
    if (busy) return false;
    if (!online) {
      setErr(OFFLINE);
      return false;
    }
    setBusy(key);
    setErr(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) {
      setErr(r.message);
      return false;
    }
    setToast({ text: done, icon });
    reload();
    return true;
  };

  const message = async (clientId: string) => {
    if (!online) return setErr(OFFLINE);
    const r = await startThread(clientId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setErr(r.message);
  };

  // ------------------------------------------------------------- Received
  const receivedCard = (x: Referral, i: number) => {
    const name = clientName(x.clientId);
    const cFirst = firstName(name);
    const from = proName(x.fromId);
    const st = x.status;
    const chip = receivedChip(st);
    const declined = st === "declined";
    const whenLine =
      st === "declined"
        ? [`Declined ${whenWord(x.respondedAt ?? x.createdAt)}`, x.declineReason].filter(Boolean).join(" · ")
        : st === "sent"
          ? `Received ${whenWord(x.clientAnsweredAt ?? x.createdAt, new Date(), clock)} · ${cFirst || "The client"} agreed to the referral`
          : `Received ${whenWord(x.clientAnsweredAt ?? x.createdAt)}`;
    return (
      <div key={x.id} style={{ background: INK.card, border: `1px solid ${declined ? (dark ? "rgba(240,154,142,0.35)" : "rgba(192,57,43,0.25)") : INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 10 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <Avatar name={name ?? "?"} size={44} tone={TONES[i % 4]} />
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch, overflowWrap: "anywhere" }}>
              {name ?? "Referred client"}
            </span>
            <span className="flex items-center" style={{ gap: 5, fontSize: textPx(12), color: INK.chF }}>
              <Send size={11} strokeWidth={2} aria-hidden className="shrink-0" />
              <span className="min-w-0">{`From ${from ?? "a colleague"}, ${typeLabel(people[x.fromId]?.type)}`}</span>
            </span>
          </span>
          <Chip label={chip.label} tone={chip.tone} />
        </div>
        <p style={{ fontSize: textPx(13), color: INK.chS, lineHeight: 1.5, marginTop: 10, paddingInlineStart: 10, borderInlineStart: `2px solid ${INK.b10}`, overflowWrap: "anywhere" }}>{x.reason}</p>
        <p style={{ fontSize: textPx(11.5), color: declined ? INK.hi : INK.chF, fontWeight: declined ? 700 : 400, marginTop: 8 }}>{whenLine}</p>
        {st === "sent" && (
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <CtaButton className="flex-1" size="base" variant="secondary" icon={<X size={15} />} label="Decline" disabled={!!busy} onClick={() => setDecline(x)} />
            <CtaButton
              className="flex-1"
              size="base"
              icon={<Check size={15} />}
              label="Accept"
              loading={busy === `acc-${x.id}`}
              onClick={() => void run(`acc-${x.id}`, () => respondReferral(x.id, true), `Accepted. ${from ?? "Your colleague"} has been told.`)}
            />
          </div>
        )}
        {st === "accepted" && inRoster(x.clientId) && (
          <div className="flex" style={{ gap: 8, marginTop: 12 }}>
            <CtaButton className="flex-1" size="base" variant="secondary" icon={<MessageCircle size={15} />} label={`Message ${cFirst || "client"}`} onClick={() => void message(x.clientId)} />
            <CtaButton className="flex-1" size="base" variant="outline" icon={<UserRound size={15} />} label="Open client" onClick={() => navigate(proClientPath(x.clientId))} />
          </div>
        )}
        {st === "accepted" && !inRoster(x.clientId) && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6, lineHeight: 1.45 }}>{`${cFirst || "The client"} chooses whether to connect with you, and what to share.`}</p>}
        {canDispute(st) && (
          <button type="button" onClick={() => setDispute(x)} className="tap relative before:absolute before:-inset-y-3 before:inset-x-0 before:content-['']" style={{ marginTop: 10, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
            Ask support to look at this
          </button>
        )}
      </div>
    );
  };

  // ------------------------------------------------------------- Network
  const network = links ?? [];
  const incoming = network.filter((l) => l.status === "pending" && !l.mine);
  const outgoing = network.filter((l) => l.status === "pending" && l.mine);
  const linked = network.filter((l) => l.status === "accepted");

  const body = () => {
    if (state === "loading" && !refs) return <ListSkeleton rows={2} row={CardRow} />;
    if (!refs || !links) return <ProError onRetry={reload} />;
    if (tab === "received") {
      const list = refs.received.filter((x) => x.status !== "withdrawn");
      return list.length ? list.map(receivedCard) : <EmptyState icon={Users} title="No referrals yet" line="When a colleague refers a client to you and the client agrees, it shows here." />;
    }
    if (tab === "sent") {
      return refs.sent.length ? (
        <ListCard
          rows={refs.sent.map((x) => {
            const cName = clientName(x.clientId) ?? "A client";
            const pName = proName(x.toId) ?? "a colleague";
            const chip = sentChip(x.status, firstName(cName), firstName(pName));
            return {
              key: x.id,
              icon: Send,
              title: `${cName} to ${pName}`,
              // Release A: a decline's reason is the referrer's to read.
              meta: [typeLabel(people[x.toId]?.type), x.createdAt > new Date(Date.now() - 60000).toISOString() ? "sent just now" : whenWord(x.createdAt), x.status === "declined" ? x.declineReason : null].filter(Boolean).join(" · "),
              trailing: <Chip label={chip.label} tone={chip.tone} />,
              onClick: canWithdraw(x.status) || canDispute(x.status) ? () => setActions(x) : undefined,
            };
          })}
        />
      ) : (
        <EmptyState icon={Send} title="No referrals sent" line="Refer a client to a colleague in your care network. The client agrees before your colleague sees anything." />
      );
    }
    return (
      <>
        {incoming.length > 0 && (
          <>
            <SectionHead label="Asking to connect" />
            <ListCard
              rows={incoming.map((l) => ({
                key: l.id,
                icon: UserPlus,
                title: proName(l.other) ?? "A colleague",
                meta: typeLabel(people[l.other]?.type),
                trailing: (
                  <span className="flex items-center shrink-0" style={{ gap: 12 }}>
                    <button type="button" disabled={!!busy} onClick={() => void run(`ld-${l.id}`, () => respondLink(l.id, false), "Request declined.")} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chS }}>
                      Decline
                    </button>
                    <button type="button" disabled={!!busy} onClick={() => void run(`la-${l.id}`, () => respondLink(l.id, true), "Added to your care network.")} className="tap relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
                      Accept
                    </button>
                  </span>
                ),
              }))}
            />
          </>
        )}
        <SectionHead label="Your care network" right="Add a colleague" onRight={() => setAdding(true)} />
        {linked.length || outgoing.length ? (
          <ListCard
            rows={[
              ...linked.map((l) => ({
                key: l.id,
                icon: Users,
                title: proName(l.other) ?? "A colleague",
                meta: `${typeLabel(people[l.other]?.type)} · in your network`,
                trailing: (
                  <button type="button" disabled={!!busy} onClick={() => void run(`lr-${l.id}`, () => removeLink(l.id), "Removed from your care network.")} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chS }}>
                    Remove
                  </button>
                ),
              })),
              ...outgoing.map((l) => ({
                key: l.id,
                icon: UserPlus,
                title: proName(l.other) ?? "A colleague",
                meta: `${typeLabel(people[l.other]?.type)} · waiting for ${firstName(proName(l.other)) || "them"}`,
                trailing: (
                  <button type="button" disabled={!!busy} onClick={() => void run(`lc-${l.id}`, () => removeLink(l.id), "Request cancelled.")} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.chS }}>
                    Cancel
                  </button>
                ),
              })),
            ]}
          />
        ) : (
          <SoftLine icon={Users}>Add colleagues you trust. Both of you agree, then you can refer clients to each other.</SoftLine>
        )}
      </>
    );
  };

  return (
    <div style={{ paddingBottom: 172 }}>
      <PageHeader title="Care network" subtitle="Referrals between you and colleagues" showBack onBack={back} />
      <div style={{ marginTop: -8 }}>
        <SegmentedTabs
          className="mb-[14px]"
          items={[
            { key: "received", label: "Received" },
            { key: "sent", label: "Sent" },
            { key: "network", label: "Network" },
          ]}
          activeKey={tab}
          onChange={(k) => setTab(k as Tab)}
          tabHeight={38}
          labelSize={12.5}
        />
        {state === "offline" && refs && <OfflineLine />}
        {err && <ErrorLine>{err}</ErrorLine>}
        {body()}
      </div>
      <PinnedCta primary={{ label: "Refer a client", icon: <Send size={15} />, onClick: () => setRefer(true) }} />

      <DeclineReferralPopup
        key={decline?.id ?? "none"}
        open={!!decline}
        clientLabel={decline ? clientName(decline.clientId) ?? "this referral" : ""}
        fromName={decline ? proName(decline.fromId) ?? "Your colleague" : ""}
        busy={!!decline && busy === `dec-${decline.id}`}
        onClose={() => setDecline(null)}
        onDecline={(why) => decline && void run(`dec-${decline.id}`, () => respondReferral(decline.id, false, why), "Referral declined.").then((ok) => ok && setDecline(null))}
      />

      <BottomSheet open={!!actions} onClose={() => setActions(null)} title="Referral">
        {actions && (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {canWithdraw(actions.status) && (
              <CtaButton size="page" variant="secondary" label="Withdraw referral" loading={busy === `wd-${actions.id}`} onClick={() => void run(`wd-${actions.id}`, () => withdrawReferral(actions.id), "Referral withdrawn.").then((ok) => ok && setActions(null))} />
            )}
            {canDispute(actions.status) && (
              <CtaButton
                size="page"
                variant="outline"
                label="Ask support to look at this"
                onClick={() => {
                  setDispute(actions);
                  setActions(null);
                }}
              />
            )}
          </div>
        )}
      </BottomSheet>

      <DisputeSheet referral={dispute} onClose={() => setDispute(null)} busy={!!dispute && busy === `dis-${dispute.id}`} onSend={(why) => dispute && void run(`dis-${dispute.id}`, () => disputeReferral(dispute.id, why), "Sent to Centium support.").then((ok) => ok && setDispute(null))} />
      <AddColleagueSheet open={adding} onClose={() => setAdding(false)} known={new Set(network.map((l) => l.other))} onAsk={(id, name) => void run(`req-${id}`, () => requestLink(id), `Asked ${firstName(name) || "them"} to connect.`, UserPlus).then((ok) => ok && setAdding(false))} busy={busy} />
      <ReferSheet
        open={refer}
        onClose={() => setRefer(false)}
        links={network}
        colleagues={people}
        onSent={(text) => {
          setRefer(false);
          setTab("sent");
          setToast({ text, icon: Send });
          reload();
        }}
      />
      <TopToast icon={toast?.icon ?? CircleCheck} text={toast?.text ?? null} tone={toast?.icon === Send ? "pr" : "good"} onDone={() => setToast(null)} />
    </div>
  );
};

/**
 * MO7 v3 "decline, reason dropdown open / reason chosen" (Release A,
 * respond_care_referral p_reason): the HO13 request-decline popup's dropdown
 * (PopupMenu with the "Reason" heading, matched to the field) over the
 * frame's five reasons; Other asks for the professional's own words
 * (REASON_MAX, 500, the database's limit). The reason is optional.
 */
const DeclineReferralPopup: React.FC<{ open: boolean; clientLabel: string; fromName: string; busy: boolean; onClose: () => void; onDecline: (why: string | null) => void }> = ({
  open,
  clientLabel,
  fromName,
  busy,
  onClose,
  onDecline,
}) => {
  const [reason, setReason] = useState<ReferralDeclineReason | null>(null);
  const [other, setOther] = useState("");
  const [menu, setMenu] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);
  const fromFirst = firstName(fromName) || fromName;
  const needsWords = reason === "other" && !other.trim();
  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title={`Decline ${clientLabel}?`}
      icon={<UserX size={22} strokeWidth={2} aria-hidden />}
      body={reason ? `${fromName} sees your reason.` : `${fromName} is told you declined.`}
    >
      <div className="text-start">
        <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
          Reason (optional)
        </span>
        <button
          ref={setTrigger}
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu((m) => !m)}
          className="tap w-full flex items-center justify-between"
          style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${menu ? INK.pr : INK.b10}`, padding: "0 12px", gap: 8, fontSize: textPx(14), color: reason ? INK.ch : INK.chF }}
        >
          <span className="min-w-0 truncate">{reason ? REFERRAL_DECLINE_REASONS.find((r) => r.value === reason)?.label : "Choose a reason"}</span>
          {menu ? <ChevronUp size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} /> : <ChevronDown size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF }} />}
        </button>
        <PopupMenu
          open={menu}
          onClose={() => setMenu(false)}
          anchor={trigger}
          matchWidth={trigger}
          heading="Reason"
          options={REFERRAL_DECLINE_REASONS}
          selected={reason}
          onSelect={(v) => {
            setReason(v);
            setMenu(false);
          }}
        />
        {reason === "other" && (
          <div style={{ marginTop: 12 }}>
            <ProField label={`Tell ${fromFirst} why`} value={other} onChange={setOther} maxLength={REASON_MAX} note={`${fromFirst} sees this with the decline. Don't include health details.`} autoFocus />
          </div>
        )}
      </div>
      <div className="flex flex-col" style={{ gap: 8, marginTop: 20 }}>
        <CtaButton size="page" label="Decline referral" loading={busy} disabled={needsWords} onClick={() => onDecline(declineReasonText(reason, other))} />
        <CtaButton size="page" variant="secondary" label="Keep referral" onClick={onClose} disabled={busy} />
      </div>
    </CentredPopup>
  );
};

/** Send a referral to support (dispute_care_referral): a short reason, no health details. */
const DisputeSheet: React.FC<{ referral: Referral | null; onClose: () => void; onSend: (why: string) => void; busy: boolean }> = ({ referral, onClose, onSend, busy }) => {
  const id = useId();
  const [why, setWhy] = useState("");
  useEffect(() => {
    if (referral) setWhy("");
  }, [referral]);
  return (
    <BottomSheet open={!!referral} onClose={onClose} title="Ask support" footer={<CtaButton className="w-full" size="sheet" label="Send to support" loading={busy} disabled={!why.trim()} onClick={() => onSend(why)} />}>
      <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 10 }}>Centium support looks at what went wrong with this referral. Support sees both of you and the dates, never the client or the referral note.</p>
      <label htmlFor={id} className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
        What went wrong?
      </label>
      <textarea
        id={id}
        value={why}
        maxLength={REASON_MAX}
        rows={3}
        onChange={(e) => setWhy(e.target.value)}
        placeholder="Don't include health details"
        className="block w-full outline-none resize-none focus:border-primary placeholder:text-charcoal-faint"
        style={{ borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch, lineHeight: 1.45 }}
      />
    </BottomSheet>
  );
};

/** Add a colleague: listed professionals by name (public_professional_directory), then request_care_link. */
const AddColleagueSheet: React.FC<{ open: boolean; onClose: () => void; known: Set<string>; onAsk: (id: string, name: string | null) => void; busy: string | null }> = ({ open, onClose, known, onAsk, busy }) => {
  const { authUserId } = useApp();
  const [q, setQ] = useState("");
  const [list, setList] = useState<Colleague[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!open || !authUserId) return;
    let live = true;
    const t = window.setTimeout(() => {
      void searchColleagues(authUserId, q).then((r) => {
        if (!live) return;
        setFailed(!r.ok);
        setList(r.ok ? r.data : []);
      });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [open, q, authUserId]);
  const shown = (list ?? []).filter((c) => !known.has(c.id));
  return (
    <BottomSheet open={open} onClose={onClose} title="Add a colleague">
      <label className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8, marginBottom: 10 }}>
        <span className="sr-only">Search colleagues</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search colleagues" className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-charcoal-faint" style={{ fontSize: textPx(14), color: INK.ch }} />
      </label>
      {failed ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF }}>Couldn't search. Check your connection and try again.</p>
      ) : list === null ? (
        <ProCardSkeleton lines={3} />
      ) : shown.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, lineHeight: 1.5 }}>No listed professionals match. Only professionals listed on Centium can be found here.</p>
      ) : (
        <ListCard
          rows={shown.map((c) => ({
            key: c.id,
            icon: UserRound,
            title: c.name ?? "A professional",
            meta: [typeLabel(c.type), c.specialty].filter(Boolean).join(" · "),
            trailing: (
              <button type="button" disabled={!!busy} onClick={() => onAsk(c.id, c.name)} className="tap shrink-0 relative before:absolute before:-inset-3 before:content-['']" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, opacity: busy ? 0.5 : 1 }}>
                Ask to connect
              </button>
            ),
          }))}
        />
      )}
    </BottomSheet>
  );
};
