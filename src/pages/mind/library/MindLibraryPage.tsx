import { useNavigate } from "react-router-dom";
import { ChevronRight, Flower2, Wind } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { useG3 } from "../../../components/premium/g3/useG3";
import { G3Body, G3Route, LockedRow } from "../../../components/premium/g3/parts";
import { fetchMindLibrary } from "../../../services/premium/g3Calls";
import { libraryTypeLabel as typeLabel, minutesLabel } from "../../../services/premium/g3";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · /app/mind/library: the meditation and breathing library
// (mind_library(): 10 sessions; Settle in, Box breathing and Wind down for
// sleep are free). A locked session shows the Premium label and opens the
// prompt. The route doesn't exist while the switch is off, and Meditation's
// own breathing, stretching and yoga stay exactly as they are.

export default function MindLibraryPage() {
  return (
    <G3Route fallback="/app/mind/meditation">
      <LibraryList />
    </G3Route>
  );
}

function LibraryList() {
  const navigate = useNavigate();
  const { state, reload } = useG3(fetchMindLibrary, "library");
  return (
    <div className="animate-fade-slide-up pb-8">
      <PageHeader title={t("Meditation library")} subtitle={t("Guided sessions and breathing")} showBack />
      <G3Body state={state} onRetry={reload}>
        {(list) => (
          <div className="flex flex-col gap-2.5">
            {list.map((s) => {
              const meta = `${typeLabel(s)} · ${minutesLabel(s.minutes)}`;
              if (s.locked) return <LockedRow key={s.contentId} feature="meditations" title={s.title} meta={meta} />;
              const Icon = s.type === "breathing" ? Wind : Flower2;
              return (
                <button
                  key={s.contentId}
                  type="button"
                  onClick={() => navigate(`/app/mind/library/${encodeURIComponent(s.slug)}`)}
                  className="tap w-full flex items-center gap-3 rounded-2xl bg-cream-card px-4 py-3 text-start shadow-soft"
                >
                  <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
                    <Icon size={17} aria-hidden className="text-primary-deep-text" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13.5px] font-semibold text-charcoal [overflow-wrap:anywhere]">{s.title}</span>
                    <span className="block text-[11.5px] text-charcoal-faint">{meta}</span>
                  </span>
                  {s.access === "free" && <span className="shrink-0 text-[10.5px] font-extrabold text-status-good">{t("Free")}</span>}
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-charcoal-faint" />
                </button>
              );
            })}
          </div>
        )}
      </G3Body>
    </div>
  );
}
