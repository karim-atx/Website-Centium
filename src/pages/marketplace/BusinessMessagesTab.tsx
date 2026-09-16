import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { BusinessPrototypeNotice } from "../../components/marketplace/BusinessPrototypeNotice";
import { Card } from "../../components/ui/Card";
import { useApp } from "../../context/AppContext";
import { useBusinessTeam } from "../../hooks/useBusinessTeam";
import { fetchMyMembers, type Membership } from "../../services/business-members";
import { MembershipStatusBadge } from "../../components/marketplace/MembershipStatusBadge";
import { ChevronLeft, MessageCircle, Send, Store } from "lucide-react";
import { PERSON_ICON } from "../../utils/icons";
import clsx from "clsx";

// V8 (QA 8.0): the current professional's stand-in id in the shared
// businessMessages channel — same "me" convention already used across the
// affiliation system (businessEmployees, MessagesTab.tsx's business thread).
const PROFESSIONAL_THREAD_ID = "me";

// V7 (QA 7.0): "New Messaging tab (clients message the business)" — same
// board concept as the Professional UI's Messages tab, scoped to customers
// instead of clients.
// V8 (QA 8.0): "Add separate tabs within BusinessMessagesTab.tsx for
// 'Professionals' vs 'Clients'" — split the previously flat customer list.
export default function BusinessMessagesTab() {
  const { businessMessages, sendBusinessMessage } = useApp();
  const [audience, setAudience] = useState<"clients" | "professionals">("clients");
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  // Real affiliated professionals. The local map this read was never written
  // to, so the Professionals tab was always empty.
  const { team: employees, businessId } = useBusinessTeam();

  // REAL MEMBERS REPLACE THREE INVENTED NAMES. mockBusinessCustomers held
  // "Nour Aad", "Fadi Chamoun" and "Lea Matta" — a demo inbox for a business
  // that had no way to have customers at all. business_members is that
  // relationship, so this list is now the people who actually joined.
  //
  // THE ROSTER HAS NO NAMES ON IT, and that is the database's shape rather
  // than an unfinished read: a business cannot resolve a member's first name
  // by any path open to it. So the rows say what they are — a membership, its
  // plan, its state — and none of them is clickable, because there is nobody
  // to open a thread with until a business↔member messaging path exists.
  const [members, setMembers] = useState<Membership[]>([]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    void fetchMyMembers(businessId).then((result) => {
      if (cancelled || !result.ok) return;
      setMembers(result.members.filter((m) => m.status === "active"));
    });
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const activeCustomer =
    activeCustomerId === PROFESSIONAL_THREAD_ID
      ? {
          id: PROFESSIONAL_THREAD_ID,
          name: employees.find((e) => e.professionalId === PROFESSIONAL_THREAD_ID)?.name ?? "Professional",
        }
      : undefined;

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
    const isProfessionalThread = activeCustomer.id === PROFESSIONAL_THREAD_ID;
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
          <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
            {isProfessionalThread ? (
              <PERSON_ICON size={16} className="text-primary-dark" />
            ) : (
              <Store size={16} className="text-primary-dark" />
            )}
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
                    m.from === "business" ? "bg-bubble-sent text-white" : "bg-cream-card text-charcoal"
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
      <BusinessPrototypeNotice />

      <div className="flex items-center gap-2 bg-cream-soft rounded-full p-1 w-fit mb-4">
        {(["clients", "professionals"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAudience(a)}
            className={clsx(
              "tap px-4 py-1.5 rounded-full text-xs font-bold capitalize",
              audience === a ? "bg-primary text-white" : "text-charcoal-faint"
            )}
          >
            {a}
          </button>
        ))}
      </div>

      {audience === "clients" ? (
        <div className="space-y-2.5">
          {members.map((m) => (
            <Card key={m.id} className="flex items-center gap-3 animate-fade-slide-up opacity-70">
              <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                <Store size={18} className="text-primary-dark" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-charcoal">{m.planName ?? "Member"}</p>
                <p className="text-xs text-charcoal-faint truncate">
                  Member since {new Date(m.respondedAt ?? m.invitedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  · messaging members isn't available yet
                </p>
              </div>
              <MembershipStatusBadge status={m.status} />
            </Card>
          ))}
          {members.length === 0 && (
            <Card className="text-center py-8">
              <p className="text-sm text-charcoal-faint">
                No members yet — invite one from the Members tab.
              </p>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {employees.map((e) => {
            // V8 (QA 8.0): only the current professional ("me") is a real,
            // messageable account in this backend-free prototype — other
            // affiliated professionals are mock names with nothing to reply
            // from, so their row is shown but not clickable.
            //
            // THAT BRANCH CANNOT FIRE ANY MORE, and saying so beats leaving it
            // to be discovered. PROFESSIONAL_THREAD_ID is the string "me", the
            // stand-in the local affiliation system used; these rows now carry
            // real account uuids, so no professional matches it. The effect is
            // that every row is correctly non-clickable — which is the honest
            // state, because `businessMessages` is still local with nothing on
            // the other end. Wiring business messaging to real threads is its
            // own piece of work; this only changed where the names come from.
            const isMe = e.professionalId === PROFESSIONAL_THREAD_ID;
            const last = isMe ? lastMessageFor(PROFESSIONAL_THREAD_ID) : undefined;
            return (
              <Card
                key={e.professionalId}
                interactive={isMe}
                onClick={() => isMe && setActiveCustomerId(PROFESSIONAL_THREAD_ID)}
                className={clsx("flex items-center gap-3 animate-fade-slide-up", !isMe && "opacity-50")}
              >
                <span className="w-11 h-11 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
                  <PERSON_ICON size={18} className="text-primary-dark" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-charcoal">{e.name}</p>
                  <p className="text-xs text-charcoal-faint truncate">
                    {isMe
                      ? last
                        ? `${last.from === "business" ? "You: " : ""}${last.text}`
                        : "No messages yet"
                      : "Not available for messaging in this prototype"}
                  </p>
                </div>
                {isMe && <MessageCircle size={16} className="text-charcoal-faint shrink-0" />}
              </Card>
            );
          })}
          {employees.length === 0 && (
            <Card className="text-center py-8">
              <p className="text-sm text-charcoal-faint">No affiliated professionals yet.</p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
