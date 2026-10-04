import type { TurnstileStatus } from "./useTurnstile";

/**
 * Where a Turnstile widget sits on an auth screen: the widget's container,
 * and a line if Cloudflare's script could not load. Nothing at all without a
 * site key (status "off"). Kept to the widget's own height so the button
 * below does not jump when it appears.
 */
export function SecurityCheck({ status, container }: { status: TurnstileStatus; container: (el: HTMLElement | null) => void }) {
  if (status === "off") return null;
  return (
    <div className="mb-3">
      <div ref={container} className="w-full min-h-[65px] flex justify-center" data-security-check />
      {status === "failed" && (
        <p role="alert" className="text-[11px] font-semibold text-status-high text-center mt-1">
          The security check couldn't load. Check your connection, then reload the page.
        </p>
      )}
    </div>
  );
}
