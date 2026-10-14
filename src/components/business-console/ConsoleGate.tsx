import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { PERMISSION_LABEL, type ConsoleNeed } from "../../services/business-console";

// B7 · what a console page shows somebody who may not use it.
//
// A business account is let through unchanged: it is the owner, or has no
// business row yet, and every page already handles both. Anybody else (a
// professional on a team) is let through when their current seat holds one
// of `need`; otherwise they get a plain card saying what is missing and who
// can give it, instead of an empty business or controls the server refuses.

const needLabel = (n: ConsoleNeed) => (n === "owner" ? null : PERMISSION_LABEL[n]);

export function ConsoleGate({ need, children }: { need: ConsoleNeed | ConsoleNeed[]; children: ReactNode }) {
  const { user } = useApp();
  const access = useConsoleAccess();
  if (user.accountType === "business") return <>{children}</>;
  const needs = Array.isArray(need) ? need : [need];
  if (access.ready && needs.some((n) => access.meets(n))) return <>{children}</>;
  if (!access.ready && !access.failed) {
    return (
      <div role="status" aria-label="Loading" className="space-y-[10px] pt-[6px]">
        <span className="block h-[28px] w-1/2 rounded-[10px] bg-cream-soft animate-skeleton-pulse" />
        <span className="block h-[120px] rounded-[18px] bg-cream-soft animate-skeleton-pulse" />
      </div>
    );
  }
  return <NoAccess needs={needs} businessName={access.current?.businessName ?? null} failed={access.failed} onRetry={access.retry} />;
}

function NoAccess({ needs, businessName, failed, onRetry }: { needs: ConsoleNeed[]; businessName: string | null; failed: boolean; onRetry: () => void }) {
  const navigate = useNavigate();
  const labels = needs.map(needLabel).filter((l): l is string => !!l);
  const ownerOnly = labels.length === 0;
  const title = failed ? "Couldn't check your access" : businessName ? "You don't have access to this" : "This is a business's console";
  const body = failed
    ? "Check your connection and try again."
    : !businessName
      ? "Join a business's team and ask the owner for access. Your businesses lists the teams you're on."
      : ownerOnly
        ? `Only ${businessName}'s owner can use this page.`
        : `Ask ${businessName}'s owner to turn on ${labels.map((l) => `"${l}"`).join(" or ")} for you.`;
  return (
    <div className="pt-[6px]">
      <div role="note" className="rounded-[20px] bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] text-center" style={{ padding: "26px 20px 22px" }}>
        <span aria-hidden className="mx-auto flex items-center justify-center rounded-[16px] bg-primary-pale text-primary-dark" style={{ width: 44, height: 44 }}>
          <Lock size={20} strokeWidth={2} />
        </span>
        <h1 className="mt-[12px] text-[15px] leading-[20px] font-bold text-charcoal">{title}</h1>
        <p className="mt-[6px] text-[12.5px] leading-[18px] text-charcoal-soft [text-wrap:pretty]">{body}</p>
        <button
          type="button"
          onClick={() => (failed ? onRetry() : navigate("/app/businesses"))}
          className="tap mt-[16px] h-[44px] px-[18px] rounded-[14px] bg-primary-fill text-on-primary-fill text-[13px] font-bold"
        >
          {failed ? "Try again" : "Your businesses"}
        </button>
      </div>
    </div>
  );
}
