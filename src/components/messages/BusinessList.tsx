import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, LifeBuoy, MessageCircle, Search, SquarePen, UserRound, Users, WifiOff } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { bizAvatarKind, bizInitials, useBizChatColours } from "./bizAvatar";
import { fetchMyTeam, type TeamMember } from "../../services/business-team";
import { fetchBusinessPeople, type BusinessPerson } from "../../services/business-members";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { MemberTag } from "../marketplace/MemberTag";
import type { MessageThread } from "../../services/messaging";
import { BottomSheet } from "../ui/BottomSheet";

/**
 * The business Messages list in ClientChatV2's language (OP1-190; source
 * `ClientChatV2.dc.html` state="list", template 22-37, logic 116-122). Client
 * and professional accounts keep the MO1.7 list (ThreadList's default rows,
 * MessagesHeader, listColors); everything here is reached only when
 * `accountType === "business"`.
 *
 * Literal values, light · dark (source L / D palettes): page #FFFFFF · #121317
 * (cream), card #FFFFFF · #1C1F28 (cream-card), border rgba(ink, 0.08),
 * divider rgba(ink, 0.06), ink #241F1B · #F5F3FA, inkSoft #5B5349 · #B8B3C7,
 * faint #8C8378 · #B8B3C7, pale #F0EDF9 · #303141, pDark #7D6BB5 · #C3B3FB,
 * fill #AEA1DC · #A991FE, onFill #FFFFFF · #0D0B1A, readTick #3A7BD5 ·
 * #7FB0F0, maskBg #F5F5F6 · #262932, maskInk #5B5349 · #B8B3C7, tealPale
 * #EAF4F2 · #293339, tealInk #3E6B67 · #B2D4CF, online #3F9165 (both). The
 * lavender values ride the theme tokens, so the five colour themes and High
 * contrast recolour them as they do the business chat (ThreadView cv2).
 */

/**
 * The round avatar: 48 with initials 15/800 and glyphs 20/2 in the list; 40
 * with initials 14/800 and glyphs 18/2 in the chat header; 64 with 20/800 and
 * 26 in the new-chat block (source template 23, 41, 47).
 */
export const BizAvatar: React.FC<{
  thread: Pick<MessageThread, "kind" | "venue" | "participantAvatarUrl" | "participantName">;
  size: 40 | 48 | 64;
  initials?: string;
}> = ({ thread, size, initials }) => {
  const c = useBizChatColours();
  const kind = bizAvatarKind(thread);
  const glyph = size === 64 ? 26 : size === 48 ? 20 : 18;
  const text = size === 64 ? "text-[20px]" : size === 48 ? "text-[15px]" : "text-[14px]";
  const box = { width: size, height: size };
  if (kind === "member")
    return (
      <span data-biz-avatar="member" className="rounded-full flex items-center justify-center shrink-0 text-charcoal-soft" style={{ ...box, background: c.maskBg }}>
        <UserRound size={glyph} strokeWidth={2} aria-hidden />
      </span>
    );
  if (kind === "support")
    return (
      <span data-biz-avatar="support" className="rounded-full flex items-center justify-center shrink-0 bg-teal-pale" style={{ ...box, color: c.tealInk }}>
        <LifeBuoy size={glyph} strokeWidth={2} aria-hidden />
      </span>
    );
  if (kind === "group")
    return (
      <span data-biz-avatar="group" className="rounded-full flex items-center justify-center shrink-0 bg-primary-pale text-primary-dark" style={box}>
        <Users size={glyph} strokeWidth={2} aria-hidden />
      </span>
    );
  if (kind === "photo")
    return (
      <span data-biz-avatar="photo" className="rounded-full overflow-hidden flex shrink-0" style={box}>
        <img src={thread.participantAvatarUrl ?? ""} alt="" className="w-full h-full object-cover" />
      </span>
    );
  return (
    <span
      data-biz-avatar="initials"
      className={`rounded-full flex items-center justify-center shrink-0 bg-primary-pale text-primary-dark font-extrabold ${text}`}
      style={box}
    >
      {initials ?? bizInitials(thread.participantName)}
    </span>
  );
};

/**
 * The title row (OP1-190 row 2, template 23): "Messages" 27/800 ls -0.02em,
 * no back on the root; the 44 round New message button, square-pen 20/2 in
 * pDark; 12 under. Sub-views (Archived, Starred messages) take the business
 * chat's back (44, chevron-left 20/2.2, ThreadView cv2) before the title.
 */
