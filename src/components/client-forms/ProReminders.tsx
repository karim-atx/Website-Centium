import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RotateCw } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { usePoll } from "../../hooks/usePoll";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { Toast } from "../ui/Toast";
import { clock12 } from "../../utils/time12";
import { fetchMyAcceptedReferrals, fetchMyOpenForms, fetchMyPendingReferrals, fetchTodaySessions, type ClientFormBundle } from "../../services/client-forms";
import {
  connectBody,
  connectReminder,
  connectTitle,
  formReminder,
  groupReminders,
  popupQueue,
  referralBody,
  referralTitle,
  referralReminder,
  sessionReminder,
  shareReminder,
  visibleQuestions,
  type ConnectReferral,
  type PendingReferral,
  type Reminder,
  type TodaySession,
} from "../../services/client-forms/logic";
import { ReminderCard } from "./ReminderCard";
import { ReminderPopup } from "./ReminderPopup";
import { FormSheet } from "./FormSheet";
import { ConnectReferralSheet, ReferralSheet } from "./ReferralSheet";
import { WinPermissionPopup } from "../share/client/WinPermissionPopup";
import { answerToast, sharedTitle } from "../share/client/sharingText";
import { specFromPayload } from "../share/shareCardModel";
import { fetchMyPendingShareRequests, type ShareRequest } from "../../services/share";
import { fetchProfessionalHandles, fetchProSummaries } from "../../services/share/client";

/**
 * Release 3 · W7 CU5 / CU6 / CU23 / CU26 on Home, an addition between the
 * date pill and the streak board: what the client's professionals are
 * waiting on (check-ins and intakes, care referrals, today's sessions), as
 * one card per professional, and the CU23 pop-up queue (at most 2 per app
 * open: a session starting within the hour first, then anything that needs
 * an answer). Nothing renders for a client with nothing waiting.
 * Release A: an accepted referral is one more level-2 item ("{pro} accepted
 * {referrer}'s referral", Review opens ConnectReferralSheet), because
 * accepting no longer connects anybody.
 */

/** Pop-ups already shown in this app open (module scope: cleared by a reload). */
const shownThisOpen = new Set<string>();

