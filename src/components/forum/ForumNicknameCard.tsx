import { useNavigate } from "react-router-dom";
import { ChevronRight, AtSign } from "lucide-react";
import { Card } from "../ui/Card";
import { useApp } from "../../context/AppContext";
import { forumAccess } from "../../services/forum/rules";
import { useForumMe } from "./useForumMe";

// Profile's way to change the forum nickname (design screen 4: "You can change
// it later in Profile"). Adult members only: a professional posts under their
// name and has no nickname, and an under-18 has no forum.

export function ForumNicknameCard({ className }: { className?: string }) {
  const { user, authUserId } = useApp();
  const navigate = useNavigate();
  const shown = user.accountType === "customer" && forumAccess(user.dateOfBirth) === "adult" && !!authUserId;
  const { nickname } = useForumMe(shown ? authUserId : null);
  if (!shown) return null;
  return (
    <Card padded={false} className={className}>
      <button
        type="button"
        onClick={() => navigate("/app/forum/nickname", { state: { from: "/app/profile" } })}
        className="tap w-full flex items-center justify-between gap-3 px-4 py-3.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <AtSign size={17} className="text-charcoal-soft shrink-0" />
          <div className="text-left min-w-0">
            <span className="block text-sm font-medium text-charcoal">Forum nickname</span>
            <span className="block text-[11px] text-charcoal-soft truncate">
              {nickname === undefined ? " " : nickname ?? "Not chosen yet"}
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
      </button>
    </Card>
  );
}
