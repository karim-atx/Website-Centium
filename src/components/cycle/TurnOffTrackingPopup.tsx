import React, { useState } from "react";
import { CentredPopup } from "../ui/CentredPopup";
import { useApp } from "../../context/AppContext";
import { TRACKER_OFF_KEEPS_DATA, TURN_OFF_CONFIRM, TURN_OFF_KEEP, TURN_OFF_TITLE } from "../../services/cycle/guidance";
import { PopupButtons, type } from "./cycleUi";
import { tk } from "../../i18n/core";

/**
 * HE1.10.b.5 "Turn off cycle tracking?": the confirm both tracker switches
 * open before the tracker goes off (Cycle › Settings and Profile's copy, K5).
 * Centred popup 350 r24 pad 20 (X-01, geometry "partB"); title 17/25.5 800;
 * body TRACKER_OFF_KEEPS_DATA verbatim 13/20.2 400 #5B5349, 10 under the
 * title; Keep tracking (outline) / Turn off (#9A8CD6, not red: literal). The
 * switch changes only after Turn off, through setCycleTracking, which records
 * tracker_chosen_at (Task R: an explicit off). A failed write leaves the
 * switch on and says so (onError, the caller's toast).
 */
export const TurnOffTrackingPopup: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
  onError?: (message: string) => void;
}> = ({ open, onClose, onDone, onError }) => {
  const { setCycleTracking } = useApp();
  const [busy, setBusy] = useState(false);

  const turnOff = async () => {
    setBusy(true);
    const r = await setCycleTracking(false);
    setBusy(false);
    onClose();
    if (!r.ok) {
      onError?.(r.message ?? tk("Couldn't save. Try again."));
      return;
    }
    onDone?.();
  };

  return (
    <CentredPopup open={open} onClose={busy ? () => undefined : onClose} title={TURN_OFF_TITLE} geometry="partB" align="start">
      <p className="text-charcoal-soft" style={type(13, 20.2, 400, { marginTop: -6 })}>
        {TRACKER_OFF_KEEPS_DATA}
      </p>
      <div style={{ marginTop: 16 }}>
        <PopupButtons cancel={TURN_OFF_KEEP} onCancel={onClose} confirm={TURN_OFF_CONFIRM} onConfirm={() => void turnOff()} busy={busy} />
      </div>
    </CentredPopup>
  );
};
