import React, { useId, useRef, useState } from "react";
import { ImageIcon, Minus, Plus } from "lucide-react";
import { sheetChipStyle } from "../../../components/ui/sheetChip";
import { EVENT_SWATCHES } from "../../../components/calendar/eventColour";
import { DEFAULT_SESSION } from "../../../components/pro/calendar/calendarItems";
import { parsePriceInput } from "../../../components/pro/profile/profileModel";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { BILLING_OPTIONS, PLAN_FEATURES_MAX, PLAN_NAME_MAX, type PlanBilling } from "../../../services/hires/proLogic";
import { savePlan, setPlanFields } from "../../../services/pro/profile";
import type { BookingAudience } from "../../../services/pro/calendar";
import {
  FORMATS,
  SHELF_DURATION_MAX,
  SHELF_NAME_MAX,
  formatOfLocation,
  locationOfFormat,
  reorderShelf,
  saveSessionService,
  saveShelfItem,
  shelfMove,
  uploadShelfPhoto,
  type Format,
  type PlanService,
  type ServiceRef,
  type ShelfItem,
} from "../../../services/pro-market";
import { MasterSheet, PrimaryButton, SaveError, SheetBox, SheetSwitch, fieldStyle, lh, px, useMarketColors } from "../../business-market/listingParts";

// Market + Share 3.0 · W3 · P-MA.2 "Edit service" (Professional Marketplace
// Screens lines 551–576 and `sheet` scServiceEdit / scServicePhoto;
// frame-check P-MA.2 "Edit service sheet", "Photo options"). MasterBottomSheet
// chrome (listingParts MasterSheet); the body a column gap 10:
// - the centred 132 × 132 radius 18 --soft photo frame with the 26 camera
//   badge (lucide camera 14 --pdark) and "Tap the photo to change it" 11.5
//   --faint (gap 6, padding-bottom 4); tap → "Service photo" (a second
//   MasterSheet: Take photo · Choose from library · Remove photo, rows 52 tall
//   radius 14 --sgrey 14 / 600, Remove in --high). A shelf item's photo is
//   its live image_url (the product-images bucket under the caller's uid;
//   Take photo / Choose from library upload, Remove photo clears it). A
//   session type or plan has no photo column (DB3 73ea87b added none): an
//   empty frame (never the board's "SERVICE PHOTO") and the rows say it is
//   coming soon;
// - Name, Description, Price (SheetBox: --sgrey radius 14 padding 12 14, the
//   13 / 500 --slabel label, the --sfield field radius 10 padding 11 13);
// - Format chips In person · Online · Both (radius 8, padding 8 12, 13; on
//   the chip fill / white 700, off --chipoffbg / --chipoffbd 500): live for a
//   session type (location_kind; null is Both, as CA16) and a shelf item
//   (`format`); a plan has none (shown off, disabled);
// - "Show in Showcase" / "Off hides it from clients and gyms" with the 42 × 26
//   switch: a shelf item's live `visible`; a session type or plan has no
//   showcase flag (shown on, disabled);
// - footer (padding 8 20 34, the --srule above, gap 4): "Save" (50 tall
//   radius 16 --fill 15 / 700) and "Delete service" (40 tall 14 / 700 --high).
// KEPT live fields (PLAN §3.3, the Services page's ServiceSheet and the
// calendar's SessionTypeSheet), in the same chrome: adding picks the Type
// (Session · Package · Programme · Showcase item); a session type keeps
// Duration, Buffer after, Colour and Who can book (changed in Availability);
// a plan keeps Sessions (a package), Billed, What's included (up to 10),
// Offered and the Move up / Move down order. A Showcase item (the
// professional's own shelf row, Database 73ea87b) adds a free-text Duration
// (its duration_label, "60 min" / "6 weeks": the card's meta line draws it,
// the sheet doesn't; ours) and Move up / Move down through
// reorder_showcase_items (the board draws no drag handle on P-MA.2).

const DURATIONS = [15, 20, 30, 45, 60, 75, 90, 120];
const BUFFERS = [0, 5, 10, 15, 20, 30];
const AUDIENCE_LABEL: Record<BookingAudience, string> = {
  everyone: "Everyone with the link",
  clients_only: "Your clients only",
  approved_only: "People you approve",
};
const SOON_SHOW = "Hiding a service from your Showcase is coming soon.";
const SHOW_SUB = "Off hides it from clients and gyms";
const TAKEN_DOWN_SUB = "Centium took this down. Contact support for details.";

