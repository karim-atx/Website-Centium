import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { Store, Send } from "lucide-react";
import clsx from "clsx";

const BUSINESS_THREAD_ID = "me";

/**
 * A professional's thread with the business they are affiliated with.
 *
 * THE CLIENT HALF OF THIS SCREEN IS GONE, replaced by `/app/messages`. It was
 * a localStorage mock keyed by client id with a `from: "professional" |
 * "client"` discriminator and no thread concept, and leaving it in place would
 * have put a fake conversation list directly beside a real one — the same
 * shape as the "Contact us" sheet that still connects to nothing. Two
 * messaging surfaces where one works and one silently discards what a
 * professional types to a client is worse than one of either.
 *
 * WHAT REMAINS IS STILL A MOCK. `businessMessages` is `usePersistentState`,
 * and nothing here reaches the database. It survives only because
 * professional-to-business messaging is a third participant type — the real
 * `message_threads` are strictly two-party and a business is not a `profiles`
 * row in the same sense — so it is scoped as its own task rather than
 * something this change could have absorbed. See Database follow-up 48.
 */
export default function MessagesTab() {
  const { user, businessDirectory, businessMessages, sendBusinessMessage } = useApp();
  const [businessDraft, setBusinessDraft] = useState("");

  const affiliatedBusiness = businessDirectory.find((b) => b.id === user.affiliatedBusinessId);
  const businessThread = businessMessages.filter((m) => m.customerId === BUSINESS_THREAD_ID);

  const sendToBusiness = () => {
    if (!businessDraft.trim() || !affiliatedBusiness) return;
    sendBusinessMessage(BUSINESS_THREAD_ID, "customer", businessDraft.trim());
    setBusinessDraft("");
  };

  return (
    <div>
      <PageHeader title="Business messages" showBack />

      {!affiliatedBusiness ? (
        <Card className="text-center py-10">
          <Store size={22} className="text-charcoal-faint mx-auto mb-2" />
          <p className="text-sm text-charcoal-faint">You're not affiliated with a business.</p>
          <p className="text-[11px] text-charcoal-faint mt-1 max-w-xs mx-auto">
            Messages with your clients are under Messages.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 260px)" }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
              <Store size={16} className="text-primary-dark" />
            </span>
            <p className="font-semibold text-charcoal">{affiliatedBusiness.businessName}</p>
          </div>
          <div className="flex-1 space-y-3 mb-4">
            {businessThread.length === 0 ? (
              <p className="text-center text-sm text-charcoal-faint py-10">
                No messages yet — say hello to {affiliatedBusiness.businessName}.
              </p>
            ) : (
              businessThread.map((m) => (
                <div key={m.id} className={clsx("flex", m.from === "customer" ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                      m.from === "customer" ? "bg-bubble-sent text-white" : "bg-cream-card text-charcoal"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 sticky bottom-0 bg-cream pt-2">
            <input
              value={businessDraft}
              onChange={(e) => setBusinessDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendToBusiness()}
              placeholder="Message…"
              className="flex-1 rounded-full bg-cream-card border border-charcoal/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
            <button
              onClick={sendToBusiness}
              className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
              aria-label="Send"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
