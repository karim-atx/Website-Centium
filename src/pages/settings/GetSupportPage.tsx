import { useNavigate, useSearchParams } from "react-router-dom";
import { GetSupportPopup } from "../../components/moderation/GetSupportPopup";
import { supportPlace } from "../../services/moderation/support";
import { browserTimezone } from "../../services/timezone";

/**
 * /app/get-support (Round C Release 2): the "Get support" popup on its own
 * route, so the support_resources notice and Settings › Help can open it.
 * ?country= is the notice's country_code when the server knows it. Closing
 * goes back to wherever the person came from.
 */
export function GetSupportPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const close = () => (window.history.length > 1 ? navigate(-1) : navigate("/app", { replace: true }));
  return <GetSupportPopup open onClose={close} place={supportPlace(params.get("country"), browserTimezone())} />;
}
