import { useState } from "react";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronDown, Copy, Plus, Share2, Ticket, UserMinus, Users, XCircle } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { MemberTag } from "../../../components/marketplace/MemberTag";
import { useOpsToast } from "../../../components/marketplace/VenueKit";
import { copyText, shareOrCopy } from "../../../components/business-more/share";
import { useOnline } from "../../../hooks/useOnline";
import { createMemberCode, endMembership, maskedMemberLabel, type MemberCode, type Membership } from "../../../services/business-members";
import { AnAvatar, AnCard, AnCountLine, AnHeaderRow, AnLead, AnListRow, AnNoneRow, AnNumberBoxes, AnRowButton, AnSeeAll, AnStrip } from "./anKit";
import type { MembersVocab } from "./membersModel";
import { liveCodes, type MembersData } from "./useMembersData";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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

const BASE = "/app/business/analytics/members";

const dMMM = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
};
const dMMMyyyy = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};

const STATUS: Record<Membership["status"], { label: string; tone: "member" | "pending" | "muted" }> = {
  active: { label: "Active", tone: "member" },
  pending: { label: "Pending", tone: "pending" },
  declined: { label: "Declined", tone: "muted" },
  ended: { label: "Ended", tone: "muted" },
};

const memberFact = (m: Membership) =>
  m.status === "ended" && m.endedAt
    ? `Ended ${dMMMyyyy(m.endedAt)}`
    : m.status === "pending"
      ? `Invited ${dMMMyyyy(m.invitedAt)}`
      : m.respondedAt
        ? `Since ${dMMMyyyy(m.respondedAt)}`
        : `Invited ${dMMMyyyy(m.invitedAt)}`;

