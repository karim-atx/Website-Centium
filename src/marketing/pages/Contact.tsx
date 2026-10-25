import React, { useEffect, useRef, useState } from "react";
import { useSEO } from "../useSEO";
import { submitContact, type ContactTopic } from "../../services/contact";
import { TURNSTILE_SITEKEY } from "../../components/security/turnstile";
import { useTurnstile } from "../../components/security/useTurnstile";
import { PageMark } from "../landing/sections/ChapterMark";
import { usePageLink } from "../landing/navigation";
import { usePageMotion } from "../landing/pageMotion";
import { useViewportWidth } from "../landing/viewport";
import { LG, SM } from "../landing/engine/env";

// Centium landing v29: the Contact page (CT1 v17, handover
// 02_pages/19-CT1), the prototype markup with its exact inline styles. ONLY
// THE DESIGN CHANGED. Everything the form does is the previous page's, kept
// as it was: the four topics and their values, the fields and their rules
// (required, maxLength 100 / 254 / 1500, type=email; the browser's own
// constraint validation), the honeypot, the shared Turnstile widget (dark,
// fixed size, mounted for the life of the form, reset after every attempt),
// the unavailable state and its console warning when the site key is
// missing, inputs read-only (not disabled) while sending, any edit retiring
// the error, the mailto in the errors, and the submitContact call
// (services/contact, which sends exactly topic, name, email, message,
// turnstileToken and website: no `source`, the server derives it from the
// request Origin).
// What the handover adds (lead decision B): visible labels; per-field
// messages in place of the browser's bubble (onInvalid, which cancels the
// bubble; the first invalid field still takes focus, as it would natively);
// an "n / 1500" counter; the copy without em dashes.
// The handover draws a "TURNSTILE stand-in" button where the real widget
// renders; the real widget is used.

/** The pill labels, and the enum the Edge Function validates against. */
const topics: { label: string; value: ContactTopic }[] = [
  { label: "General", value: "general" },
  { label: "Professional", value: "professional" },
  { label: "Business", value: "business" },
  { label: "Press", value: "press" },
];

const SUPPORT_EMAIL = "support@atraxia.org";

/**
 * The colour the four submission errors are written in.
 *
 * REUSED RATHER THAN INVENTED, but as a literal rather than as the token. This
 * is exactly the app's own error colour — the light-mode value of
 * `--c-status-high` in src/index.css, which `text-status-high` resolves to
 * everywhere in the signed-in product.
 *
 * The token itself would be wrong here, and the reason is not stylistic. It is
 * theme-aware: AppContext puts `.dark` on <html> for the whole document,
 * marketing routes included, and under `.dark` the variable becomes a pale
 * salmon meant for dark surfaces. This message sits on a card hard-coded
 * `bg-white`, which does not follow the theme — so a visitor whose app theme
 * is dark would get #F09A8E on #FFFFFF, a 2.16:1 contrast that fails AA badly.
 * Pinning the light value keeps the hue the product already uses for errors
 * and keeps it legible on the one background this card ever has.
 *
 * 5.44:1 against #FFFFFF. An inline hex because that is how every other custom
 * colour in this file is applied (#6A54C4, #2F5F58, #E0DDD6). (CT1 draws the
 * same #C0392B, on #FDF3F1 in the error box.)
 */
const ERROR_RED = "#C0392B";

type Status = "idle" | "sending" | "sent";
type Field = "name" | "email" | "message";

const FIELD_MESSAGE: Record<Field, string> = {
  name: "Please enter your name.",
  email: "Please enter a valid email address.",
  message: "Please write a message.",
};

