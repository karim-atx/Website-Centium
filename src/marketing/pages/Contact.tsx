import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Clock } from "lucide-react";
import { Section } from "../components/Section";
import { Reveal } from "../components/Reveal";
import { Eyebrow } from "../components/Eyebrow";
import { useSEO } from "../useSEO";
import { submitContact, type ContactTopic } from "../../services/contact";

/** The pill labels, and the enum the Edge Function validates against. */
const topics: { label: string; value: ContactTopic }[] = [
  { label: "General", value: "general" },
  { label: "Professional", value: "professional" },
  { label: "Business", value: "business" },
  { label: "Press", value: "press" },
];

const SUPPORT_EMAIL = "support@atraxia.org";

/**
 * The site key is baked in at build time, and its absence is a real state
 * rather than a crash: see the `unavailable` branch below.
 */
const TURNSTILE_SITEKEY = import.meta.env.NEXT_PUBLIC_TURNSTILE_SITEKEY;

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      theme?: "auto" | "light" | "dark";
      callback?: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Loads Cloudflare's script once per page, however many times this component
 * mounts.
 *
 * MODULE SCOPE ON PURPOSE. React remounts this page on every navigation back
 * to /contact, and appending a second <script> would re-run Turnstile's
 * bootstrap against widgets the first copy already owns. The promise is the
 * lock, so the second mount waits on the first mount's load instead of
 * starting its own.
 *
 * NOT LOADED GLOBALLY EITHER. It is requested from the effect below, so every
 * other page in the app — the whole signed-in product included — never talks
 * to challenges.cloudflare.com at all.
 *
 * A FAILED LOAD IS NOT CACHED. Caching the promise is what makes the sharing
 * work, but a rejected one would answer for the rest of the session, so a
 * blocked request or a dropped connection would leave the form permanently
 * without a widget even after the network came back.
 */
let turnstileScript: Promise<void> | null = null;

function loadTurnstile(): Promise<void> {
  if (turnstileScript) return turnstileScript;

  const pending = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("turnstile script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("turnstile script failed")));
    document.head.appendChild(script);
  });

  turnstileScript = pending.catch((e) => {
    turnstileScript = null;
    throw e;
  });
  return turnstileScript;
}

type Status = "idle" | "sending" | "sent";

