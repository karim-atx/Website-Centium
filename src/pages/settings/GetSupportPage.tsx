import { useNavigate, useSearchParams } from "react-router-dom";
import { GetSupportPopup } from "../../components/moderation/GetSupportPopup";
import { useApp } from "../../context/AppContext";
import { RECOVERY_SETTING_PATH, supportPlace } from "../../services/moderation/support";
import { browserTimezone } from "../../services/timezone";

/**
 * /app/get-support (Round C Release 2): the "Get support" popup on its own
 * route, so the support_resources notice and Settings › Help can open it.
 * ?country= is the notice's country_code when the server knows it. Closing
 * goes back to wherever the person came from. ?recovery=1 (20261222080000:
 * the notice's offer_recovery_mode, after a form's eating question) adds the
 * link to turn on recovery-sensitive mode, unless it's already on.
 */
export function GetSupportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { recoverySensitive } = useApp();
  const close = () => (window.history.length > 1 ? navigate(-1) : navigate("/app", { replace: true }));
  const offerRecovery = params.get("recovery") === "1" && !recoverySensitive;
  return (
    <GetSupportPopup
      open
      onClose={close}
      place={supportPlace(params.get("country"), browserTimezone())}
      onRecoveryMode={offerRecovery ? () => navigate(RECOVERY_SETTING_PATH, { replace: true }) : undefined}
    />
  );
}