export const Contact: React.FC = () => {
  useSEO("Contact", "Get in touch with the Centium team.");
  usePageMotion();
  const vw = useViewportWidth();
  const lg = vw >= LG,
    sm = vw >= SM;
  const pageLink = usePageLink();
  const [topic, setTopic] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  /** Honeypot. A real visitor never types here; see the input's own note. */
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  /** The function's code, "" for a failure with no response, null for none. */
  const [errorCode, setErrorCode] = useState<string | null>(null);
  /** Fields the browser found invalid on the last submit, until edited. */
  const [invalid, setInvalid] = useState<Record<Field, boolean>>({ name: false, email: false, message: false });
  /** One submit attempt fires an invalid event per invalid field: only the first takes focus. */
  const focusedInvalid = useRef(false);

  // The shared widget (components/security): dark, at its fixed size, as before.
  const { token, container: turnstileContainer, reset: resetTurnstile } = useTurnstile("dark", "normal");

  const unavailable = !TURNSTILE_SITEKEY;

  useEffect(() => {
    if (!TURNSTILE_SITEKEY) {
      // One line, naming the variable, because the page it degrades looks
      // deliberate rather than broken and would otherwise be hard to explain.
      console.warn(
        "[contact] NEXT_PUBLIC_TURNSTILE_SITEKEY is not set — the contact form is showing its unavailable state."
      );
    }
  }, []);

  /** Any edit retires the error: it described the previous attempt. */
  const edited = () => {
    if (errorCode !== null) setErrorCode(null);
  };

  /** An edit also retires that field's own message. */
  const editedField = (f: Field) => {
    edited();
    if (invalid[f]) setInvalid((v) => ({ ...v, [f]: false }));
  };

  /** The browser found the field invalid on submit: show its message instead of the bubble. */
  const onInvalid = (f: Field) => (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    setInvalid((v) => ({ ...v, [f]: true }));
    if (!focusedInvalid.current) {
      focusedInvalid.current = true;
      e.currentTarget.focus();
      window.setTimeout(() => {
        focusedInvalid.current = false;
      }, 0);
    }
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

  /**
   * The address inside an error, in the error's own colour.
   *
   * It keeps an underline where the lavender one in the info strip does not:
   * inside a paragraph that is entirely red, colour alone no longer marks the
   * link as a link, so the underline is carrying the affordance rather than
   * decorating it.
   */
  const errorMailtoLink = (
    <a href={`mailto:${SUPPORT_EMAIL}`} style={{ fontWeight: 700, color: ERROR_RED, textDecoration: "underline" }}>
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
        return <>You've sent several messages recently. Please wait a while, or email us at {errorMailtoLink}.</>;
      default:
        return <>Your message wasn't sent. Your text is still here. Try again, or email us at {errorMailtoLink}.</>;
    }
  };

  const sending = status === "sending";
  const submitDisabled = !token || sending;
  const pillsDisabled = unavailable || sending;
  const ctPad = lg ? "36px" : "22px";

  const field = (f: Field): React.CSSProperties => ({
    borderRadius: "14px",
    border: "1.5px solid " + (invalid[f] ? ERROR_RED : "#E0DDD6"),
    background: invalid[f] ? "#FFFBFA" : unavailable ? "#F6F5F2" : "#FFFFFF",
    fontSize: "14.5px",
    color: "#221E1A",
    outline: "none",
    transition: "border-color .2s",
  });
  const label: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "6px" };
  const labelText: React.CSSProperties = { fontSize: "12.5px", fontWeight: "700", color: "#3B352D" };
  const fieldError = (f: Field) =>
    invalid[f] ? (
      <span id={"ct-err-" + f} style={{ fontSize: "12px", fontWeight: "600", color: ERROR_RED }}>
        {FIELD_MESSAGE[f]}
      </span>
    ) : null;
  const infoHead: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "10.5px",
    fontWeight: "800",
    letterSpacing: ".16em",
    color: "#8C8378",
  };
  const infoIcon = (bg: string): React.CSSProperties => ({
    width: "30px",
    height: "30px",
    flexShrink: "0",
    borderRadius: "9px",
    background: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  return (
    <section id="contact-page" data-screen-label="CT1 v17 Contact" style={{ position: "relative", zIndex: "2", padding: `${lg ? "96px" : "80px"} ${sm ? "40px" : "20px"} 96px` }}>
      <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 44px" }}>
        <PageMark id="CONTACT" word="Contact" size={lg ? "20px" : "14px"} />
        <h1 style={{ marginTop: "14px", fontWeight: "800", fontSize: lg ? "56px" : "40px", letterSpacing: "-.04em", lineHeight: "1.04" }}>Get in touch</h1>
        <p style={{ marginTop: "14px", fontSize: "18px", lineHeight: "1.6", color: "#5B5349" }}>
          Questions about Centium, or interested in bringing your practice or business on board? Reach out.
        </p>
      </div>
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr)",
          borderRadius: "28px",
          overflow: "hidden",
          background: "#FFFFFF",
          border: "1px solid rgba(125,103,217,.14)",
          boxShadow: "0 1px 1px rgba(72,58,130,.05),0 10px 24px rgba(72,58,130,.06),0 40px 80px rgba(92,72,168,.09)",
        }}
      >
        <form onSubmit={handleSubmit} style={{ position: "relative", padding: ctPad, display: "flex", flexDirection: "column", gap: "14px", textAlign: "left" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "800", letterSpacing: ".16em", color: "#8C8378" }}>WHAT'S THIS ABOUT?</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "4px" }}>
            {topics.map((t, i) => {
              const active = topic === i;
              return (
                <button
                  type="button"
                  key={t.value}
                  disabled={pillsDisabled}
                  aria-pressed={active ? "true" : "false"}
                  onClick={() => {
                    setTopic(i);
                    edited();
                  }}
                  style={{
                    minHeight: "38px",
                    padding: "8px 16px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: "700",
                    border: "1px solid " + (active ? "#2F5F58" : "#E0DDD6"),
                    background: active ? "#2F5F58" : "transparent",
                    color: active ? "#fff" : "#5B5349",
                    opacity: pillsDisabled ? 0.5 : 1,
                    transition: "background .2s,color .2s",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <label style={label}>
            <span style={labelText}>Name</span>
            <input
              type="text"
              required
              maxLength={100}
              value={name}
              disabled={unavailable}
              readOnly={sending}
              onChange={(e) => {
                setName(e.target.value);
                editedField("name");
              }}
              onInvalid={onInvalid("name")}
              aria-invalid={invalid.name || undefined}
              aria-describedby={invalid.name ? "ct-err-name" : undefined}
              placeholder="Name"
              className="cl-ffield"
              style={{ ...field("name"), height: "48px", padding: "0 16px", boxShadow: "none" }}
            />
            {fieldError("name")}
          </label>
          <label style={label}>
            <span style={labelText}>Email</span>
            <input
              type="email"
              required
              maxLength={254}
              value={email}
              disabled={unavailable}
              readOnly={sending}
              onChange={(e) => {
                setEmail(e.target.value);
                editedField("email");
              }}
              onInvalid={onInvalid("email")}
              aria-invalid={invalid.email || undefined}
              aria-describedby={invalid.email ? "ct-err-email" : undefined}
              placeholder="Email"
              className="cl-ffield"
              style={{ ...field("email"), height: "48px", padding: "0 16px" }}
            />
            {fieldError("email")}
          </label>
          <label style={label}>
            <span style={{ ...labelText, display: "flex", justifyContent: "space-between" }}>
              Message
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "11px", fontWeight: "500", color: "#A9A29A" }}>{message.length} / 1500</span>
            </span>
            <textarea
              required
              maxLength={1500}
              value={message}
              disabled={unavailable}
              readOnly={sending}
              onChange={(e) => {
                setMessage(e.target.value);
                editedField("message");
              }}
              onInvalid={onInvalid("message")}
              aria-invalid={invalid.message || undefined}
              aria-describedby={invalid.message ? "ct-err-message" : undefined}
              rows={4}
              placeholder="How can we help?"
              className="cl-ffield"
              style={{ ...field("message"), padding: "14px 16px", lineHeight: "1.5", resize: "none" }}
            />
            {fieldError("message")}
          </label>
          <p style={{ marginTop: "-4px", fontSize: "12px", color: "#8C8378" }}>Please don't include medical details in this form.</p>

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
            <div ref={turnstileContainer} style={{ display: status === "sent" ? "none" : "flex", justifyContent: "center", minHeight: "65px" }} />
          )}

          {unavailable ? (
            <p style={{ padding: "12px 14px", borderRadius: "14px", background: "#FAF9F7", fontSize: "13px", lineHeight: "1.55", color: "#5B5349", textAlign: "center" }}>
              The contact form is temporarily unavailable. Email us at{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} style={{ fontWeight: 700, color: "#6A54C4" }}>
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          ) : status === "sent" ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                padding: "18px",
                borderRadius: "16px",
                background: "#F3F9F7",
                border: "1px solid rgba(94,158,149,.24)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "99px",
                  background: "#5E9E95",
                  color: "#fff",
                  fontSize: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✓
              </span>
              <p style={{ fontSize: "15px", fontWeight: "700" }}>Message sent. We'll reply by email.</p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setErrorCode(null);
                }}
                style={{ fontSize: "13px", fontWeight: "700", color: "#6A54C4", textDecoration: "underline" }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <button
                type="submit"
                disabled={submitDisabled}
                className="cl-hbg"
                style={
                  {
                    alignSelf: "center",
                    width: sm ? "50%" : "100%",
                    minHeight: "50px",
                    marginTop: "2px",
                    borderRadius: "999px",
                    background: "#7D67D9",
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "14.5px",
                    opacity: submitDisabled ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    transition: "background .2s",
                    "--hbg": "#6A54C4",
                  } as React.CSSProperties
                }
              >
                {sending && (
                  <span
                    id="ct-spin"
                    aria-hidden="true"
                    style={{ width: "16px", height: "16px", borderRadius: "99px", border: "2px solid rgba(255,255,255,.35)", borderTopColor: "#fff" }}
                  />
                )}
                {sending ? "Sending…" : "Send message"}
              </button>
              {errorCode !== null && (
                <p
                  role="alert"
                  style={{
                    padding: "10px 14px",
                    borderRadius: "12px",
                    background: "#FDF3F1",
                    fontSize: "12.5px",
                    lineHeight: "1.55",
                    textAlign: "center",
                    color: ERROR_RED,
                  }}
                >
                  {errorMessage()}
                </p>
              )}
            </>
          )}
        </form>
        <div
          id="ct-info"
          style={{
            padding: `22px ${ctPad}`,
            background: "#FAF9FE",
            borderLeft: "0",
            borderTop: "1px solid #EDEAE4",
            display: "grid",
            gridTemplateColumns: sm ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)",
            gap: "18px 32px",
            alignItems: "start",
            textAlign: "left",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={infoHead}>
              <span style={infoIcon("#EFEAFB")}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#6A54C4" />
                  <path d="M4 7l8 6 8-6" stroke="#6A54C4" />
                </svg>
              </span>
              EMAIL
            </span>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ paddingLeft: "40px", fontSize: "14.5px", fontWeight: "700", color: "#6A54C4" }}>
              {SUPPORT_EMAIL}
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={infoHead}>
              <span style={infoIcon("#E6F2EF")}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="8.5" stroke="#2F5F58" />
                  <path d="M12 7.5V12l3 2" stroke="#2F5F58" />
                </svg>
              </span>
              RESPONSE TIME
            </span>
            <p style={{ paddingLeft: "40px", fontSize: "14.5px", color: "#5B5349" }}>Within a few business days</p>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "64px" }}>
        <a
          href="/"
          onClick={pageLink("/")}
          className="cl-hbg"
          style={{ padding: "15px 28px", borderRadius: "999px", background: "#7D67D9", color: "#fff", fontWeight: 600, fontSize: "15px", "--hbg": "#6A54C4" } as React.CSSProperties}
        >
          Back to home
        </a>
        <a
          href="/legal"
          onClick={pageLink("/legal")}
          className="cl-hbd"
          style={{ padding: "15px 26px", borderRadius: "999px", border: "1px solid #CFC5EA", color: "#221E1A", fontWeight: 600, fontSize: "15px", "--hbd": "#7D67D9" } as React.CSSProperties}
        >
          Legal
        </a>
      </div>
    </section>
  );
};