function createError(code: string | undefined, message: string): string {
  if (code === "ATX09") return "You need Members access to create member codes. Ask the owner.";
  if (code === "ATX25") return "That plan belongs to another business. Choose another plan.";
  if (code === "ATX02") return "You've created a lot of codes in the last hour. Try again later.";
  return message || "Couldn't create a code. Try again.";
}

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

  const codes = data.codes ?? [];
  const waiting = liveCodes(codes);
  const members = data.members ?? [];
  const memberCount = Math.max(data.memberTotal, members.length);
  const memberName = (m: Membership) => m.label ?? maskedMemberLabel(m.id);
  const memberCountLabel = `${memberCount} ${memberCount === 1 ? "member" : "members"}`;
  const redeemed = codes.filter((c) => c.redeemed).length;
  const pct = codes.length > 0 ? Math.round((redeemed / codes.length) * 100) : null;
  const planName = (id: string | null) => (id ? (data.plans.find((p) => p.id === id)?.name ?? "Plan") : "No plan");

  const copy = async (code: string) => {
    if (await copyText(code)) {
      setCopied(code);
      window.setTimeout(() => setCopied((c) => (c === code ? null : c)), 1600);
    } else showToast("Couldn't copy. Select the code and copy it yourself.");
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
    showToast("Membership ended.");
    data.reload();
  };

  const codeRow = (c: MemberCode, i: number) => (
    <AnListRow
      key={c.id}
      first={i === 0}
      mono
      avatar={<AnAvatar icon={Ticket} tone="caution" />}
      name={c.code}
      fact={`Expires ${dMMM(c.expiresAt)} · ${planName(c.membershipPlanId)}`}
      trailing={
        <AnRowButton
          icon={copied === c.code ? Check : Copy}
          label={copied === c.code ? "Copied" : "Copy"}
          ariaLabel={`Copy ${c.code}`}
          onClick={() => void copy(c.code)}
        />
      }
    />
  );

  const memberRow = (m: Membership, i: number) => {
    const st = STATUS[m.status];
    return (
      <AnListRow
        key={m.id}
        first={i === 0}
        avatar={m.label && !isMaskedLabel(m.label) ? <AnAvatar initial={m.label.charAt(0).toUpperCase()} index={i} /> : <AnAvatar masked />}
        name={memberName(m)}
        nameExtra={m.isMinor ? <MemberTag label="Under 18" tone="muted" /> : undefined}
        fact={`${m.planName ?? "No plan"} · ${memberFact(m)}`}
        trailing={
          <span className="flex items-center gap-[8px]">
            <MemberTag label={st.label} tone={st.tone} />
            {(m.status === "active" || m.status === "pending") && (
              <AnRowButton
                icon={UserMinus}
                label="End"
                tone="high"
                ariaLabel={`End ${memberName(m)}'s membership`}
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
      crumb={list ? "Member codes" : vocab.label}
      backLabel={list ? "Back to Member codes" : `Back to ${vocab.label}`}
      onBack={() => (list ? setParams({}, { replace: false }) : navigate(BASE))}
      title={list === "codes" ? "Waiting to be used" : list === "members" ? memberCountLabel : "Member codes"}
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
                <AnCountLine count={`${waiting.length} ${waiting.length === 1 ? "code" : "codes"}`} order="Newest first" />
                {waiting.map(codeRow)}
              </>
            ) : (
              <>
                <AnCountLine count={memberCountLabel} order="Waiting first, then newest" />
                {members.map(memberRow)}
              </>
            )}
          </div>
        </AnCard>
        {list === "members" && members.length < memberCount && (
          <div className="text-center mt-[12px]">
            <AnRowButton icon={Users} label={data.loadingMore ? "Loading…" : `Show more (${memberCount - members.length})`} onClick={data.loadMoreMembers} disabled={data.loadingMore || !online} />
          </div>
        )}
        {list === "members" && (
          <p className="text-[10.5px] leading-[15px] text-charcoal-faint text-center mt-[10px]">
            First names only. Members under 18 are marked.
          </p>
        )}
        {endPopup()}
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
        title="End this membership?"
        subtitle={
          [
            "They stop being a member today. You can invite them again with a new code.",
            !online ? "You're offline." : null,
            endError,
          ]
            .filter(Boolean)
            .join(" ")
        }
        confirmLabel="End membership"
        cancelLabel="Keep it"
        busy={endBusy || !online}
        onCancel={() => !endBusy && setEnding(null)}
        onConfirm={() => void confirmEnd()}
      />
    );
  }

  return (
    <div>
      {header}
      {data.error && <AnStrip offline={!online} text={online ? "Couldn't load your codes. Check your connection and try again." : "You're offline. Showing what was loaded last."} onRetry={data.reload} />}

      <AnCard label="Member codes">
        <AnNumberBoxes
          boxes={[
            { label: "Codes redeemed", value: data.codes === null ? null : pct === null ? null : `${pct}%` },
            { label: "Waiting to be used", value: data.codes === null ? null : waiting.length.toLocaleString() },
          ]}
        />
        <AnLead>
          {redeemed} of {codes.length} {codes.length === 1 ? "code has" : "codes have"} been used. Unused codes stop working after 7 days.
        </AnLead>
        <div style={{ padding: "0 20px 16px" }}>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            disabled={!data.businessId || !online}
            className="tap w-full h-[44px] px-[18px] rounded-[14px] bg-primary-fill text-on-primary-fill inline-flex items-center justify-center gap-[8px] text-[13px] font-bold disabled:opacity-60"
          >
            <Plus size={15} aria-hidden /> Create code
          </button>
          {!online && <p className="text-[11px] leading-[15px] text-charcoal-faint mt-[8px] text-center">Connect to create a code.</p>}
          {!data.businessId && !data.loading && (
            <p className="text-[11px] leading-[15px] text-charcoal-faint mt-[8px] text-center">Save your business profile first. Members belong to it.</p>
          )}
        </div>
      </AnCard>

      <AnCard className="mt-[12px]" label="Codes waiting to be used">
        <div style={{ padding: "4px 16px 4px" }}>
          <AnCountLine count={`${waiting.length} ${waiting.length === 1 ? "code" : "codes"}`} order="Newest first" />
          {waiting.length === 0 ? (
            <AnNoneRow icon={Ticket} tone="caution">
              No codes waiting. Create one when someone joins at the desk.
            </AnNoneRow>
          ) : (
            waiting.slice(0, 3).map(codeRow)
          )}
        </div>
        {waiting.length > 3 && <AnSeeAll n={waiting.length} onClick={() => setParams({ list: "codes" })} />}
      </AnCard>

      <AnCard className="mt-[12px]" label="Members">
        <div style={{ padding: "4px 16px 4px" }}>
          <AnCountLine count={memberCountLabel} order="Waiting first, then newest" />
          {members.length === 0 ? (
            <AnNoneRow icon={Users} tone="pale">
              {data.businessId ? "No members yet. Create a member code and hand it over at the desk." : "Save your business profile first. Members belong to it."}
            </AnNoneRow>
          ) : (
            members.slice(0, 3).map(memberRow)
          )}
        </div>
        {memberCount > 3 && <AnSeeAll n={memberCount} onClick={() => setParams({ list: "members" })} />}
      </AnCard>
      <p className="text-[10.5px] leading-[15px] text-charcoal-faint text-center mt-[10px]">
        First names only. Members under 18 are marked.
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
          showToast("Code created.");
        }}
        onCopyFailed={() => showToast("Couldn't copy. Select the code and copy it yourself.")}
      />
      {endPopup()}
      {toast}
    </div>
  );
}

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
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<MemberCode | null>(null);
  const [copied, setCopied] = useState(false);
  const [menu, setMenu] = useState(false);
  const [fieldEl, setFieldEl] = useState<HTMLButtonElement | null>(null);
  const canShare = typeof (navigator as Navigator & { share?: unknown }).share === "function";

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPlanId("");
      setError(null);
      setCreated(null);
      setCopied(false);
    }
  }

  const create = async () => {
    if (!data.businessId || creating) return;
    setCreating(true);
    setError(null);
    const r = await createMemberCode(data.businessId, planId || null);
    setCreating(false);
    if (!r.ok) {
      setError(createError(r.code, r.message));
      return;
    }
    setCreated(r.code);
    onCreated(r.code);
  };

  const plan = data.plans.find((p) => p.id === planId);
  const footer = (
    <div>
      {error && <p className="text-[12px] leading-[17px] text-status-high mb-[8px]">{error}</p>}
      <button
        type="button"
        onClick={() => (created ? onClose() : void create())}
        disabled={!created && (creating || !online || !data.businessId)}
        className="tap w-full h-[50px] rounded-[16px] bg-primary-fill text-on-primary-fill text-[14px] font-extrabold disabled:opacity-60"
      >
        {created ? "Done" : creating ? "Creating…" : "Create code"}
      </button>
    </div>
  );

  return (
    <BottomSheet open={open} onClose={onClose} title="Create a member code" tone="business" footer={footer}>
      {created ? (
        <div className="text-center py-[8px]">
          <p className="text-[24px] font-extrabold tabular-nums tracking-[0.12em] text-charcoal">{created.code}</p>
          <p className="text-[12.5px] leading-[18px] text-charcoal-soft mt-[4px]">Expires {dMMMyyyy(created.expiresAt)}.</p>
          <div className="flex justify-center gap-[10px] mt-[16px]">
            <AnRowButton
              icon={copied ? Check : Copy}
              label={copied ? "Copied" : "Copy"}
              ariaLabel={`Copy ${created.code}`}
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
                label="Share"
                onClick={() =>
                  void shareOrCopy({
                    title: "Centium member code",
                    text: `Your Centium member code is ${created.code}. Redeem it from your Centium profile before ${dMMMyyyy(created.expiresAt)}.`,
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
            Give the code to the {vocab.one === "client" ? "client" : "person"} at the desk. They redeem it in their own Centium app and become a member straight away.
          </p>
          {data.plans.length > 0 && (
            <div>
              <p className="text-[11px] leading-[14px] font-bold text-charcoal-faint mb-[6px]">Membership plan (optional)</p>
              <button
                ref={setFieldEl}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
                className="tap w-full h-[44px] rounded-[14px] bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] flex items-center justify-between gap-2 text-left text-[13px] leading-[18px] text-charcoal"
                style={{ padding: "0 12px" }}
              >
                <span className="truncate">{plan ? `${plan.name} · ${plan.price}` : "No plan"}</span>
                <ChevronDown size={16} aria-hidden className="text-charcoal-faint shrink-0" />
              </button>
              <PopupMenu
                open={menu}
                onClose={() => setMenu(false)}
                anchor={fieldEl}
                matchWidth={fieldEl}
                variant="field"
                options={[{ value: "", label: "No plan" }, ...data.plans.map((p) => ({ value: p.id, label: `${p.name} · ${p.price}` }))]}
                selected={planId}
                onSelect={(v) => {
                  setPlanId(v);
                  setMenu(false);
                }}
              />
            </div>
          )}
          <p className="text-[11px] leading-[15px] text-charcoal-faint">The code works for 7 days.</p>
        </div>
      )}
    </BottomSheet>
  );
}
