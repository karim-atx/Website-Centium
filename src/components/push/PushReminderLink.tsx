import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../../lib/supabase/client";
import { reminderFrom, resolveReminder, type PushDestinationRpc } from "../../services/push/pushReminder";

// Batch D GA (neutral health links) · /app?reminder=<uuid>, from a web push, a
// native tap or the in-app push banner (they all land here). The route sits
// inside RequireOnboarded, so this runs only signed in and onboarded; a
// signed-out native tap is held with its path (NativeOpenPath) and arrives
// here after sign-in. The page comes from push_destination (pushReminder.ts)
// and replaces this entry; anything else leaves /app without the param.
//
// While the answer is on its way nothing is drawn (not Home, and not a
// professional's redirect to /app/pro, which would drop the param); a slow
// answer gives up after RPC_WAIT_MS and stays on /app.

const RPC_WAIT_MS = 8000;

type Rpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown | null }>;
// push_destination is not in database.types yet (Database PR #103): one untyped door.
const rpc: Rpc = (fn, args) => (supabase.rpc as unknown as Rpc).call(supabase, fn, args);

const pushDestination: PushDestinationRpc = (reminderId) =>
  Promise.race([
    Promise.resolve(rpc("push_destination", { p_reminder_id: reminderId })),
    new Promise<null>((done) => setTimeout(() => done(null), RPC_WAIT_MS)),
  ]);

export function PushReminderLink({ children }: { children: React.ReactNode }) {
  const { search } = useLocation();
  const navigate = useNavigate();
  const pending = reminderFrom(search) !== null;
  // One ask per search (StrictMode and AppContext remounts run effects twice).
  const asked = useRef<string | null>(null);

  useEffect(() => {
    if (!pending || asked.current === search) return;
    asked.current = search;
    let live = true;
    void resolveReminder(search, pushDestination).then((to) => {
      if (live && to) navigate(to, { replace: true });
    });
    return () => {
      live = false;
      asked.current = null;
    };
  }, [pending, search, navigate]);

  return pending ? null : <>{children}</>;
}
