import { useState } from "react";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronDown, Copy, Minus, MoreHorizontal, Plus, RefreshCw, Share2, Ticket, UserMinus, Users, XCircle } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { MemberTag } from "../../../components/marketplace/MemberTag";
import { useOpsToast } from "../../../components/marketplace/VenueKit";
import { copyText, shareOrCopy } from "../../../components/business-more/share";
import { useOnline } from "../../../hooks/useOnline";
import {
  clampUses,
  CODE_COPY,
  createBlock,
  createMemberCode,
  endMembership,
  grantsLine,
  gymArg,
  KIND_WORD,
  maskedMemberLabel,
  MAX_USES,
  MIN_USES,
  replaceMemberCode,
  revokeMemberCode,
  usesLine,
  usesValue,
  type MemberCode,
  type Membership,
} from "../../../services/business-members";
import { t, tk, tn, tx } from "../../../i18n/core";
import { kindLabel } from "../../business-ops/plans/planModel";
import { AnAvatar, AnCard, AnCountLine, AnHeaderRow, AnLead, AnListRow, AnNoneRow, AnNumberBoxes, AnRowButton, AnSeeAll, AnStrip } from "./anKit";
import type { MembersVocab } from "./membersModel";
import { liveCodes, type MembersData } from "./useMembersData";
import { appLocale } from "../../../i18n/format";


// Analytics › Members › Member codes (OURS-AN4-member-codes, with the
// OURS-OP1-member-codes differences: the End pop-up is OP1-019's K16,
// Declined shown, the venue roster lives on its own page). The live
// walk-in desk: a code, not a search box (no account lookup exists), and
// redeeming IS the consent, so the membership starts accepted.
//
// FIRST NAMES (B7 list_business_members): a first name and an Under 18 tag,
// never a surname or a date of birth; "Member #code" only where the reader
// gives no name. Pending first, then newest; the count is total_count and the
// full list pages. The roster is NOT filtered to active: pending and declined
// explain who is missing. Either side may end a membership; the business's
// half is offered while active or pending. Codes need business_can(members)
// (the owner, or staff with Members, ATX09); the plan must be the business's
// (ATX25); creating is rate-limited (ATX02).
//
// CN (Batch 2): a code may grant a plan, a membership or a pass. Only active
// plans are offered (redeeming refuses any other status). The gym picker
// shows only for a business with several gyms, and p_gym_id is sent only
// then; one gym is resolved by the server, and none is said up front. Each
// code names what it grants. A granted membership is never revenue (price
// 0.00, no ledger row).
//
// Round F2 AB6 (Karim F24): a "Can be used" stepper when creating (1–50,
// default 1; create_business_member_code_with_uses), "Used {n} of {max}" on
// each code, and a menu on each code with Revoke and Replace (confirmed; the
// replacement keeps the plan, gym, uses and validity, and the new code shows
// in a toast). Members who already joined keep their membership.

const BASE = "/app/business/analytics/members";

// The app's "Oct 14" convention.
const dMMM = (iso: string) => new Date(iso).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric" });
const dMMMyyyy = (iso: string) => new Date(iso).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" });
/** The plan kind inside a sentence ("this membership"), from services' KIND_WORD. */
const kindWord = (k: keyof typeof KIND_WORD) => tx(KIND_WORD[k], "plan kind");

const STATUS: Record<Membership["status"], { label: string; tone: "member" | "pending" | "muted" }> = {
  active: { label: tk("Active"), tone: "member" },
  pending: { label: tk("Pending"), tone: "pending" },
  declined: { label: tk("Declined"), tone: "muted" },
  ended: { label: tk("Ended"), tone: "muted" },
};

const memberFact = (m: Membership) =>
  m.status === "ended" && m.endedAt
    ? t("Ended {date}", { date: dMMMyyyy(m.endedAt) })
    : m.status === "pending"
      ? t("Invited {date}", { date: dMMMyyyy(m.invitedAt) })
      : m.respondedAt
        ? t("Since {date}", { date: dMMMyyyy(m.respondedAt) })
        : t("Invited {date}", { date: dMMMyyyy(m.invitedAt) });

