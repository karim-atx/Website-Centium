import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSEO } from "../useSEO";
import { PageMark } from "../landing/sections/ChapterMark";
import { usePageLink } from "../landing/navigation";
import { usePageMotion } from "../landing/pageMotion";
import { useViewportWidth } from "../landing/viewport";
import { LG, SM } from "../landing/engine/env";
import { WASH_BG, WEDGE_312, WEDGE_48 } from "../landing/wash";
import { useApp } from "../../context/AppContext";
import { SUPPORT_EMAIL } from "../../services/support";
import { rememberPublicReturn } from "../../services/public-pro";
import { t, tk } from "../../i18n/core";

// Round K (K-DEL): the account-deletion page Google Play asks for. Public, signed in or
// not, at a stable address (/delete-account, also in public/_redirects) that goes into
// Play's Data safety form. Built in the Community guidelines page's own layout and
// literal values (the washed head, the 68ch column, h2 sections with dotted items,
// the closing card). Every fact below is what the Database does today:
//   * 30 days, then the account and everything it owns go (20260908104636);
//   * files are purged from Storage before the erasure (storage_purge_buckets);
//   * sent messages survive without the sender (20260911200000);
//   * bug reports and app reviews survive without the author (20260911210000);
//   * a business closes rather than being deleted (20261130000000);
//   * an author's courses go, enrolled learners told (20261226120000).

function vals(vw: number) {
  const lg = vw >= LG,
    sm = vw >= SM;
  return {
    ctTop: lg ? "96px" : "80px",
    px: sm ? "40px" : "20px",
    washH: lg ? "560px" : "400px",
    headMb: lg ? "64px" : "40px",
    eyebrow: lg ? "20px" : "14px",
    h1: lg ? "56px" : "40px",
  };
}

const DOT = "#775FD7";

const SECTIONS: { id: string; h: string; items: string[] }[] = [
  {
    id: "how",
    h: tk("How to delete your account"),
    items: [tk("In the Centium app or on the website, sign in, open Settings, then Privacy, and choose Delete my account. A business account chooses Delete business account.")],
  },
  {
    id: "thirty-days",
    h: tk("30 days to change your mind"),
    items: [
      tk("Your account will be scheduled for deletion in 30 days. After that your food logs, workouts, health metrics and connections are permanently removed."),
      tk("You can change your mind at any point in those 30 days. Sign back in and choose “Cancel deletion”."),
    ],
  },
  {
    id: "deleted",
    h: tk("What is deleted"),
    items: [
      tk("After the 30 days, your sign-in, your profile and everything your account holds are permanently removed."),
      tk("Files you uploaded, such as photos, documents and message attachments, are removed from storage before your account is erased."),
      tk("Courses you published are removed, and anyone enrolled is told the course is no longer available."),
    ],
  },
  {
    id: "kept",
    h: tk("What is kept, and why"),
    items: [
      tk("Messages you sent stay in the other person's conversation, without your name, so they keep their side of it."),
      tk("Bug reports and app reviews you wrote are kept without anything that identifies you."),
      tk("If you own a business account, the business closes instead of being deleted. Its members keep their records, receipts, bookings and reviews."),
    ],
  },
];

const PRIMARY: React.CSSProperties = { padding: "13px 22px", borderRadius: "999px", background: "#775FD7", color: "#fff", fontWeight: 600, fontSize: "14.5px", "--hbg": "#6A54C4" } as React.CSSProperties;
const OUTLINE: React.CSSProperties = { padding: "13px 22px", borderRadius: "999px", border: "1px solid #CFC5EA", color: "#221E1A", fontWeight: 600, fontSize: "14.5px", "--hbd": "#775FD7" } as React.CSSProperties;

