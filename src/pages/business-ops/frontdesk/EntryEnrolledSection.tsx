import React, { useEffect, useState } from "react";
import { IdCard, Search } from "lucide-react";
import { BizButton, BizField, BizSheet, SearchBox } from "../../../components/business-more/kit";
import { fetchEnrolled, setEntryExternalId, type Enrolled } from "../../../services/front-desk/entrySystem";
import { EXTERNAL_ID_MAX, maskExternalId, normalizeExternalId } from "../../../services/venues/entrySystem";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { t, tx } from "../../../i18n/core";
import { ChipButton, DeskLabel, DeskRow, ErrorCard, ListCard, ListLine, RowsSkeleton } from "./frontDeskKit";

// Round H (EU, Karim 2026-11-04) · Front desk › Entry system › Enrolled: the
// members already in the gym's own system (desk_entry_enrolled), searchable
// by first name, member number or ID, 50 at a time, and "Change ID" for a
// lost or replaced card (set_entry_external_id; an empty field clears it,
// ATXU4 a bad value). The list masks the ID to its last 4; the sheet shows it
// in full, as the enrol sheet does.

const PAGE = 50;

export const EntryEnrolledSection: React.FC<{ gymId: string; online: boolean; tick: number; onSaved: (toast: string) => void }> = ({ gymId, online, tick, onSaved }) => {
  const [query, setQuery] = useState("");
  const [asked, setAsked] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [state, setState] = useState<{ key: string; rows: Enrolled[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [editing, setEditing] = useState<Enrolled | null>(null);

  // The search runs 300 ms after the last keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setAsked(query.trim());
      setLimit(PAGE);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const key = `${gymId}|${asked}|${limit}|${tick}|${retry}`;
  useEffect(() => {
    let alive = true;
    void fetchEnrolled(gymId, asked, limit, 0).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setState({ key, rows: r.value.rows, total: r.value.total });
        setError(null);
      } else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [gymId, asked, limit, tick, retry, key]);

  const current = state && state.key === key ? state : null;
  const shown = state;
  return (
    <>
      <DeskLabel trailing={shown ? <span className="text-[11px] font-semibold text-charcoal-faint tabular-nums">{shown.total}</span> : undefined}>{tx("Enrolled", "entry system")}</DeskLabel>
      <div style={{ marginBottom: 10 }}>
        <SearchBox value={query} onChange={setQuery} placeholder={t("First name, member number or ID")} label={t("Search enrolled members")} icon={Search} onClear={() => setQuery("")} />
      </div>
      {error && !shown ? (
        <ErrorCard title={t("Couldn't load the enrolled members.")} onRetry={() => setRetry((k) => k + 1)} />
      ) : !shown ? (
        <RowsSkeleton rows={2} />
      ) : shown.rows.length === 0 ? (
        <ListLine>{asked ? t("No enrolled member matches that.") : t("Nobody is enrolled yet.")}</ListLine>
      ) : (
        <ListCard label={tx("Enrolled", "entry system")}>
          {shown.rows.map((r, i) => {
            const id = maskExternalId(r.externalId);
            return (
              <DeskRow
                key={r.membershipId}
                first={i === 0}
                icon={IdCard}
                title={r.memberNumber ? t("{name} · No. {number}", { name: r.firstName, number: r.memberNumber }) : r.firstName}
                sub={[id ? t("ID {id}", { id }) : t("No ID"), r.planName, r.expiresOn ? t("Until {date}", { date: dayMonthYear(r.expiresOn.slice(0, 10)) }) : null].filter(Boolean).join(" · ")}
                trailing={<ChipButton tone="pale" label={t("Change ID")} ariaLabel={t("Change {name}'s ID", { name: r.firstName })} disabled={!online} onClick={() => setEditing(r)} />}
              />
            );
          })}
        </ListCard>
      )}
      {shown && shown.rows.length < shown.total && (
        <button type="button" onClick={() => setLimit((l) => Math.min(200, l + PAGE))} disabled={!current || limit >= 200} className="tap text-[12px] font-bold text-primary-dark disabled:opacity-40" style={{ minHeight: 44, marginTop: -6, marginBottom: 8 }}>
          {limit >= 200 ? t("Search to find more") : t("Show more")}
        </button>
      )}
      {editing && (
        <ChangeIdSheet
          row={editing}
          online={online}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setEditing(null);
            setRetry((k) => k + 1);
            onSaved(msg);
          }}
        />
      )}
    </>
  );
};

function ChangeIdSheet({ row, online, onClose, onDone }: { row: Enrolled; online: boolean; onClose: () => void; onDone: (toast: string) => void }) {
  const [value, setValue] = useState(row.externalId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = normalizeExternalId(value);
  const same = (id === false ? null : id) === (row.externalId ?? null);
  const save = async () => {
    if (id === false || busy || same) return;
    setBusy(true);
    setError(null);
    const r = await setEntryExternalId(row.membershipId, id);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onDone(id ? t("{name}'s ID changed.", { name: row.firstName }) : t("{name}'s ID removed.", { name: row.firstName }));
  };
  return (
    <BizSheet open onClose={onClose} title={t("Change {name}'s ID", { name: row.firstName })} lead={t("Change it here once you've changed it in your entry system. Leave it empty to remove it.")}>
      <BizField
        id="entry-change-id"
        label={t("Card, fob or user ID (optional)")}
        value={value}
        onChange={setValue}
        maxLength={EXTERNAL_ID_MAX}
        placeholder={t("For example, 0042117")}
        error={id === false ? t("Use one line of up to {n} characters for the ID.", { n: EXTERNAL_ID_MAX }) : error}
      />
      <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ margin: "-4px 2px 12px" }}>
        {t("Only a card, fob or member number. Never fingerprints, face data or any other biometric data.")}
      </p>
      <BizButton label={t("Save")} onClick={() => void save()} disabled={!online || busy || id === false || same} busy={busy} />
    </BizSheet>
  );
}
