import { Link } from "react-router-dom";
import { fv } from "../forum/forumColor";
import { ProfessionalBadge } from "../forum/parts";
import { useIsDark } from "../../hooks/useIsDark";
import { onCover } from "./courseCover";

export function StarIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fv("star")} aria-hidden="true">
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}

export function CheckIcon({ color = fv("good") }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={fv("muted")} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" className="shrink-0">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

/** The white pill on a course's cover: "Beginner · 6 weeks". */
export function CoverPill({ children }: { children: React.ReactNode }) {
  const { bg, ink } = onCover(useIsDark());
  return (
    <span
      className="text-[11px] font-extrabold rounded-full px-[9px] py-1"
      style={{ background: bg, color: ink }}
    >
      {children}
    </span>
  );
}

/**
 * The instructor: first name and the Professional badge. Every published
 * course's author is a verified professional (checked again at publication),
 * so the badge always applies. On the course page ("By Rami") the name links
 * to their directory page; on a card the whole card is the link, so it does not.
 */
export function Instructor({ authorId, name, link }: { authorId: string | null; name: string; link: boolean }) {
  return (
    <span className="flex gap-1.5 items-center flex-wrap min-w-0">
      {link && authorId ? (
        // MO1.3.5 #3: "By Rami" at 13/400 in the muted ink; the name still
        // opens their directory page.
        <Link to={`/app/professionals/${authorId}`} className="no-underline" style={{ color: "inherit" }}>
          By {name}
        </Link>
      ) : (
        <span>{link ? `By ${name}` : name}</span>
      )}
      <ProfessionalBadge />
    </span>
  );
}

/** "4.8 (126)" on a card, or "New" before anyone has rated it. */
export function RatingShort({ average, count }: { average: number | null; count: number }) {
  return (
    <span className="flex gap-1 items-center">
      {average === null ? (
        "New"
      ) : (
        <>
          <StarIcon size={12} /> {average.toFixed(1)} ({count})
        </>
      )}
    </span>
  );
}
