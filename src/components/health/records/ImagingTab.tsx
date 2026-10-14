import React, { useRef, useState } from "react";
import { Eye, MoreVertical, Pencil, ScanLine, Share2, Trash2 } from "lucide-react";
import { SwipeActions } from "../../ui/SwipeActions";
import { PopupMenu } from "../../ui/PopupMenu";
import { textPx, linePx } from "../../../theme/textSize";
import type { ImagingRecord } from "../../../types";
import { useHealthMode, fmtDate, tileFill, ListCard, RowTile, RowText, Skel, RetryCard, EmptyCard, ErrorLine, rowRule, INK_FAINT } from "./kit";

// HE1.9.b · Imaging tab: one list card, rows 66 (ScanLine tile, type,
// "{date} · {note}" on one line, "Scan" when a file is attached or "Typed",
// a ⋮ 32 r9999 with the dropdown View file · Share · Edit · Delete), swipe
// Edit / Delete, tap = the file (HE1.9.b.1) or, with no file, Edit (HE1.9.b.3).

export const ImagingTab: React.FC<{
  records: ImagingRecord[];
  loading: boolean;
  error: string | null;
  writeError: string | null;
  onRetry: () => void;
  onView: (r: ImagingRecord) => void;
  onShare: (r: ImagingRecord) => void;
  onEdit: (r: ImagingRecord) => void;
  onDelete: (r: ImagingRecord) => void;
}> = ({ records, loading, error, writeError, onRetry, onView, onShare, onEdit, onDelete }) => {
  const { dark, hc } = useHealthMode();
  const [menuFor, setMenuFor] = useState<ImagingRecord | null>(null);
  const anchors = useRef(new Map<string, HTMLButtonElement | null>());

  if (loading && records.length === 0) {
    return (
      <ListCard>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center" style={{ height: 66, padding: "9px 14px", gap: 11, borderTop: i ? rowRule(dark, hc) : undefined }}>
            <Skel w={32} h={32} r={10} />
            <span className="flex-1 flex flex-col" style={{ gap: 6 }}>
              <Skel w="35%" h={11} />
              <Skel w="60%" h={9} />
            </span>
          </div>
        ))}
      </ListCard>
    );
  }
  if (error && records.length === 0) return <RetryCard message="Couldn't load your imaging." onRetry={onRetry} />;
  if (records.length === 0) return <EmptyCard icon={ScanLine} title="No imaging yet." body="Add a scan or test result to keep it with your records." />;

  const sorted = [...records].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return (
    <>
      <ListCard>
        {sorted.map((r, i) => {
          const open = menuFor?.id === r.id;
          return (
            <div key={r.id} style={{ borderTop: i ? rowRule(dark, hc) : undefined }}>
              <SwipeActions
                radius={0}
                tileMax={45}
                tileRadius={12}
                edgeInset={8}
                actions={[
                  { key: "edit", label: "Edit", icon: <Pencil size={16} />, onClick: () => onEdit(r) },
                  { key: "delete", label: "Delete", icon: <Trash2 size={16} />, destructive: true, onClick: () => onDelete(r) },
                ]}
              >
                <div className="flex items-center" style={{ minHeight: 66, padding: "9px 14px", gap: 11, background: "rgb(var(--c-cream-card))" }}>
                  <button type="button" onClick={() => (r.filePath ? onView(r) : onEdit(r))} className="tap flex-1 min-w-0 flex items-center text-left" style={{ gap: 11 }}>
                    <RowTile icon={ScanLine} />
                    <RowText title={r.type} meta={r.note ? `${fmtDate(r.date)} · ${r.note}` : fmtDate(r.date)} />
                  </button>
                  <span className="shrink-0" style={{ fontSize: textPx(10.5), lineHeight: linePx(15.8), fontWeight: 600, color: INK_FAINT }}>
                    {r.filePath ? "Scan" : "Typed"}
                  </span>
                  <button
                    ref={(el) => {
                      anchors.current.set(r.id, el);
                    }}
                    type="button"
                    onClick={() => setMenuFor(r)}
                    aria-label={`More options for ${r.type}, ${fmtDate(r.date)}`}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className="tap shrink-0 grid place-items-center relative before:absolute before:-inset-[6px] before:content-['']"
                    style={{ width: 32, height: 32, borderRadius: 9999, background: open ? tileFill(dark) : "transparent" }}
                  >
                    <MoreVertical
                      size={17}
                      style={{ color: open ? (dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-5f5093))") : "rgb(var(--c-charcoal-soft))" }}
                      aria-hidden
                    />
                  </button>
                </div>
              </SwipeActions>
            </div>
          );
        })}
      </ListCard>
      {writeError && <ErrorLine style={{ marginTop: 8 }}>{writeError}</ErrorLine>}
      <PopupMenu
        open={menuFor !== null}
        onClose={() => setMenuFor(null)}
        anchor={menuFor ? anchors.current.get(menuFor.id) ?? null : null}
        options={[
          ...(menuFor?.filePath ? [{ value: "view", label: "View file", icon: <Eye size={15} /> }] : []),
          { value: "share", label: "Share", icon: <Share2 size={15} /> },
          { value: "edit", label: "Edit", icon: <Pencil size={15} /> },
          { value: "delete", label: "Delete", icon: <Trash2 size={15} />, destructive: true },
        ]}
        onSelect={(v) => {
          const r = menuFor;
          if (!r) return;
          if (v === "view") onView(r);
          else if (v === "share") onShare(r);
          else if (v === "edit") onEdit(r);
          else onDelete(r);
        }}
        width={155}
        align="right"
        hairline
        backdrop={false}
        rowLineHeight={18}
      />
    </>
  );
};

/**
 * The client side of the one-time notice (Q-14, B2): from this release a
 * professional sees no scan until the client shares that file. Shown once on
 * the Imaging tab to an account that has imaging; "Got it" is remembered per
 * account in this browser (localStorage `centium-imaging-share-notice:<user
 * id>` = "seen"). The professional-side notice is another screen's.
 */
export const ImagingShareNotice: React.FC<{ userId: string | null; hasImaging: boolean }> = ({ userId, hasImaging }) => {
  const { dark } = useHealthMode();
  const key = userId ? `centium-imaging-share-notice:${userId}` : null;
  const [seen, setSeen] = useState(() => {
    if (!key) return true;
    try {
      return localStorage.getItem(key) === "seen";
    } catch {
      return false;
    }
  });
  if (!key || seen || !hasImaging) return null;
  return (
    <div role="status" style={{ margin: "2px 0 12px", borderRadius: 14, padding: "12px 14px", background: dark ? "rgb(var(--c-primary) / 0.12)" : "rgb(var(--th-9a8cd6) / 0.12)" }}>
      <p style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>Your scans are now shared one at a time</p>
      <p style={{ marginTop: 4, fontSize: textPx(11), lineHeight: linePx(16), color: "rgb(var(--c-charcoal-soft))" }}>
        Professionals you&apos;re connected with no longer see your imaging. They see a scan only after you share that file with them. Open a scan&apos;s menu and choose Share.
      </p>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(key, "seen");
          } catch {
            // private mode: it simply shows again next time
          }
          setSeen(true);
        }}
        className="tap min-h-[44px]"
        style={{ marginBottom: -10, fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))" }}
      >
        Got it
      </button>
    </div>
  );
};
