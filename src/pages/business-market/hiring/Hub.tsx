import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { linePx, textPx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { useBizShareSheet } from "../../../components/share/business/useBizShareSheet";
import { BackHeader, OutlineButton } from "../listingParts";
import { fetchExistingTeamWindow, fetchMyOpenings, fetchMyTeam, payText, type Opening } from "../../../services/hiring";
import { HIRING_ROUTES } from "./HiringRoutes";
import { useHiringBusiness } from "./useHiringBusiness";
import { HiringEmpty, OpeningCard, OpeningMenuButton, UserPlusGlyph, fixedPair, useHiringRead, useHiringStrip, type OpeningAction } from "./hiringParts";
import PostOpeningSheet from "./PostOpeningSheet";
import { HUB_TABS, bannerStub, countLine, scheduleLine, tabOf, teamButtonText, typeLabel, type HubTab } from "./hubModel";

// Market + Share 3.0 · W4 · B-MA.8 Hiring hub (Business Hiring Screens
// `hOpen` `hPosted` `hFilled` `hClosed` `hEmpty`, markup lines 56–102),
// gyms and studios only. Content padding 0 16 32 (the app shell's own):
//   back header "Gym / Hiring";
//   the existing-team ticket banner (margin-bottom 12, radius 18, #E6F1EF;
//     body padding 12 14: "Add your existing team" 14 / 800, the line 12 / 17
//     --ink2 margin-top 2, "Add people" 12.5 / 800 #2F5F58 margin-top 6;
//     stub 76 with a 1.5px dashed #4F8F8A border: the days 20 / 800 #2F5F58
//     line-height 1 over "days left" 10 / 700; 14 notches at right 69 in
//     --page), only while existing_team_window is open → Add your existing team;
//   the Team · N / Hiring fees track (grid 1fr 1fr, gap 5, padding 6, radius
//     16, --segtrack; buttons 40 radius 12 --segidle / --segink 13 / 700);
//   the Open · Filled · Closed sub-track (margin-top 12, gap 4, padding 4,
//     radius 12, --subtrack; 34 tall radius 9, 12.5, active --subactive /
//     --onfill 700, idle --subink 600), in the URL as ?tab=filled|closed;
//   the caps count line + "Post opening" (outlined, the 15 / 2.4 plus) at
//     margin-top 14, space-between;
//   the opening cards (margin-top 10, gap 10; hiringParts OpeningCard);
//   the empty state "No openings yet" (hEmpty);
//   "Know someone? Find a professional" (margin-top 14, 48 + border, radius
//     14, 1px --border, 14 / 700 --pdark, the 16 search glyph, gap 8).
// Strip (W1 Q4, over the header): "Opening posted · {title}" with View.
//
// Ours: a non-owner (staff with the members permission) sees the Team button
// alone across the track (Hiring fees is the owner's, ConsoleGate "owner");
// the ⋮ on Open cards only (B-SH.1 opening menu: Edit / Share / Pause /
// Delete; Share is live through useBizShareSheet, the other three have no
// documented DB8 function and answer a calm strip). Every read below is
// awaiting DB stage DB8: pending today, so the hub shows its drawn empty
// state, "Team" without a count and no banner.

export default function HubPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const back = useBack("/app/business/marketplace");
  const biz = useHiringBusiness();
  const [params, setParams] = useSearchParams();
  const tab = tabOf(params.get("tab"));
  const [strip, showStrip] = useHiringStrip();
  const share = useBizShareSheet();
  // ?post=1 (Team / Add your existing team "Post an opening", the instructor picker) opens the post sheet once.
  const [sheetOpen, setSheetOpen] = useState(() => params.get("post") === "1");
  useEffect(() => {
    if (params.get("post") !== "1") return;
    const next = new URLSearchParams(params);
    next.delete("post");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [posted, setPosted] = useState<Opening[]>([]);
  const [justPosted, setJustPosted] = useState<string | null>(null);
  const id = biz.canHire ? biz.businessId : null;

  // awaiting DB stage DB8 (my_openings)
  const openings = useHiringRead(() => (id ? fetchMyOpenings(id, tab) : null), [id, tab]);
  // awaiting DB stage DB8 (my_team): "Team" alone while pending / unknown.
  const team = useHiringRead(() => (id ? fetchMyTeam(id) : null), [id]);
  // awaiting DB stage DB8 (existing_team_window, D-31): no banner while pending.
  const win = useHiringRead(() => (id ? fetchExistingTeamWindow(id) : null), [id]);

  const list = useMemo(() => {
    const fetched = openings.value ?? [];
    if (tab !== "open") return fetched;
    const extra = posted.filter((p) => !fetched.some((f) => f.id === p.id));
    return [...extra, ...fetched];
  }, [openings.value, posted, tab]);

  const setTab = (t: HubTab) => {
    const next = new URLSearchParams(params);
    if (t === "open") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  const onMenu = (o: Opening, a: OpeningAction) => {
    if (a === "share") {
      void share.open(() => ({ t: "hiring", d: { id: o.id, title: o.title, typeLabel: typeLabel(o.type), schedule: scheduleLine(o), pay: o.pay != null && o.pay > 0 ? payText(o.pay, o.payUnit) : null } }));
      return;
    }
    // No documented DB8 function for these yet (backend gap): a calm strip, nothing changes.
    const text = a === "edit" ? "Editing an opening is coming soon." : a === "pause" ? "Pausing an opening is coming soon." : "Deleting an opening is coming soon.";
    showStrip(text, { tone: "neutral" });
  };

  const header = <BackHeader eyebrow={biz.kind === "gym" ? "Gym" : "Marketplace"} title="Hiring" onBack={back} backLabel={biz.kind === "gym" ? "Back to Gym" : "Back to Marketplace"} />;

  if (biz.loading) {
    return (
      <div style={{ color: m.ink }}>
        {header}
        <MarketSkeleton radius={20} rows={3} count={2} label="Loading Hiring" />
      </div>
    );
  }
  if (!biz.canHire) {
    return (
      <div style={{ color: m.ink }}>
        {header}
        <HiringEmpty icon={<UserPlusGlyph />} title="Hiring is for gyms and studios." />
      </div>
    );
  }

  const w = win.state === "ok" && win.value?.open ? win.value : null;
  const stub = w ? bannerStub(w.daysLeft) : null;
  const [bannerBg, bannerDash] = fixedPair("#E6F1EF", "#4F8F8A", dark);
  const bannerInk = dark ? m.tealink : "#2F5F58";
  const teamN = team.state === "ok" && team.value ? team.value.length : null;
  const count = openings.state === "ok" || openings.state === "pending" ? countLine(tab, list.length) : null;
  const showEmpty = (openings.state === "ok" || openings.state === "pending") && list.length === 0;
  const trackBtn = { height: 40, borderRadius: 12, background: m.segidle, color: m.segink, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(13), fontWeight: 700, border: 0, fontFamily: "inherit", cursor: "pointer", lineHeight: "normal" } as const;

  return (
    <div style={{ color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {header}
      {strip}
      {share.node}

      {w && stub ? (
        <button
          type="button"
          onClick={() => navigate(HIRING_ROUTES.existingTeam)}
          aria-label={`Add your existing team. Professionals already working with you join free. No hiring fee. ${stub.n} ${stub.unit}. Add people`}
          className="market-focus"
          data-banner
          style={{ position: "relative", display: "flex", width: "100%", marginBottom: 12, borderRadius: 18, background: bannerBg, overflow: "hidden", border: 0, padding: 0, textAlign: "left", fontFamily: "inherit", color: m.ink, cursor: "pointer" }}
        >
          <span aria-hidden style={{ flex: 1, minWidth: 0, padding: "12px 14px", display: "block" }}>
            <span style={{ display: "block", fontSize: textPx(14), fontWeight: 800 }}>Add your existing team</span>
            <span style={{ display: "block", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2, marginTop: 2 }}>Professionals already working with you join free. No hiring fee.</span>
            <span style={{ display: "block", marginTop: 6, fontSize: textPx(12.5), fontWeight: 800, color: bannerInk }}>Add people</span>
          </span>
          <span aria-hidden style={{ width: 76, flexShrink: 0, borderLeft: `1.5px dashed ${bannerDash}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: textPx(20), fontWeight: 800, color: bannerInk, lineHeight: 1 }}>{stub.n}</span>
            <span style={{ fontSize: textPx(10), fontWeight: 700, color: bannerInk }}>{stub.unit}</span>
          </span>
          <span aria-hidden style={{ position: "absolute", right: 69, top: -7, width: 14, height: 14, borderRadius: 999, background: m.page }} />
          <span aria-hidden style={{ position: "absolute", right: 69, bottom: -7, width: 14, height: 14, borderRadius: 999, background: m.page }} />
        </button>
      ) : null}

      <div data-hub-track style={{ display: "grid", gridTemplateColumns: biz.isOwner ? "1fr 1fr" : "1fr", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
        <button type="button" onClick={() => navigate(HIRING_ROUTES.team)} className="tap market-focus" style={trackBtn}>
          {teamButtonText(teamN)}
        </button>
        {biz.isOwner ? (
          <button type="button" onClick={() => navigate(HIRING_ROUTES.fees)} className="tap market-focus" style={trackBtn}>
            Hiring fees
          </button>
        ) : null}
      </div>

      <div role="tablist" aria-label="Openings" data-hub-tabs style={{ marginTop: 12, display: "flex", gap: 4, padding: 4, borderRadius: 12, background: m.subtrack }}>
        {HUB_TABS.map((t) => {
          const on = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(t.key)}
              className="hit market-focus"
              style={{ flex: 1, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: textPx(12.5), fontWeight: on ? 700 : 600, background: on ? m.subactive : "transparent", color: on ? m.onfill : m.subink, border: 0, fontFamily: "inherit", cursor: "pointer", lineHeight: "normal" }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span data-hub-count style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>
          {count ?? ""}
        </span>
        <OutlineButton onClick={() => setSheetOpen(true)}>
          <Plus size={15} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
          Post opening
        </OutlineButton>
      </div>

      <div role="tabpanel" style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {openings.state === "loading" && list.length === 0 ? <MarketSkeleton radius={20} rows={3} count={2} label="Loading your openings" /> : null}
        {openings.state === "error" ? <MarketError thing="your openings" onRetry={openings.retry} /> : null}
        {openings.state === "offline" ? <MarketOffline loaded={list.length > 0} onRetry={openings.retry} force /> : null}
        {list.map((o) => (
          <OpeningCard
            key={o.id}
            o={o}
            justPosted={o.id === justPosted}
            onOpen={() => navigate(HIRING_ROUTES.applicants(o.id), { state: { opening: o } })}
            menu={tab === "open" ? <OpeningMenuButton title={o.title} onAction={(a) => onMenu(o, a)} /> : undefined}
          />
        ))}
      </div>
      {showEmpty ? (
        <HiringEmpty
          icon={<UserPlusGlyph />}
          title="No openings yet"
          body="Post a role or a one-off class slot. Professionals near you can apply, and you choose who to hire."
        />
      ) : null}

      <button
        type="button"
        onClick={() => navigate(HIRING_ROUTES.find)}
        className="tap market-focus"
        data-find
        style={{ marginTop: 14, width: "100%", height: 50, boxSizing: "border-box", borderRadius: 14, border: `1px solid ${m.border}`, background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: textPx(14), fontWeight: 700, color: m.pdark, fontFamily: "inherit", cursor: "pointer" }}
      >
        <Search size={16} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
        Know someone? Find a professional
      </button>

      <PostOpeningSheet
        open={sheetOpen}
        businessId={id}
        onClose={() => setSheetOpen(false)}
        onPosted={(o, title) => {
          setSheetOpen(false);
          if (o) {
            setPosted((p) => [o, ...p.filter((x) => x.id !== o.id)]);
            setJustPosted(o.id);
          }
          if (tab !== "open") setTab("open");
          else openings.retry();
          showStrip(`Opening posted · ${title}`, { action: "View", onAction: o ? () => navigate(HIRING_ROUTES.applicants(o.id), { state: { opening: o } }) : undefined });
        }}
      />
    </div>
  );
}
