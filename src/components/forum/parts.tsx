import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Heart, MessageCircle } from "lucide-react";
import type { Author, Identity } from "../../services/forum";
import { initialOf, initialsOf } from "../../services/forum/rules";
import { fv } from "./forumColor";
import { linePx, textPx } from "../../theme/textSize";
import { CentiumMark } from "../icons/CentiumMark";
import { AvatarPlaceholder } from "../icons/PartBIcons";
import { useApp } from "../../context/AppContext";
import { GetSupportPopup } from "../moderation/GetSupportPopup";
import { ImageApprovalBadge, useOwnImage } from "../moderation/ImageApproval";
import { GuidelinesLink } from "../moderation/GuidelinesLink";
import { mentionsSelfHarm } from "../../services/moderation/phrases";
import { supportPlace } from "../../services/moderation/support";
import { browserTimezone } from "../../services/timezone";

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
  glyphForNames,
}: {
  author: Author;
  identity: Identity;
  size: 32 | 36 | 40 | 46;
  /**
   * v6 MO1.3 #20 / #21 (the forum list): a real-name post (no photo; PB-O-44
   * would add one) draws the person glyph on #E7E2F6 (dark #303141, the drawn
   * #E7E2F6* is a light leak); a nickname post keeps its initial (A18).
   */
  glyphForNames?: boolean;
}) {
  if (glyphForNames && identity !== "nickname") {
    return (
      <div
        aria-hidden="true"
        data-avatar-glyph=""
        className="flex items-center justify-center shrink-0 overflow-hidden bg-th-e7e2f6 dark:bg-th-303141"
        style={{ width: size, height: size, borderRadius: size / 2 }}
      >
        <AvatarPlaceholder size={size} />
      </div>
    );
  }
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

/**
 * The Centium C and leaf in white, in every theme (the Mind Habits header).
 * v6 (asset map): the one vector CentiumMark, variant "white", replaces the
 * PNG masks (centium-logo-c.png / -leaf.png); framing "ink" is that canvas
 * (648 x 701), so `width` keeps the box it had.
 */
export function WhiteMark({ width }: { width: number }) {
  return <CentiumMark framing="ink" variant="white" height={(width * 701) / 648} className="shrink-0" />;
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
      // 18 tall, as MO1.3 and MO1.3.1 draw it (measured; was 20).
      className="inline-flex items-center gap-[3px] h-[18px] px-[7px] rounded-full text-[10.5px] font-extrabold shrink-0"
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
export function AuthorName({ author, size, color, lineHeight }: { author: Author; size: 13 | 14 | 15; color?: string; lineHeight?: number }) {
  const cls = "font-bold min-w-0 [overflow-wrap:anywhere]";
  const style = { fontSize: textPx(size), color: color ?? fv("text"), ...(lineHeight ? { lineHeight: linePx(lineHeight) } : null) };
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

/**
 * The author's own held post or reply (design screen 5's amber note; Round C
 * Release 2 words). A hold now has more reasons than a link: the word lists
 * and contact details hold too, and a self-harm phrase holds a post without
 * any penalty.
 *
 * THE GENTLE NOTE IS DECIDED ON THIS DEVICE. The server tells the author
 * nothing about why (and sends the support notice separately); this checks
 * the author's own text against the self-harm phrase list, here, as private
 * messages do. Inside a card that is itself a button (`inline`) the note
 * holds no link or button of its own.
 */
export function HeldNote({ text, inline }: { text?: string; inline?: boolean }) {
  const [gentle, setGentle] = useState(false);
  const [support, setSupport] = useState(false);
  useEffect(() => {
    let live = true;
    if (text) void mentionsSelfHarm(text).then((m) => live && setGentle(m));
    return () => {
      live = false;
    };
  }, [text]);
  const box = { color: fv("held-ink"), background: fv("amber-bg"), borderRadius: 10, padding: "8px 10px" } as const;
  if (gentle)
    return (
      <span className="block text-xs leading-[1.5]" style={box}>
        <span className="block font-bold">Only you can see this for now.</span>
        <span className="block font-semibold">If you're going through something hard, you don't have to face it alone.</span>
        {!inline && (
          <>
            <button type="button" onClick={() => setSupport(true)} className="tap mt-1 min-h-[32px] font-extrabold underline">
              Get support
            </button>
            <GetSupportPopup open={support} onClose={() => setSupport(false)} place={supportPlace(null, browserTimezone())} />
          </>
        )}
      </span>
    );
  return (
    <span className="block text-xs leading-[1.5]" style={box}>
      <span className="font-bold">Held for review.</span>{" "}
      <span className="font-semibold">Only you can see this until our team checks it.</span>
      {!inline && (
        <>
          {" "}
          <Link to="/legal/community-guidelines" className="font-bold underline" style={{ color: "inherit" }}>
            Community guidelines
          </Link>
        </>
      )}
    </span>
  );
}

/**
 * A filter or category chip (design screens 1 and 3). `inStrip` is mobile
 * v5.1 MO1.3's filter strip: 32 pt, radius 9 (Foundations › FO3 sub-tabs,
 * measured on the frame; was 12), 12 pt text, same colours.
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
  const { accessibility, theme } = useApp();
  const dark = theme === "dark";
  if (inStrip) {
    // v6 MO1.3 #10 / #11: 32 tall, r9, padding 0 14, 12/18. Active #A198DF
    // with white (High contrast #5B48B8; dark #A991FE with #0D0B1A); idle
    // transparent on the rail, no border, 600 in #5B5349 / #B8B3C7.
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={clsx(
          "tap shrink-0 h-8 rounded-[9px] px-[14px] text-[12px] leading-[18px] whitespace-nowrap",
          active ? "font-bold" : "font-semibold bg-transparent text-charcoal-soft"
        )}
        style={
          active
            ? {
                background: accessibility.highContrast ? "rgb(var(--c-seg-active))" : dark ? "rgb(var(--c-primary-fill))" : "rgb(var(--th-a198df))",
                color: dark ? "rgb(var(--c-on-primary-fill))" : "#FFFFFF",
              }
            : undefined
        }
        data-active={active ? "true" : undefined}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx("tap shrink-0", inStrip ? "h-8 rounded-[9px] px-3 text-[12px]" : "h-[34px] rounded-full px-[14px] text-[13px]")}
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
      // v6 skeleton (MO1.3 O1, X-32): #F5F5F6 / #242730, pulse 1.2 s, static
      // under Reduce motion.
      className="animate-skeleton-pulse bg-cream-soft"
      style={{ height, borderRadius: 18 }}
    />
  );
}

/**
 * Foundations › Empty state, for the forum and the course catalogue
 * (decision 23, kept-list items 66 and 72): a 56 pt primary.tint tile with a
 * 26 pt thin-stroke icon in primary.accent, a 15/700 title and one 12.5/500
 * text.muted line, at most 260 wide, centred. The gaps and the block's
 * padding are not given in Foundations: 10 between the parts (MO1.4.3's
 * block) and 32 above and below (unspecified).
 */
export function EmptyBlock({ icon, title, line, partB }: { icon: React.ReactNode; title: string; line: string; partB?: boolean }) {
  return (
    <div className="flex flex-col items-center text-center gap-2.5 py-8 mx-auto max-w-[260px]">
      {/* partB (v6 MO1.3 O3, as MO1.7.e #13 / #14): r16, the icon #7D6BB5 / #C3B3FB. */}
      <span
        className={clsx(
          "w-14 h-14 bg-primary-pale flex items-center justify-center",
          partB ? "rounded-2xl text-th-7d6bb5 dark:text-th-c3b3fb" : "rounded-[18px] text-primary-accent"
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
      <p className="m-0 text-[15px] font-bold text-charcoal">{title}</p>
      <p className="m-0 text-[12.5px] font-medium text-charcoal-faint leading-[1.55]">{line}</p>
    </div>
  );
}

/**
 * A plain inline error in danger, no box (decision 23, items 67, 69, 70, 73;
 * Foundations' "inline error line in danger under the affected element").
 */
export function DangerLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={clsx("m-0 text-[12px] font-semibold text-status-high", className)}>
      {children}
      {typeof children === "string" && <GuidelinesLink message={children} />}
    </p>
  );
}

/**
 * The author's own post photo while it waits for an admin (Round C Release
 * 2: every forum photo is approved before others can see it). The author's
 * signed URL works from the start; this adds the "Waiting for approval" (or
 * "Not approved") badge over it. Others get no URL until it is approved, and
 * their card draws no frame at all.
 */
export function OwnPhotoBadge({ threadId }: { threadId: string }) {
  const { image } = useOwnImage("forum_photo", threadId);
  if (!image) return null;
  return <ImageApprovalBadge state={image} className="absolute top-2 left-2 shadow-soft" />;
}
