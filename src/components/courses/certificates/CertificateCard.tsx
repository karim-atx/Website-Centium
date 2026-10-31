import { useState } from "react";
import { setCertificateSharing, type Certificate } from "../../../services/courses";
import { fv } from "../../forum/forumColor";
import { certificateDate } from "./certificateDate";
import { siteHref } from "../../../config/site";
import { GuidelinesLink } from "../../moderation/GuidelinesLink";
import { t } from "../../../i18n/core";

/**
 * The certificate, and the switch that makes it public. On the course page and
 * on a certificate's own page (Round F · 3, Your certificates).
 *
 * OFF BY DEFAULT, AND PER CERTIFICATE. The default is the database's
 * (course_certificates.shared is `not null default false`), and the switch is
 * per certificate rather than per account so that publishing one course does
 * not volunteer the rest.
 *
 * THE LINK ONLY EXISTS WHILE IT IS ON. While the switch is off,
 * course_certificate(serial) answers a stranger with nothing — so showing the
 * URL would be showing a link that leads nowhere, and the page it leads to is
 * deliberately unable to say why.
 */
export function CertificateCard({ certificate, courseGone = false }: { certificate: Certificate | null; courseGone?: boolean }) {
  const [shared, setShared] = useState(certificate?.shared ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url = certificate ? siteHref(`/certificate/${certificate.serial}`) : "";

  const toggle = async (next: boolean) => {
    if (!certificate || busy) return;
    setBusy(true);
    setError(null);
    // Optimistic, then corrected by the write: a switch should move under the
    // finger, and a failed write puts it back and says so.
    setShared(next);
    const r = await setCertificateSharing(certificate.id, next);
    if (!r.ok) {
      setShared(!next);
      setError(r.message);
    }
    setBusy(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Couldn't copy the link. Select it and copy it by hand.");
    }
  };

  return (
    // Decision 23 (item 261): the learn card's shape (MO1.3.5 #5: radius 18,
    // padding 14, gap 10, title 14/800).
    <div className="rounded-[18px] p-[14px] flex flex-col gap-2.5" style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}>
      <span className="text-sm font-extrabold">{t("Certificate of completion")}</span>
      {certificate ? (
        <>
          <span className="text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
            {t("Earned {date}", { date: certificateDate(certificate.issuedAt) })} · <bdi>{certificate.serial}</bdi>
          </span>

          <label className="flex items-center justify-between gap-3 mt-1 cursor-pointer">
            <span className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold">{t("Share certificate")}</span>
              <span className="text-xs leading-[1.45]" style={{ color: fv("muted") }}>
                {/* A deleted course's public page has no professional's name
                    (course_certificate gives null), so the line leaves it out. */}
                {!shared
                  ? t("Off. Only you can see it.")
                  : courseGone
                    ? t("Anyone with the link can see your first name, this course and the date.")
                    : t("Anyone with the link can see your first name, this course, the professional and the date.")}
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={shared}
              disabled={busy}
              onChange={(e) => void toggle(e.target.checked)}
              className="sr-only peer"
              aria-label={t("Share certificate")}
            />
            <span
              aria-hidden="true"
              className="w-11 h-[26px] rounded-full shrink-0 relative transition-colors"
              style={{ background: shared ? fv("accent") : fv("track"), opacity: busy ? 0.6 : 1 }}
            >
              <span
                className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-all"
                style={{ insetInlineStart: shared ? 21 : 3 }}
              />
            </span>
          </label>

          {shared && (
            <div className="flex items-center gap-2 rounded-xl px-2.5 py-2" style={{ background: fv("track") }}>
              <span dir="ltr" className="text-[11px] grow min-w-0 truncate text-start" style={{ color: fv("muted") }}>
                {url}
              </span>
              <button
                type="button"
                onClick={() => void copy()}
                className="tap text-[11px] font-extrabold rounded-full px-2.5 py-1 shrink-0"
                style={{ background: fv("card"), color: fv("link"), border: `1px solid ${fv("border")}` }}
              >
                {copied ? t("Copied") : t("Copy link")}
              </button>
            </div>
          )}

          {error && (
            <span role="alert" className="text-xs font-semibold" style={{ color: fv("danger") }}>
              {t(error)}
              <GuidelinesLink message={error} />
            </span>
          )}
        </>
      ) : (
        <span className="text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
          {t("Finish every lesson and pass every quiz to earn it.")}
        </span>
      )}
    </div>
  );
}
