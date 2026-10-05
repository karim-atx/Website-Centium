import { Link } from "react-router-dom";
import clsx from "clsx";
import type { Author, Identity } from "../../services/forum";
import { initialOf } from "../../services/forum/rules";
import { fv } from "./forumColor";

// Small pieces shared by the forum screens (design PgYuBboDr8DEL2bk7EJKtU).
// Sizes, weights and colours are the design's; colours go through the
// --forum-* variables in index.css so dark mode has its own values.


/**
 * The circle beside every post: an INITIAL, never a photo. A nickname post
 * with an avatar would show the face the nickname exists to keep out of it,
 * so no post shows one. Colour by who is speaking, as the design draws them:
 * a verified professional teal, a nickname amber, a first name lilac.
 */
export function AuthorInitial({
  author,
  identity,
  size,
}: {
  author: Author;
  identity: Identity;
  size: 32 | 36 | 40;
}) {
  const tone = author.professionalId
    ? { bg: fv("teal-bg"), ink: fv("teal-ink") }
    : identity === "nickname"
    ? { bg: fv("amber-bg"), ink: fv("amber-ink") }
    : { bg: fv("rules-bg"), ink: fv("rules-ink") };
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center shrink-0 font-extrabold"
      style={{ width: size, height: size, borderRadius: size / 2, background: tone.bg, color: tone.ink }}
    >
      {initialOf(author.label)}
    </div>
  );
}

export function ShieldCheckIcon({ size = 11, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ProfessionalBadge() {
  return (
    <span
      className="inline-flex items-center gap-[3px] h-5 px-[7px] rounded-full text-[11px] font-extrabold shrink-0"
      style={{ background: fv("teal-bg"), color: fv("teal-ink") }}
    >
      <ShieldCheckIcon color={fv("teal-ink")} />
      Professional
    </span>
  );
}

/**
 * The author's name. A verified professional's name links to their directory
 * page and carries the badge; nobody else's name links anywhere.
 */
export function AuthorName({ author, size }: { author: Author; size: 13 | 14 | 15 }) {
  const cls = "font-bold min-w-0 [overflow-wrap:anywhere]";
  const style = { fontSize: size, color: fv("text") };
  if (author.professionalId) {
    return (
      <span className="flex items-center gap-1.5 flex-wrap min-w-0">
        <Link
          to={`/app/professionals/${author.professionalId}`}
          onClick={(e) => e.stopPropagation()}
          className={clsx(cls, "no-underline")}
          style={style}
        >
          {author.label}
        </Link>
        <ProfessionalBadge />
      </span>
    );
  }
  return (
    <span className={cls} style={style}>
      {author.label}
    </span>
  );
}

export function HeartIcon({ filled, color }: { filled?: boolean; color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}

export function ReplyIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}

/** "Post removed by a moderator" / "Reply removed by a moderator" (design screens 2 and 5). */
export function RemovedNote({ kind, radius = 16 }: { kind: "post" | "reply"; radius?: number }) {
  return (
    <div
      className="italic"
      style={{
        borderRadius: radius,
        background: fv("removed-bg"),
        padding: kind === "post" ? "12px 14px" : "10px 12px",
        fontSize: 13,
        color: fv("muted"),
      }}
    >
      {kind === "post" ? "Post removed by a moderator" : "Reply removed by a moderator"}
    </div>
  );
}

/** The author's own held post (design screen 5). */
export function HeldNote() {
  return (
    <span
      className="block text-xs font-bold"
      style={{ color: fv("held-ink"), background: fv("amber-bg"), borderRadius: 10, padding: "8px 10px" }}
    >
      Only you can see this until a moderator checks the link.
    </span>
  );
}

/**
 * A filter or category chip (design screens 1 and 3). `inStrip` is mobile
 * v5.1 MO1.3's filter strip: 32 pt, radius 12, 12 pt text, same colours.
 */
export function ForumChip({
  active,
  onClick,
  children,
  inStrip,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  inStrip?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx("tap shrink-0", inStrip ? "h-8 rounded-xl px-3 text-[12px]" : "h-[34px] rounded-full px-[14px] text-[13px]")}
      style={
        active
          ? { background: fv("accent"), color: fv("on-accent"), fontWeight: 700, border: "none" }
          : { background: fv("card"), color: fv("text"), fontWeight: 600, border: `1px solid ${fv("border")}` }
      }
    >
      {children}
    </button>
  );
}

/** A neutral block shown where content waits on the recovery setting or a load. */
export function ForumPlaceholder({ height }: { height: number }) {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse"
      style={{ height, borderRadius: 18, background: fv("track"), border: `1px solid ${fv("border")}` }}
    />
  );
}
