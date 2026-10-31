import { useCallback, useEffect, useRef, useState } from "react";
import { typeLabel } from "../../../pages/marketplace/venueTypes";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { fetchMyEmployments, type MyEmployment } from "../../../services/business-team/employment";
import { fetchBusinessFacts, fetchJoinRequests, fetchMyClasses, type BusinessFacts, type JoinRequest, type MyClass } from "../../../services/pro/businesses";
import { localIso } from "../../../services/pro/home";
import { time12 } from "../../../utils/time12";
import { formatShortDate } from "../../../utils/date";
import { loadConsoleAccess } from "../../../services/business-console";
import { appLocale } from "../../../i18n/format";

export interface BusinessesData {
  employments: MyEmployment[];
  requests: JoinRequest[];
  facts: Record<string, BusinessFacts>;
  /** My classes from the first of last month on (this month's count, its delta, and what's next). */
  classes: MyClass[];
}

/**
 * Release 3 · the data behind Businesses (MO9) and a business's page (MO13):
 * my_business_employments (connected and invitations), my join requests
 * (pending and declined, 90 days), the businesses' public facts, and the
 * classes they assigned to me. A failed first read is an error with Retry;
 * offline after a good read keeps it, with the offline line.
 */
export function useBusinesses(): {
  data: BusinessesData | null;
  failed: boolean;
  offline: boolean;
  reload: () => void;
} {
  const { authUserId } = useApp();
  const online = useOnline();
  const [data, setData] = useState<BusinessesData | null>(null);
  const [failed, setFailed] = useState(false);
  const [epoch, setEpoch] = useState(0);
  const reload = useCallback(() => setEpoch((e) => e + 1), []);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    const now = new Date();
    const since = localIso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90));
    const lastMonth = localIso(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    void (async () => {
      const [emp, req, cls, access] = await Promise.all([fetchMyEmployments(), fetchJoinRequests(authUserId, since), fetchMyClasses(authUserId, lastMonth), loadConsoleAccess(authUserId)]);
      if (cancelled) return;
      if (!emp.ok) {
        setFailed(true);
        return;
      }
      const owned = access.ok ? access.value.seats.filter((s) => s.isOwner).map((s) => s.businessId) : [];
      const ids = [...new Set([...emp.value.map((e) => e.businessId), ...owned, ...(cls.ok ? cls.data.map((c) => c.businessId) : [])])];
      const facts = await fetchBusinessFacts(ids);
      if (cancelled) return;
      setFailed(false);
      setData({ employments: emp.value, requests: req.ok ? req.data : [], facts, classes: cls.ok ? cls.data : [] });
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, epoch]);

  // Back online: read again.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) reload();
    wasOnline.current = online;
  }, [online, reload]);

  return { data, failed: failed && !data, offline: !online && !!data, reload };
}

/** "Gym · Beirut": the business type as a word and its location. */
export function typeLine(f: BusinessFacts | undefined): string {
  if (!f) return "";
  const type = f.type ? typeLabel(f.type) : null;
  return [type, f.location].filter(Boolean).join(" · ");
}

/** "Thu 5:30 PM": a class's weekday and 12-hour start. */
export const classWhen = (c: MyClass) => `${new Date(`${c.date}T00:00:00`).toLocaleDateString(appLocale("en-GB"), { weekday: "short" })} ${time12(c.startTime)}`;
/** "Jun 2026". */
export const monthYear = (iso: string) => formatShortDate(new Date(iso), { month: "short", year: "numeric" });

export const ROLE_NAME: Record<string, string> = {
  instructor: "Instructor",
  trainer: "Personal trainer",
  front_desk: "Front desk",
  manager: "Manager",
  staff: "Staff",
  shop_assistant: "Shop assistant",
};

