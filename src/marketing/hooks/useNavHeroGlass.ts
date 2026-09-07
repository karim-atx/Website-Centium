import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/** v3 landing handoff: over Home's hero the transparent nav had almost no
 *  contrast against the light lavender/teal gradient, so while the bar sits
 *  on the hero band its pill/buttons gain a real glass fill and the logo
 *  lightens so the wordmark doesn't sink into the purple. Keyed off two
 *  element ids (`#hero-band`, `#reviews-belt`) that only exist on Home — on
 *  every other route this is simply always `false`, a no-op, matching the
 *  handoff's own `if (!band) return;` guard.
 *
 *  Switches just above the review belt (`belt.top - 56`) rather than at the
 *  hero band's very bottom, so the light lockup doesn't linger over white. */
export function useNavHeroGlass() {
  const [over, setOver] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const band = document.getElementById("hero-band");
    if (!band) {
      setOver(false);
      return;
    }
    const belt = document.getElementById("reviews-belt");
    const check = () => {
      const edge = belt ? belt.getBoundingClientRect().top - 56 : band.getBoundingClientRect().bottom;
      setOver((prev) => {
        const next = edge > 34;
        return prev === next ? prev : next;
      });
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [pathname]);

  return over;
}
