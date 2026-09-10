/**
 * The unread count, or nothing at all.
 *
 * RENDERS NULL AT ZERO rather than an empty circle or a "0". A badge is a
 * claim that something is waiting; drawing one over nothing is the same class
 * of error as printing a measurement nobody took.
 *
 * CAPPED AT 99+, because the number stops being information past that point
 * and starts being a layout problem — the nav row it sits in has a fixed
 * width, and a four-digit count would push the label out of it.
 */
export const UnreadBadge: React.FC<{ count: number; className?: string }> = ({
  count,
  className,
}) => {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-white dark:text-[#0D0B1A] text-[10px] font-bold tabular-nums shrink-0 ${className ?? ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
};

/**
 * A presence-only marker, for a surface that aggregates.
 *
 * The mobile "More" tab is the only route to Messages on this app's primary
 * platform — there is no Messages item in the bottom nav — so without
 * something here the badge inside More would only ever be seen by someone who
 * had already gone looking. A dot rather than a count because More holds many
 * things and a number on it would imply the count belonged to the menu itself.
 */
export const UnreadDot: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <span
      aria-label="Unread messages"
      className="absolute top-1 right-[calc(50%-16px)] w-2 h-2 rounded-full bg-primary ring-2 ring-cream-card"
    />
  );
};