export const Contact: React.FC = () => {
  useSEO("Contact", "Get in touch with the Centium team.");
  const [topic, setTopic] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  /** Honeypot. A real visitor never types here; see the input's own note. */
  const [website, setWebsite] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  /** The function's code, "" for a failure with no response, null for none. */
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const unavailable = !TURNSTILE_SITEKEY;

  useEffect(() => {
    if (!TURNSTILE_SITEKEY) {
      // One line, naming the variable, because the page it degrades looks
      // deliberate rather than broken and would otherwise be hard to explain.
      console.warn(
        "[contact] NEXT_PUBLIC_TURNSTILE_SITEKEY is not set — the contact form is showing its unavailable state."
      );
      return;
    }

    let cancelled = false;
    void loadTurnstile()
      .then(() => {
        if (cancelled || !widgetRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITEKEY,
          theme: "dark",
          callback: (t) => setToken(t),
          // A token is good for a few minutes. Clearing it on expiry is what
          // stops the button offering to send something the function would
          // then reject.
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => {
        /* No widget, so no token, so the button stays disabled. Nothing to
           say here that the disabled button does not already say. */
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* Already gone with the container. */
        }
      }
      widgetIdRef.current = null;
    };
  }, []);

  /**
   * Turnstile tokens are single-use — the function redeems one per submission
   * and Cloudflare refuses the same token twice. Resetting after EVERY attempt,
   * not just failures, is what keeps a second send from failing verification
   * on a token the first one already spent.
   */
  const resetTurnstile = () => {
    setToken(null);
    const id = widgetIdRef.current;
    if (id && window.turnstile) {
      try {
        window.turnstile.reset(id);
      } catch {
        /* Widget went away; the missing token already disables the button. */
      }
    }
  };

  /** Any edit retires the error: it described the previous attempt. */
  const edited = () => {
    if (errorCode !== null) setErrorCode(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Guards the double-click as well as the impossible cases: the second
    // click of a rapid pair arrives while status is already "sending".
    if (!token || status === "sending" || unavailable) return;

    setStatus("sending");
    setErrorCode(null);

    const result = await submitContact({
      topic: topics[topic].value,
      name,
      email,
      message,
      turnstileToken: token,
      website,
    });

    resetTurnstile();

    if (result.ok) {
      setName("");
      setEmail("");
      setMessage("");
      setStatus("sent");
      return;
    }

    // BACK TO IDLE, NOT TO A DEAD END, and the typed text is untouched: the
    // visitor has to be able to press send again without retyping anything.
    setStatus("idle");
    setErrorCode(result.code);
  };

  const mailtoLink = (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold" style={{ color: "#6A54C4" }}>
      {SUPPORT_EMAIL}
    </a>
  );

  const errorMessage = () => {
    switch (errorCode) {
      case "invalid_input":
        return <>Please check your name, email and message, then try again.</>;
      case "captcha_failed":
        return <>Verification didn't complete. Please try again.</>;
      case "rate_limited":
        return <>You've sent several messages recently. Please wait a while, or email us at {mailtoLink}.</>;
      default:
        return <>Your message wasn't sent. Your text is still here — try again, or email us at {mailtoLink}.</>;
    }
  };

  const fieldClass =
    "border border-[#E0DDD6] rounded-xl px-4 py-3 text-sm text-mkt-ink placeholder:text-mkt-faint focus:outline-none focus:border-mkt-accent transition-colors duration-200";

  return (
    <Section className="pt-32 sm:pt-[152px] pb-24">
      <Reveal className="text-center mb-14 max-w-2xl mx-auto">
        <Eyebrow className="mx-auto">CONTACT</Eyebrow>
        <h1 className="font-display font-extrabold text-4xl sm:text-5xl text-mkt-ink tracking-tight mt-5">Get in touch</h1>
        <p className="text-lg leading-relaxed text-mkt-soft mt-4">
          Questions about Centium, or interested in bringing your practice or business on board? Reach out.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="grid lg:grid-cols-[1.3fr_.7fr] max-w-4xl mx-auto border border-mkt-line rounded-3xl overflow-hidden bg-white">
          <form onSubmit={handleSubmit} className="p-7 sm:p-9 flex flex-col gap-3.5">
            <span className="font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">WHAT'S THIS ABOUT?</span>
            <div className="flex flex-wrap gap-2 mb-1.5">
              {topics.map((t, i) => {
                const active = topic === i;
                return (
                  <button
                    type="button"
                    key={t.value}
                    disabled={unavailable || status === "sending"}
                    onClick={() => {
                      setTopic(i);
                      edited();
                    }}
                    className="px-3.5 py-2 rounded-full text-[13px] font-bold transition-colors duration-200 border disabled:opacity-50"
                    style={
                      active
                        ? { background: "#2F5F58", borderColor: "#2F5F58", color: "#fff" }
                        : { background: "transparent", borderColor: "#E0DDD6", color: "#5B5349" }
                    }
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              disabled={unavailable}
              readOnly={status === "sending"}
              onChange={(e) => {
                setName(e.target.value);
                edited();
              }}
              placeholder="Name"
              className={fieldClass}
            />
            <input
              type="email"
              required
              maxLength={254}
              value={email}
              disabled={unavailable}
              readOnly={status === "sending"}
              onChange={(e) => {
                setEmail(e.target.value);
                edited();
              }}
              placeholder="Email"
              className={fieldClass}
            />
            <textarea
              required
              maxLength={1500}
              value={message}
              disabled={unavailable}
              readOnly={status === "sending"}
              onChange={(e) => {
                setMessage(e.target.value);
                edited();
              }}
              rows={4}
              placeholder="How can we help?"
              className={`${fieldClass} resize-none`}
            />
            <p className="text-[12px] text-mkt-faint -mt-1">
              Please don't include medical details in this form.
            </p>

            {/* THE HONEYPOT. Off-screen rather than display:none, because the
                simplest scrapers skip anything display:none and fill in
                everything else — which is exactly the behaviour this is here
                to catch. aria-hidden and tabIndex={-1} keep it away from
                screen readers and the tab order, so it is invisible to people
                by every route they actually use. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
            />

            {/* MOUNTED FOR THE WHOLE LIFE OF THE FORM, hidden rather than
                unmounted once a message is sent. Putting it inside the branch
                below looked tidier and was wrong: sending unmounted the
                container, which destroyed the widget with it, and "Send
                another message" then mounted an empty div that nothing would
                ever render into — the render effect runs on mount of the page,
                not of the container. The button stayed disabled forever
                because no token could arrive. Caught by trying it, not by
                reading it. */}
            {!unavailable && (
              <div
                ref={widgetRef}
                className={status === "sent" ? "hidden" : "flex justify-center min-h-[65px]"}
              />
            )}

            {unavailable ? (
              <p className="text-[12.5px] leading-relaxed text-mkt-soft text-center mt-1">
                The contact form is temporarily unavailable — email us at {mailtoLink}.
              </p>
            ) : status === "sent" ? (
              <div className="flex flex-col items-center gap-1.5 mt-1">
                <p className="text-sm font-semibold text-mkt-ink">Message sent — we'll reply by email.</p>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setErrorCode(null);
                  }}
                  className="text-[12.5px] font-semibold underline"
                  style={{ color: "#6A54C4" }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={!token || status === "sending"}
                  className="tap self-center w-1/2 rounded-full bg-mkt-accent hover:bg-mkt-accent-hover active:scale-[0.98] text-white font-semibold text-sm py-3.5 px-[26px] mt-1 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === "sending" ? "Sending…" : "Send message"}
                </button>
                {errorCode !== null && (
                  <p className="text-[12.5px] leading-relaxed text-mkt-soft text-center mt-1">{errorMessage()}</p>
                )}
              </>
            )}
          </form>

          <div className="border-t lg:border-t-0 lg:border-l border-mkt-line p-7 sm:p-9 flex flex-col gap-6 bg-mkt-wash2">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">
                <Mail size={13} /> EMAIL
              </span>
              <a href="mailto:support@atraxia.org" className="text-sm font-semibold" style={{ color: "#6A54C4" }}>
                support@atraxia.org
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2 font-semibold text-[10.5px] tracking-[.16em] text-mkt-faint">
                <Clock size={13} /> RESPONSE TIME
              </span>
              <p className="text-sm text-mkt-soft">Within a few business days</p>
            </div>
          </div>
        </div>
      </Reveal>

      <div className="flex flex-wrap gap-3 justify-center mt-[76px]">
        <Link
          to="/"
          className="px-7 py-[15px] rounded-full bg-mkt-accent hover:bg-mkt-accent-hover text-white font-semibold text-[15px] transition-colors"
        >
          Back to home
        </Link>
        <Link
          to="/legal"
          className="px-[26px] py-[15px] rounded-full border border-[#CFC5EA] hover:border-mkt-accent text-mkt-ink font-semibold text-[15px] transition-colors"
        >
          Legal
        </Link>
      </div>
    </Section>
  );
};