export const BizListHeader: React.FC<{ title: string; onBack?: () => void; onNew?: () => void }> = ({ title, onBack, onNew }) => {
  const { language, t } = useApp();
  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div data-biz-header="" className="flex items-center justify-between mb-3 min-h-[44px] gap-1">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("Back")}
          className="tap w-11 h-11 -ml-2.5 rounded-full flex items-center justify-center text-charcoal shrink-0"
        >
          <BackIcon size={20} strokeWidth={2.2} aria-hidden />
        </button>
      )}
      <h1 className="flex-1 min-w-0 truncate text-[27px] leading-[1.5] font-extrabold tracking-[-0.02em] text-charcoal">{title}</h1>
      {onNew && (
        <button
          type="button"
          onClick={onNew}
          aria-label="New message"
          title="New message"
          data-new-message=""
          className="tap w-11 h-11 rounded-full flex items-center justify-center text-primary-dark shrink-0"
        >
          <SquarePen size={20} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
};

/** O1 (OURS): four 72 rows in the business row's geometry, a 48 circle and two bars. */
export const BizListSkeleton: React.FC = () => (
  <div aria-busy="true" data-biz-skeleton="">
    <span className="sr-only">Loading messages</span>
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        aria-hidden
        className="flex items-center gap-3 min-h-[72px] px-2 py-2.5 -mx-2 border-b border-charcoal/[0.06] animate-skeleton-pulse"
      >
        <span className="w-12 h-12 rounded-full shrink-0 bg-cream-soft" />
        <span className="flex flex-col gap-2">
          <span className="block rounded-md bg-cream-soft" style={{ width: 120, height: 14 }} />
          <span className="block rounded-md bg-cream-soft" style={{ width: 220, height: 12 }} />
        </span>
      </div>
    ))}
  </div>
);

/**
 * O4 (OURS, the dashed card of OP1-140 O4 / OP1-033): tert dashed 1px, r22,
 * padding 28 20; a 48 r16 pale tile with a pDark glyph 22; title 15/800 10
 * under; helper 12.5/18 inkSoft 4 under.
 */
export const BizEmptyCard: React.FC<{ title: string; helper?: string; icon?: React.ReactNode }> = ({ title, helper, icon }) => (
  <div
    data-empty-state=""
    className="bg-cream-card border border-dashed border-charcoal-tertiary text-center"
    style={{ marginTop: 18, borderRadius: 22, padding: "28px 20px" }}
  >
    <span className="inline-flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 48, height: 48, borderRadius: 16 }}>
      {icon ?? <MessageCircle size={22} aria-hidden />}
    </span>
    <p className="text-[15px] font-extrabold text-charcoal" style={{ marginTop: 10 }}>
      {title}
    </p>
    {helper && (
      <p className="text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>
        {helper}
      </p>
    )}
  </div>
);

/** O2 (OURS): the first load failed, with Retry. */
export const BizListError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div role="alert" data-biz-error="" className="flex flex-col items-center text-center pt-8 pb-4 gap-1">
    <p className="max-w-[280px] text-[13px] leading-[19px] text-charcoal-soft">
      Couldn't load your messages. Check your connection and try again.
    </p>
    <button type="button" onClick={onRetry} className="tap min-h-[44px] px-3 text-[13px] font-bold text-primary-dark">
      Retry
    </button>
  </div>
);

/**
 * O3 (OURS): offline over a list already on screen, in the chat's context
 * banner pattern (template 46: pale r14, padding 9 12, glyph 15/2.2 pDark,
 * 12/700 line 16 in deep).
 */
export const BizOfflineBanner: React.FC = () => (
  <div role="status" data-biz-offline="" className="mb-1.5 rounded-[14px] bg-primary-pale px-3 py-[9px] flex items-center gap-2">
    <WifiOff size={15} strokeWidth={2.2} className="text-primary-dark shrink-0" aria-hidden />
    <span className="text-[12px] leading-[16px] font-bold text-primary-deep-text">You're offline. Showing your last saved chats.</span>
  </div>
);

/**
 * S2: New message (OP1-190 S2, MO1.7 K13). A business may message only its
 * own people: its team (start_message_thread, `onPick`) and its own members
 * and customers (B7 MB-01 business_people, `onPickMember` →
 * start_member_thread, which refuses with ATX96 anyone who is not a current
 * member or left in the last 90 days). Each person shows as the server's
 * label (Q-05: the first name when shared with this business, else
 * "Member #0042"; never built here), the masked avatar, and "Under 18" for a
 * minor (AN4-051 O5). The members part needs the `messages` permission.
 * The picker is not drawn: it reuses this sheet's team rows and the list's
 * search field (row 3).
 */
