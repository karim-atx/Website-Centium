import { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { PremiumPromptSheet } from "./PremiumPrompt";
import { usePromptPlace } from "./usePremiumPrompt";
import { supportOpen, usePremium } from "../../services/premium/hooks";
import { onPremiumAsk } from "../../services/premium/asks";
import { askOutcome, noticeText } from "../../services/premium/g2";
import type { PremiumFeature } from "../../services/premium/features";
import { localDay, promptAllowed, promptStorageKey } from "../../services/premium/model";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G2 · the one place a Premium moment opens: a free limit checked
// before a screen opens, an ATXQ1 / ATXQ2 from a write, or a tap on an entry
// point labelled Premium (services/premium/asks). The rules are G6's
// (promptAllowed: the switch on, no Premium, may_prompt_upgrade, an adult,
// not on Get support) plus once per feature per day, decided by askOutcome:
// the sheet, a plain notice (never an upgrade line, so it reads right in
// recovery-sensitive mode), or nothing. Mounted once in the member's layout.

function readDay(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeDay(key: string, day: string): void {
  try {
    window.localStorage.setItem(key, day);
  } catch {
    // Blocked storage only loses the once-a-day memory.
  }
}

type Open = { feature: PremiumFeature; mode: "sheet" | "notice" } | null;

export function PremiumAskHost() {
  const { premium } = usePremium();
  const place = usePromptPlace();
  const [open, setOpen] = useState<Open>(null);
  // The listener reads the latest answers without re-subscribing.
  const live = useRef({ premium, place });
  useEffect(() => {
    live.current = { premium, place };
  });

  useEffect(
    () =>
      onPremiumAsk(({ feature, via }) => {
        const { premium: p, place: pl } = live.current;
        // Off, loading or a Database without G2: today's app, nothing opens.
        if (!p || !p.premiumOn || p.premium) return;
        const allowed = promptAllowed({ premium: p, age: pl.age, path: pl.path, inSupport: supportOpen() });
        const key = pl.userId ? promptStorageKey(pl.userId, feature) : null;
        const today = localDay(new Date());
        const outcome = askOutcome(via, allowed && !!key, key ? readDay(key) === today : true);
        if (outcome === "none") return;
        if (outcome === "sheet" && key && via !== "tap") writeDay(key, today);
        setOpen({ feature, mode: outcome });
      }),
    []
  );

  if (!open) return null;
  if (open.mode === "sheet") return <PremiumPromptSheet open feature={open.feature} premium={premium} onClose={() => setOpen(null)} />;
  return (
    <BottomSheet open onClose={() => setOpen(null)} title={t("Free plan")}>
      <div data-premium-notice={open.feature} className="pb-2">
        <p className="text-[14px] leading-[20px] text-charcoal">{noticeText(open.feature, premium?.limits ?? null)}</p>
        <Button variant="secondary" size="lg" fullWidth className="mt-4" onClick={() => setOpen(null)}>
          {t("OK")}
        </Button>
      </div>
    </BottomSheet>
  );
}

/** A small "Premium" label on an entry point that needs Premium (the switch on, no Premium). */
export function PremiumLabel({ className = "" }: { className?: string }) {
  return (
    <span data-premium-label="" className={`inline-flex items-center rounded-full bg-primary-pale px-2 py-[1px] text-[10.5px] font-extrabold leading-4 text-primary-deep-text ${className}`}>
      {t("Premium")}
    </span>
  );
}

