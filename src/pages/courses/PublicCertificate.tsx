import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchPublicCertificate, type PublicCertificate as Cert } from "../../services/courses";

// The public certificate page: /certificate/:serial
//
// SIGNED OUT, AND OUTSIDE EVERY GUARD. This is the one page in the app a
// stranger is meant to open, because a certificate is a thing somebody shows an
// employer. course_certificate() is the only function in Courses granted to
// anon, it returns five fields and no sixth, and it answers nothing at all
// unless the learner has turned sharing on.
//
// ONE NOT-FOUND STATE, AND IT MUST NOT EXPLAIN ITSELF. An unshared certificate
// and a serial that never existed both come back empty, deliberately: telling
// the two apart would confirm to a stranger that a given certificate exists,
// which is exactly what the switch is for. So the wording here is never "this
// certificate is private" — it is "we couldn't find it", for both.
//
// AND IT SAYS WHAT IT IS. "A certificate of completion, not a professional
// qualification" is fixed wording from the design and is not negotiable: it is
// the sentence that stops this page being mistaken for a licence.

const DISCLAIMER = "A certificate of completion, not a professional qualification.";

/** Its own colours, because it renders for someone who has never signed in. */
const INK = "#241F1B";
const MUTED = "#5E5750";
const CARD = "#FFFFFF";
const BORDER = "#E4E0F0";
const ACCENT = "#7D6BB5";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    // THIS PAGE IS ALWAYS LIGHT. It has no session, so it has no theme to read,
    // and a certificate is a document — a dark one would look like a mistake
    // beside the printed thing it stands in for.
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: "#F7F6FB" }}>
      <main className="w-full max-w-[430px] flex flex-col gap-4">{children}</main>
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex justify-center">
      <img src="/centium-lockup.png" alt="Centium" className="h-9 w-auto object-contain" />
    </div>
  );
}

export default function PublicCertificate() {
  const { serial = "" } = useParams();
  const [state, setState] = useState<{ status: "loading" } | { status: "found"; cert: Cert } | { status: "missing" } | { status: "error"; message: string }>({
    status: "loading",
  });

  useEffect(() => {
    let live = true;
    void fetchPublicCertificate(serial).then((r) => {
      if (!live) return;
      if (!r.ok) setState({ status: "error", message: r.message });
      else if (!r.value) setState({ status: "missing" });
      else setState({ status: "found", cert: r.value });
    });
    return () => {
      live = false;
    };
  }, [serial]);

  useEffect(() => {
    document.title = state.status === "found" ? `${state.cert.courseTitle} · Centium` : "Certificate · Centium";
  }, [state]);

  if (state.status === "loading") {
    return (
      <Frame>
        <Wordmark />
        <div className="rounded-[22px] h-[320px] animate-pulse" style={{ background: "#ECE9F4" }} aria-busy="true" />
      </Frame>
    );
  }

  if (state.status === "error") {
    return (
      <Frame>
        <Wordmark />
        <div className="rounded-[22px] p-6 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[15px] font-extrabold" style={{ color: INK }}>
            Something went wrong
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: MUTED }}>
            {state.message}
          </p>
        </div>
      </Frame>
    );
  }

  if (state.status === "missing") {
    return (
      <Frame>
        <Wordmark />
        <div className="rounded-[22px] p-6 text-center" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[15px] font-extrabold" style={{ color: INK }}>
            We couldn't find that certificate
          </p>
          {/* DELIBERATELY SAYS NOTHING ABOUT WHY. The serial may never have
              existed, or its owner may not be sharing it; this page cannot tell
              you which, and that is the point rather than a limitation. */}
          <p className="mt-1.5 text-[13px] leading-[1.6]" style={{ color: MUTED }}>
            Check the link and try again.
          </p>
        </div>
      </Frame>
    );
  }

  const { cert } = state;
  const completed = new Date(`${cert.completedOn}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Frame>
      <Wordmark />
      <article
        className="rounded-[22px] px-6 py-8 flex flex-col items-center text-center gap-1"
        style={{ background: CARD, border: `1px solid ${BORDER}` }}
      >
        <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase" style={{ color: ACCENT }}>
          Certificate of completion
        </span>

        <span className="mt-4 text-[13px]" style={{ color: MUTED }}>
          This certifies that
        </span>
        {/* FIRST NAME ONLY, because that is all the function returns. */}
        <h1 className="text-[26px] font-extrabold leading-tight [overflow-wrap:anywhere]" style={{ color: INK }}>
          {cert.learnerFirstName}
        </h1>

        <span className="mt-3 text-[13px]" style={{ color: MUTED }}>
          completed
        </span>
        <p className="text-[18px] font-extrabold leading-snug [overflow-wrap:anywhere]" style={{ color: INK }}>
          {cert.courseTitle}
        </p>

        <p className="mt-3 text-[13px] leading-[1.6]" style={{ color: MUTED }}>
          {/* THE DATABASE RETURNS NULL RATHER THAN "Deleted account" when the
              professional has closed theirs, so the absence is worded here —
              the course was still taught, and the certificate still stands. */}
          {cert.professionalName ? (
            <>
              Taught by <strong style={{ color: INK }}>{cert.professionalName}</strong>
            </>
          ) : (
            "The professional who taught this course has since closed their account."
          )}
        </p>
        <p className="text-[13px]" style={{ color: MUTED }}>
          on {completed}
        </p>

        <div className="w-full mt-6 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
          <p className="text-[10px] font-extrabold tracking-[0.14em] uppercase" style={{ color: MUTED }}>
            Serial
          </p>
          <p className="text-[13px] font-bold tabular-nums tracking-wide [overflow-wrap:anywhere]" style={{ color: INK }}>
            {cert.serial}
          </p>
        </div>
      </article>

      <p className="text-center text-[11px] leading-[1.6] px-4" style={{ color: MUTED }}>
        {DISCLAIMER}
      </p>
    </Frame>
  );
}
