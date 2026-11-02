import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { BackHeader, MasterSheet, PrimaryButton, SoonNote } from "../listingParts";
import { HIRING_ERROR_TEXT, searchProfessionals, sendHireOffer, type BusyTime, type ProCard } from "../../../services/hiring";
import { HIRING_ROUTES } from "./HiringRoutes";
import { useHiringBusiness } from "./useHiringBusiness";
import { BusyWarning, FeeNoticeRow, HiredLine, HiringEmpty, PersonHead, UserPlusGlyph, feeNoticeText, fixedPair, useFeeRules, useHiringRead, useHiringStrip } from "./hiringParts";
import { OpeningFormFields, useLiveClasses } from "./PostOpeningSheet";
import HireConfirmDialog, { type DialogNote, type HireOffer } from "./HireConfirmDialog";
import { busyText, emptyForm, hiredLine, parseForm, sentStrip, type OpeningFormState, type ParsedForm } from "./hubModel";
import { t, tx } from "../../../i18n/core";

// Market + Share 3.0 · W4 · B-MA.8.6 Find a professional / direct offer
// (Business Hiring Screens `srch`, `dOffer`, `dConfirm`, `dSent`; markup
// lines 134–155), back header "Hiring / Find a professional", padding 0 16 32:
//   the search field: 48 tall, radius 14, 1.5px --fill, padding 0 14, gap
//     10; the 17 search glyph --faint, the query 14 / 600, the 16 clear X;
//   the line "Ranked by Centium work history, reviews and distance. Only
//     professionals open to gym work show here." (margin-top 10, 11.5 / 16
//     --faint);
//   ranked results (margin-top 12, gap 10): radius 20, --card, 1px --border
//     (1.5px #5A859E once offered), padding 14 16; the person row with its
//     rank; the footer row (margin-top 10, space-between, gap 10): the hired
//     line and "Send offer" (36 tall, padding 0 14, radius 11, --fill /
//     --onfill 12.5 / 800), "Offered" (#EBF2F4 / #5A859E) after sending;
//   the offer sheet "Offer to {name}" (the person row, Type, Role title,
//     Classes, Pay, Classes a month, Starts; the fee notice over "Review offer")
//     → HireConfirmDialog "Send this offer?" → strip "Offer sent to {name}.
//     {First} accepts in Opportunities." (View).
// search_professionals (Database Release 2) lists only professionals open to
// gym work, ranked by the server: Centium hires, then rating
// (professional_rating()). It returns no distance and does not apply D-44's
// 40/40/20 weights (platform_settings rank_weight_* exist but nothing reads
// them; Database gap), so the line under the field says what the server does.
// Busy times (check_conflicts as the gym: start / end only) show as a caution
// card under that result after sending: a warning, never blocking.

const personLine = (p: ProCard): { line: string; muted: boolean } => {
  const h = hiredLine(p.hiredViaCentiumCount);
  const rating = p.rating != null && p.reviewCount > 0 ? ` · ${p.rating.toFixed(1)}` : "";
  return { line: `${h.text}${rating}`, muted: !h.hired };
};

