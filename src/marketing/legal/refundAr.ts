import AR_MD from "../../../docs/legal/refund-policy.ar.md?raw";
import { parsePolicy } from "./policyDoc";

// The Refund and Cancellation Policy's Arabic, a lazy chunk of its own: the
// page imports it only when the Arabic is shown, so English visitors never
// download it, and the policy page doesn't need the app's Arabic catalogue.
export default parsePolicy(AR_MD);
