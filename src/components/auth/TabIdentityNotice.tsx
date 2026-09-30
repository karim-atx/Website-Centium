import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Users } from "lucide-react";
import { Button } from "../ui/Button";
import { currentTabLock, onTabLock, type TabLock } from "../../../lib/supabase/tabIdentity";

/**
 * The blocking notice for a tab whose account was changed from another tab
 * (lib/supabase/tabIdentity.ts). By the time it shows, every data request from
 * this tab is already refused at the fetch layer; the notice only explains why
 * and offers the one way on, a full reload that re-binds the tab to whoever is
 * signed in now. It cannot be dismissed: behind it is the previous account's
 * screen, and nothing on it may be used.
 */
export const TabIdentityNotice: React.FC = () => {
  const [lock, setLock] = useState<TabLock | null>(currentTabLock);
  useEffect(() => onTabLock(setLock), []);
  if (!lock) return null;

  const title =
    lock.kind === "switched"
      ? `You're now signed in as ${lock.label} in another tab.`
      : "You've signed out in another tab.";
  const action = lock.kind === "switched" ? `Continue as ${lock.label}` : "Sign in";

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center px-6">
      <div className="absolute inset-0 backdrop-blur-[3px]" style={{ background: "rgba(36,31,27,0.5)" }} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-[340px] bg-white animate-pop"
        style={{ borderRadius: 20, padding: 20, boxShadow: "0 16px 40px rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center" style={{ gap: 12 }}>
          <span
            className="flex-none flex items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(162,200,194,.25)", color: "#4F7F78" }}
          >
            <Users size={18} />
          </span>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#241F1B" }}>{title}</p>
        </div>
        <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "#8C8378" }}>
          Nothing more is saved from this tab until it reloads.
        </p>
        <Button className="w-full" style={{ marginTop: 18 }} onClick={() => window.location.reload()} autoFocus>
          {action}
        </Button>
      </div>
    </div>,
    document.body
  );
};