export default function DirectOfferPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const back = useBack(HIRING_ROUTES.hub);
  const biz = useHiringBusiness();
  const id = biz.canHire ? biz.businessId : null;
  const [strip, showStrip] = useHiringStrip();
  const live = useLiveClasses();
  const rules = useFeeRules();

  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDq(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);
  const results = useHiringRead(() => (id ? searchProfessionals(id, dq) : null), [id, dq]);

  const [offered, setOffered] = useState<Record<string, BusyTime[]>>({});
  const [who, setWho] = useState<ProCard | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<OpeningFormState>(emptyForm);
  const [confirm, setConfirm] = useState<{ o: HireOffer; f: ParsedForm } | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<DialogNote | null>(null);

  const slot = live.sessions.find((s) => s.id === form.sessionId) ?? null;
  const parsed = parseForm(form, "offer", slot?.slotTitle ?? null);

  const start = (p: ProCard) => {
    setWho(p);
    setForm(emptyForm());
    setSheetOpen(true);
  };

  const review = () => {
    if (!who || !parsed) return;
    const startsOn = parsed.type === "class_slot" ? (slot?.date ?? null) : parsed.startsOn;
    if (!startsOn) return;
    setNote(null);
    setConfirm({ f: parsed, o: { name: who.name, onTeam: who.onTeam, type: parsed.type, title: parsed.title, pay: parsed.pay, payUnit: parsed.payUnit, classesPerMonth: parsed.classesPerMonth, startsOn } });
    setSheetOpen(false);
  };

  const send = async () => {
    if (!confirm || !who || !id || sending) return;
    setSending(true);
    const r = await sendHireOffer(id, {
      professionalId: who.id,
      applicationId: null,
      type: confirm.o.type,
      title: confirm.o.title,
      classSeriesIds: confirm.f.seriesIds,
      classSessionId: confirm.f.sessionId,
      pay: confirm.o.pay,
      payUnit: confirm.o.payUnit,
      classesPerMonth: confirm.o.classesPerMonth,
      startsOn: confirm.o.startsOn,
      message: null,
    });
    setSending(false);
    if (!r.ok) {
      setNote({ text: r.message, tone: r.pending ? "soon" : "error" });
      return;
    }
    const p = who;
    setOffered((o) => ({ ...o, [p.id]: r.value.conflicts }));
    setConfirm(null);
    setWho(null);
    showStrip(sentStrip(p.name), {
      action: t("View"),
      onAction: () => document.querySelector<HTMLElement>(`[data-result="${CSS.escape(p.id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }),
    });
  };

  const list = results.value ?? [];
  const [offBg, offInk] = fixedPair("#EBF2F4", "#5A859E", dark);

  return (
    <div style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackHeader eyebrow={t("Hiring")} title={t("Find a professional")} onBack={back} backLabel={t("Back to Hiring")} />
      {strip}

      {!biz.loading && !biz.canHire ? (
        <HiringEmpty icon={<UserPlusGlyph />} title={HIRING_ERROR_TEXT.not_a_gym} />
      ) : (
        <>
          <div data-search style={{ height: 48, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${m.fill}`, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", background: m.card }}>
            <Search size={17} strokeWidth={2} color={m.faint} aria-hidden style={{ flexShrink: 0, ...NO_ICON_SCALE }} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={t("Search professionals by name or specialty")}
              autoComplete="off"
              enterKeyHint="search"
              style={{ flex: 1, minWidth: 0, border: 0, outline: "none", background: "transparent", fontFamily: "inherit", fontSize: textPx(14), fontWeight: 600, color: m.ink, padding: 0 }}
            />
            {q ? (
              <button type="button" onClick={() => setQ("")} aria-label={t("Clear search")} className="tap market-focus" style={{ display: "flex", border: 0, background: "transparent", padding: 0, color: m.faint, cursor: "pointer" }}>
                <X size={16} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
              </button>
            ) : null}
          </div>
          <div style={{ marginTop: 10, fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>{t("Ranked by Centium work history and reviews. Only professionals open to gym work show here.")}</div>

          {results.state === "loading" && !results.value ? <MarketSkeleton radius={20} rows={3} count={3} label={t("Searching professionals")} style={{ marginTop: 12 }} /> : null}
          {results.state === "error" ? <MarketError thing="professionals" onRetry={results.retry} style={{ marginTop: 12 }} /> : null}
          {results.state === "offline" ? <MarketOffline loaded={list.length > 0} onRetry={results.retry} force style={{ marginTop: 12 }} /> : null}
          {results.state === "pending" ? <SoonNote style={{ marginTop: 16 }}>{t("Hiring is coming soon.")}</SoonNote> : null}
          {results.state === "ok" && list.length === 0 ? <SoonNote style={{ marginTop: 16 }}>{dq ? t("No professionals match this search.") : t("No professionals are open to gym work yet.")}</SoonNote> : null}

          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((p, i) => {
              const sent = p.id in offered;
              return (
                <div key={p.id} data-result={p.id} style={{ borderRadius: 20, background: m.card, border: sent ? `1.5px solid ${offInk}` : `1px solid ${m.border}`, padding: "14px 16px" }}>
                  <PersonHead p={p} rank={p.rank ?? i + 1} teamFirst={false} />
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <HiredLine roles={p.hiredViaCentiumCount} />
                    <button
                      type="button"
                      onClick={() => !sent && start(p)}
                      aria-disabled={sent || undefined}
                      aria-label={sent ? t("Offered to {name}", { name: p.name }) : t("Send offer to {name}", { name: p.name })}
                      className="hit market-focus"
                      style={{ height: 36, padding: "0 14px", borderRadius: 11, border: 0, background: sent ? offBg : m.fill, color: sent ? offInk : m.onfill, display: "flex", alignItems: "center", fontSize: textPx(12.5), fontWeight: 800, whiteSpace: "nowrap", fontFamily: "inherit", cursor: sent ? "default" : "pointer", flexShrink: 0 }}
                    >
                      {sent ? tx("Offered", "hire") : t("Send offer")}
                    </button>
                  </div>
                  {sent && offered[p.id].length ? <BusyWarning lines={offered[p.id].map(busyText).filter(Boolean)} style={{ marginTop: 10 }} /> : null}
                </div>
              );
            })}
          </div>
        </>
      )}

      <MasterSheet
        open={sheetOpen && !!who}
        onClose={() => setSheetOpen(false)}
        title={who ? t("Offer to {name}", { name: who.name }) : tx("Offer", "hire")}
        footer={
          <>
            <FeeNoticeRow text={feeNoticeText(rules)} />
            <PrimaryButton onClick={review} disabled={!parsed || (parsed.type === "class_slot" && !slot)}>
              {t("Review offer")}
            </PrimaryButton>
          </>
        }
      >
        {who ? (
          <OpeningFormFields
            form={form}
            set={(patch) => setForm((f) => ({ ...f, ...patch }))}
            mode="offer"
            series={live.series}
            sessions={live.sessions}
            person={{ p: who, ...personLine(who) }}
          />
        ) : null}
      </MasterSheet>

      <HireConfirmDialog
        offer={confirm?.o ?? null}
        direct
        busy={sending}
        note={note}
        onCancel={() => {
          if (sending) return;
          setConfirm(null);
          setSheetOpen(true);
        }}
        onSend={() => void send()}
      />
    </div>
  );
}
