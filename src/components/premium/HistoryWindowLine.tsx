import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { usePromptPlace } from "./usePremiumPrompt";
import { supportOpen, usePremium } from "../../services/premium/hooks";
import { askPremium } from "../../services/premium/asks";
import { fetchHistoryFrom } from "../../services/premium/g2Calls";
import { historyLine } from "../../services/premium/g2";
import { promptAllowed } from "../../services/premium/model";
import { formatShortDate } from "../../utils/date";

// undrawn (Round G, no handover)
// Round G2 · 14 days of history: where a free member's own charts and
// history lists show the capped tables, one quiet line from
// my_history_from(): "Showing from {date}. Older history comes with
// Premium.", with the prompt on tap. Nothing while the switch is off or
// loading, with no cap (null), or on a Database without G2. Where no upgrade
// prompt may show (recovery-sensitive mode, under-18s, Get support) it is
// the plain date line.

// my_history_from() changes once a day: one read per account per session.
const cache = new Map<string, { day: string; value: Promise<string | null> }>();
const today = () => new Date().toDateString();

function historyFrom(userId: string): Promise<string | null> {
  const hit = cache.get(userId);
  if (hit && hit.day === today()) return hit.value;
  const value = fetchHistoryFrom();
  cache.set(userId, { day: today(), value });
  return value;
}

const dayText = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { day: "numeric", month: "long" });

export function HistoryWindowLine({ className = "" }: { className?: string }) {
  const { authUserId } = useApp();
  const { premium } = usePremium();
  const place = usePromptPlace();
  const [from, setFrom] = useState<{ userId: string; value: string | null } | null>(null);
  const on = !!premium?.premiumOn && !premium.premium;

  useEffect(() => {
    if (!authUserId || !on) return;
    let live = true;
    void historyFrom(authUserId).then((value) => live && setFrom({ userId: authUserId, value }));
    return () => {
      live = false;
    };
  }, [authUserId, on]);

  const value = from && from.userId === authUserId ? from.value : null;
  const allowed = promptAllowed({ premium, age: place.age, path: place.path, inSupport: supportOpen() });
  const line = on ? historyLine(premium, value, allowed, dayText) : null;
  if (!line) return null;
  if (!line.asks) return <p data-history-window="" className={`text-[11.5px] leading-[17px] text-charcoal-faint ${className}`}>{line.text}</p>;
  return (
    <button type="button" data-history-window="" onClick={() => askPremium("history_days", "tap")} className={`tap block text-start text-[11.5px] leading-[17px] text-charcoal-faint underline-offset-2 hover:underline ${className}`}>
      {line.text}
    </button>
  );
}
