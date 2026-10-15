import { useEffect, useRef, useState } from "react";
import { Armchair, AtSign, Check, ChevronDown, Copy, Loader, Send, WifiOff } from "lucide-react";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { useOnline } from "../../../hooks/useOnline";
import { Buttons, ErrLine, LeadRow, Sheet } from "./parts";
import { inviteEmployee, type BusinessRole } from "./teamData";
import { roleUsesSeat } from "../../../services/business-team/seats";
import { ROLE_ICON, ROLE_LABEL, rolesFor, type Vocab } from "./vocab";

// AN5-012 (sheet), AN5-013 / AN5-015 (role listbox, built on PopupMenu as
// HANDOVER §2.2 asks), AN5-016 (sending), AN5-017 (sent), AN5-019 (discard:
// ConfirmCard, DECIDED), AN5-020 (not found), AN5-021 (failed), AN5-022 is
// SeatsSheet's "noseats". invite_employee through the Team service.
//
// Not built, with reasons (BACKEND B6, see the checklist rows):
// - the live "found: Taylor H." chip (row 13.1): invite_employee answers only
//   on send, there is no lookup function, so a miss shows after Send;
// The Message field (rows 13-14) is back: invite_employee stores it as
// invite_message (B6 follow-up, 500 max; the frame caps it at 300 with the
// AN5-015 O1 counter) and the professional sees it with the invitation. Seats count instructors and trainers only (role_uses_seat).

type Step = "form" | "sent" | "failed";

