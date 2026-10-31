import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { fetchBusinessPeople, type BusinessPerson } from "../../../services/business-members";
import { fetchCustomerOrders } from "../../../services/store/orders";
import { dayWord } from "../../../services/store/format";
import { useAnalytics } from "../analyticsContext";
import { rangeWords } from "../analyticsRange";
import { AnAvatar, AnCard, AnEmptyCard, AnHeaderRow, AnHint, AnIndexRow, AnIndexSkeleton, AnListRow, AnStrip } from "./anKit";
import { customersIndex, topCustomers, type CustomerOrder } from "./customersModel";
import { appLocale } from "../../../i18n/format";

// AN4-045 row 13 · Analytics › Customers for a Store (B11): who is a
// customer is business_people(…, 'customers') (everyone who has ordered,
// with the server's label: "Member #NNNN" unless the name is shared); the
// counts are B11 store_orders, read with `store` (RLS returns nothing
// without it, so the counts read "–" then, never 0). Rows open the Top
// customers list (the "See all list inside the Customers page").

const BASE = "/app/business/analytics/members";

interface CustomersData {
  loading: boolean;
  error: boolean;
  /** business_people 'customers' is not on this database (B11 pending). */
  pending: boolean;
  people: BusinessPerson[];
  total: number;
  /** null = not readable by this seat (no `store`) or not loaded. */
  orders: CustomerOrder[] | null;
  reload: () => void;
}

function useStoreCustomers(businessId: string | null): CustomersData {
  const access = useConsoleAccess();
  const canStore = access.ready && access.meets("store");
  const [state, setState] = useState<Omit<CustomersData, "reload">>({ loading: true, error: false, pending: false, people: [], total: 0, orders: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!businessId || !access.ready) return;
    let alive = true;
    void Promise.all([fetchBusinessPeople(businessId, { segment: "customers", limit: 200 }), canStore ? fetchCustomerOrders(businessId) : Promise.resolve(null)]).then(([p, o]) => {
      if (!alive) return;
      if (!p.ok) {
        setState((s) => ({ ...s, loading: false, error: !p.pending, pending: p.pending }));
        return;
      }
      setState({ loading: false, error: false, pending: false, people: p.people, total: p.total, orders: o && o.status === "ok" ? o.value : null });
    });
    return () => {
      alive = false;
    };
  }, [businessId, access.ready, canStore, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

const NO_CUSTOMERS = { title: "No customers yet", body: "Customers appear here once your first orders come in." };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function StoreCustomersIndex({ businessId }: { businessId: string | null }) {
  const navigate = useNavigate();
  const online = useOnline();
  const { range } = useAnalytics();
  const d = useStoreCustomers(businessId);
  const idx = useMemo(() => (d.orders ? customersIndex(d.orders, range) : null), [d.orders, range]);

  if (d.loading) {
    return (
      <AnCard label="Customers sections">
        <AnIndexSkeleton rows={3} />
      </AnCard>
    );
  }
  if (d.pending || (!d.error && d.total === 0)) return <AnEmptyCard icon={ShoppingBag} title={NO_CUSTOMERS.title} body={NO_CUSTOMERS.body} />;

  const open = () => navigate(`${BASE}/customers`);
  const inRangeLead = idx
    ? range.key === "week"
      ? `${plural(idx.inRange, "customer", "customers")} ordered this week.`
      : `${plural(idx.inRange, "customer", "customers")} ordered in ${rangeWords(range)}.`
    : "Who ordered in this range.";
  const rows = [
    { title: "Customers", value: idx ? idx.inRange.toLocaleString(appLocale()) : null, lead: inRangeLead },
    {
      title: "Ordered again",
      value: idx?.orderedAgainPct != null ? `${idx.orderedAgainPct}%` : null,
      lead: idx?.orderedAgainPct != null ? `${idx.orderedAgainPct}% of customers ordered more than once.` : "Shows after your first 10 orders.",
    },
    {
      title: "New this week",
      value: idx ? idx.newThisWeek.toLocaleString(appLocale()) : null,
      lead: idx ? `${plural(idx.newThisWeek, "customer", "customers")} placed their first order this week.` : "Customers whose first order was this week.",
    },
  ];

  return (
    <div>
      {d.error && <AnStrip offline={!online} text={online ? "Couldn't load your customers. Check your connection and try again." : "You're offline. Showing customers as of your last visit."} onRetry={d.reload} />}
      <AnCard label="Customers sections">
        {rows.map((r, i) => (
          <AnIndexRow key={r.title} first={i === 0} title={r.title} lead={r.lead} value={r.value} onClick={open} ariaLabel={`${r.title}: ${r.value ?? "not known yet"}`} />
        ))}
      </AnCard>
      <AnHint>Tap a section to open its page.</AnHint>
    </div>
  );
}

export function TopCustomersPage({ businessId }: { businessId: string | null }) {
  const navigate = useNavigate();
  const online = useOnline();
  const d = useStoreCustomers(businessId);
  const byId = useMemo(() => new Map(d.people.map((p) => [p.personId, p])), [d.people]);
  const top = useMemo(() => (d.orders ? topCustomers(d.orders) : null), [d.orders]);

  // With the orders: ranked by orders. Without (no `store`): the people as the server lists them.
  const list: { person: BusinessPerson; fact: string }[] = top
    ? top.flatMap((t) => {
        const person = byId.get(t.customerId);
        return person ? [{ person, fact: `${plural(t.orders, "order", "orders")} · last ${dayWord(t.lastAt)}` }] : [];
      })
    : d.people.map((person) => ({ person, fact: person.lastSeen ? `Last order ${dayWord(person.lastSeen)}` : "" }));

  return (
    <div>
      <AnHeaderRow crumb="Customers" backLabel="Back to Customers" onBack={() => navigate(BASE)} title="Top customers" />
      {d.error && <AnStrip offline={!online} text={online ? "Couldn't load your customers. Check your connection and try again." : "You're offline. Showing customers as of your last visit."} onRetry={d.reload} />}
      {d.loading ? (
        <AnCard label="Top customers">
          <AnIndexSkeleton rows={3} />
        </AnCard>
      ) : d.pending || list.length === 0 ? (
        <AnEmptyCard icon={ShoppingBag} title={NO_CUSTOMERS.title} body={NO_CUSTOMERS.body} />
      ) : (
        <AnCard label="Top customers" className="px-[16px]">
          {list.map(({ person, fact }, i) => (
            <AnListRow
              key={person.personId}
              first={i === 0}
              avatar={<AnAvatar masked={!person.nameIsShared} initial={person.label.slice(0, 1).toUpperCase()} index={i} />}
              name={person.label}
              nameExtra={person.isMinor ? <span className="text-[11px] font-bold text-charcoal-faint">Under 18</span> : undefined}
              fact={fact || undefined}
            />
          ))}
        </AnCard>
      )}
    </div>
  );
}
