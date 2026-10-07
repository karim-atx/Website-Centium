// The membership tag (MO1.4.2 card, MO1.4.2.1 header, MO1.4.2.2.2 pass).
// "member": the teal Member tag — 11/700 #2F5F58 on #E4F0EE on the card and
// header, 12/700 #3C6B65 on #E7F2F0 on the pass (the frames' own secondary
// shades). "pending": the amber "Pay on your first visit" (flow 4.8), in the
// fixed gold pair #FBF3E2 / #9A7424 (dark: gold-pale / #CAB082, as the
// calendar's gold text). "muted": expired, cancelled, refunded.

export function MemberTag({
  label,
  tone,
  size = "card",
  className = "",
}: {
  label: string;
  tone: "member" | "pending" | "muted";
  size?: "card" | "pass";
  className?: string;
}) {
  const ink =
    tone === "member"
      ? size === "pass"
        ? "bg-th-e7f2f0 text-th-3c6b65 dark:bg-teal-pale dark:text-teal-deep-text"
        : "bg-th-e4f0ee text-th-2f5f58 dark:bg-teal-pale dark:text-teal-deep-text"
      : tone === "pending"
      ? "bg-[#FBF3E2] text-[#9A7424] dark:bg-gold-pale dark:text-[#CAB082]"
      : "bg-cream-soft text-charcoal-soft";
  return (
    <span
      className={`shrink-0 inline-flex items-center rounded-full whitespace-nowrap font-bold ${
        size === "pass" ? "h-[22px] px-[9px] text-[12px]" : "h-5 px-2 text-[11px]"
      } ${ink} ${className}`}
    >
      {label}
    </span>
  );
}
