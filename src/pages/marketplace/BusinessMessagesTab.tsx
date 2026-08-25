import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { mockBusinessCustomers } from "../../data/mockBusinessCustomers";
import { ChevronLeft, MessageCircle, Send, Store } from "lucide-react";
import clsx from "clsx";

// V7 (QA 7.0): "New Messaging tab (clients message the business)" — same
// board concept as the Professional UI's Messages tab, scoped to customers
// instead of clients.
export default function BusinessMessagesTab() {
  const { businessMessages, sendBusinessMessage } = useApp();
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const activeCustomer = mockBusinessCustomers.find((c) => c.id === activeCustomerId);

  const lastMessageFor = (customerId: string) => {
    const msgs = businessMessages.filter((m) => m.customerId === customerId);
    return msgs[msgs.length - 1];
  };

  const send = () => {
    if (!draft.trim() || !activeCustomerId) return;
    sendBusinessMessage(activeCustomerId, "business", draft.trim());
    setDraft("");
  };

  if (activeCustomer) {
    const thread = businessMessages.filter((m) => m.customerId === activeCustomer.id);
    return (
      <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 180px)" }}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setActiveCustomerId(null)}
            className="tap w-9 h-9 rounded-full flex items-center justify-center text-charcoal-soft hover:bg-cream-soft"
            aria-label="Back to messages"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="w-9 h-9 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
            <Store size={16} className="text-sohati-dark" />
          </span>
          <p className="font-semibold text-charcoal">{activeCustomer.name}</p>
        </div>

        <div className="flex-1 space-y-3 mb-4">
          {thread.length === 0 ? (
            <p className="text-center text-sm text-charcoal-faint py-10">
              No messages yet — say hello to {activeCustomer.name}.
            </p>
          ) : (
            thread.map((m) => (
              <div key={m.id} className={clsx("flex", m.from === "business" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                    m.from === "business" ? "bg-sohati text-white" : "bg-cream-card text-charcoal"
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
            className="flex-1 rounded-full bg-cream-card border border-charcoal/10 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sohati/15"
          />
          <button
            onClick={send}
            className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shrink-0"
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
      <PageHeader title="Messages" />
      <div className="space-y-2.5">
        {mockBusinessCustomers.map((c) => {
          const last = lastMessageFor(c.id);
          return (
            <Card
              key={c.id}
              interactive
              onClick={() => setActiveCustomerId(c.id)}
              className="flex items-center gap-3 animate-fade-slide-up"
            >
              <span className="w-11 h-11 rounded-full bg-sohati-pale flex items-center justify-center shrink-0">
                <Store size={18} className="text-sohati-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal">{c.name}</p>
                <p className="text-xs text-charcoal-faint truncate">
                  {last ? `${last.from === "business" ? "You: " : ""}${last.text}` : "No messages yet"}
                </p>
              </div>
              <MessageCircle size={16} className="text-charcoal-faint shrink-0" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