type AddKind = "session" | "package" | "programme" | "shelf";
const KIND_LABEL: Record<AddKind, string> = { session: "Session", package: "Package", programme: "Programme", shelf: "Showcase item" };

export interface ServiceEditSheetProps {
  open: boolean;
  /** The service being edited; null adds one. */
  target: ServiceRef | null;
  plans: PlanService[];
  /** The professional's own shelf items (for Move up / Move down). */
  shelf?: ShelfItem[];
  audience: BookingAudience;
  onClose: () => void;
  onSaved: (message: string) => void;
  onDelete: (ref: ServiceRef) => void;
  onOpenAvailability: () => void;
}

export function ServiceEditSheet(props: ServiceEditSheetProps) {
  if (!props.open) return null;
  return <ServiceForm key={props.target ? `${props.target.kind}:${props.target.item.id}` : "new"} {...props} />;
}

function ServiceForm({ target, plans, shelf = [], audience, onClose, onSaved, onDelete, onOpenAvailability }: ServiceEditSheetProps) {
  const m = useMarketColors();
  const ids = useId();
  const { authUserId } = useApp();
  const online = useOnline();
  const session = target?.kind === "session" ? target.item : null;
  const plan = target?.kind === "plan" ? target.item : null;
  const item = target?.kind === "shelf" ? target.item : null;
  const [kind, setKind] = useState<AddKind>(item ? "shelf" : plan ? (plan.sessionCount !== null ? "package" : "programme") : "session");
  const isSession = kind === "session";
  const isShelf = kind === "shelf";
  const [name, setName] = useState(target?.item.name ?? "");
  const [description, setDescription] = useState(session?.description ?? item?.description ?? "");
  const [price, setPrice] = useState(target && (target.item.price ?? 0) > 0 ? String(target.item.price) : "");
  const [format, setFormat] = useState<Format | null>(session ? formatOfLocation(session.locationKind) : item ? item.format : target ? null : "in_person");
  const [durationLabel, setDurationLabel] = useState(item?.durationLabel ?? "");
  const [shown, setShown] = useState(item?.visible ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(item?.imageUrl ?? null);
  /** A photo URL that failed to load: the empty frame shows instead of a broken image. */
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);
  const takenDown = !!item?.hiddenByCentium;
  const [duration, setDuration] = useState(session?.durationMin ?? 60);
  const [buffer, setBuffer] = useState(session?.bufferMin ?? 0);
  const [colour, setColour] = useState(session?.colour ?? DEFAULT_SESSION);
  const [sessions, setSessions] = useState(plan?.sessionCount ? String(plan.sessionCount) : "10");
  const [billing, setBilling] = useState<PlanBilling>(plan && (["daily", "monthly", "annually"] as string[]).includes(plan.billing) ? (plan.billing as PlanBilling) : "monthly");
  const [features, setFeatures] = useState<string[]>(plan && plan.features.length ? plan.features : [""]);
  const [active, setActive] = useState(plan?.active ?? true);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoNote, setPhotoNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);
  const buffers = BUFFERS.includes(buffer) ? BUFFERS : [...BUFFERS, buffer].sort((a, b) => a - b);
  const editing = !!target;

  const save = async () => {
    if (!authUserId || busy) return;
    setError(null);
    const p = parsePriceInput(price);
    if (p === null) return setError("Enter the price as a number, for example 60, or leave it empty for Free.");
    if (!name.trim()) return setError("Give the service a name.");
    setBusy(true);
    if (isShelf) {
      // An empty price shows no price on the shelf (a session's empty price is Free).
      const r = await saveShelfItem(authUserId, item?.id ?? null, {
        name,
        description,
        price: price.trim() === "" ? null : p,
        imageUrl,
        format,
        durationLabel,
        visible: shown,
      });
      setBusy(false);
      if (!r.ok) return setError(r.message);
      return onSaved(editing ? "Service saved" : `${name.trim()} added`);
    }
    if (isSession) {
      const r = await saveSessionService(authUserId, session?.id ?? null, {
        name,
        description,
        durationMin: duration,
        bufferMin: buffer,
        price: p,
        colour,
        locationKind: locationOfFormat(format, session ? session.locationKind : "in_person"),
      });
      setBusy(false);
      if (!r.ok) return setError(r.message);
      return onSaved(editing ? "Service saved" : `${name.trim()} added`);
    }
    const count = kind === "package" ? Number(sessions) : null;
    if (kind === "package" && (!Number.isInteger(count) || (count ?? 0) < 1)) {
      setBusy(false);
      return setError("Enter how many sessions the package holds.");
    }
    const position = plan ? plan.position : plans.reduce((mx, x) => Math.max(mx, x.position + 1), 0);
    const r = await savePlan(authUserId, plan?.id ?? null, { name, price: String(p), billing, features, active, sessionCount: count }, position);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSaved(editing ? "Service saved" : `${r.plan.name} added`);
  };

  // The plan editor's reorder (kept): swap positions with the neighbour. A
  // shelf item moves through reorder_showcase_items (the whole shelf's order).
  const move = async (dir: -1 | 1) => {
    if (item) {
      const next = shelfMove(shelf, item.id, dir);
      if (!next || busy) return;
      setBusy(true);
      setError(null);
      const r = await reorderShelf(next);
      setBusy(false);
      if (!r.ok) return setError(r.message);
      return onSaved(dir < 0 ? "Moved up" : "Moved down");
    }
    if (!plan || busy) return;
    const sorted = [...plans].sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
    const i = sorted.findIndex((x) => x.id === plan.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    setBusy(true);
    setError(null);
    const a = await setPlanFields(sorted[i].id, { position: j });
    const b = a.ok ? await setPlanFields(sorted[j].id, { position: i }) : a;
    setBusy(false);
    if (!b.ok) return setError(b.message);
    onSaved(dir < 0 ? "Moved up" : "Moved down");
  };

  const pickPhoto = async (file: File | undefined) => {
    if (!file || !authUserId) return;
    setPhotoOpen(false);
    setPhotoBusy(true);
    setPhotoError(null);
    const r = await uploadShelfPhoto(authUserId, file);
    setPhotoBusy(false);
    if (!r.ok) return setPhotoError(r.message);
    setImageUrl(r.url);
  };

  const chip = (on: boolean, disabled?: boolean): React.CSSProperties => ({
    ...sheetChipStyle(on),
    padding: "8px 12px",
    fontSize: px(13),
    fontFamily: "inherit",
    lineHeight: "normal",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.4 : 1,
  });
  const chipRow = (labelId: string, children: React.ReactNode) => (
    <div role="radiogroup" aria-labelledby={labelId} className="no-scrollbar" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {children}
    </div>
  );
  const groupLabel = (id: string, text: string) => (
    <div id={id} style={{ fontSize: px(13), fontWeight: 500, color: m.slabel, marginBottom: 8, lineHeight: "normal" }}>
      {text}
    </div>
  );
  const hint = (text: string, id?: string) => (
    <div id={id} style={{ fontSize: px(11.5), lineHeight: lh(16), color: m.faint, marginTop: 8 }}>
      {text}
    </div>
  );
  const grey: React.CSSProperties = { background: m.sgrey, borderRadius: 14, padding: "12px 14px" };

  return (
    <>
      <MasterSheet
        open={!photoOpen}
        onClose={onClose}
        title={editing ? "Edit service" : "Add service"}
        footer={
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <PrimaryButton onClick={() => void save()} disabled={!online || !name.trim()} busy={busy}>
              {busy ? "Saving…" : editing ? "Save" : "Add to profile"}
            </PrimaryButton>
            {error ? <SaveError style={{ marginTop: 4 }}>{error}</SaveError> : null}
            {target ? (
              <button
                type="button"
                onClick={() => onDelete(target)}
                disabled={busy || !online}
                className="market-focus"
                style={{ height: 40, minHeight: 40, border: 0, background: "transparent", color: m.high, fontSize: px(14), fontWeight: 700, fontFamily: "inherit", cursor: "pointer", opacity: busy || !online ? 0.4 : 1 }}
              >
                Delete service
              </button>
            ) : null}
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: m.ink, lineHeight: "normal" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: 4 }}>
            <button
              type="button"
              aria-label={isShelf && !imageUrl ? "Add a photo" : "Change photo"}
              aria-haspopup="dialog"
              disabled={isShelf && (photoBusy || !online)}
              onClick={() => {
                setPhotoNote(false);
                setPhotoOpen(true);
              }}
              className="market-focus"
              style={{ position: "relative", width: 132, height: 132, borderRadius: 18, background: m.soft, border: 0, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              {isShelf && imageUrl && failedUrl !== imageUrl ? (
                <img src={imageUrl} alt="" onError={() => setFailedUrl(imageUrl)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18, display: "block" }} />
              ) : (
                <ImageIcon size={28} strokeWidth={1.6} color={m.tert} aria-hidden />
              )}
              {photoBusy ? <span className="animate-skeleton-pulse" aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 18, background: m.soft, opacity: 0.7 }} /> : null}
              <span aria-hidden style={{ position: "absolute", right: 6, bottom: 6, width: 26, height: 26, borderRadius: 999, background: m.card, display: "flex", alignItems: "center", justifyContent: "center", color: m.pdark, boxShadow: "0 1px 3px rgba(36,31,27,0.16)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: "none" }}>
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </span>
            </button>
            <span style={{ fontSize: px(11.5), color: m.faint }}>{photoBusy ? "Uploading…" : "Tap the photo to change it"}</span>
            {photoError ? (
              <span role="alert" style={{ fontSize: px(11.5), color: m.high, textAlign: "center" }}>
                {photoError}
              </span>
            ) : null}
          </div>

          {!editing ? (
            <div style={grey}>
              {groupLabel(`${ids}-type`, "Type")}
              {chipRow(
                `${ids}-type`,
                (["session", "package", "programme", "shelf"] as AddKind[]).map((k) => (
                  <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className="market-focus" style={chip(kind === k)}>
                    {KIND_LABEL[k]}
                  </button>
                ))
              )}
            </div>
          ) : null}

          <SheetBox label="Name" htmlFor={`${ids}-name`}>
            <input id={`${ids}-name`} value={name} onChange={(e) => setName(e.target.value)} maxLength={isSession ? 60 : isShelf ? SHELF_NAME_MAX : PLAN_NAME_MAX} style={fieldStyle(m)} />
          </SheetBox>

          <SheetBox label="Description" htmlFor={`${ids}-desc`}>
            {isSession || isShelf ? (
              <textarea
                id={`${ids}-desc`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={1}
                placeholder="Optional"
                style={{ ...fieldStyle(m), resize: "none", minHeight: 41, fieldSizing: "content" } as React.CSSProperties}
              />
            ) : (
              <>
                <input id={`${ids}-desc`} disabled aria-describedby={`${ids}-desc-note`} value="" placeholder="Optional" style={{ ...fieldStyle(m), opacity: 0.4 }} />
                {hint("Descriptions for packages and programmes are coming soon. What's included shows on the card.", `${ids}-desc-note`)}
              </>
            )}
          </SheetBox>

          <SheetBox label="Price" htmlFor={`${ids}-price`}>
            <input id={`${ids}-price`} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={isShelf ? "Optional" : "Free"} inputMode="decimal" style={fieldStyle(m)} />
          </SheetBox>

          <div style={grey}>
            {groupLabel(`${ids}-fmt`, "Format")}
            {chipRow(
              `${ids}-fmt`,
              FORMATS.map((f) => {
                const live = isSession || isShelf;
                const on = live && format === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-disabled={!live || undefined}
                    aria-describedby={!live ? `${ids}-fmt-note` : undefined}
                    onClick={() => live && setFormat(f.key)}
                    className="market-focus"
                    style={chip(on, !live)}
                  >
                    {f.label}
                  </button>
                );
              })
            )}
            {!isSession && !isShelf ? hint("Format for packages and programmes is coming soon.", `${ids}-fmt-note`) : null}
          </div>

          {isShelf ? (
            <>
              <SheetBox label="Duration" htmlFor={`${ids}-len`}>
                <input
                  id={`${ids}-len`}
                  value={durationLabel}
                  onChange={(e) => setDurationLabel(e.target.value)}
                  maxLength={SHELF_DURATION_MAX}
                  placeholder="Optional, for example 60 min or 6 weeks"
                  style={fieldStyle(m)}
                />
              </SheetBox>
              {item && shelf.length > 1 ? (
                <div style={{ display: "flex", gap: 8 }}>
                  {([-1, 1] as const).map((dir) => {
                    const can = !!shelfMove(shelf, item.id, dir);
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => void move(dir)}
                        disabled={busy || !online || !can}
                        className="tap market-focus"
                        style={{ minHeight: 40, padding: "0 12px", borderRadius: 12, border: `1px solid ${m.border}`, background: "transparent", color: m.pdark, fontSize: px(12.5), fontWeight: 800, fontFamily: "inherit", cursor: "pointer", opacity: busy || !online || !can ? 0.4 : 1 }}
                      >
                        {dir < 0 ? "Move up" : "Move down"}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </>
          ) : isSession ? (
            <>
              <div style={grey}>
                {groupLabel(`${ids}-dur`, "Duration")}
                {chipRow(
                  `${ids}-dur`,
                  durations.map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={duration === d} onClick={() => setDuration(d)} className="market-focus" style={chip(duration === d)}>
                      {d} min
                    </button>
                  ))
                )}
              </div>
              <div style={grey}>
                {groupLabel(`${ids}-buf`, "Buffer after")}
                {chipRow(
                  `${ids}-buf`,
                  buffers.map((b) => (
                    <button key={b} type="button" role="radio" aria-checked={buffer === b} onClick={() => setBuffer(b)} className="market-focus" style={chip(buffer === b)}>
                      {b === 0 ? "None" : `${b} min`}
                    </button>
                  ))
                )}
              </div>
              <div style={grey}>
                {groupLabel(`${ids}-col`, "Colour in your calendar")}
                <div role="radiogroup" aria-labelledby={`${ids}-col`} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {EVENT_SWATCHES.map((s) => {
                    const on = colour.toLowerCase() === s.toLowerCase();
                    return (
                      <button
                        key={s}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={`Colour ${s}`}
                        onClick={() => setColour(s)}
                        className="tap market-focus"
                        style={{ width: 28, height: 28, borderRadius: 999, background: s, border: 0, padding: 0, cursor: "pointer", boxShadow: on ? `0 0 0 2px ${m.sgrey}, 0 0 0 4px ${m.ink}` : undefined }}
                      />
                    );
                  })}
                </div>
              </div>
              <div style={{ ...grey, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: px(14), fontWeight: 700 }}>Who can book</div>
                  <div style={{ fontSize: px(11.5), color: m.faint }}>{AUDIENCE_LABEL[audience]}</div>
                </div>
                <button
                  type="button"
                  onClick={onOpenAvailability}
                  aria-label={`Who can book: ${AUDIENCE_LABEL[audience]}. Change it in Availability`}
                  className="tap market-focus"
                  style={{ border: 0, background: "transparent", color: m.pdark, fontSize: px(12.5), fontWeight: 800, fontFamily: "inherit", cursor: "pointer", padding: "2px 4px", flexShrink: 0 }}
                >
                  Change
                </button>
              </div>
            </>
          ) : (
            <>
              {kind === "package" ? (
                <SheetBox label="Sessions" htmlFor={`${ids}-count`}>
                  <input id={`${ids}-count`} value={sessions} onChange={(e) => setSessions(e.target.value.replace(/\D/g, ""))} inputMode="numeric" style={fieldStyle(m)} />
                </SheetBox>
              ) : null}
              <div style={grey}>
                {groupLabel(`${ids}-bill`, "Billed")}
                {chipRow(
                  `${ids}-bill`,
                  BILLING_OPTIONS.map((b) => (
                    <button key={b.value} type="button" role="radio" aria-checked={billing === b.value} onClick={() => setBilling(b.value)} className="market-focus" style={chip(billing === b.value)}>
                      {b.label}
                    </button>
                  ))
                )}
              </div>
              <div style={grey}>
                {groupLabel(`${ids}-inc`, `What's included (up to ${PLAN_FEATURES_MAX})`)}
                <div role="group" aria-labelledby={`${ids}-inc`} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {features.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input value={f} aria-label={`Included, line ${i + 1}`} onChange={(e) => setFeatures((fs) => fs.map((x, k) => (k === i ? e.target.value : x)))} style={{ ...fieldStyle(m), flex: 1, minWidth: 0 }} />
                      <button
                        type="button"
                        onClick={() => setFeatures((fs) => (fs.length > 1 ? fs.filter((_, k) => k !== i) : [""]))}
                        aria-label={`Remove included line ${i + 1}`}
                        className="tap market-focus"
                        style={{ width: 28, height: 28, borderRadius: 999, background: m.card, color: m.faint, border: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}
                      >
                        <Minus size={14} strokeWidth={2.4} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
                {features.length < PLAN_FEATURES_MAX ? (
                  <button
                    type="button"
                    onClick={() => setFeatures((fs) => [...fs, ""])}
                    className="tap market-focus"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, border: 0, background: "transparent", padding: "2px 0", color: m.pdark, fontSize: px(12.5), fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    <Plus size={13} strokeWidth={2.4} aria-hidden /> Add a line
                  </button>
                ) : null}
              </div>
              <div style={{ ...grey, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: px(14), fontWeight: 700 }}>Offered</div>
                  <div id={`${ids}-off`} style={{ fontSize: px(11.5), color: m.faint }}>
                    Clients only see plans that are switched on.
                  </div>
                </div>
                <SheetSwitch on={active} onChange={setActive} label="Offered" describedBy={`${ids}-off`} />
              </div>
              {plan && plans.length > 1 ? (
                <div style={{ display: "flex", gap: 8 }}>
                  {([-1, 1] as const).map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => void move(dir)}
                      disabled={busy || !online}
                      className="tap market-focus"
                      style={{ minHeight: 40, padding: "0 12px", borderRadius: 12, border: `1px solid ${m.border}`, background: "transparent", color: m.pdark, fontSize: px(12.5), fontWeight: 800, fontFamily: "inherit", cursor: "pointer", opacity: busy || !online ? 0.4 : 1 }}
                    >
                      {dir < 0 ? "Move up" : "Move down"}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}

          <div style={{ ...grey, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: px(14), fontWeight: 700 }}>Show in Showcase</div>
              <div id={`${ids}-vis`} style={{ fontSize: px(11.5), color: m.faint }}>
                {isShelf ? (takenDown ? TAKEN_DOWN_SUB : SHOW_SUB) : SOON_SHOW}
              </div>
            </div>
            {isShelf ? (
              <SheetSwitch on={shown && !takenDown} onChange={setShown} label="Show in Showcase" describedBy={`${ids}-vis`} disabled={takenDown} />
            ) : (
              // awaiting DB stage DB3: showcase_visible on appointment_services / professional_plans (73ea87b added none); every live service shows.
              <SheetSwitch on onChange={() => undefined} label="Show in Showcase" describedBy={`${ids}-vis`} disabled />
            )}
          </div>
        </div>
      </MasterSheet>

      <MasterSheet open={photoOpen} onClose={() => setPhotoOpen(false)} title="Service photo" footer={<span />}>
        {isShelf ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, color: m.ink, lineHeight: "normal" }}>
            {(["Take photo", "Choose from library", "Remove photo"] as const).map((label) => {
              const remove = label === "Remove photo";
              const off = remove && !imageUrl;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    if (label === "Take photo") camRef.current?.click();
                    else if (label === "Choose from library") libRef.current?.click();
                    else {
                      setImageUrl(null);
                      setPhotoOpen(false);
                    }
                  }}
                  disabled={off}
                  className="market-focus"
                  style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 14px", borderRadius: 14, background: m.sgrey, border: 0, fontFamily: "inherit", fontSize: px(14), fontWeight: 600, color: remove ? m.high : m.ink, textAlign: "left", cursor: off ? "default" : "pointer", opacity: off ? 0.4 : 1 }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: m.ink, lineHeight: "normal" }}>
          {(["Take photo", "Choose from library", "Remove photo"] as const).map((label) => {
            const remove = label === "Remove photo";
            return (
              <button
                key={label}
                type="button"
                // awaiting DB stage DB3: photo_path on appointment_services / professional_plans (73ea87b added none). No photo can be stored yet, so there is none to remove.
                onClick={() => setPhotoNote(true)}
                disabled={remove}
                aria-describedby={`${ids}-photo-note`}
                className="market-focus"
                style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 52, padding: "0 14px", borderRadius: 14, background: m.sgrey, border: 0, fontFamily: "inherit", fontSize: px(14), fontWeight: 600, color: remove ? m.high : m.ink, textAlign: "left", cursor: remove ? "default" : "pointer", opacity: remove ? 0.4 : 1 }}
              >
                {label}
              </button>
            );
          })}
          <p id={`${ids}-photo-note`} role={photoNote ? "status" : undefined} style={{ fontSize: px(11.5), lineHeight: lh(16), color: m.faint, textAlign: "center", margin: "4px 0 0" }}>
            Service photos are coming soon.
          </p>
        </div>
        )}
      </MasterSheet>
      <input
        ref={camRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void pickPhoto(f);
        }}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          void pickPhoto(f);
        }}
      />
    </>
  );
}
