import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { REFUND_POLICY_ID } from "../legal/refund";

// Landing update (C14, RF1 v2): the Refund and Cancellation Policy is Legal
// section 04 now, with no page of its own. The edge answers the old address
// with a 301 to /legal#refund-policy (public/_redirects); this is the
// router's fallback, for an in-app navigation to /legal/refund-policy: it
// renders no page and replaces the address with section 04. The query string
// is kept, so ?lang=ar arrives at Legal, which sets the language to Arabic
// there (pages/Legal.tsx), as it does after the edge redirect.
export const RefundPolicy: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={{ pathname: "/legal", search, hash: "#" + REFUND_POLICY_ID }} replace />;
};
