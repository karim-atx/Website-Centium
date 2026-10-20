import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchThreads, type MessageThread } from "../../../services/messaging";
import { summarise, type Summary } from "./messagesModel";

export interface ProMessagesSummary extends Summary {
  loading: boolean;
}

/**
 * Release 3 · the More hero's numbers (MO1 v7 "5 unread / 2 new enquiries"
 * and the latest-message card), from the same my_conversations() read the
 * professional's Messages uses (fetchThreads, staff business threads merged
 * in) and the same tab rule (messagesModel). `latest` is the newest message
 * someone else sent in a client chat or an enquiry. Read once on mount; a
 * failed read reports nothing (hasAny false, no latest), never sample data.
 */
export function useProMessagesSummary(): ProMessagesSummary {
  const { authUserId, professionalClients } = useApp();
  const [threads, setThreads] = useState<MessageThread[] | null>(null);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchThreads().then((r) => {
      if (!cancelled) setThreads(r.ok ? r.threads : []);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);
  const clientIds = useMemo(() => new Set(professionalClients.map((c) => c.clientId).filter((x): x is string => !!x)), [professionalClients]);
  return useMemo(() => {
    if (!threads) return { loading: !!authUserId, unread: 0, newEnquiries: 0, latest: null, hasAny: false };
    return { loading: false, ...summarise(threads, clientIds, authUserId) };
  }, [threads, clientIds, authUserId]);
}
