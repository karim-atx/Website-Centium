import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { ChevronLeft, MessageCircle, Send, Store } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import clsx from "clsx";

// V8 (QA 8.0): the professional's own affiliated-business identity in the
// shared businessMessages channel — "me" is the same stand-in id already
// used for the current professional in businessEmployees/affiliation state.
const BUSINESS_THREAD_ID = "me";

// V6 (QA 6.0): "a tab used strictly as a messaging board between the
// professional and clients" — a client list that opens into a thread,
// backed by the shared professionalMessages store (separate from the
// one-off message sheet already on ProfessionalDetail for the client side).
// V8 (QA 8.0): "add a separate tab/section for messaging the affiliated
// business" — reuses the shared businessMessages/sendBusinessMessage infra
// already backing the Business UI's own Messages tab.
export default function MessagesTab() {
  const { professionalClients, professionalMessages, sendProfessionalMessage, user, businessDirectory, businessMessages, sendBusinessMessage } = useApp();
  const [audience, setAudience] = useState<"clients" | "business">("clients");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [businessDraft, setBusinessDraft] = useState("");

  const activeClient = professionalClients.find((c) => c.id === activeClientId);
  const affiliatedBusiness = businessDirectory.find((b) => b.id === user.affiliatedBusinessId);
  const businessThread = businessMessages.filter((m) => m.customerId === BUSINESS_THREAD_ID);

  const lastMessageFor = (clientId: string) => {
    const msgs = professionalMessages.filter((m) => m.clientId === clientId);
    return msgs[msgs.length - 1];
  };

  const send = () => {
    if (!draft.trim() || !activeClientId) return;
    sendProfessionalMessage(activeClientId, "professional", draft.trim());
    setDraft("");
  };

  const sendToBusiness = () => {
    if (!businessDraft.trim()) return;
    sendBusinessMessage(BUSINESS_THREAD_ID, "customer", businessDraft.trim());
    setBusinessDraft("");
  };

  if (activeClient) {
    const thread = professionalMessages.filter((m) => m.clientId === activeClient.id);
    return (
      // V7 (QA 7.0): the input bar should sit just above the tab bar, not
      // mid-screen — filling the actual visible height (minus header/nav
      // chrome) makes the sticky input rest at the true page bottom.
      <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 180px)" }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveClientId(null)}
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
            aria-label="Back to messages"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
            <PERSON_ICON size={16} className="text-primary-dark" />
          </span>
          <p className="font-semibold text-charcoal">{activeClient.name}</p>
        </div>

        <div className="flex-1 space-y-3 mb-4">
          {thread.length === 0 ? (
            <p className="text-center text-sm text-charcoal-faint py-10">
              No messages yet — say hello to {activeClient.name}.
            </p>
          ) : (
            thread.map((m) => (
              <div key={m.id} className={clsx("flex", m.from === "professional" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    m.from === "professional" ? "bg-primary text-white" : "bg-cream-card text-charcoal"
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…"
            className="flex-1 rounded-full bg-cream-card border border-charcoal/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
          <button
            onClick={send}
            className="tap w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0"
            aria-label="Send"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Messages" showBack />

      {affiliatedBusiness && (
        <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
          {(["clients", "business"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAudience(a)}
              className={clsx(
                "tap px-4 py-1.5 rounded-full text-xs font-bold capitalize",
                audience === a ? "bg-primary text-white" : "text-charcoal-faint"
              )}
            >
              {a === "clients" ? "Clients" : affiliatedBusiness.businessName}
            </button>
          ))}
        </div>
      )}

      {audience === "business" && affiliatedBusiness ? (
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
                      m.from === "customer" ? "bg-primary text-white" : "bg-cream-card text-charcoal"
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
      ) : (
        <div className="space-y-2.5">
          {professionalClients.map((c) => {
            const last = lastMessageFor(c.id);
            return (
              <Card
                key={c.id}
                interactive
                onClick={() => setActiveClientId(c.id)}
                className="flex items-center gap-3 animate-fade-slide-up"
              >
                <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                  <PERSON_ICON size={18} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal">{c.name}</p>
                  <p className="text-xs text-charcoal-faint truncate">
                    {last ? `${last.from === "professional" ? "You: " : ""}${last.text}` : "No messages yet"}
                  </p>
                </div>
                <MessageCircle size={16} className="text-charcoal-faint shrink-0" />
              </Card>
            );
          })}
          {professionalClients.length === 0 && (
            <Card className="text-center py-8">
              <p className="text-sm text-charcoal-faint">Add a client to start messaging.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
