import React, { useEffect, useState } from "react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { PopupMenu } from "../../ui/PopupMenu";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { EVENT_SWATCHES } from "../../calendar/eventColour";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { deleteSessionType, saveSessionType, type LocationKind, type SessionType } from "../../../services/pro/calendar";
import { FieldButton, FieldInput, FieldLabel } from "./calendarFields";
import { DEFAULT_SESSION } from "./calendarItems";
import { Trash2 } from "lucide-react";
import { t } from "../../../i18n/core";

/**
 * Release 3 · W4 CA16 Session type · Detail and edit (source/gen/r6a.js
 * sessionType6): Name; Duration | Buffer after; Price | Package; Location
 * (In person, Online, Both: SegmentedTabs h38); Colour (the twelve swatches
 * SW6, 32 round, 8 apart; selected ring 1 px cream + 2 px charcoal); Who can
 * book; Delete session type (13 / 700 status.high); Save session type.
 *
 * DB-4 appointment_services (pro rows): name ≤ 60, duration 5 to 480 in
 * fives, buffer 0 to 120 in fives, price ≥ 0, colour #RRGGBB, location_kind
 * (null = both). Package and the per-type Who can book have no column, so
 * they are not drawn (W4 notes, backend gaps). Delete hides the type
 * (active false): sessions already booked keep it.
 */

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120];
const BUFFERS = [0, 5, 10, 15, 20, 30];
type Loc = "in_person" | "online" | "both";

export const SessionTypeSheet: React.FC<{
  open: boolean;
  me: string;
  type: SessionType | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, me, type, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(60);
  const [buffer, setBuffer] = useState(0);
  const [price, setPrice] = useState("");
  const [loc, setLoc] = useState<Loc>("both");
  const [colour, setColour] = useState(DEFAULT_SESSION);
  const [durAnchor, setDurAnchor] = useState<HTMLElement | null>(null);
  const [bufAnchor, setBufAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(type?.name ?? "");
    setDuration(type?.durationMin ?? 60);
    setBuffer(type?.bufferMin ?? 0);
    setPrice(type && type.price > 0 ? String(type.price) : "");
    setLoc(type?.locationKind === "in_person" ? "in_person" : type?.locationKind === "online" ? "online" : "both");
    setColour(type?.colour ?? DEFAULT_SESSION);
    setError(null);
    setConfirm(false);
  }, [open, type]);

  const priceNum = price.trim() === "" ? 0 : Number(price.replace(/[^0-9.]/g, ""));
  const valid = name.trim().length >= 1 && name.trim().length <= 60 && Number.isFinite(priceNum) && priceNum >= 0;
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);
  const buffers = BUFFERS.includes(buffer) ? BUFFERS : [...BUFFERS, buffer].sort((a, b) => a - b);

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    const kind: LocationKind = loc === "both" ? null : loc;
    const r = await saveSessionType(me, type?.id ?? null, { name, durationMin: duration, bufferMin: buffer, price: priceNum, colour, locationKind: kind });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved();
    onClose();
  };

  const remove = async () => {
    if (!type) return;
    setBusy(true);
    const r = await deleteSessionType(me, type.id);
    setBusy(false);
    setConfirm(false);
    if (!r.ok) return setError(r.message);
    onSaved();
    onClose();
  };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={t("Session type")}
        footer={<CtaButton size="sheet" className="w-full" label={t("Save session type")} loading={busy} disabled={!valid} onClick={() => void save()} />}
      >
        <div className="flex flex-col" style={{ gap: 14 }}>
          <FieldInput label={t("Name")} value={name} onChange={setName} maxLength={60} />
          <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
            <div className="min-w-0">
              <FieldButton label={t("Duration")} value={t("{duration} min", { duration })} ariaLabel={t("Duration, {duration} min", { duration })} open={!!durAnchor} onClick={(e) => setDurAnchor(e.currentTarget)} />
              <PopupMenu
                open={!!durAnchor}
                onClose={() => setDurAnchor(null)}
                anchor={durAnchor}
                matchWidth={durAnchor}
                options={durations.map((d) => ({ value: String(d), label: t("{d} min", { d }) }))}
                selected={String(duration)}
                onSelect={(v) => {
                  setDuration(Number(v));
                  setDurAnchor(null);
                }}
              />
            </div>
            <div className="min-w-0">
              <FieldButton label={t("Buffer after")} value={t("{buffer} min", { buffer })} ariaLabel={t("Buffer after, {buffer} min", { buffer })} open={!!bufAnchor} onClick={(e) => setBufAnchor(e.currentTarget)} />
              <PopupMenu
                open={!!bufAnchor}
                onClose={() => setBufAnchor(null)}
                anchor={bufAnchor}
                matchWidth={bufAnchor}
                align="right"
                options={buffers.map((d) => ({ value: String(d), label: t("{d} min", { d }) }))}
                selected={String(buffer)}
                onSelect={(v) => {
                  setBuffer(Number(v));
                  setBufAnchor(null);
                }}
              />
            </div>
          </div>
          <FieldInput label={t("Price")} value={price} onChange={setPrice} inputMode="decimal" placeholder={type?.currency === "USD" || !type ? "$0" : "0"} />
          <div>
            <FieldLabel>{t("Location")}</FieldLabel>
            <SegmentedTabs
              items={[
                { key: "in_person", label: t("In person") },
                { key: "online", label: t("Online") },
                { key: "both", label: t("Both") },
              ]}
              activeKey={loc}
              onChange={(k) => setLoc(k as Loc)}
              tabHeight={38}
              labelSize={12}
            />
          </div>
          <div>
            <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 8 }}>{t("Colour")}</span>
            <div className="flex flex-wrap" role="radiogroup" aria-label={t("Colour")} style={{ gap: 8 }}>
              {EVENT_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={colour === c}
                  aria-label={t("Colour {c}", { c })}
                  onClick={() => setColour(c)}
                  className="tap shrink-0 rounded-full"
                  style={{ width: 32, height: 32, background: c, boxShadow: colour === c ? `0 0 0 1px rgb(var(--c-cream)), 0 0 0 3px ${INK.ch}` : "inset 0 0 0 1px rgba(36,31,27,0.12)" }}
                />
              ))}
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 12 }}>
            {error}
          </p>
        )}
        {type && (
          <button type="button" onClick={() => setConfirm(true)} className="tap block w-full text-center" style={{ marginTop: 18, minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.hi }}>{t("Delete session type")}</button>
        )}
      </BottomSheet>
      <CentredPopup
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("Delete this session type?")}
        icon={<Trash2 size={22} strokeWidth={2} aria-hidden />}
        body={t("Clients can't book it any more. Sessions already booked stay on your calendar.")}
      >
        <div className="flex flex-col" style={{ gap: 8 }}>
          <CtaButton size="page" label={t("Delete session type")} loading={busy} onClick={() => void remove()} />
          <CtaButton size="page" variant="secondary" label={t("Keep it")} disabled={busy} onClick={() => setConfirm(false)} />
        </div>
      </CentredPopup>
    </>
  );
};
