import { Link } from "react-router-dom";
import clsx from "clsx";
import { Heart, MessageCircle } from "lucide-react";
import type { Author, Identity } from "../../services/forum";
import { initialOf, initialsOf } from "../../services/forum/rules";
import { fv } from "./forumColor";
import { textPx } from "../../theme/textSize";

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
  size: 32 | 36 | 40 | 46;
}) {
  const tone = author.professionalId
    ? { bg: fv("teal-bg"), ink: fv("teal-ink") }
    : identity === "nickname"
    ? { bg: fv("amber-bg"), ink: fv("amber-ink") }
    : { bg: fv("rules-bg"), ink: fv("rules-ink") };
  // MO1.3: a nickname is one letter at 14/800 ("P"); a name is two letters at
  // 14/700 ("ES" for Elie S.).
  const nick = identity === "nickname";
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-center shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: tone.bg,
        color: tone.ink,
        fontSize: textPx(14),
        fontWeight: nick ? 800 : 700,
      }}
    >
      {nick ? initialOf(author.label) : initialsOf(author.label)}
    </div>
  );
}

const WHITE_MARK_LAYER: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#FFFFFF",
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

/**
 * The Centium C and leaf in white, in every theme (MO1.3 rules card). Drawn
 * the way ThemedMark draws its tinted mark: the brand's own C and leaf masks
 * (public/centium-logo-c.png and -leaf.png, one 648 x 701 canvas) filled
 * with a solid colour, at the canvas's own 648:701 proportions.
 */
export function WhiteMark({ width }: { width: number }) {
  return (
    <span aria-hidden="true" className="relative inline-block shrink-0" style={{ width, height: (width * 701) / 648 }}>
      <span style={{ ...WHITE_MARK_LAYER, maskImage: "url(/centium-logo-c.png)", WebkitMaskImage: "url(/centium-logo-c.png)" }} />
      <span style={{ ...WHITE_MARK_LAYER, maskImage: "url(/centium-logo-leaf.png)", WebkitMaskImage: "url(/centium-logo-leaf.png)" }} />
    </span>
  );
}

export function ShieldCheckIcon({ size = 11, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function ProfessionalBadge() {
  return (
    <span
      className="inline-flex items-center gap-[3px] h-5 px-[7px] rounded-full text-[10.5px] font-extrabold shrink-0"
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
  const style = { fontSize: textPx(size), color: fv("text") };
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

/** Lucide Heart, filled when liked. MO1.3 cards draw it 14/1.75, MO1.3.3's action row 20/1.75 and replies 15/1.75. */
export function HeartIcon({ filled, color, size }: { filled?: boolean; color: string; size: 14 | 15 | 20 }) {
  return <Heart size={size} strokeWidth={1.75} color={color} fill={filled ? color : "none"} aria-hidden="true" />;
}

/** Lucide MessageCircle beside a reply count (MO1.3 cards: 14/1.75). */
export function ReplyIcon({ color, size }: { color: string; size: 14 | 15 }) {
  return <MessageCircle size={size} strokeWidth={1.75} color={color} aria-hidden="true" />;
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
        fontSize: textPx(13),
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
