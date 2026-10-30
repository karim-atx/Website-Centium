import React from "react";
import { AlertCircle, CloudOff } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { ERROR_PANEL_COPY, errorPanelKind, isChunkLoadError } from "./errorPanel";
import { t } from "../../i18n/core";

/**
 * Round D O1: a render error used to blank the whole app, and offline the
 * likeliest one is a code chunk that can't download (the map, the call
 * screen, the app pages). main.tsx wraps the app in one (`fullScreen`) and
 * Layout wraps each route area in another, so a broken page keeps the navs.
 *
 * The panel is D-S19, in the empty-state card style: CloudOff, "This needs a
 * connection", Retry; a real crash while online says "Something went wrong".
 * Theme token classes only, because the root one sits outside AppContext.
 *
 * RETRY re-mounts the children. The app pages loader clears its failed
 * promise, so a re-mount downloads it again. React.lazy keeps a rejected
 * import for good, so a chunk failure while online reloads the page instead.
 * The `online` event retries a connection panel by itself.
 */
interface Props {
  children: React.ReactNode;
  /** Clears the error when it changes (the route's pathname). */
  resetKey?: string;
  fullScreen?: boolean;
}

interface State {
  error: unknown;
  failed: boolean;
  generation: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, failed: false, generation: 0 };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error, failed: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  componentDidMount() {
    window.addEventListener("online", this.onOnline);
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.onOnline);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.failed && prev.resetKey !== this.props.resetKey) this.reset();
  }

  // Whatever failed while offline showed the connection panel, so the
  // connection coming back retries it; a real crash simply shows again.
  private onOnline = () => {
    if (this.state.failed) this.reset();
  };

  private reset = () => {
    this.setState((s) => ({ error: null, failed: false, generation: s.generation + 1 }));
  };

  private retry = () => {
    if (isChunkLoadError(this.state.error) && navigator.onLine) {
      window.location.reload();
      return;
    }
    this.reset();
  };

  render() {
    if (!this.state.failed) {
      return <React.Fragment key={this.state.generation}>{this.props.children}</React.Fragment>;
    }
    return <ErrorPanel error={this.state.error} onRetry={this.retry} fullScreen={this.props.fullScreen} />;
  }
}

/** Re-renders on online/offline so the panel's wording follows the connection. */
function useOnlineFlag(): boolean {
  const [online, setOnline] = React.useState(() => navigator.onLine !== false);
  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
}

const ErrorPanel: React.FC<{ error: unknown; onRetry: () => void; fullScreen?: boolean }> = ({ error, onRetry, fullScreen }) => {
  const online = useOnlineFlag();
  const kind = errorPanelKind(error, online);
  const copy = ERROR_PANEL_COPY[kind];
  const Icon = kind === "connection" ? CloudOff : AlertCircle;
  const card = (
    <div role="alert" className="rounded-2xl bg-cream-card border border-charcoal/10 px-4 py-6 flex flex-col items-center text-center">
      <span className="flex items-center justify-center bg-primary-pale text-primary" style={{ width: 56, height: 56, borderRadius: 16 }}>
        <Icon size={26} strokeWidth={1.5} aria-hidden />
      </span>
      <p className="text-charcoal" style={{ fontSize: textPx(15), fontWeight: 700, marginTop: 12 }}>{t(copy.title)}</p>
      {copy.line && (
        <p className="text-charcoal-soft" style={{ fontSize: textPx(12.5), fontWeight: 500, marginTop: 4, lineHeight: 1.6, maxWidth: 260 }}>{t(copy.line)}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="tap mt-4 h-11 px-5 rounded-xl bg-primary-fill text-on-primary-fill font-bold text-[13px] hover:brightness-[0.92]"
      >
        {t(copy.action)}
      </button>
    </div>
  );
  if (!fullScreen) return card;
  return (
    <div className="min-h-[100dvh] bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-[430px]">{card}</div>
    </div>
  );
};
