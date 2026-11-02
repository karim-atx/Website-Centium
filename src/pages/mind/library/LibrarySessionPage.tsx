import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/ui/PageHeader";
import { BreathingRunner } from "../../../components/mind/BreathingRunner";
import { useContentLines, useG3 } from "../../../components/premium/g3/useG3";
import { G3Body, G3Route, LockedRow } from "../../../components/premium/g3/parts";
import { fetchMindLibrary } from "../../../services/premium/g3Calls";
import { libraryKind, libraryTypeLabel as typeLabel, minutesLabel, type LibrarySession } from "../../../services/premium/g3";
import { GET_SUPPORT_PATH } from "../../../services/premium/model";
import type { BreathingPattern } from "../../../data/mockMindContent";
import { ScriptRunner } from "./ScriptRunner";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · /app/mind/library/:slug, one library session. It opens with
// session_opening (premium_content_lines); a breathing session runs its
// phases in the existing breathing circle (BreathingRunner, Reduce motion
// respected there), a meditation shows its script step by step with its
// timing (ScriptRunner). Under it, session_support links to Get support.
// A finished session is logged to meditation_sessions as today, with the
// session's content_id. A locked session shows the label and the prompt.

export default function LibrarySessionPage() {
  return (
    <G3Route fallback="/app/mind/meditation">
      <SessionScreen />
    </G3Route>
  );
}

function SessionScreen() {
  const { slug = "" } = useParams();
  const { state, reload } = useG3(fetchMindLibrary, "library");
  return (
    <div className="animate-fade-slide-up pb-28">
      <G3Body state={state} onRetry={reload}>
        {(list) => {
          const s = list.find((x) => x.slug === slug);
          if (!s)
            return (
              <>
                <PageHeader title={t("Meditation library")} showBack />
                <p className="text-[13px] text-charcoal-faint">{t("This session isn't available.")}</p>
              </>
            );
          return <SessionView s={s} />;
        }}
      </G3Body>
    </div>
  );
}

function SessionView({ s }: { s: LibrarySession }) {
  const lines = useContentLines();
  // One pattern object per session, so the runner doesn't reset on a re-render.
  const pattern = useMemo<BreathingPattern | null>(() => (s.phases ? { id: s.slug, name: s.title, desc: "", phases: s.phases } : null), [s.slug, s.title, s.phases]);

  return (
    <>
      <PageHeader title={s.title} subtitle={`${typeLabel(s)} · ${minutesLabel(s.minutes)}`} showBack />
      {s.locked ? (
        <LockedRow feature="meditations" title={s.title} meta={t("Part of Centium Premium")} />
      ) : (
        <>
          {lines?.sessionOpening && <p className="mb-4 rounded-2xl bg-primary-pale px-4 py-3 text-[13px] leading-[19px] text-charcoal">{lines.sessionOpening}</p>}
          {s.type === "breathing" && pattern ? (
            <>
              {s.script && <p className="mb-3 px-1 text-center text-[12px] leading-[17px] text-charcoal-muted">{s.script}</p>}
              <BreathingRunner pattern={pattern} contentId={s.contentId} kind={libraryKind(s.slug)} />
            </>
          ) : s.script ? (
            <ScriptRunner slug={s.slug} contentId={s.contentId} script={s.script} minutes={s.minutes} />
          ) : null}
        </>
      )}
      {lines?.sessionSupport && (
        <p className="mt-6 text-center text-[12px] leading-[18px] text-charcoal-soft">
          {lines.sessionSupport}{" "}
          <Link to={GET_SUPPORT_PATH} className="font-bold underline" style={{ color: "rgb(var(--c-primary-dark))" }}>
            {t("Get support")}
          </Link>
        </p>
      )}
    </>
  );
}
