import React, { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { fetchConnectedProfessional, professionalRole } from "../../services/connected-professional";

/** "Updated 2d ago" (WO25). Beyond a week, the date. */
function updatedAgo(iso: string | undefined, now = Date.now()): string | null {
  if (!iso) return null;
  const mins = Math.floor((now - Date.parse(iso)) / 60000);
  if (!Number.isFinite(mins)) return null;
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days <= 7) return `Updated ${days}d ago`;
  return `Updated ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

/**
 * WO25 · Coach's note popup, from the note icon in the logger header.
 *
 * Filled: the coach (initials avatar, first name, "· role"), "Updated 2d ago",
 * and the note in a tinted box that scrolls inside a max height with Close
 * pinned below it. Empty: the existing line. The coach's name and role come
 * from connected_professional_summary (first name only; the view has no last
 * name) for routines.assigned_by_professional_id; when the relationship has
 * ended the view returns nothing and the popup says "Your coach".
 */
export const CoachNotePopup: React.FC<{
  note: string | undefined;
  updatedAt: string | undefined;
  professionalId: string | undefined;
  onClose: () => void;
}> = ({ note, updatedAt, professionalId, onClose }) => {
  const [coach, setCoach] = useState<{ name: string; role: string | null } | null>(null);

  useEffect(() => {
    if (!note || !professionalId) return;
    let cancelled = false;
    void fetchConnectedProfessional(professionalId).then((result) => {
      if (cancelled || !result.ok || !result.professional) return;
      const p = result.professional;
      setCoach({ name: p.firstName?.trim() || "Your coach", role: professionalRole(p) });
    });
    return () => {
      cancelled = true;
    };
  }, [note, professionalId]);

  const name = coach?.name ?? "Your coach";
  // Initials from the name we have (first name only, so usually one letter).
  const initials = coach ? name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") : "";
  const ago = updatedAgo(updatedAt);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Coach's note"
        className="relative w-full flex flex-col animate-pop"
        style={{
          maxWidth: 330,
          maxHeight: "min(80dvh, 560px)",
          background: "#FFFFFF",
          borderRadius: 20,
          padding: 18,
          boxShadow: "0 16px 40px rgba(0,0,0,0.18)",
        }}
      >
        <p className="flex items-center" style={{ margin: "0 0 12px", gap: 8, fontSize: 16, fontWeight: 700, color: "#241F1B" }}>
          <MessageSquareText size={16} style={{ color: "#7D6BB5" }} /> Coach's note
        </p>
        {note ? (
          <>
            <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
              <span
                aria-hidden
                className="flex-none flex items-center justify-center rounded-full"
                style={{ width: 36, height: 36, background: "#A2C8C2", color: "#FFFFFF", fontSize: 12, fontWeight: 700 }}
              >
                {initials || <MessageSquareText size={15} />}
              </span>
              <div className="min-w-0">
                <p className="truncate" style={{ margin: 0, fontSize: 13 }}>
                  <span style={{ fontWeight: 700, color: "#241F1B" }}>{name}</span>
                  {coach?.role && <span style={{ color: "#8C8378" }}> · {coach.role}</span>}
                </p>
                {ago && <p style={{ margin: "1px 0 0", fontSize: 11, color: "#8C8378" }}>{ago}</p>}
              </div>
            </div>
            {/* Long notes scroll here; Close stays pinned below. */}
            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
              style={{ background: "#F6F5FB", borderRadius: 12, padding: "12px 14px" }}
            >
              <p className="whitespace-pre-wrap" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#3A3446" }}>
                {note}
              </p>
            </div>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
            Your professional hasn't left a note for this routine yet.
          </p>
        )}
        <button
          onClick={onClose}
          className="tap w-full flex-none"
          style={{ marginTop: 16, height: 44, borderRadius: 12, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 14, fontWeight: 700 }}
        >
          Close
        </button>
      </div>
    </div>
  );
};
