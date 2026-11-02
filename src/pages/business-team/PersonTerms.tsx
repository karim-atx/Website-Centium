import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { BottomSheet } from "../../components/ui/BottomSheet";
import type { BizKind } from "../../components/business-more/kind";
import { roleUsesSeat, setEmployeeTerms, type BusinessRole, type TeamPerson } from "../../services/business-team/team";
import { DCard, Row } from "./parts";
import { ROLE_DOES, roleLabel, roleOptions } from "./teamLogic";
import { t, tk } from "../../i18n/core";

// OP1-061 / 130 Role card (R1 / R2, S4) and "What they can do" (P, S5), now
// writable through set_employee_terms (B6 follow-up; the V6-84 condition is
// met). Role and permissions are access levels; seats count instructors and
// trainers only. Pay per class sits in the Role card (OURS): NULL means "not
// agreed", cleared with p_clear_pay_rate.

/**
 * The eight permissions: B6's seven plus B7's `venues` (edit a venue's
 * details; adding or removing a venue stays the owner's; on for managers by
 * default). Handover labels where the drawing has one (OP1-061 #14), ours
 * otherwise.
 */
export const PERMISSIONS: { key: string; title: string; sub: string }[] = [
  { key: "schedule", title: tk("Edit the schedule"), sub: tk("Classes, times and descriptions") },
  { key: "messages", title: tk("Message booked members"), sub: tk("For classes they teach") },
  { key: "members", title: tk("Members and team"), sub: tk("Members, join requests and invites") },
  { key: "front_desk", title: tk("Front desk"), sub: tk("Check members in and take cash") },
  { key: "store", title: tk("Store"), sub: tk("Products and orders") },
  { key: "marketing", title: tk("Marketing"), sub: tk("Promotions and your listing") },
  { key: "venues", title: tk("Venues"), sub: tk("Venue name, address and time zone. On for managers") },
  { key: "revenue", title: tk("See Revenue"), sub: tk("Payments and pay") },
];

const SHEET = { tone: "business" as const, headerHeight: 62 as const, bodyPadding: { top: 18, right: 18, bottom: 30, left: 18 } };

const PillToggle = ({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: () => void }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className="tm-switch tm-hit" disabled={disabled} onClick={onChange}>
    <span className="tm-switch-knob" />
  </button>
);

export function RoleCard({
  person,
  kind,
  disabled,
  onSaved,
  onToast,
  onNoSeats,
}: {
  person: TeamPerson;
  kind: BizKind;
  disabled: boolean;
  onSaved: () => void;
  onToast: (m: string, error?: boolean) => void;
  onNoSeats: () => void;
}) {
  const pickRef = useRef<HTMLButtonElement | null>(null);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paySheet, setPaySheet] = useState(false);
  const opts = roleOptions(kind);
  const options = (opts.some((o) => o.value === person.role) ? opts : [...opts, { value: person.role, label: roleLabel(person.role), sub: t(ROLE_DOES[person.role]) }]).map((o) => ({
    value: o.value,
    label: o.label,
    note: roleUsesSeat(o.value) ? `${o.sub} · ${t("uses a seat")}` : o.sub,
  }));

  const pick = async (role: BusinessRole) => {
    setMenu(false);
    if (role === person.role) return;
    setBusy(true);
    const r = await setEmployeeTerms(person.employmentId, { role });
    setBusy(false);
    if (r.ok) {
      onToast(t("{name}'s role is now {role}.", { name: person.name, role: roleLabel(role) }));
      return onSaved();
    }
    if (r.reason === "no_seats") return onNoSeats();
    onToast(r.message, true);
  };

  const pay = person.payRate === null ? t("Not agreed yet") : t("{price} a class", { price: `$${person.payRate.toFixed(2)}` });

  return (
    <DCard title={t("Role")}>
      <Row
        title={t(ROLE_DOES[person.role])}
        sub={t("Change it to update what they can do")}
        trailing={
          <button
            ref={pickRef}
            type="button"
            className="tm-pick tm-hit"
            aria-haspopup="listbox"
            aria-expanded={menu}
            aria-label={t("Role: {role}", { role: roleLabel(person.role) })}
            disabled={disabled || busy}
            onClick={() => setMenu((m) => !m)}
          >
            {busy ? t("Saving…") : roleLabel(person.role)}
            <ChevronDown size={14} />
          </button>
        }
      />
      <Row
        title={t("Pay per class")}
        sub={pay}
        trailing={
          <button type="button" className="tm-pick tm-hit" disabled={disabled} onClick={() => setPaySheet(true)}>
            {person.payRate === null ? t("Set") : t("Change")}
          </button>
        }
      />
      <PopupMenu
        open={menu}
        onClose={() => setMenu(false)}
        anchor={pickRef.current}
        options={options}
        selected={person.role}
        onSelect={(v) => void pick(v as BusinessRole)}
        variant="field"
        heading={t("Role")}
        width={240}
        align="right"
      />
      <PaySheet open={paySheet} person={person} onClose={() => setPaySheet(false)} onSaved={onSaved} onToast={onToast} />
    </DCard>
  );
}

