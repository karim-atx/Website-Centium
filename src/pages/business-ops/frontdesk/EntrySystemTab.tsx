import React, { useCallback, useEffect, useState } from "react";
import { Download, KeyRound, UserMinus, UserPlus } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { BizButton, BizField, BizSheet } from "../../../components/business-more/kit";
import { Toast } from "../../../components/ui/Toast";
import {
  exportEntryMembers,
  fetchEntryExports,
  fetchEntryLists,
  markEntryEnrolled,
  markEntryRemoved,
  undoMarkEntryEnrolled,
  undoMarkEntryRemoved,
  type Ending,
  type EntryExportLog,
  type EntryLists,
  type ToEnrol,
  type VenueEntrySystem,
} from "../../../services/front-desk/entrySystem";
import { entryExportFileName, entryExportRows } from "../../../services/front-desk/entryExportModel";
import { EXTERNAL_ID_MAX, entrySystemDisplay, maskExternalId, normalizeExternalId } from "../../../services/venues/entrySystem";
import { saveCsv } from "../../business-more/exportReports";
import { dayMonthYear } from "../../../services/venues/venueLogic";
import { clock12 } from "../../../utils/time12";
import { todayLocal } from "../../../utils/date";
import { t, tn } from "../../../i18n/core";
import { ChipButton, DeskLabel, DeskRow, ErrorCard, ListCard, ListLine, NumberBoxes, NumberBoxesSkeleton, RowsSkeleton } from "./frontDeskKit";

// Round H (EU, Karim's decisions 3, 4 and 6) · Front desk › Entry system: the
// tab a gym that keeps its own entry system (key cards, a keypad, Kisi…) gets,
// and only that gym. Centium lists who to add to that system and who to take
// off; the desk does it in the system and marks it here.
// - New members to enrol: desk_entry_to_enrol. "Mark enrolled" opens a sheet
//   with an optional external ID (the card or fob number, up to 64
//   characters), prefilled with a renewal's previous ID.
// - Memberships ending: desk_entry_ending. "Mark removed" clears the ID.
// - Both marks can be undone for 10 minutes (the toast's Undo; ATXU6 after).
// - Lists show only first names (Centium stores no surname) and the ID masked
//   to its last 4; the enrol sheet and the export show it in full. Members who
//   haven't agreed to the sharing are only a count.
// - Export (owner or a manager only, ATXU2 otherwise): every active member
//   plus today's changes, on demand, as a CSV; each export is logged
//   (entry_exports), and the last few are listed under the button.
// No board frame: built from the Passes tab's parts (frontDeskKit) and the
// business sheet; strings are ours and have Arabic in i18n/ar/bizops.ts.

type Undo = { kind: "enrolled"; id: string } | { kind: "removed"; id: string; externalId: string | null };

const shortDay = (iso: string | null) => (iso ? dayMonthYear(iso.slice(0, 10)) : null);
const memberLine = (first: string, number: string | null) => (number ? t("{name} · No. {number}", { name: first, number }) : first);

function enrolSub(r: ToEnrol): string {
  const parts = [r.kind === "renewal" ? t("Renewal") : null, r.granted ? t("Granted") : null, r.planName, r.startsOn && r.expiresOn ? t("{start} to {end}", { start: shortDay(r.startsOn)!, end: shortDay(r.expiresOn)! }) : r.startsOn ? t("From {date}", { date: shortDay(r.startsOn)! }) : null];
  const prev = maskExternalId(r.previousExternalId);
  if (prev) parts.push(t("Last ID {id}", { id: prev }));
  return parts.filter(Boolean).join(" · ");
}

const REASON: Record<Ending["reason"], () => string> = {
  expired: () => t("Expired"),
  cancelled: () => t("Cancelled"),
  consent_withdrawn: () => t("Stopped sharing"),
};

function endingSub(r: Ending): string {
  const id = maskExternalId(r.externalId);
  return [REASON[r.reason](), r.planName, r.endedOn ? t("Ended {date}", { date: shortDay(r.endedOn)! }) : null, id ? t("ID {id}", { id }) : null].filter(Boolean).join(" · ");
}

