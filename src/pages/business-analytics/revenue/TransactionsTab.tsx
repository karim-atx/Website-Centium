import React, { useEffect, useState } from "react";
import { Check, ChevronDown, Download, Receipt, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  dMon,
  money,
  moneyCents,
  type TxFilter,
  type TxItem,
  type TxPill,
} from "../../../services/business-revenue";
import { useAnalytics } from "../analyticsContext";
import {
  Avatar,
  downloadCsv,
  ErrorLine,
  MoreRow,
  Pill,
  RCard,
  SecLabel,
  Skel,
  SoonChip,
  v,
  type PillTone,
} from "./kit";
import { REVENUE_BASE } from "./payModel";
import { useTransactions } from "./useTransactions";
import { t, tx as tctx } from "../../../i18n/core";
import { labelText } from "../../../services/business-revenue/model";

// Transactions (OURS-AN14-transactions; AnInsightsV3 sub "tx"): search,
// one filter (in flow under the row, OD-1), the list with Export CSV, five
// rows then "See all". Before Whish the Whish option is "Soon" and disabled
// and no row is ever "Failed" (cash cannot fail).
//
// B8 RV-01: the list is transactions_page (refunded and pending rows too,
// masked labels as given), with the search (first name, member number,
// amount, provider reference), the status and the method on the server
// (useTransactions). A partly refunded payment is "Part refunded" with the
// amount refunded in its line (RV-04). Before B8 (reader missing) the list is
// the records' one, searched here by who and item.

const TONE: Record<TxPill, PillTone> = {
  Paid: "good",
  Owed: "warn",
  Refunded: "soft",
  "Part refunded": "soft",
  Failed: "high",
  Void: "soft",
};

export const TransactionsTab: React.FC = () => {
  const { range } = useAnalytics();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  // The server search waits for a pause in typing.
  const [search, setSearch] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(q.trim()), 300);
    return () => window.clearTimeout(id);
  }, [q]);
  const [filter, setFilter] = useState<TxFilter>("all");
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const tx = useTransactions(range, filter, search, all);

  const counts = tx.counts;
  const FL: { k: TxFilter; t: string; soon?: boolean }[] = [
    { k: "all", t: t("All payments") },
    { k: "whish", t: "Whish", soon: true },
    { k: "cash", t: t("Cash") },
    { k: "issues", t: t("Owed, failed or refunded") },
  ];
  const needle = search;
  const shown = tx.items;
  const label =
    (needle
      ? t("Results") + " · "
      : filter === "all"
        ? t("Transactions") + " · "
        : FL.find((f) => f.k === filter)!.t + " · ") + tx.total;
  const none = !needle && filter === "all" && tx.total === 0;

  const subOf = (x: TxItem) => {
    const m = x.method === "whish" ? "Whish" : t("Cash");
    const refunded =
      x.status === "paid" && x.refunded > 0
        ? ` · ${t("{amount} refunded", { amount: moneyCents(x.refunded) })}`
        : "";
    if (x.undated) return `${labelText(x.label)} · ${t("bought {date}", { date: dMon(x.day) })} · ${m}`;
    return `${labelText(x.label)} · ${dMon(x.day)} · ${m}${refunded}`;
  };

  const exportCsv = async () => {
    const list = await tx.everything();
    if (!list) return;
    downloadCsv("centium-transactions.csv", [
      [t("Day"), t("Item"), tctx("Who", "payer"), t("Method"), t("Amount (USD)"), t("Refunded (USD)"), t("Status")],
      ...list.map((x) => [
        x.day,
        x.item,
        labelText(x.label),
        x.method === "whish" ? "Whish" : t("Cash"),
        x.amount,
        x.refunded,
        t(x.pill),
      ]),
    ]);
  };

  if (tx.error && !tx.items.length && !tx.live)
    return (
      <ErrorLine message={t("Couldn't load transactions.")} onRetry={tx.reload} />
    );
  if (tx.loading)
    return (
      <div role="status" aria-label={t("Loading")} className="mt-[16px]">
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
            placeholder={tx.live ? t("Search member or amount") : t("Search member or item")}
            aria-label={tx.live ? t("Search member or amount") : t("Search member or item")}
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
          aria-label={t("Filter")}
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
                className="tap w-full flex items-center gap-[8px] min-h-[44px] rounded-[8px] px-[10px] box-border text-start focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
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
        {!none && tx.total > 0 && (
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="tap min-h-[36px] flex items-center gap-[5px] text-[12px] font-extrabold whitespace-nowrap rounded-[10px] px-[6px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
            style={{ color: v("pdark") }}
          >
            <Download size={14} aria-hidden />
            {t("Export CSV")}
          </button>
        )}
      </div>
      <RCard>
        {shown.map((x, i) => (
          <button
            key={x.key}
            type="button"
            onClick={() =>
              navigate(
                `${REVENUE_BASE}/transactions/${encodeURIComponent(x.key)}`,
              )
            }
            className="tap w-full grid items-center text-start px-[16px] py-[12px] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
            style={{
              gridTemplateColumns: "34px minmax(0,1fr) auto",
              columnGap: 10,
              borderTop: i ? `1px solid ${v("divider")}` : "none",
            }}
          >
            <Avatar who={x.who} size={34} font={12} icon={16} />
            <span className="min-w-0">
              <span
                className="block text-[13px] font-extrabold leading-[17px] truncate"
                style={{ color: v("ink") }}
              >
                {x.item}
              </span>
              <span
                className="block text-[11px] leading-[15px] mt-[1px]"
                style={{ color: v("faint") }}
              >
                {subOf(x)}
              </span>
            </span>
            <span className="flex flex-col items-end gap-[4px]">
              <span
                className="text-[14px] font-extrabold whitespace-nowrap rv-num"
                style={{
                  color: x.status === "refunded" ? v("faint") : v("ink"),
                }}
              >
                {money(x.amount)}
              </span>
              <Pill tone={TONE[x.pill]}>{t(x.pill)}</Pill>
            </span>
          </button>
        ))}
        {!all && !needle && tx.total > 5 && (
          <MoreRow
            label={t("See all {n}", { n: tx.total })}
            onClick={() => setAll(true)}
            minH={48}
          />
        )}
        {(none || tx.total === 0) && (
          <div className="px-[20px] py-[24px] text-center">
            <span className="inline-flex" style={{ color: v("faint") }}>
              <Receipt size={22} aria-hidden />
            </span>
            <p
              className="text-[14px] font-extrabold mt-[6px]"
              style={{ color: v("ink") }}
            >
              {none ? t("No transactions yet") : t("No transactions match")}
            </p>
            <p
              className="text-[12px] leading-[17px] mt-[4px]"
              style={
                { color: v("faint"), textWrap: "pretty" } as React.CSSProperties
              }
            >
              {tx.denied
                ? t("Transactions show here for people with the Revenue permission.")
                : none
                  ? t("Revenue appears here once you record a payment. Cash today, Whish soon.")
                  : t("Try another search or filter.")}
            </p>
          </div>
        )}
      </RCard>
    </div>
  );
};