function PaySheet({
  open,
  person,
  onClose,
  onSaved,
  onToast,
}: {
  open: boolean;
  person: TeamPerson;
  onClose: () => void;
  onSaved: () => void;
  onToast: (m: string, error?: boolean) => void;
}) {
  const [value, setValue] = useState(person.payRate === null ? "" : String(person.payRate));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 10000;

  const save = async (clear: boolean) => {
    setBusy(true);
    setError(null);
    const r = await setEmployeeTerms(person.employmentId, clear ? { clearPayRate: true } : { payRate: Math.round(n * 100) / 100 });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onToast(clear ? t("{name}'s pay is marked as not agreed.", { name: person.name }) : t("{name}'s pay is saved.", { name: person.name }));
    onClose();
    onSaved();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("Pay per class")} {...SHEET}>
      <div className="tm-vars">
        <div className="tm-fld">
          <label className="tm-fld-l" htmlFor="tm-pay">
            {t("What {name} earns for each class they teach", { name: person.name })}
          </label>
          <input
            id="tm-pay"
            className={error ? "tm-input err" : "tm-input"}
            inputMode="decimal"
            placeholder="0.00"
            value={value}
            disabled={busy}
            onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ""))}
          />
          {error && <p className="tm-fld-err">{error}</p>}
        </div>
        <p className="tm-sh-note">{t("Used for Pay in Analytics. Leave it as not agreed if you haven't settled a rate.")}</p>
        <button type="button" className={busy ? "tm-sh-btn busy" : "tm-sh-btn"} disabled={!valid || busy} onClick={() => void save(false)}>
          {busy ? t("Saving…") : t("Save")}
        </button>
        {person.payRate !== null && (
          <div style={{ textAlign: "center" }}>
            <button type="button" className="tm-link tap" disabled={busy} onClick={() => void save(true)}>
            {t("Mark as not agreed")}
          </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

/** "What they can do" (OP1-061 #14): one toggle per B6 permission, saved at once, reverted on failure. */
export function PermissionsCard({
  person,
  disabled,
  onSaved,
  onToast,
  readOnly = false,
}: {
  person: TeamPerson;
  disabled: boolean;
  onSaved: () => void;
  onToast: (m: string, error?: boolean) => void;
  /** B7: staff see the switches but only the owner changes them. */
  readOnly?: boolean;
}) {
  const [perms, setPerms] = useState<string[]>(person.permissions);
  const [busy, setBusy] = useState<string | null>(null);

  const flip = async (key: string) => {
    const before = perms;
    const next = perms.includes(key) ? perms.filter((p) => p !== key) : [...perms, key];
    setPerms(next);
    setBusy(key);
    const r = await setEmployeeTerms(person.employmentId, { permissions: next });
    setBusy(null);
    if (!r.ok) {
      setPerms(before);
      return onToast(r.reason === "own" || r.reason === "unknown_permission" ? r.message : t("Couldn't save. Try again."), true);
    }
    onSaved();
  };

  return (
    <DCard title={t("What they can do")}>
      {PERMISSIONS.map((p) => (
        <Row
          key={p.key}
          title={t(p.title)}
          sub={t(p.sub)}
          trailing={<PillToggle on={perms.includes(p.key)} label={t(p.title)} disabled={disabled || busy !== null} onChange={() => void flip(p.key)} />}
        />
      ))}
      <p className="tm-note">
        {readOnly
          ? t("Only the owner can change what people can do.")
          : person.acceptedAt
            ? t("Changes apply straight away. Revenue is never on by default.")
            : t("These apply once {name} accepts. Revenue is never on by default.", { name: person.name })}
      </p>
    </DCard>
  );
}