export const BizNewMessageSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (userId: string) => void;
  onPickMember: (businessId: string, personId: string) => void;
  busy: boolean;
  error: string | null;
}> = ({ open, onClose, onPick, onPickMember, busy, error }) => {
  const { authUserId } = useApp();
  const c = useBizChatColours();
  const access = useConsoleAccess();
  const bizId = access.ready && access.can("messages") ? access.businessId : null;
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<{ key: string; list: BusinessPerson[] | null; error: string | null; pending: boolean } | null>(null);
  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    void fetchMyTeam(authUserId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setTeam(r.members);
        setLoadError(null);
      } else setLoadError(r.message);
    });
    return () => {
      cancelled = true;
    };
  }, [open, authUserId]);
  const search = query.trim();
  const peopleKey = `${bizId}|${search}`;
  useEffect(() => {
    if (!open || !bizId) return;
    let cancelled = false;
    // Typing settles before the read (250 ms), so a search is one request.
    const id = window.setTimeout(() => {
      void fetchBusinessPeople(bizId, { segment: "all", search: search || null, limit: 50 }).then((r) => {
        if (cancelled) return;
        setPeople(r.ok ? { key: peopleKey, list: r.people, error: null, pending: false } : { key: peopleKey, list: null, error: r.message || null, pending: r.pending });
      });
    }, search ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [open, bizId, search, peopleKey]);
  const shown = people && people.key === peopleKey ? people : null;
  const teamShown = (team ?? []).filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <BottomSheet open={open} onClose={onClose} title="New message">
      <div className="animate-fade-slide-up" data-biz-new-sheet="">
        {(error || loadError) && (
          <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3 py-2 mb-2">{error ?? loadError}</p>
        )}
        {bizId && (
          // The list's search field (OP1-190 row 3): h44 r14 card, 1px border, padding 0 12, gap 8, search 16 faint.
          <label data-new-search="" className="flex items-center gap-2 h-11 rounded-[14px] px-3 mb-3 bg-cream-card border border-charcoal/[0.08]">
            <Search size={16} className="shrink-0 text-charcoal-faint" aria-hidden />
            <span className="sr-only">Search your team, members and customers</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value.slice(0, 60))}
              placeholder="Search"
              className="flex-1 min-w-0 bg-transparent text-[14px] text-charcoal placeholder:text-charcoal-faint focus:outline-none"
            />
          </label>
        )}
        <p className="text-[12px] leading-[16px] font-bold text-charcoal-faint mb-1">Your team</p>
        {team === null && !loadError && <p className="text-[13px] text-charcoal-soft py-4">Loading your team…</p>}
        {team && team.length === 0 && <p className="text-[13px] text-charcoal-soft py-4">No one on your team yet.</p>}
        {team && team.length > 0 && teamShown.length === 0 && <p className="text-[13px] text-charcoal-soft py-4">No one matches your search.</p>}
        {teamShown.map((m) => (
          <button
            key={m.professionalId}
            type="button"
            disabled={busy}
            onClick={() => onPick(m.professionalId)}
            className="tap w-full flex items-center gap-3 min-h-[56px] text-left border-b border-charcoal/[0.06] disabled:opacity-60"
          >
            <span className="w-10 h-10 rounded-full bg-primary-pale text-primary-dark flex items-center justify-center shrink-0 text-[14px] font-extrabold">
              {bizInitials(m.name)}
            </span>
            <span className="flex-1 min-w-0 text-[15px] leading-[19px] font-bold text-charcoal truncate">{m.name}</span>
          </button>
        ))}
        {bizId && !shown?.pending && (
          <div data-new-members="">
            <p className="text-[12px] leading-[16px] font-bold text-charcoal-faint mb-1 mt-4">Your members and customers</p>
            {!shown && <p className="text-[13px] text-charcoal-soft py-4">Loading your members…</p>}
            {shown?.error && <p className="text-[13px] text-charcoal-soft py-4">{shown.error}</p>}
            {shown?.list && shown.list.length === 0 && (
              <p className="text-[13px] text-charcoal-soft py-4">{search ? "No one matches your search." : "No members or customers yet."}</p>
            )}
            {shown?.list?.map((p) => (
              <button
                key={p.personId}
                type="button"
                disabled={busy}
                data-new-member=""
                onClick={() => onPickMember(bizId, p.personId)}
                className="tap w-full flex items-center gap-3 min-h-[56px] text-left border-b border-charcoal/[0.06] disabled:opacity-60"
              >
                {/* The masked member avatar (BizAvatar "member": 40 maskBg, user-round 18/2 inkSoft). */}
                <span data-biz-avatar="member" className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-charcoal-soft" style={{ background: c.maskBg }}>
                  <UserRound size={18} strokeWidth={2} aria-hidden />
                </span>
                <span className="flex-1 min-w-0 flex items-center" style={{ gap: 6 }}>
                  <span className="min-w-0 text-[15px] leading-[19px] font-bold text-charcoal truncate">{p.label}</span>
                  {p.isMinor && <MemberTag label="Under 18" tone="muted" />}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
