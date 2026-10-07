import { useState } from "react";

// A venue's logo or cover (backend stage A4), drawn over its fallback. The
// URLs are tried in order; one that fails to load (a 404 — the seed sets
// paths but uploads no objects — or a broken hosted logo) moves to the next,
// and when none is left the fallback (the initials / the tint) is what shows.
// Decorative: the venue's name is always printed beside it.

export function VenueImage({
  srcs,
  className = "",
  fallback = null,
}: {
  srcs: (string | null | undefined)[];
  className?: string;
  fallback?: React.ReactNode;
}) {
  const list = srcs.filter((s): s is string => !!s);
  const key = list.join("\n");
  const [failed, setFailed] = useState<{ key: string; n: number }>({ key, n: 0 });
  const n = failed.key === key ? failed.n : 0;
  const src = list[n];
  if (!src) return <>{fallback}</>;
  return (
    <img
      key={src}
      src={src}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      onError={() => setFailed({ key, n: n + 1 })}
      className={`object-cover ${className}`}
    />
  );
}
