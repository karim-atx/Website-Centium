import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Flag, UserRound } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ReviewReportForm } from "../../components/professionals/ReviewForms";
import { ShareCard } from "../../components/share/ShareCard";
import { specFromPayload, type CardSpec, type ShareFormat, type ShareStyle } from "../../components/share/shareCardModel";
import { fetchSharedItemPublic, reportSharedItem } from "../../services/share";
import { professionalByHandle, rememberPublicReturn } from "../../services/public-pro";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { textPx } from "../../theme/textSize";
import { PublicCard, PublicFrame, PublicMessage } from "../public/publicKit";

/**
 * Release 3 · W8 the public shared card, centium.app/s/{id} (the link a
 * professional shares with "More"). shared_item_public (anon) returns the
 * card and the professional's handle, nothing about the client beyond what
 * the card itself shows; professional_by_handle (anon) gives the first name
 * for the card's top line. A removed or unknown card reads "This card is no
 * longer shared." Signed in, Report writes share_item_reports through
 * report_shared_item (the report_reason values); signed out, a link to sign in.
 */

type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; offline: boolean }
  | { status: "found"; spec: CardSpec; format: ShareFormat; style: ShareStyle; handle: string | null; proName: string; client: string };

function reportError(code: string | null, offline: boolean): string {
  if (offline) return OFFLINE_MESSAGE;
  if (code === "ATX08") return "This card is no longer shared.";
  if (code === "ATX02") return "You've sent a lot of reports today. Try again tomorrow.";
  if (code === "ATX01") return "Sign in to report this card.";
  return "Couldn't send your report. Try again.";
}

export default function SharedCard() {
  const { id = "" } = useParams();
  const { authReady, authUserId } = useApp();
  const [state, setState] = useState<State>({ status: "loading" });
  const [reload, setReload] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!authReady) return;
    let live = true;
    void (async () => {
      const r = await fetchSharedItemPublic(id);
      if (!live) return;
      if (!r.ok) return setState({ status: "error", offline: r.offline });
      if (!r.data) return setState({ status: "missing" });
      const handle = r.data.professionalHandle;
      const pro = handle ? await professionalByHandle(handle) : null;
      if (!live) return;
      const proName = (pro?.ok && pro.data?.firstName?.trim()) || "A Centium professional";
      const card = specFromPayload(r.data.card, proName);
      if (!card) return setState({ status: "missing" });
      const shown = (r.data.card as { name_display?: unknown } | null)?.name_display;
      setState({ status: "found", ...card, handle, proName, client: typeof shown === "string" && shown.trim() ? shown : "A client" });
    })();
    return () => {
      live = false;
    };
  }, [id, reload, authReady]);

  useEffect(() => {
    document.title = state.status === "found" ? `${state.proName} · Centium` : "Centium";
  }, [state]);

  if (state.status === "loading") {
    return (
      <PublicFrame>
        <div aria-busy="true" role="status" aria-label="Loading" className="flex flex-col items-center gap-4">
          <span aria-hidden className="w-[280px] h-[350px] max-w-full rounded-[14px] bg-cream-soft animate-skeleton-pulse" />
          <span aria-hidden className="w-full h-[96px] rounded-[20px] bg-cream-soft animate-skeleton-pulse" />
        </div>
      </PublicFrame>
    );
  }
  if (state.status === "error") {
    return (
      <PublicFrame>
        <PublicMessage title="Couldn't load this card" line={state.offline ? OFFLINE_MESSAGE : "Something went wrong. Try again."} onRetry={() => {
            setState({ status: "loading" });
            setReload((n) => n + 1);
          }} />
      </PublicFrame>
    );
  }
  if (state.status === "missing") {
    return (
      <PublicFrame>
        <PublicMessage title="This card is no longer shared." />
      </PublicFrame>
    );
  }

  const tall = state.format === "story" || state.format === "sticker";
  return (
    <PublicFrame label={`${state.proName}'s card`}>
      <div className="flex justify-center">
        <ShareCard
          spec={state.spec}
          pro={{ name: state.proName, handle: state.handle }}
          format={state.format}
          style={state.style}
          width={tall ? 260 : 300}
          client={state.client}
          onChecker={state.format === "sticker"}
        />
      </div>

      <PublicCard className="flex flex-col gap-1">
        {state.handle && (
          <Link
            to={`/p/${state.handle}`}
            className="tap w-full h-12 rounded-[14px] bg-primary-fill text-on-primary-fill inline-flex items-center justify-center gap-[7px] font-bold"
            style={{ fontSize: textPx(14) }}
          >
            <UserRound size={15} strokeWidth={2} aria-hidden /> {`See ${state.proName}'s profile`}
          </Link>
        )}
        {authUserId ? (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="tap w-full min-h-11 inline-flex items-center justify-center gap-[6px] font-bold text-charcoal-soft"
            style={{ fontSize: textPx(13) }}
          >
            <Flag size={14} strokeWidth={2} aria-hidden /> Report
          </button>
        ) : (
          <Link to="/app/onboarding?auth=signin" onClick={() => rememberPublicReturn(`/s/${id}`)} className="tap w-full min-h-11 inline-flex items-center justify-center font-bold text-primary-accent" style={{ fontSize: textPx(13) }}>
            Sign in to report this card
          </Link>
        )}
      </PublicCard>

      {authUserId && (
        <BottomSheet open={reportOpen} onClose={() => setReportOpen(false)} title="Report this card">
          {reportOpen && (
            <ReviewReportForm
              onSend={async (reason, detail) => {
                const r = await reportSharedItem(id, reason, detail);
                return r.ok ? null : reportError(r.code, r.offline);
              }}
            />
          )}
        </BottomSheet>
      )}
    </PublicFrame>
  );
}
