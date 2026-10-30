import { ChevronLeft, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";

/**
 * The Messages title row (v6 MO1.7 #2-#4), shared by the list, Archived,
 * Starred messages and the K12 sub-views (New group, Broadcast).
 *
 * Back: a 32 box 8 into the gutter (m-left -8), ChevronLeft 22 in
 * text.primary #241F1B / #F5F3FA (ChevronRight in RTL), with a 44 hit area.
 * Title: 27 / 40.5 700 ls -0.6 (X-12 / V6-150: one size for every page
 * reached from More; the frame draws 26 / 39 800), 6 after the back box.
 * `right` sits at the end, centred on the title line (MO1.7 #5).
 */
export const MessagesHeader: React.FC<{
  title: string;
  /** Default: the router's back (More). */
  onBack?: () => void;
  right?: React.ReactNode;
  className?: string;
}> = ({ title, onBack, right, className }) => {
  const back = useBack();
  const { language, t } = useApp();
  const BackIcon = language === "ar" ? ChevronRight : ChevronLeft;
  return (
    <div className={`flex items-center gap-1.5 min-w-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={onBack ?? back}
        aria-label={t("Back")}
        className="tap relative w-8 h-8 -ms-2 shrink-0 rounded-full flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']"
        style={{ color: "rgb(var(--c-charcoal))" }}
      >
        <BackIcon size={22} aria-hidden />
      </button>
      <h1
        className="flex-1 min-w-0 truncate font-display text-[27px] leading-[40.5px] font-bold tracking-[-0.6px]"
        style={{ color: "rgb(var(--c-charcoal))" }}
      >
        {title}
      </h1>
      {right}
    </div>
  );
};
