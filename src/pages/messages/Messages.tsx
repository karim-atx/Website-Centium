import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { ThreadList } from "../../components/messages/ThreadList";
import { ThreadView } from "../../components/messages/ThreadView";
import { useApp } from "../../context/AppContext";
import { fetchThreads, type MessageThread } from "../../services/messaging";
import { MessageCircle } from "lucide-react";

/**
 * Messages, for every account type.
 *
 * ONE ROUTE FOR BOTH SIDES. A thread is two profile ids and nothing about it
 * is role-specific, so a professional and a client read the same screen. The
 * surface this replaces was `/app/professionals/messages`, reachable only by
 * professionals and built around the roster — a client messaging a
 * professional had nowhere to read the reply, which is why this is a new route
 * rather than a widened one.
 *
 * THE LIST DOES NOT POLL. Only an open conversation does; see ThreadView. An
 * inbox refreshing on its own spends requests on something nobody is watching,
 * and the list re-reads on returning from a thread anyway — which is the
 * moment it is actually stale.
 */
export default function Messages() {
  const { authUserId } = useApp();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [open, setOpen] = useState<MessageThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const result = await fetchThreads();
    if (result.ok) {
      setThreads(result.threads);
      setError(null);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authUserId) {
      setLoading(false);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId]);

  if (open) {
    return (
      <div>
        <PageHeader title="Messages" showBack />
        <ThreadView
          thread={open}
          onBack={() => {
            setOpen(null);
            // Re-read on the way back, so a thread just replied to moves to
            // the top with its new preview rather than showing the old one.
            void load();
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Messages" showBack />

      {error && (
        <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-4">
          {error}
        </p>
      )}

      {/* Nothing at all while loading. A skeleton list would suggest
          conversations exist before anyone knows whether any do. */}
      {!loading && threads.length === 0 && !error && (
        <Card className="text-center py-10">
          <MessageCircle size={22} className="text-charcoal-faint mx-auto mb-2" />
          <p className="text-sm text-charcoal-faint">No conversations yet.</p>
          <p className="text-[11px] text-charcoal-faint mt-1 max-w-xs mx-auto">
            Messages with the professionals and clients you work with appear here.
          </p>
        </Card>
      )}

      <ThreadList threads={threads} onOpen={setOpen} />
    </div>
  );
}
