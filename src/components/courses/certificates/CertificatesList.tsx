import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, ChevronRight } from "lucide-react";
import { fetchMyCertificates, type MyCertificate } from "../../../services/courses";
import { DangerLine, EmptyBlock, ForumPlaceholder } from "../../forum/parts";
import { fv } from "../../forum/forumColor";
import { certificateDate } from "./certificateDate";
import { t } from "../../../i18n/core";

/**
 * Round F · 3, Your certificates: Community › Courses › Certificates (also
 * reached from Profile). Every certificate the learner holds, including those
 * whose course was deleted (Database #52 keeps them with the course's last
 * title), newest first; each opens its own page.
 *
 * Not drawn in any handover: it takes the catalogue's card (r20, card fill,
 * 1px border, padding 12 14) and Profile's 32 icon tile.
 */
export function CertificatesList({ userId }: { userId: string }) {
  const [result, setResult] = useState<{ list: MyCertificate[] } | { error: string } | null>(null);

  useEffect(() => {
    let live = true;
    void fetchMyCertificates(userId).then((r) => live && setResult(r.ok ? { list: r.value } : { error: r.message }));
    return () => {
      live = false;
    };
  }, [userId]);

  if (!result) {
    return (
      <div className="flex flex-col gap-2.5" aria-busy="true">
        <ForumPlaceholder height={72} />
        <ForumPlaceholder height={72} />
      </div>
    );
  }
  if ("error" in result) return <DangerLine>{t(result.error)}</DangerLine>;
  if (result.list.length === 0) {
    return (
      <EmptyBlock
        icon={<Award size={26} strokeWidth={1.75} />}
        title={t("No certificates yet")}
        line={t("Finish every lesson and pass every quiz in a course to earn one.")}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-2.5 list-none m-0 p-0" aria-label={t("Your certificates")}>
      {result.list.map((c) => (
        <li key={c.id}>
          <Link
            to={`/app/forum/courses/certificates/${c.id}`}
            className="rounded-[20px] px-[14px] py-3 flex items-center gap-3 no-underline"
            style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
          >
            <span className="w-8 h-8 rounded-[10px] bg-primary-pale flex items-center justify-center shrink-0" aria-hidden="true">
              <Award size={16} strokeWidth={1.75} className="text-primary-dark" />
            </span>
            <span className="flex flex-col gap-[3px] grow min-w-0">
              <span className="text-[15px] font-extrabold leading-[1.3] [overflow-wrap:anywhere]">{c.courseTitle}</span>
              <span className="text-xs" style={{ color: fv("muted") }}>
                {[
                  t("Earned {date}", { date: certificateDate(c.issuedAt) }),
                  c.courseId === null ? t("Course no longer available") : null,
                  c.shared ? t("Shared") : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <ChevronRight size={15} className="shrink-0 rtl:-scale-x-100" style={{ color: fv("muted") }} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
