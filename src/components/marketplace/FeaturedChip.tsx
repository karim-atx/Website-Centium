import { Award } from "lucide-react";
import { t } from "../../i18n/core";

/**
 * B13 MK-06: the "Featured" marker on an Explore card for a live featured
 * week. Literal from the business UI's "Where it appears" preview of Explore
 * (BizMarketV7.dc.html, MA1-112 #5): award 11 / stroke 2.4, 4 before
 * "Featured" 10/800, pad 2 8, r999, #F0EDF9 with #7D6BB5 (dark #303141 with
 * #C3B3FB). The line height is not in the markup (OURS: 15).
 */
export function FeaturedChip({ className = "" }: { className?: string }) {
  return (
    <span
      data-featured-chip=""
      className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] leading-[15px] font-extrabold bg-th-f0edf9 text-th-7d6bb5 dark:bg-th-303141 dark:text-th-c3b3fb ${className}`}
    >
      <Award size={11} strokeWidth={2.4} aria-hidden />
      {t("Featured")}
    </span>
  );
}
