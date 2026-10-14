import React, { useMemo, useState } from "react";
import { Check, ChevronDown, Download, Receipt, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  dMon,
  money,
  transactions as txOf,
  type TxRow,
  type TxStatus,
} from "../../../services/business-revenue";
import { useAnalytics } from "../analyticsContext";
import {
  Avatar,
  downloadCsv,
  MoreRow,
  Pill,
  RCard,
  SecLabel,
  Skel,
  SoonChip,
  v,
  whoOf,
  type PillTone,
} from "./kit";
import { REVENUE_BASE } from "./payModel";
import { useRevenue } from "./revenueContext";

// Transactions (OURS-AN14-transactions; AnInsightsV3 sub "tx"): search,
// one filter (in flow under the row, OD-1), the list with Export CSV, five
// rows then "See all". Before Whish the Whish option is "Soon" and disabled
// and no row is ever "Failed" (cash cannot fail).

type Filter = "all" | "whish" | "cash" | "issues";
const TONE: Record<TxStatus, PillTone> = {
  Paid: "good",
  Owed: "warn",
  Refunded: "soft",
};

export const TransactionsTab: React.FC = () => {
  const { range } = useAnalytics();
  const { data, loading } = useRevenue();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);

  const rows = useMemo(() => txOf(data?.records ?? [], range), [data, range]);
  const counts = {
    all: rows.length,
    whish: rows.filter((t) => t.rec.method === "whish").length,
    cash: rows.filter((t) => t.rec.method === "cash").length,
    issues: rows.filter((t) => t.status !== "Paid").length,
  };
  const FL: { k: Filter; t: string; soon?: boolean }[] = [
    { k: "all", t: "All payments" },
    { k: "whish", t: "Whish", soon: true },
    { k: "cash", t: "Cash" },
    { k: "issues", t: "Owed, failed or refunded" },
  ];
  const needle = q.trim().toLowerCase();
  const list = rows.filter(
    (t) =>
      (filter === "all" ||
        (filter === "whish" && t.rec.method === "whish") ||
        (filter === "cash" && t.rec.method === "cash") ||
        (filter === "issues" && t.status !== "Paid")) &&
      (!needle ||
        (whoOf(t.rec) + " " + t.rec.item).toLowerCase().includes(needle)),
  );
  const shown = all ? list : list.slice(0, 5);
  const label =
    (needle
      ? "Results · "
      : filter === "all"
        ? "Transactions · "
        : FL.find((f) => f.k === filter)!.t + " · ") + list.length;
  const none = rows.length === 0;

  const subOf = (t: TxRow) => {
    const m = t.rec.method === "whish" ? "Whish" : "Cash";
    if (t.rec.paidUndated)
      return `${whoOf(t.rec)} · bought ${dMon(t.day)} · ${m}`;
    return `${whoOf(t.rec)} · ${dMon(t.day)} · ${m}`;
  };

  const exportCsv = () =>
    downloadCsv("centium-transactions.csv", [
      ["Day", "Item", "Who", "Method", "Amount (USD)", "Status"],
      ...list.map((t) => [
        t.day,
        t.rec.item,
        whoOf(t.rec),
        t.rec.method === "whish" ? "Whish" : "Cash",
        t.rec.amount ?? null,
        t.status,
      ]),
    ]);

  if (loading && !data)
    return (
      <div role="status" aria-label="Loading" className="mt-[16px]">
        <Skel h={44} r={14} />
        <RCard className="mt-[48px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="px-[16px] py-[12px] flex gap-[10px] items-center"
              style={{ borderTop: i ? `1px solid ${v("divider")}` : "none" }}
            >
              <Skel h={34} r={999} className="w-[34px]" />
              <Skel h={28} className="flex-1" />
            </div>
          ))}
        </RCard>
      </div>
    );

  return (
    <div>
      <div className="flex gap-[8px] mt-[16px]">
        <label
          className="flex-1 min-w-0 h-[44px] rounded-[14px] flex items-center gap-[8px] px-[12px]"
          style={{
            background: v("card"),
            border: `1px solid ${q ? v("primary") : v("border")}`,
          }}
        >
          <Search size={15} aria-hidden style={{ color: v("faint") }} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search member or item"
            aria-label="Search member or item"
            className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-charcoal-faint"
            style={{ color: v("ink") }}
          />
        </label>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="tap h-[44px] px-[12px] rounded-[14px] flex items-center gap-[6px] text-[12.5px] font-extrabold whitespace-nowrap focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
          style={{
            background: filter !== "all" ? v("pale") : v("card"),
            border: `1px solid ${filter !== "all" || open ? v("primary") : v("border")}`,
            color: filter !== "all" ? v("pdark") : v("ink"),
          }}
        >
          {FL.find((f) => f.k === filter)!.t}
          <ChevronDown size={14} aria-hidden />
        </button>
      </div>
      {open && (
        <div
          role="listbox"
          aria-label="Filter"
          className="mt-[8px] rounded-[14px] p-[8px]"
          style={{
            border: `1px solid ${v("menu-border")}`,
            background: v("card"),
            boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
          }}
        >
          {FL.map((f, i) => {
            const sel = f.k === filter;
            return (
              <button
                key={f.k}
                type="button"
                role="option"
                aria-selected={sel}
                aria-disabled={f.soon || undefined}
                onClick={() => {
                  if (f.soon) return;
                  setFilter(f.k);
                  setOpen(false);
                  setAll(false);
                }}
                className="tap w-full flex items-center gap-[8px] min-h-[44px] rounded-[8px] px-[10px] box-border text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
                style={{
                  marginTop: i ? 6 : 0,
                  border: `1px solid ${sel ? v("primary") : v("option")}`,
                  background: sel ? v("pale") : v("raised"),
                  opacity: f.soon ? 0.55 : 1,
                }}
              >
                <span
                  className="flex-1 text-[13px]"
                  style={{
                    color: sel ? v("pdark") : v("ink"),
                    fontWeight: sel ? 800 : 600,
                  }}
                >
                  {f.t}
                </span>
                {f.soon ? (
                  <SoonChip />
                ) : (
                  <span
                    className="text-[11px] font-bold"
                    style={{ color: v("faint") }}
                  >
                    {counts[f.k]}
                  </span>
                )}
                {sel && (
                  <Check
                    size={15}
                    strokeWidth={2.6}
                    aria-hidden
                    style={{ color: v("pdark") }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-[12px] mt-[20px] mx-[4px] mb-[8px]">
        <SecLabel className="!m-0">{label}</SecLabel>
        {!none && list.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="tap min-h-[36px] flex items-center gap-[5px] text-[12px] font-extrabold whitespace-nowrap rounded-[10px] px-[6px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
            style={{ color: v("pdark") }}
          >
            <Download size={14} aria-hidden />
            Export CSV
          </button>
        )}
      </div>
      <RCard>
        {shown.map((t, i) => (
          <button
            key={t.rec.key}
            type="button"
            onClick={() =>
              navigate(
                `${REVENUE_BASE}/transactions/${encodeURIComponent(t.rec.key)}`,
              )
            }
            className="tap w-full grid items-center text-left px-[16px] py-[12px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
            style={{
              gridTemplateColumns: "34px minmax(0,1fr) auto",
              columnGap: 10,
              borderTop: i ? `1px solid ${v("divider")}` : "none",
            }}
          >
            <Avatar who={t.rec.who} size={34} font={12} icon={16} />
            <span className="min-w-0">
              <span
                className="block text-[13px] font-extrabold leading-[17px] truncate"
                style={{ color: v("ink") }}
              >
                {t.rec.item}
              </span>
              <span
                className="block text-[11px] leading-[15px] mt-[1px]"
                style={{ color: v("faint") }}
              >
                {subOf(t)}
              </span>
            </span>
            <span className="flex flex-col items-end gap-[4px]">
              <span
                className="text-[14px] font-extrabold whitespace-nowrap rv-num"
                style={{
                  color: t.status === "Refunded" ? v("faint") : v("ink"),
                }}
              >
                {money(t.rec.amount ?? 0)}
              </span>
              <Pill tone={TONE[t.status]}>{t.status}</Pill>
            </span>
          </button>
        ))}
        {!all && !needle && list.length > 5 && (
          <MoreRow
            label={`See all ${list.length}`}
            onClick={() => setAll(true)}
            minH={48}
          />
        )}
        {(none || list.length === 0) && (
          <div className="px-[20px] py-[24px] text-center">
            <span className="inline-flex" style={{ color: v("faint") }}>
              <Receipt size={22} aria-hidden />
            </span>
            <p
              className="text-[14px] font-extrabold mt-[6px]"
              style={{ color: v("ink") }}
            >
              {none ? "No transactions yet" : "No transactions match"}
            </p>
            <p
              className="text-[12px] leading-[17px] mt-[4px]"
              style={
                { color: v("faint"), textWrap: "pretty" } as React.CSSProperties
              }
            >
              {none
                ? "Revenue appears here once you record a payment. Cash today, Whish soon."
                : "Try another search or filter."}
            </p>
          </div>
        )}
      </RCard>
    </div>
  );
};
