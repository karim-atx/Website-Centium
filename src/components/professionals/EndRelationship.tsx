import React, { useState } from "react";
import { ConfirmCard } from "../ui/ConfirmCard";
import { endRelationship } from "../../services/connected-professional";
import { useOnline } from "../../hooks/useOnline";
import { t, tx } from "../../i18n/core";

/**
 * Round I (Karim 2026-11-05; Help: "Open their profile on the Professionals
 * page and tap End."): the client's End on a connected professional's profile,
 * phone and web. A confirmation first; ending stops every sharing grant at
 * once (disconnect_client_relationship). A live hire isn't cancelled by it, and
 * the confirmation says so. Each layout passes its own chip look; the button
 * reads «إنهاء» in Arabic ("End" is «النهاية» as a date field elsewhere).
 */
export const EndRelationship: React.FC<{
  relationshipId: string;
  firstName: string;
  /** The client has a live hire with them. */
  hasPlan: boolean;
  /** The chip's look, from the layout it sits in. */
  style: React.CSSProperties;
  className?: string;
  onEnded: () => void;
}> = ({ relationshipId, firstName, hasPlan, style, className, onEnded }) => {
  const online = useOnline();
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const end = async () => {
    if (busy) return;
    if (!online) return setError(t("You're offline. Try again when you're connected."));
    setBusy(true);
    setError(null);
    const r = await endRelationship(relationshipId);
    setBusy(false);
    setAsking(false);
    if (!r.ok) return setError(t(r.message));
    onEnded();
  };

  const body = [
    t("{name} stops seeing your shared information straight away. Your own records stay with you. To work together again, you'll need a new client code.", { name: firstName }),
    hasPlan ? t("This doesn't cancel your plan with {name}. Use Cancel hire for that.", { name: firstName }) : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setAsking(true);
        }}
        aria-label={t("End working with {name}", { name: firstName })}
        className={className}
        style={{ cursor: "pointer", font: "inherit", ...style }}
      >
        {tx("End", "relationship")}
      </button>
      {error && (
        <p role="alert" className="text-status-high" style={{ flexBasis: "100%", margin: 0, fontSize: 12, fontWeight: 600 }}>
          {error}
        </p>
      )}
      <ConfirmCard
        open={asking}
        layout="decision"
        tone="destructive"
        title={t("End working with {name}?", { name: firstName })}
        subtitle={body}
        confirmLabel={busy ? t("Ending…") : tx("End", "relationship")}
        cancelLabel={t("Keep working together")}
        busy={busy}
        onCancel={() => setAsking(false)}
        onConfirm={() => void end()}
      />
    </>
  );
};