export function MemberCodesPage({ data, vocab }: { data: MembersData; vocab: MembersVocab }) {
  const navigate = useNavigate();
  const online = useOnline();
  const [params, setParams] = useSearchParams();
  const list = params.get("list");
  const [toast, showToast] = useOpsToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(params.get("create") === "1");
  const [ending, setEnding] = useState<Membership | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  // AB6: the code menu, and the Revoke / Replace confirm.
  const [codeMenu, setCodeMenu] = useState<{ code: MemberCode; anchor: HTMLElement } | null>(null);
  const [codeAsk, setCodeAsk] = useState<{ kind: "revoke" | "replace"; code: MemberCode } | null>(null);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const codes = data.codes ?? [];
  const waiting = liveCodes(codes);
  const members = data.members ?? [];
  const memberCount = Math.max(data.memberTotal, members.length);
  const memberName = (m: Membership) => m.label ?? maskedMemberLabel(m.id);
  const memberCountLabel = tn(memberCount, "1 member", "{n} members");
  // AB6: a code with uses left counts once it has been used at all.
  const redeemed = codes.filter((c) => c.uses > 0).length;
  const pct = codes.length > 0 ? Math.round((redeemed / codes.length) * 100) : null;
  const gyms = businessGyms(data);

  const copy = async (code: string) => {
    if (await copyText(code)) {
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
    } else showToast(t("Couldn't copy. Select the code and copy it yourself."));
  };

  const confirmEnd = async () => {
    if (!ending || endBusy) return;
    setEndBusy(true);
    setEndError(null);
    const r = await endMembership(ending.id);
    setEndBusy(false);
    if (!r.ok) {
      setEndError(r.message);
      return;
    }
    setEnding(null);
    showToast(t("Membership ended."));
    data.reload();
  };

  const confirmCode = async () => {
    if (!codeAsk || codeBusy) return;
    setCodeBusy(true);
    setCodeError(null);
    const { kind, code } = codeAsk;
    const r = kind === "revoke" ? await revokeMemberCode(code.id) : await replaceMemberCode(code.id);
    setCodeBusy(false);
    if (!r.ok) {
      setCodeError(r.message);
      return;
    }
    setCodeAsk(null);
    data.setCodes((prev) => {
      const rest = prev.map((c) => (c.id === code.id ? { ...c, revokedAt: c.revokedAt ?? new Date().toISOString() } : c));
      return kind === "replace" ? [r.code, ...rest] : rest;
    });
    showToast(kind === "revoke" ? t(CODE_COPY.revoked) : t(CODE_COPY.replaced, { code: r.code.code }));
  };

  const codeRow = (c: MemberCode, i: number) => (
    <AnListRow
      key={c.id}
      first={i === 0}
      mono
      avatar={<AnAvatar icon={Ticket} tone="caution" />}
      name={c.code}
      fact={`${t("Expires {date}", { date: dMMM(c.expiresAt) })} · ${usesLine(c.uses, c.maxUses)} · ${grantsLine(c, data.plans, gyms)}`}
      trailing={
        <span className="flex items-center gap-[6px]">
          <AnRowButton
            icon={copied === c.code ? Check : Copy}
            label={copied === c.code ? t("Copied") : t("Copy")}
            ariaLabel={t("Copy {code}", { code: c.code })}
            onClick={() => void copy(c.code)}
          />
          <button
            type="button"
            aria-label={t(CODE_COPY.menu)}
            aria-haspopup="menu"
            disabled={!online}
            onClick={(e) => setCodeMenu({ code: c, anchor: e.currentTarget })}
            className="tap w-[40px] h-[40px] rounded-[12px] border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] inline-flex items-center justify-center text-charcoal-soft disabled:opacity-60"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        </span>
      }
    />
  );

  function codePopups() {
    const ask = codeAsk;
    return (
      <>
        <PopupMenu
          open={!!codeMenu}
          onClose={() => setCodeMenu(null)}
          anchor={codeMenu?.anchor ?? null}
          variant="field"
          width={204}
          heading={codeMenu?.code.code}
          options={[
            { value: "replace", label: t(CODE_COPY.replace), disabled: !online },
            { value: "revoke", label: t(CODE_COPY.revoke), disabled: !online },
          ]}
          onSelect={(v) => {
            if (!codeMenu) return;
            setCodeError(null);
            setCodeAsk({ kind: v === "revoke" ? "revoke" : "replace", code: codeMenu.code });
            setCodeMenu(null);
          }}
        />
        <ConfirmCard
          open={!!ask}
          layout="stacked"
          frame="kit"
          tone={ask?.kind === "revoke" ? "destructive" : undefined}
          icon={ask?.kind === "revoke" ? <XCircle size={20} strokeWidth={2.2} /> : <RefreshCw size={20} strokeWidth={2.2} />}
          title={t(ask?.kind === "revoke" ? CODE_COPY.revokeTitle : CODE_COPY.replaceTitle)}
          subtitle={[t(ask?.kind === "revoke" ? CODE_COPY.revokeBody : CODE_COPY.replaceBody), codeError].filter(Boolean).join(" ")}
          confirmLabel={t(ask?.kind === "revoke" ? CODE_COPY.revokeConfirm : CODE_COPY.replaceConfirm)}
          cancelLabel={t(CODE_COPY.keep)}
          busy={codeBusy || !online}
          onCancel={() => !codeBusy && setCodeAsk(null)}
          onConfirm={() => void confirmCode()}
        />
      </>
    );
  }

  const memberRow = (m: Membership, i: number) => {
    const st = STATUS[m.status];
    return (
      <AnListRow
        key={m.id}
        first={i === 0}
        avatar={m.label && !isMaskedLabel(m.label) ? <AnAvatar initial={m.label.charAt(0).toUpperCase()} index={i} /> : <AnAvatar masked />}
        name={memberName(m)}
        nameExtra={m.isMinor ? <MemberTag label={t("Under 18")} tone="muted" /> : undefined}
        fact={`${m.planName ?? t("No plan")} · ${memberFact(m)}`}
        trailing={
          <span className="flex items-center gap-[8px]">
            <MemberTag label={st.label === "Active" ? tx("Active", "members chart") : t(st.label)} tone={st.tone} />
            {(m.status === "active" || m.status === "pending") && (
              <AnRowButton
                icon={UserMinus}
                label={tx("End", "membership")}
                tone="high"
                ariaLabel={t("End {name}'s membership", { name: memberName(m) })}
                onClick={() => {
                  setEndError(null);
                  setEnding(m);
                }}
              />
            )}
          </span>
        }
      />
    );
  };

  const header = (
    <AnHeaderRow
      crumb={list ? t("Member codes") : t(vocab.label)}
      backLabel={list ? t("Back to Member codes") : vocab.label === "Clients" ? t("Back to Clients") : t("Back to Members")}
      onBack={() => (list ? setParams({}, { replace: false }) : navigate(BASE))}
      title={list === "codes" ? t("Waiting to be used") : list === "members" ? memberCountLabel : t("Member codes")}
    />
  );

  // Full lists ("See all {n}").
  if (list === "codes" || list === "members") {
    return (
      <div>
        {header}
        <AnCard className="!rounded-[24px]">
          <div style={{ padding: "4px 16px 4px" }}>
            {list === "codes" ? (
              <>
                <AnCountLine count={tn(waiting.length, "1 code", "{n} codes")} order={t("Newest first")} />
                {waiting.map(codeRow)}
              </>
            ) : (
              <>
                <AnCountLine count={memberCountLabel} order={t("Waiting first, then newest")} />
                {members.map(memberRow)}
              </>
            )}
          </div>
        </AnCard>
        {list === "members" && members.length < memberCount && (
          <div className="text-center mt-[12px]">
            <AnRowButton icon={Users} label={data.loadingMore ? t("Loading…") : t("Show more ({n})", { n: memberCount - members.length })} onClick={data.loadMoreMembers} disabled={data.loadingMore || !online} />
          </div>
        )}
        {list === "members" && (
          <p className="text-[10.5px] leading-[15px] text-charcoal-faint text-center mt-[10px]">
            {t("First names only. Members under 18 are marked.")}
          </p>
        )}
        {endPopup()}
        {codePopups()}
        {toast}
      </div>
    );
  }

  function endPopup() {
    return (
      <ConfirmCard
        open={!!ending}
        layout="stacked"
        frame="kit"
        tone="destructive"
        icon={<XCircle size={20} strokeWidth={2.2} />}
        title={t("End this membership?")}
        subtitle={
          [
            t("They stop being a member today. You can invite them again with a new code."),
            !online ? t("You're offline.") : null,
            endError,
          ]
            .filter(Boolean)
            .join(" ")
        }
        confirmLabel={t("End membership")}
        cancelLabel={t("Keep it")}
        busy={endBusy || !online}
        onCancel={() => !endBusy && setEnding(null)}
        onConfirm={() => void confirmEnd()}
      />
    );
  }

  return (
    <div>
      {header}
      {data.error && <AnStrip offline={!online} text={online ? t("Couldn't load your codes. Check your connection and try again.") : t("You're offline. Showing what was loaded last.")} onRetry={data.reload} />}

      <AnCard label={t("Member codes")}>
        <AnNumberBoxes
          boxes={[
            { label: t("Codes redeemed"), value: data.codes === null ? null : pct === null ? null : `${pct}%` },
            { label: t("Waiting to be used"), value: data.codes === null ? null : waiting.length.toLocaleString(appLocale()) },
          ]}
        />
        <AnLead>
          {tn(codes.length, "{redeemed} of 1 code has been used. Unused codes stop working after 7 days.", "{redeemed} of {n} codes have been used. Unused codes stop working after 7 days.", { redeemed })}
        </AnLead>
        <div style={{ padding: "0 20px 16px" }}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={!data.businessId || !online}
            className="tap w-full h-[44px] px-[18px] rounded-[14px] bg-primary-fill text-on-primary-fill inline-flex items-center justify-center gap-[8px] text-[13px] font-bold disabled:opacity-60"
          >
            <Plus size={15} aria-hidden /> {t("Create code")}
          </button>
          {!online && <p className="text-[11px] leading-[15px] text-charcoal-faint mt-[8px] text-center">{t("Connect to create a code.")}</p>}
          {!data.businessId && !data.loading && (
            <p className="text-[11px] leading-[15px] text-charcoal-faint mt-[8px] text-center">{t("Save your business profile first. Members belong to it.")}</p>
          )}
        </div>
      </AnCard>

      <AnCard className="mt-[12px]" label={t("Codes waiting to be used")}>
        <div style={{ padding: "4px 16px 4px" }}>
          <AnCountLine count={tn(waiting.length, "1 code", "{n} codes")} order={t("Newest first")} />
          {waiting.length === 0 ? (
            <AnNoneRow icon={Ticket} tone="caution">
              {t("No codes waiting. Create one when someone joins at the desk.")}
            </AnNoneRow>
          ) : (
            waiting.slice(0, 3).map(codeRow)
          )}
        </div>
        {waiting.length > 3 && <AnSeeAll n={waiting.length} onClick={() => setParams({ list: "codes" })} />}
      </AnCard>

      <AnCard className="mt-[12px]" label={t("Members")}>
        <div style={{ padding: "4px 16px 4px" }}>
          <AnCountLine count={memberCountLabel} order={t("Waiting first, then newest")} />
          {members.length === 0 ? (
            <AnNoneRow icon={Users} tone="pale">
              {data.businessId ? t("No members yet. Create a member code and hand it over at the desk.") : t("Save your business profile first. Members belong to it.")}
            </AnNoneRow>
          ) : (
            members.slice(0, 3).map(memberRow)
          )}
        </div>
        {memberCount > 3 && <AnSeeAll n={memberCount} onClick={() => setParams({ list: "members" })} />}
      </AnCard>
      <p className="text-[10.5px] leading-[15px] text-charcoal-faint text-center mt-[10px]">
        {t("First names only. Members under 18 are marked.")}
      </p>

      <CreateCodeSheet
        open={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          if (params.get("create")) setParams({}, { replace: true });
        }}
        data={data}
        vocab={vocab}
        onCreated={(c) => {
          data.setCodes((prev) => [c, ...prev]);
          showToast(t("Code created."));
        }}
        onCopyFailed={() => showToast(t("Couldn't copy. Select the code and copy it yourself."))}
      />
      {endPopup()}
      {codePopups()}
      {toast}
    </div>
  );
}