export function InviteSheet({
  open,
  businessId,
  businessCode,
  freeSeats,
  vocab,
  onClose,
  onSent,
  onNoSeats,
}: {
  open: boolean;
  businessId: string | null;
  businessCode: string | null;
  freeSeats: number;
  vocab: Vocab;
  onClose: () => void;
  onSent: () => void;
  onNoSeats: () => void;
}) {
  const online = useOnline();
  const roles = rolesFor(vocab.kind);
  const [step, setStep] = useState<Step>("form");
  const [identifier, setIdentifier] = useState("");
  const [message, setMessage] = useState("");
  const [role, setRole] = useState<BusinessRole>(roles[0]);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);
  const [limited, setLimited] = useState<string | null>(null);
  const [discard, setDiscard] = useState(false);
  const [copied, setCopied] = useState(false);
  const roleRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("form");
    setIdentifier("");
    setMessage("");
    setRole(roles[0]);
    setBusy(false);
    setNotFound(null);
    setLimited(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dirty = identifier.trim().length > 0;
  const close = () => {
    if (busy) return;
    if (step === "form" && dirty) setDiscard(true);
    else onClose();
  };

  const send = async () => {
    if (!businessId || !dirty) return;
    setBusy(true);
    setNotFound(null);
    setLimited(null);
    const r = await inviteEmployee(identifier, role, businessId, message);
    setBusy(false);
    if (r.ok) {
      setStep("sent");
      onSent();
      return;
    }
    if (r.kind === "notfound") setNotFound(identifier);
    else if (r.kind === "noseats") onNoSeats();
    else if (r.kind === "limited" || r.kind === "denied") setLimited(r.message);
    else setStep("failed");
  };

  const copy = () => {
    if (!businessCode) return;
    navigator.clipboard?.writeText(businessCode).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (step === "sent") {
    return (
      <Sheet open={open} onClose={onClose} title="Invite sent">
        <LeadRow icon={Send} tone="good">
          They see the invite in Centium. Their seat shows as pending until they accept.
        </LeadRow>
        <Buttons primary={{ label: "Back to Team", onClick: onClose }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "failed") {
    return (
      <Sheet open={open} onClose={onClose} title="Invite didn't send">
        <LeadRow icon={WifiOff} tone="high">
          Check your connection and try again. Nothing was sent.
        </LeadRow>
        <Buttons alt={{ label: "Cancel", onClick: onClose }} primary={{ label: "Try again", onClick: () => void send(), busy }} marginTop={16} />
      </Sheet>
    );
  }

  const showNotFound = notFound !== null && notFound === identifier;
  const canSend = dirty && !showNotFound && online && !!businessId;
  const RoleIcon = ROLE_ICON[role];

  return (
    <>
      <Sheet open={open} onClose={close} title="Add an employee">
        <div className="an5-idcard">
          <div className="min-w-0">
            <p className="an5-idcard-l">Your business ID</p>
            <p className="an5-idcard-v">{businessCode ?? "–"}</p>
            <p className="an5-idcard-h">Professionals can also enter this to request to join.</p>
          </div>
          <button type="button" className="an5-copy tap" aria-label="Copy business ID" onClick={copy} disabled={!businessCode}>
            {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
          </button>
        </div>

        <p className="an5-sec">Invite a professional</p>
        <div className="an5-fields">
          <div>
            <label className="an5-label" htmlFor="an5-invite-id">
              Centium ID or email
            </label>
            <div className={`an5-field${showNotFound ? " is-error" : ""}`}>
              <span className="an5-field-ic">{busy ? <Loader size={16} className="an5-spin" aria-hidden /> : <AtSign size={16} aria-hidden />}</span>
              <input
                id="an5-invite-id"
                type="text"
                inputMode="email"
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter their Centium ID or email"
                value={identifier}
                disabled={busy || !online}
                aria-invalid={showNotFound || undefined}
                aria-describedby={showNotFound ? "an5-invite-err" : undefined}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            {showNotFound && <ErrLine id="an5-invite-err" text="No professional found with that ID or email." />}
            {limited && <ErrLine text={limited} />}
            {!online && <ErrLine text="You're offline. Invites need a connection." />}
          </div>
          <div>
            <span className="an5-label" id="an5-role-l">
              Role
            </span>
            <button
              ref={roleRef}
              type="button"
              className={`an5-field tap${menu ? " is-focus" : ""}`}
              aria-haspopup="listbox"
              aria-expanded={menu}
              aria-labelledby="an5-role-l"
              disabled={busy}
              onClick={() => setMenu(true)}
            >
              <RoleIcon size={15} style={{ color: "var(--an-pdark)", flexShrink: 0 }} aria-hidden />
              <span className="an5-field-val">{ROLE_LABEL[role]}</span>
              <ChevronDown size={16} style={{ color: "var(--an-faint)", transform: menu ? "rotate(180deg)" : "none" }} aria-hidden />
            </button>
          </div>
        </div>

        <div>
          <label className="an5-label" htmlFor="an5-invite-msg">
            Message (optional)
          </label>
          <textarea
            id="an5-invite-msg"
            className="an5-textarea"
            maxLength={300}
            placeholder="Add a note (optional)"
            value={message}
            disabled={busy}
            aria-describedby={message.length > 0 ? "an5-invite-count" : undefined}
            onChange={(e) => setMessage(e.target.value)}
          />
          {message.length > 0 && (
            <p id="an5-invite-count" className="an5-counter">
              {message.length}/300
            </p>
          )}
        </div>

        <div className="an5-seatnote">
          <Armchair size={16} aria-hidden />
          <span>{!roleUsesSeat(role) ? `${ROLE_LABEL[role]} doesn't use a seat.` : freeSeats <= 1 ? "Uses your last free seat. You can add seats later." : `Uses 1 of your ${freeSeats} free seats. You can add seats later.`}</span>
        </div>

        <Buttons
          alt={{ label: "Cancel", onClick: close, disabled: busy }}
          primary={{ label: busy ? "Sending…" : "Send invite", icon: Send, busy, disabled: !canSend, onClick: () => void send() }}
        />
      </Sheet>

      <PopupMenu
        open={menu}
        onClose={() => setMenu(false)}
        anchor={roleRef.current}
        matchWidth={roleRef.current}
        variant="field"
        heading="Role"
        options={roles.map((r) => {
          const I = ROLE_ICON[r];
          return { value: r, label: ROLE_LABEL[r], icon: <I size={15} aria-hidden /> };
        })}
        selected={role}
        onSelect={(v) => {
          setRole(v as BusinessRole);
          setMenu(false);
        }}
      />

      <ConfirmCard
        open={discard}
        layout="stacked"
        frame="kit"
        tone="destructive"
        title="Discard this invite?"
        subtitle="Nothing has been sent. You can invite them later."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setDiscard(false)}
        onConfirm={() => {
          setDiscard(false);
          onClose();
        }}
      />
    </>
  );
}
