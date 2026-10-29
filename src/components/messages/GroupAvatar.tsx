import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { groupPhotoUrl } from "../../services/messaging/groups";

/**
 * Round D · D-S16: a group's approved photo (private bucket group-photos, a
 * signed URL), or the existing teal Users disc when there is none or it can't
 * be signed. Members, including the owner, see the approved photo only; the
 * owner's pending one shows in "Rename or edit description".
 */
function useGroupPhotoUrl(path: string | null | undefined): string | null {
  const [state, setState] = useState<{ path: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    void groupPhotoUrl(path).then((url) => live && setState({ path, url }));
    return () => {
      live = false;
    };
  }, [path]);
  return path && state?.path === path ? state.url : null;
}

export const GroupAvatar: React.FC<{ path: string | null | undefined; size: number; iconSize: number; className?: string }> = ({ path, size, iconSize, className }) => {
  const url = useGroupPhotoUrl(path);
  return (
    <span
      className={`rounded-full bg-th-e4f0ee dark:bg-teal-pale flex items-center justify-center overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" className="w-full h-full object-cover" />
      ) : (
        <Users size={iconSize} className="text-th-2f5f58 dark:text-teal-deep-text" aria-hidden />
      )}
    </span>
  );
};
