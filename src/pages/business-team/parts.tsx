import { useCallback, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, CircleAlert } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import { initials } from "./teamLogic";
import "./team.css";

// Shared pieces of the Team screens (OpsTabsV4 detail header, card shell,
// row, notice line and toast).

/** The page scope: OpsTabsV4 palette and type (team.css). */
export const TeamScope = ({ children, detail }: { children: ReactNode; detail?: boolean }) => (
  <div className="tm">
    <div className={detail ? "tm-page detail" : "tm-page"}>{children}</div>
  </div>
);

/** Back row (OP1-061 #1): 44 back button + the parent page title. */
export const BackRow = ({ label, onBack }: { label: string; onBack: () => void }) => (
  <div className="tm-backrow">
    <button type="button" className="tm-back tap" aria-label="Back" onClick={onBack}>
      <ChevronLeft size={22} strokeWidth={2.2} />
    </button>
    <p>{label}</p>
  </div>
);

/** Error / offline line (OP1-053 O2 / O3) with an optional Retry. */
export const Notice = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="tm-notice" role="alert">
    <p>{message}</p>
    {onRetry && (
      <button type="button" className="tm-retry tap" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
);

/** A person's avatar: photo when they have one, else initials. */
export const Avatar = ({ name, url, className }: { name: string; url: string | null; className: string }) => (
  <span className={className} aria-hidden>
    {url ? <img src={url} alt="" /> : initials(name)}
  </span>
);

/** Detail card shell (OP1-061 #8). */
export const DCard = ({ title, right, children }: { title: string; right?: string; children: ReactNode }) => (
  <section className="tm-dcard" aria-label={title}>
    <div className="tm-dcard-h">
      <p>{title}</p>
      {right && <p>{right}</p>}
    </div>
    {children}
  </section>
);

/** Card row (OP1-061 #8): optional icon, title, sub, trailing control. */
export const Row = ({ icon, title, sub, trailing }: { icon?: ReactNode; title: string; sub?: string; trailing?: ReactNode }) => (
  <div className="tm-row">
    {icon && <span className="tm-row-i">{icon}</span>}
    <div className="tm-row-b">
      <p className="tm-row-t">{title}</p>
      {sub && <p className="tm-row-s">{sub}</p>}
    </div>
    {trailing}
  </div>
);

/** A Row that opens an external link in a new tab (OP1-132 S2: rel noopener). */
export const LinkRow = ({ icon, title, sub, href, label }: { icon: ReactNode; title: string; sub: string; href: string; label: string }) => (
  <a className="tm-row tap" href={href} target="_blank" rel="noopener noreferrer" aria-label={label} style={{ color: "inherit", textDecoration: "none" }}>
    <span className="tm-row-i">{icon}</span>
    <div className="tm-row-b">
      <p className="tm-row-t">{title}</p>
      <p className="tm-row-s">{sub}</p>
    </div>
  </a>
);

/** The fixed CTA with its fade (OP1-053 #28), portaled so no transform pins it to a wrapper. */
export const TeamCta = ({ label, icon, onClick, disabled }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean }) =>
  createPortal(
    <div className="tm-vars">
      <div className="tm-cta-fade" aria-hidden />
      <button type="button" className="tm-cta" onClick={onClick} disabled={disabled}>
        {icon}
        {label}
      </button>
    </div>,
    document.body
  );

/**
 * The OpsTabsV4 toast (OP1-069): the shared business toast, shape "ops",
 * 150 above the bottom on pages with the CTA. Failures use circle-alert
 * (OP1-124 O5).
 */
export function useTeamToast(bottom?: number): [ReactNode, (message: string, error?: boolean) => void] {
  const [msg, setMsg] = useState<{ text: string; error: boolean } | null>(null);
  const [n, setN] = useState(0);
  const show = useCallback((text: string, error = false) => {
    setMsg({ text, error });
    setN((k) => k + 1);
  }, []);
  const node = (
    <Toast
      key={n}
      open={!!msg}
      message={msg?.text ?? ""}
      variant="business"
      shape="ops"
      bottom={bottom}
      icon={msg?.error ? <CircleAlert size={18} strokeWidth={2.2} style={{ color: "#F09A8E" }} /> : undefined}
      onExpire={() => setMsg(null)}
    />
  );
  return [node, show];
}

export const isOfflineNow = () => typeof navigator !== "undefined" && navigator.onLine === false;
