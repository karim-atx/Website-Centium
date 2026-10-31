import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchMyCertificateById, type MyCertificate } from "../../../services/courses";
import { DangerLine, ForumPlaceholder } from "../../forum/parts";
import { fv } from "../../forum/forumColor";
import { useBack } from "../../../hooks/useBack";
import { CertificateCard } from "./CertificateCard";
import { t } from "../../../i18n/core";

/**
 * Round F · 3: one certificate, opened from Your certificates
 * (/app/forum/courses/certificates/:certificateId). The course's stored title,
 * the way back to the course while it exists, and the certificate card with
 * its share switch, which still works once the course is gone (the public
 * check reads the stored title).
 */
export function CertificateView({ certificateId }: { certificateId: string }) {
  const goBack = useBack("/app/forum?tab=courses&view=certificates");
  const [result, setResult] = useState<{ certificate: MyCertificate | null } | { error: string } | null>(null);

  useEffect(() => {
    let live = true;
    void fetchMyCertificateById(certificateId).then((r) => live && setResult(r.ok ? { certificate: r.value } : { error: r.message }));
    return () => {
      live = false;
    };
  }, [certificateId]);

  const certificate = result && "certificate" in result ? result.certificate : null;

  return (
    <div className="flex flex-col gap-3.5 pb-6" style={{ color: fv("text") }}>
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={goBack}
          aria-label={t("Back")}
          className="tap relative w-9 h-9 -ms-[7px] rounded-full flex items-center justify-center shrink-0 before:content-[''] before:absolute before:-inset-1"
        >
          <ChevronLeft size={18} strokeWidth={2} className="rtl:-scale-x-100" style={{ color: fv("muted") }} aria-hidden="true" />
        </button>
        <div className="flex flex-col gap-1 min-w-0 mt-[3px]">
          <span className="text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.12em] rtl:tracking-normal" style={{ color: fv("muted") }}>
            {t("Certificate")}
          </span>
          <h1 className="m-0 text-[22px] font-extrabold leading-[1.25] [overflow-wrap:anywhere] [text-wrap:balance]">
            {certificate ? certificate.courseTitle : t("Your certificates")}
          </h1>
        </div>
      </div>

      {!result ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <ForumPlaceholder height={56} />
          <ForumPlaceholder height={150} />
        </div>
      ) : "error" in result ? (
        <DangerLine>{t(result.error)}</DangerLine>
      ) : !certificate ? (
        <DangerLine>{t("We couldn't find that certificate.")}</DangerLine>
      ) : (
        <>
          {certificate.courseId === null ? (
            <span className="text-[13px] leading-[1.5]" style={{ color: fv("muted") }}>
              {t("This course is no longer available. Your certificate stays yours, and a shared link still works.")}
            </span>
          ) : (
            <Link
              to={`/app/forum/courses/${certificate.courseId}`}
              className="tap self-start h-11 flex items-center gap-1 text-[13px] font-bold no-underline"
              style={{ color: fv("link") }}
            >
              {t("Open the course")}
              <ChevronRight size={14} strokeWidth={2} className="rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          )}
          <CertificateCard certificate={certificate} courseGone={certificate.courseId === null} />
        </>
      )}
    </div>
  );
}