export const EntrySystemTab: React.FC<{ gymId: string; venueName: string; system: VenueEntrySystem; online: boolean }> = ({ gymId, venueName, system, online }) => {
  const { authUserId } = useApp();
  const access = useConsoleAccess();
  const canExport = access.isOwner || access.current?.role === "manager";
  const [lists, setLists] = useState<{ gymId: string; value: EntryLists } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [enrolling, setEnrolling] = useState<ToEnrol | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ n: number; message: string; undo: Undo | null } | null>(null);
  const [exports, setExports] = useState<EntryExportLog[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const reload = useCallback(() => setTick((k) => k + 1), []);
  useEffect(() => {
    let alive = true;
    void fetchEntryLists(gymId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setLists({ gymId, value: r.value });
        setError(null);
      } else setError(r.message);
    });
    return () => {
      alive = false;
    };
  }, [gymId, tick]);
  useEffect(() => {
    if (!canExport) return;
    let alive = true;
    void fetchEntryExports(gymId, 5).then((r) => {
      if (alive && r.ok) setExports(r.value);
    });
    return () => {
      alive = false;
    };
  }, [gymId, canExport, tick]);

  const show = (message: string, undo: Undo | null) => setToast((p) => ({ n: (p?.n ?? 0) + 1, message, undo }));
  const current = lists && lists.gymId === gymId ? lists.value : null;

  const remove = async (r: Ending) => {
    if (busyId || !online) return;
    setBusyId(r.membershipId);
    const res = await markEntryRemoved(r.membershipId);
    setBusyId(null);
    if (!res.ok) return show(res.message, null);
    show(t("{name} marked removed.", { name: r.firstName }), { kind: "removed", id: r.membershipId, externalId: r.externalId });
    reload();
  };

  const undo = async (u: Undo) => {
    setToast(null);
    const res = u.kind === "enrolled" ? await undoMarkEntryEnrolled(u.id) : await undoMarkEntryRemoved(u.id, u.externalId);
    show(res.ok ? t("Undone.") : res.message, null);
    reload();
  };

  const runExport = async () => {
    if (exporting || !online) return;
    setExporting(true);
    setExportError(null);
    const r = await exportEntryMembers(gymId);
    setExporting(false);
    if (!r.ok) return setExportError(r.message);
    const file = entryExportFileName(venueName, todayLocal());
    saveCsv(file, entryExportRows(r.value));
    show(t("{file} downloaded.", { file }), null);
    reload();
  };

  const name = entrySystemDisplay(system.system, system.name);
  return (
    <div>
      <p className="text-[12px] leading-[17px] text-charcoal-soft" style={{ margin: "0 2px 12px" }}>
        {t("{venue} uses its own entry system ({system}). Add new members to it, take ending ones off, and mark each one here.", { venue: venueName, system: name })}
      </p>

      {error && !current ? (
        <ErrorCard title={t("Couldn't load the entry system lists.")} onRetry={reload} />
      ) : !current ? (
        <>
          <NumberBoxesSkeleton />
          <RowsSkeleton rows={2} />
        </>
      ) : (
        <>
          <NumberBoxes
            items={[
              { label: t("To enrol"), value: String(current.summary.toEnrol) },
              { label: t("To remove"), value: String(current.summary.ending) },
              { label: t("Waiting to agree"), value: String(current.summary.awaitingConsent) },
            ]}
          />
          {current.summary.awaitingConsent > 0 && (
            <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ margin: "-6px 2px 14px" }}>
              {tn(
                current.summary.awaitingConsent,
                "{n} member hasn't agreed to the sharing yet, so they aren't listed. They're asked in the app.",
                "{n} members haven't agreed to the sharing yet, so they aren't listed. They're asked in the app."
              )}
            </p>
          )}

          <DeskLabel>{t("New members to enrol")}</DeskLabel>
          {current.toEnrol.length === 0 ? (
            <ListLine>{t("Nobody to enrol.")}</ListLine>
          ) : (
            <ListCard label={t("New members to enrol")}>
              {current.toEnrol.map((r, i) => (
                <DeskRow
                  key={r.membershipId}
                  first={i === 0}
                  icon={UserPlus}
                  title={memberLine(r.firstName, r.memberNumber)}
                  sub={enrolSub(r)}
                  trailing={
                    <ChipButton tone="good" label={t("Mark enrolled")} ariaLabel={t("Mark {name} enrolled", { name: r.firstName })} disabled={!online || !!busyId} onClick={() => setEnrolling(r)} />
                  }
                />
              ))}
            </ListCard>
          )}

          <DeskLabel>{t("Memberships ending")}</DeskLabel>
          {current.ending.length === 0 ? (
            <ListLine>{t("Nobody to remove.")}</ListLine>
          ) : (
            <ListCard label={t("Memberships ending")}>
              {current.ending.map((r, i) => (
                <DeskRow
                  key={r.membershipId}
                  first={i === 0}
                  icon={UserMinus}
                  title={memberLine(r.firstName, r.memberNumber)}
                  sub={endingSub(r)}
                  trailing={
                    <ChipButton
                        tone="high"
                        label={busyId === r.membershipId ? t("Saving…") : t("Mark removed")}
                        ariaLabel={t("Mark {name} removed", { name: r.firstName })}
                        disabled={!online || !!busyId}
                        onClick={() => void remove(r)}
                      />
                  }
                />
              ))}
            </ListCard>
          )}
        </>
      )}

      {canExport && (
        <>
          <DeskLabel>{t("Export")}</DeskLabel>
          <div className="rounded-[18px] bg-[#F7F7FC] dark:bg-th-aea1dc/[0.10]" style={{ padding: 14, marginBottom: 14 }}>
            <p className="text-[12px] leading-[17px] text-charcoal-soft" style={{ margin: 0 }}>
              {t("A spreadsheet of every active member and today's changes, to load into {system}. Each export is recorded.", { system: name })}
            </p>
            <button
              type="button"
              onClick={() => void runExport()}
              disabled={!online || exporting}
              className="tap mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary-dark disabled:opacity-40"
              style={{ minHeight: 44 }}
            >
              <Download size={15} strokeWidth={2} aria-hidden />
              {exporting ? t("Preparing…") : t("Export members (CSV)")}
            </button>
            {exportError && (
              <p role="alert" className="text-[12px] font-bold text-status-high" style={{ margin: 0 }}>
                {exportError}
              </p>
            )}
            {exports.length > 0 && (
              <ul className="list-none p-0 m-0 text-[11.5px] leading-[16px] text-charcoal-faint" aria-label={t("Recent exports")}>
                {exports.map((e) => (
                  <li key={e.exportId}>
                    {t("{date}, {time} · {rows} · {who}", {
                      date: shortDay(e.exportedAt) ?? "",
                      time: clock12(e.exportedAt),
                      rows: tn(e.rowCount, "{n} row", "{n} rows"),
                      who: e.exportedBy && e.exportedBy === authUserId ? t("by you") : t("by a manager"),
                    })}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {enrolling && (
        <EnrolSheet
          row={enrolling}
          system={name}
          online={online}
          onClose={() => setEnrolling(null)}
          onDone={(id) => {
            const r = enrolling;
            setEnrolling(null);
            show(t("{name} marked enrolled.", { name: r.firstName }), { kind: "enrolled", id });
            reload();
          }}
        />
      )}
      {toast && <Toast key={toast.n} open message={toast.message} variant="business" shape="more" onUndo={toast.undo ? () => void undo(toast.undo!) : undefined} onExpire={() => setToast(null)} />}
    </div>
  );
};

function EnrolSheet({ row, system, online, onClose, onDone }: { row: ToEnrol; system: string; online: boolean; onClose: () => void; onDone: (membershipId: string) => void }) {
  const [value, setValue] = useState(row.previousExternalId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const id = normalizeExternalId(value);
  const save = async () => {
    if (id === false || busy) return;
    setBusy(true);
    setError(null);
    const r = await markEntryEnrolled(row.membershipId, id);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onDone(row.membershipId);
  };
  return (
    <BizSheet open onClose={onClose} title={t("Mark {name} enrolled", { name: row.firstName })} lead={t("Once they're added to {system}.", { system })}>
      <div className="flex items-center gap-2.5" style={{ marginBottom: 14 }}>
        <span className="flex items-center justify-center shrink-0 bg-primary-pale text-primary-dark" style={{ width: 36, height: 36, borderRadius: 11 }} aria-hidden>
          <KeyRound size={17} strokeWidth={1.75} />
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold text-charcoal">{memberLine(row.firstName, row.memberNumber)}</span>
          <span className="block text-[11.5px] text-charcoal-faint">{enrolSub(row)}</span>
        </span>
      </div>
      <BizField
        id="entry-external-id"
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
      <BizButton label={t("Mark enrolled")} onClick={() => void save()} disabled={!online || busy || id === false} busy={busy} />
    </BizSheet>
  );
}