export const DeleteAccount: React.FC = () => {
  useSEO(t("Delete your Centium account"), t("How to delete your Centium account and what happens to your data."));
  usePageMotion();
  const r = vals(useViewportWidth());
  const pageLink = usePageLink();
  const { authUserId, language, setLanguage } = useApp();
  const { search } = useLocation();

  // ?lang=ar, as the refund policy's old address takes: for a reviewer's Arabic link.
  // The address itself never changes.
  useEffect(() => {
    if (new URLSearchParams(search).get("lang") === "ar" && language !== "ar") setLanguage("ar");
    // Once per arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wash = (mask: string) => (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        insetInlineStart: "0",
        insetInlineEnd: "0",
        top: "0",
        height: r.washH,
        transform: "scaleY(-1)",
        pointerEvents: "none",
        background: WASH_BG,
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );

  return (
    <section
      id="delete-account-page"
      data-screen-label="Delete your account"
      style={{ position: "relative", zIndex: "2", overflowX: "clip", padding: `${r.ctTop} ${r.px} 88px` }}
    >
      {wash(WEDGE_48)}
      {wash(WEDGE_312)}
      <div style={{ position: "relative", textAlign: "center", maxWidth: "820px", margin: `0 auto ${r.headMb}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <PageMark id="LEGAL" word={t("Legal")} size={r.eyebrow} />
        <h1 style={{ margin: "14px 0 0", fontWeight: "800", fontSize: r.h1, letterSpacing: "-.04em", lineHeight: "1.04", textWrap: "balance" }}>{t("Delete your Centium account")}</h1>
      </div>
      <div style={{ position: "relative", maxWidth: "68ch", margin: "0 auto", textAlign: "start" }}>
        <article style={{ paddingBottom: "44px", marginBottom: "44px", borderBottom: "1px solid #EDEAE4" }}>
          <p style={{ fontSize: "16.5px", lineHeight: "1.7", color: "#5B5349" }}>{t("Centium is an app by Atraxia. You can delete your account, and the data that goes with it, at any time.")}</p>
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} style={{ scrollMarginTop: "96px", marginTop: "30px" }}>
              <h2 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.015em" }}>{t(s.h)}</h2>
              {s.items.map((it) => (
                <div key={it} style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
                  <span aria-hidden="true" style={{ width: "6px", height: "6px", marginTop: "10px", flexShrink: "0", borderRadius: "99px", background: DOT }} />
                  <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>{t(it)}</p>
                </div>
              ))}
            </section>
          ))}
          <section id="no-access" style={{ scrollMarginTop: "96px", marginTop: "30px" }}>
            <h2 style={{ fontSize: "19px", fontWeight: "800", letterSpacing: "-.015em" }}>{t("If you can't sign in")}</h2>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <span aria-hidden="true" style={{ width: "6px", height: "6px", marginTop: "10px", flexShrink: "0", borderRadius: "99px", background: DOT }} />
              <p style={{ fontSize: "15.5px", lineHeight: "1.7", color: "#3B352D" }}>
                {t("Email {email} from the address on your account and ask us to delete it. We aim to respond within a few business days.", { email: SUPPORT_EMAIL })}
              </p>
            </div>
          </section>
        </article>
        <div style={{ padding: "24px", borderRadius: "22px", background: "#FFFFFF", border: "1px solid rgba(125,103,217,.14)" }}>
          <h2 style={{ fontSize: "22px", fontWeight: "800", letterSpacing: "-.028em" }}>{t("Delete your account now")}</h2>
          <div style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {authUserId ? (
              <a href="/app/settings/privacy?delete=1" className="cl-hbg" style={PRIMARY}>
                {t("Go to Delete my account")}
              </a>
            ) : (
              <a href="/app/onboarding?auth=signin" onClick={() => rememberPublicReturn("/delete-account")} className="cl-hbg" style={PRIMARY}>
                {t("Sign in to delete your account")}
              </a>
            )}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="cl-hbd" style={OUTLINE}>
              {t("Email {email}", { email: SUPPORT_EMAIL })}
            </a>
            <a href="/legal" onClick={pageLink("/legal")} className="cl-hbd" style={OUTLINE}>
              {t("Legal")}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
