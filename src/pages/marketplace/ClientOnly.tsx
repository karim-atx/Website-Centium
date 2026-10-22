import type React from "react";
import { Navigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";

// Market + Share 3.0 · W2: the client Explore's own pages (bookings, rewards,
// points, vouchers, notifications). A business account has its own
// marketplace (BusinessDashboard at /app/marketplace), so it is sent there.
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  if (user.accountType === "business") return <Navigate to="/app/marketplace" replace />;
  return <>{children}</>;
}