/** The business's own gyms: my_venues() lists every venue the caller is an insider of, across businesses. */
function businessGyms(data: MembersData) {
  return data.businessId ? data.venues.filter((v) => v.businessId === data.businessId) : [];
}

const FIELD =
  "tap w-full h-[44px] rounded-[14px] bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] flex items-center justify-between gap-2 text-start text-[13px] leading-[18px] text-charcoal disabled:opacity-60";
const FIELD_LABEL = "text-[11px] leading-[14px] font-bold text-charcoal-faint mb-[6px]";
const HINT = "text-[11px] leading-[15px] text-charcoal-faint";

function CreateCodeSheet({
  open,
  onClose,
  data,
  vocab,
  onCreated,
  onCopyFailed,
}: {
  open: boolean;
  onClose: () => void;
  data: MembersData;
  vocab: MembersVocab;
  onCreated: (c: MemberCode) => void;
  onCopyFailed: () => void;
}) {
  const online = useOnline();
  const [planId, setPlanId] = useState<string>("");
  const [gymId, setGymId] = useState<string>("");
  const [uses, setUses] = useState(MIN_USES);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<MemberCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [fieldEl, setFieldEl] = useState<HTMLButtonElement | null>(null);
  const [gymMenu, setGymMenu] = useState(false);
  const [gymEl, setGymEl] = useState<HTMLButtonElement | null>(null);
  const canShare = typeof (navigator as Navigator & { share?: unknown }).share === "function";

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPlanId("");
      setGymId("");
      setUses(MIN_USES);
      setError(null);
      setCreated(null);
      setCopied(false);
    }
  }

  // Only plans that can be granted: redeeming refuses any plan that is not active.
  const offered = data.plans.filter((p) => p.dbStatus === "active");
  const plan = offered.find((p) => p.id === planId);
  const gyms = businessGyms(data);
  const gym = gyms.find((g) => g.gymId === gymId);
  const block = createBlock({
    planId: plan ? plan.id : null,
    gymId: gym ? gym.gymId : null,
    gymCount: gyms.length,
    gymsLoading: data.venuesLoading,
    gymsError: !!data.venuesError,
  });

  const create = async () => {
    if (!data.businessId || creating || block) return;
    setCreating(true);
    setError(null);
    const p = plan ? plan.id : null;
    const r = await createMemberCode(data.businessId, p, gymArg(p, gym ? gym.gymId : null, gyms.length), clampUses(uses));
    setCreating(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setCreated(r.code);
    onCreated(r.code);
  };

  // What a created code grants, in words (the server resolved a single gym itself).
  const createdPlan = created?.membershipPlanId ? data.plans.find((p) => p.id === created.membershipPlanId) : undefined;
  const createdGym = created?.gymId ? gyms.find((g) => g.gymId === created.gymId) : undefined;
  const createdGrant = created?.membershipPlanId
    ? ((what: string) => (createdGym ? t("{plan} at {gym}", { plan: what, gym: createdGym.name }) : what))(createdPlan ? `${createdPlan.name} (${kindLabel(createdPlan.kind)})` : t("A plan"))
    : null;

  const footer = (
    <div>
      {error && (
        <p role="alert" className="text-[12px] leading-[17px] text-status-high mb-[8px]">
          {error}
        </p>
      )}
      {!created && !online && <p className="text-[12px] leading-[17px] text-charcoal-faint mb-[8px]">{t("You're offline. Connect to create a code.")}</p>}
      <button
        type="button"
        onClick={() => (created ? onClose() : void create())}
        disabled={!created && (creating || !online || !data.businessId || block !== null)}
        className="tap w-full h-[50px] rounded-[16px] bg-primary-fill text-on-primary-fill text-[14px] font-extrabold disabled:opacity-60"
      >
        {created ? t("Done") : creating ? t("Creating…") : t("Create code")}
      </button>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title={t("Create a member code")} tone="business" footer={footer}>
      {created ? (
        <div className="text-center py-[8px]">
          <p className="text-[24px] font-extrabold tabular-nums tracking-[0.12em] text-charcoal">{created.code}</p>
          <p className="text-[12.5px] leading-[18px] text-charcoal-soft mt-[4px]">{t("Expires {date}.", { date: dMMMyyyy(created.expiresAt) })}</p>
          <p className="text-[12.5px] leading-[18px] text-charcoal-soft mt-[2px]">
            {t(CODE_COPY.usesLabel)}: {usesValue(created.maxUses)}
          </p>
          <p className="text-[12.5px] leading-[18px] text-charcoal-soft mt-[2px]">
            {createdGrant ? t("Comes with {grant}.", { grant: createdGrant }) : t("A member code only. It doesn't come with a membership or pass.")}
          </p>
          <div className="flex justify-center gap-[10px] mt-[16px]">
            <AnRowButton
              icon={copied ? Check : Copy}
              label={copied ? t("Copied") : t("Copy")}
              ariaLabel={t("Copy {code}", { code: created.code })}
              onClick={() =>
                void copyText(created.code).then((ok) => {
                  if (!ok) return onCopyFailed();
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1600);
                })
              }
            />
            {canShare && (
              <AnRowButton
                icon={Share2}
                label={t("Share")}
                onClick={() =>
                  void shareOrCopy({
                    title: t("Centium member code"),
                    text: createdGrant
                      ? t("Your Centium member code is {code}. It comes with {grant}. Redeem it from your Centium profile before {date}.", { code: created.code, grant: createdGrant, date: dMMMyyyy(created.expiresAt) })
                      : t("Your Centium member code is {code}. Redeem it from your Centium profile before {date}.", { code: created.code, date: dMMMyyyy(created.expiresAt) }),
                    copy: created.code,
                  })
                }
              />
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-[14px]">
          <p className="text-[13px] leading-[19px] text-charcoal-soft">
            {vocab.one === "client"
              ? t("Give the code to the client at the desk. They redeem it in their own Centium app and become a member straight away.")
              : t("Give the code to the person at the desk. They redeem it in their own Centium app and become a member straight away.")}
          </p>
          {data.plansLoading && offered.length === 0 ? (
            <div>
              <p className={FIELD_LABEL}>{t("What the code comes with")}</p>
              <button type="button" disabled className={FIELD} style={{ padding: "0 12px" }}>
                <span className="truncate text-charcoal-faint">{t("Loading plans…")}</span>
              </button>
            </div>
          ) : (
            offered.length > 0 && (
              <div>
                <p className={FIELD_LABEL}>{t("What the code comes with")}</p>
                <button
                  ref={setFieldEl}
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={menu}
                  onClick={() => setMenu((m) => !m)}
                  className={FIELD}
                  style={{ padding: "0 12px" }}
                >
                  <span className="truncate">{plan ? `${plan.name} · ${kindLabel(plan.kind)} · ${plan.price}` : t("No plan (member code only)")}</span>
                  <ChevronDown size={16} aria-hidden className="text-charcoal-faint shrink-0" />
                </button>
                <PopupMenu
                  open={menu}
                  onClose={() => setMenu(false)}
                  anchor={fieldEl}
                  matchWidth={fieldEl}
                  variant="field"
                  options={[
                    { value: "", label: t("No plan (member code only)") },
                    ...offered.map((p) => ({ value: p.id, label: `${p.name} · ${kindLabel(p.kind)} · ${p.price}` })),
                  ]}
                  selected={planId}
                  onSelect={(v) => {
                    setPlanId(v);
                    setError(null);
                    setMenu(false);
                  }}
                />
              </div>
            )
          )}

          {plan && (
            <>
              <p className={HINT}>
                {t("When they redeem the code they get this {what} at no charge. It isn't counted as revenue.", { what: kindWord(plan.kind) })}
              </p>
              {block === "gyms-loading" && <p className={HINT}>{t("Loading your gyms…")}</p>}
              {block === "gyms-error" && (
                <div className="flex items-center justify-between gap-[10px]">
                  <p className="text-[12px] leading-[17px] text-status-high">{t("Couldn't load your gyms.")}</p>
                  <button
                    type="button"
                    onClick={data.reloadVenues}
                    disabled={!online}
                    className="tap min-h-[44px] px-[14px] rounded-[12px] text-[13px] font-bold text-primary-dark disabled:opacity-60"
                  >
                    {t("Try again")}
                  </button>
                </div>
              )}
              {block === "no-gym" && (
                <p className="text-[12px] leading-[17px] text-status-high">
                  {t("A membership or pass needs a gym, and your business has none yet. Add a gym first, or choose No plan.")}
                </p>
              )}
              {!block && gyms.length === 1 && (
                <p className={HINT}>
                  {t("The {what} is for {gym}.", { what: kindWord(plan.kind), gym: gyms[0].name })}
                </p>
              )}
              {gyms.length > 1 && !data.venuesError && (
                <div>
                  <p className={FIELD_LABEL}>{t("Which gym is it for?")}</p>
                  <button
                    ref={setGymEl}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={gymMenu}
                    onClick={() => setGymMenu((m) => !m)}
                    className={FIELD}
                    style={{ padding: "0 12px" }}
                  >
                    <span className={gym ? "truncate" : "truncate text-charcoal-faint"}>{gym ? gym.name : t("Choose one of your {n} gyms", { n: gyms.length })}</span>
                    <ChevronDown size={16} aria-hidden className="text-charcoal-faint shrink-0" />
                  </button>
                  <PopupMenu
                    open={gymMenu}
                    onClose={() => setGymMenu(false)}
                    anchor={gymEl}
                    matchWidth={gymEl}
                    variant="field"
                    options={gyms.map((g) => ({ value: g.gymId, label: g.name }))}
                    selected={gymId}
                    onSelect={(v) => {
                      setGymId(v);
                      setError(null);
                      setGymMenu(false);
                    }}
                  />
                </div>
              )}
            </>
          )}
          {/* AB6: "Can be used", 1–50 people, default 1 (a 44 stepper in the field's style). */}
          <div>
            <p className={FIELD_LABEL}>{t(CODE_COPY.usesLabel)}</p>
            <div className={FIELD} style={{ padding: "0 4px" }} role="group" aria-label={t(CODE_COPY.usesLabel)}>
              <button
                type="button"
                aria-label={t(CODE_COPY.fewer)}
                disabled={uses <= MIN_USES}
                onClick={() => setUses((n) => clampUses(n - 1))}
                className="tap w-[40px] h-[40px] rounded-[12px] inline-flex items-center justify-center text-primary-dark disabled:text-charcoal-tertiary"
              >
                <Minus size={16} aria-hidden />
              </button>
              <span className="flex-1 text-center tabular-nums font-bold" aria-live="polite">
                {usesValue(uses)}
              </span>
              <button
                type="button"
                aria-label={t(CODE_COPY.more)}
                disabled={uses >= MAX_USES}
                onClick={() => setUses((n) => clampUses(n + 1))}
                className="tap w-[40px] h-[40px] rounded-[12px] inline-flex items-center justify-center text-primary-dark disabled:text-charcoal-tertiary"
              >
                <Plus size={16} aria-hidden />
              </button>
            </div>
            <p className={`${HINT} mt-[6px]`}>{t(CODE_COPY.usesHint)}</p>
          </div>
          <p className={HINT}>{t("The code works for 7 days.")}</p>
        </div>
      )}
    </BottomSheet>
  );
}