const ACK_KEY = "centium:pro-reminders:ack";
function readAck(): Set<string> {
  try {
    const raw = window.localStorage.getItem(ACK_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
function addAck(key: string) {
  try {
    const list = [...readAck(), key].slice(-50);
    window.localStorage.setItem(ACK_KEY, JSON.stringify(list));
  } catch {
    // Storage blocked: the pop-up may show again next open, nothing more.
  }
}

/** Release 3 · W8 CU29: a pending ask to share a win, with the professional's first name. */
interface ShareAsk {
  request: ShareRequest;
  proName: string;
  proAvatarUrl: string | null;
  /** professional_handle(); null: the preview has no handle line, link or QR. */
  proHandle: string | null;
  winTitle: string;
}

/** Pending share requests; a failed read is an empty list, so the reminders above it keep working. */
async function fetchShareAsks(me: string): Promise<ShareAsk[] | null> {
  const r = await fetchMyPendingShareRequests(me);
  if (!r.ok) return null;
  const ids = r.data.map((x) => x.professionalId);
  const [names, handles] = await Promise.all([fetchProSummaries(ids), fetchProfessionalHandles(ids)]);
  return r.data.map((request) => {
    const proName = names.get(request.professionalId)?.firstName ?? "Your professional";
    const card = specFromPayload(request.card, proName);
    return { request, proName, proAvatarUrl: names.get(request.professionalId)?.avatarUrl ?? null, proHandle: handles.get(request.professionalId) ?? null, winTitle: card ? sharedTitle(card.spec) : "" };
  });
}

const toShareReminder = (s: ShareAsk) => shareReminder({ id: s.request.id, proId: s.request.professionalId, proName: s.proName, createdAt: s.request.createdAt, winTitle: s.winTitle });

interface Data {
  forms: ClientFormBundle[];
  referrals: PendingReferral[];
  /** Release A: accepted referrals waiting for the client to connect (connect_from_referral). */
  connects: ConnectReferral[];
  sessions: TodaySession[];
  shares: ShareAsk[];
}

type Status = "loading" | "ready" | "error" | "offline";

const POLL_MS = 60000;

export const ProReminders: React.FC = () => {
  const { authUserId, recoverySensitive, recoveryModePending, myTimezone } = useApp();
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [now, setNow] = useState(() => new Date());
  const [formOpen, setFormOpen] = useState<ClientFormBundle | null>(null);
  const [referralOpen, setReferralOpen] = useState<PendingReferral | null>(null);
  const [connectOpen, setConnectOpen] = useState<ConnectReferral | null>(null);
  const [queue, setQueue] = useState<Reminder[] | null>(null);
  const [handled, setHandled] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  // CU29 reopened from the Home card ("Review"): the request id.
  const [shareOpen, setShareOpen] = useState<string | null>(null);

  const hideBody = recoverySensitive || recoveryModePending;

  const queued = useRef(false);
  const load = useCallback(async () => {
    if (!authUserId) return;
    const at = new Date();
    const [f, r, s, sh, cn] = await Promise.all([fetchMyOpenForms(authUserId), fetchMyPendingReferrals(authUserId), fetchTodaySessions(authUserId, at), fetchShareAsks(authUserId), fetchMyAcceptedReferrals(authUserId)]);
    // Release A: a failed read of the connect step keeps what was there, like the share asks.
    const connects = cn.ok ? cn.data : null;
    setNow(at);
    if (!f.ok || !r.ok || !s.ok) {
      const offline = (!f.ok && f.offline) || (!r.ok && r.offline) || (!s.ok && s.offline);
      // Keep what was there; only a first load shows the error row.
      setStatus((prev) => (prev === "ready" ? prev : offline ? "offline" : "error"));
      return;
    }
    setData((prev) => ({ forms: f.data, referrals: r.data, connects: connects ?? prev?.connects ?? [], sessions: s.data, shares: sh ?? prev?.shares ?? [] }));
    setStatus("ready");
    // The pop-up queue is set once, from what was waiting when Home opened.
    if (!queued.current) {
      queued.current = true;
      const candidates = [...s.data.map((x) => sessionReminder(x, at)).filter((x): x is Reminder => !!x), ...r.data.map(referralReminder), ...(connects ?? []).map(connectReminder), ...(sh ?? []).map(toShareReminder)];
      const q = popupQueue(candidates, shownThisOpen, readAck());
      q.forEach((x) => shownThisOpen.add(x.key));
      setQueue(q);
    }
  }, [authUserId]);

  useEffect(() => {
    void load();
  }, [load]);
  usePoll(() => void load(), POLL_MS, !!authUserId && !formOpen);

  const reminders = useMemo<Reminder[]>(() => {
    if (!data) return [];
    const forms = data.forms.map((f) => formReminder({ ...f, questions: visibleQuestions(f.questions, hideBody) }, now));
    const refs = [...data.referrals.map(referralReminder), ...data.connects.map(connectReminder)];
    const sess = data.sessions.map((s) => sessionReminder(s, now)).filter((x): x is Reminder => !!x);
    const shares = data.shares.map(toShareReminder);
    return [...sess, ...refs, ...shares, ...forms];
  }, [data, hideBody, now]);

  const groups = useMemo(() => groupReminders(reminders), [reminders]);
  const avatars = useMemo(() => {
    const m = new Map<string, string | null>((data?.shares ?? []).map((x) => [x.request.professionalId, x.proAvatarUrl]));
    for (const f of data?.forms ?? []) m.set(f.proId, f.proAvatarUrl);
    return m;
  }, [data]);

  const formByKey = (key: string) => data?.forms.find((f) => `form:${f.assignmentId}` === key) ?? null;
  const referralByKey = (key: string) => data?.referrals.find((r) => `referral:${r.id}` === key) ?? null;
  const connectByKey = (key: string) => data?.connects.find((r) => `connect:${r.id}` === key) ?? null;
  const sessionByKey = (key: string) => data?.sessions.find((s) => `session:${s.id}` === key) ?? null;
  const shareByKey = (key: string) => data?.shares.find((s) => `share:${s.request.id}` === key) ?? null;
  const waiting = (r: Reminder) => (r.kind === "session" ? !!sessionByKey(r.key) : r.kind === "share_request" ? !!shareByKey(r.key) : r.kind === "referral_connect" ? !!connectByKey(r.key) : !!referralByKey(r.key));

  // The next pop-up: queued, not handled, and still waiting (answered elsewhere drops out).
  const live = (queue ?? []).filter((r) => !handled.includes(r.key) && waiting(r));
  const current = live[0] ?? null;
  const qi = current && queue ? queue.indexOf(current) : 0;
  const advance = (note?: string) => {
    const next = live[1];
    if (note) setToast(next ? `${note} One more from ${next.proName}.` : note);
    if (current) setHandled((h) => [...h, current.key]);
  };

  const act = (r: Reminder) => {
    if (r.kind === "session") {
      navigate("/app/calendar");
      return;
    }
    if (r.kind === "referral") {
      setReferralOpen(referralByKey(r.key));
      return;
    }
    if (r.kind === "referral_connect") {
      setConnectOpen(connectByKey(r.key));
      return;
    }
    if (r.kind === "share_request") {
      const sa = shareByKey(r.key);
      if (sa) setShareOpen(sa.request.id);
      return;
    }
    const f = formByKey(r.key);
    if (f) setFormOpen(f);
  };

  // CU29: an answered (or already gone) request leaves the card and the queue at once.
  const dropShare = (id: string) => {
    setData((prev) => (prev ? { ...prev, shares: prev.shares.filter((x) => x.request.id !== id) } : prev));
    setHandled((h) => [...h, `share:${id}`]);
    void load();
  };
  const queuedShare = current && queue && current.kind === "share_request" && !formOpen && !referralOpen && !connectOpen && !shareOpen ? shareByKey(current.key) : null;
  const reopenedShare = shareOpen ? (data?.shares.find((x) => x.request.id === shareOpen) ?? null) : null;
  const sharePopup = (sa: ShareAsk, index: number, count: number, close: () => void) => (
    <WinPermissionPopup
      key={sa.request.id}
      open
      index={index}
      count={count}
      request={sa.request}
      proName={sa.proName}
      proAvatarUrl={sa.proAvatarUrl}
      proHandle={sa.proHandle}
      onAnswered={(a) => {
        close();
        setToast(answerToast(a));
        dropShare(sa.request.id);
      }}
      onGone={() => {
        close();
        setToast("This request was already answered.");
        dropShare(sa.request.id);
      }}
      onDismiss={close}
    />
  );

  const popupProps = (() => {
    if (!current || !queue || formOpen || referralOpen || connectOpen || shareOpen || current.kind === "share_request") return null;
    const common = { index: qi, count: queue.length, kind: current.kind, tone: current.tone, proName: current.proName, proAvatarUrl: avatars.get(current.proId) ?? null };
    if (current.kind === "session") {
      const s = sessionByKey(current.key);
      return {
        ...common,
        title: current.title,
        body: s ? `${s.serviceName} · Today ${clock12(s.startsAt)}.` : current.detail,
        primary: {
          label: "Got it",
          onClick: () => {
            addAck(current.key);
            advance("Session noted.");
          },
        },
        secondary: {
          label: "View",
          onClick: () => {
            addAck(current.key);
            advance();
            navigate("/app/calendar");
          },
        },
        onDismiss: () => advance(),
      };
    }
    if (current.kind === "referral") {
      const ref = referralByKey(current.key);
      if (!ref) return null;
      return {
        ...common,
        title: referralTitle(ref),
        body: referralBody(ref),
        primary: {
          label: "Review",
          onClick: () => {
            advance();
            setReferralOpen(ref);
          },
        },
        secondary: { label: "Not now", onClick: () => advance() },
        onDismiss: () => advance(),
      };
    }
    if (current.kind === "referral_connect") {
      const c = connectByKey(current.key);
      if (!c) return null;
      return {
        ...common,
        title: connectTitle(c),
        body: connectBody(c),
        primary: {
          label: "Review",
          onClick: () => {
            advance();
            setConnectOpen(c);
          },
        },
        secondary: { label: "Not now", onClick: () => advance() },
        onDismiss: () => advance(),
      };
    }
    return null;
  })();

  return (
    <>
      {(status === "error" || status === "offline") && (
        <div className="flex items-center animate-fade-slide-up" style={{ gap: 10, borderRadius: 16, background: INK.soft, padding: "6px 6px 6px 14px", marginBottom: 13 }}>
          <p className="flex-1 min-w-0" style={{ fontSize: textPx(12), lineHeight: 1.45, color: INK.chS }}>
            {status === "offline" ? "You're offline. Updates from your professional show when you're back online." : "Couldn't load updates from your professional."}
          </p>
          <button type="button" onClick={() => void load()} className="tap inline-flex items-center justify-center shrink-0" style={{ minHeight: 44, padding: "0 12px", gap: 5, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}>
            <RotateCw size={13} strokeWidth={2.2} aria-hidden />
            Retry
          </button>
        </div>
      )}

      {groups.map((g) => (
        <ReminderCard key={g.proId} group={g} proAvatarUrl={avatars.get(g.proId) ?? null} onAction={act} />
      ))}

      {popupProps && <ReminderPopup open {...popupProps} />}
      {queuedShare && queue && sharePopup(queuedShare, qi, queue.length, () => advance())}
      {reopenedShare && sharePopup(reopenedShare, 0, 1, () => setShareOpen(null))}

      <FormSheet
        open={!!formOpen}
        bundle={formOpen}
        me={authUserId ?? ""}
        hideBody={hideBody}
        timezone={myTimezone?.timezone ?? null}
        onClose={(changed) => {
          setFormOpen(null);
          if (changed) void load();
        }}
      />

      <ReferralSheet
        key={referralOpen?.id ?? "none"}
        referral={referralOpen}
        onClose={() => setReferralOpen(null)}
        onAnswered={(agree) => {
          const from = referralOpen?.fromName ?? "";
          setReferralOpen(null);
          setToast(agree ? `Thanks. ${from}'s referral is on its way.` : "Referral declined.");
          void load();
        }}
      />

      <ConnectReferralSheet
        key={connectOpen ? `connect-${connectOpen.id}` : "connect-none"}
        referral={connectOpen}
        onClose={() => setConnectOpen(null)}
        onConnected={() => {
          const to = connectOpen?.toName;
          const id = connectOpen?.id;
          setConnectOpen(null);
          setToast(to ? `You're connected with ${to}.` : "You're connected.");
          setData((prev) => (prev ? { ...prev, connects: prev.connects.filter((x) => x.id !== id) } : prev));
          void load();
        }}
      />

      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};
