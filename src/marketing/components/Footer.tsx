import React from "react";
import { Link } from "react-router-dom";
import { CentiumMark, CentiumWordmark } from "./CentiumLogo";

// v2 Centium landing handoff: footer rebuilt with a CTA band, a social +
// store row, and Product/Company/Legal columns over a lavender wash — the
// long inline policy list is gone, replaced by three links into the new
// consolidated /legal page. "For Business" dropped from Company per the
// handoff's own footer spec (Business.tsx itself is untouched and still
// reachable at /business; it's simply no longer linked from here).
const columns: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: "Product",
    links: [
      { to: "/#platform", label: "Features" },
      { to: "/#pricing", label: "Pricing" },
      { to: "/app", label: "Log in" },
      { to: "/contact", label: "Request a Demo" },
    ],
  },
  {
    title: "Company",
    links: [
      { to: "/#faq", label: "FAQ" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { to: "/legal", label: "Policies & disclaimers" },
      { to: "/legal#privacy", label: "Privacy Policy" },
      { to: "/legal#terms", label: "Terms of Service" },
    ],
  },
];

const socials = [
  {
    label: "Instagram",
    path: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="17.4" cy="6.6" r=".8" fill="currentColor" />
      </>
    ),
  },
  { label: "LinkedIn", path: <path d="M4.5 9.5v10M4.5 5.5v.1M10 19.5v-10M10 13.5a3.5 3.5 0 0 1 7 0v6" /> },
  { label: "X", path: <path d="M4 4l16 16M20 4L4 20" /> },
  {
    label: "YouTube",
    path: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="4" />
        <path d="M11 10l4 2-4 2z" fill="currentColor" />
      </>
    ),
  },
];

export const Footer: React.FC = () => (
  <footer className="relative overflow-hidden" style={{ background: "linear-gradient(#E7E0F9 0%,#EFEAF9 34%,#F7F5FB 100%)" }}>
    <div
      aria-hidden="true"
      className="absolute pointer-events-none rounded-full"
      style={{ right: -90, top: 34, width: 300, height: 300, background: "radial-gradient(circle at 50% 50%,rgba(111,153,147,.3),rgba(111,153,147,0) 68%)" }}
    />
    <div
      aria-hidden="true"
      className="absolute pointer-events-none rounded-full"
      style={{ left: -70, bottom: -110, width: 320, height: 320, background: "radial-gradient(circle at 50% 50%,rgba(140,110,222,.26),rgba(140,110,222,0) 68%)" }}
    />
    <div className="relative max-w-[1180px] mx-auto pt-[76px] px-5 sm:px-10 pb-8">
      <div
        className="grid gap-9 items-center rounded-[22px] px-[30px] py-[26px]"
        style={{
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          background: "rgba(255,255,255,.62)",
          border: "1px solid rgba(255,255,255,.8)",
          boxShadow: "0 18px 44px rgba(72,58,130,.1)",
          backdropFilter: "blur(10px)",
        }}
      >
        <div>
          <div className="font-extrabold text-[22px] tracking-[-.028em] text-mkt-ink">Bring it all together.</div>
          <p className="text-sm leading-relaxed text-mkt-soft mt-2">One place to understand, manage and improve your health.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 justify-end">
          <span className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-mkt-ink/10 bg-white/70">
            <span className="flex text-mkt-accent-hover">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M16.6 12.9c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.1-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.3zM14.6 5.9c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2z" />
              </svg>
            </span>
            <span className="flex flex-col leading-[1.1]">
              <span className="text-[9px] font-semibold text-mkt-faint">Coming soon</span>
              <span className="text-[12.5px] font-bold text-mkt-ink">App Store</span>
            </span>
          </span>
          <span className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-mkt-ink/10 bg-white/70">
            <span className="flex text-mkt-accent-hover">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M4 3.5v17c0 .5.5.8.9.6l9.3-5.3-3-3L4 3.5zM15.6 14.1l2.9-1.6c.6-.4.6-1.3 0-1.6l-2.9-1.7-3 3.1 3 1.8zM4.9 2.3l8.7 8.8-2.4 2.4L4.9 2.3z" />
              </svg>
            </span>
            <span className="flex flex-col leading-[1.1]">
              <span className="text-[9px] font-semibold text-mkt-faint">Coming soon</span>
              <span className="text-[12.5px] font-bold text-mkt-ink">Google Play</span>
            </span>
          </span>
        </div>
      </div>

      <div className="grid gap-10 mt-[52px]" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
        <div>
          <Link to="/" className="flex items-center gap-[11px] text-[#5C48A8]">
            <CentiumMark size={26} />
            <CentiumWordmark height={10} />
          </Link>
          <p className="text-sm leading-relaxed text-mkt-soft mt-4 max-w-[250px]">
            Nutrition, training, health and community — connected in one health hub.
          </p>
          <div className="flex gap-2 mt-[22px]">
            {socials.map((s) => (
              <a
                key={s.label}
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-label={s.label}
                className="w-[34px] h-[34px] rounded-full border border-mkt-ink/10 bg-white/70 text-mkt-soft flex items-center justify-center transition-[color,border-color,transform] duration-200 hover:text-mkt-accent-hover hover:border-mkt-accent-ring hover:-translate-y-0.5"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {s.path}
                </svg>
              </a>
            ))}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-bold text-[11px] tracking-[.2em] text-[#6B6358]">{col.title.toUpperCase()}</p>
            <ul className="flex flex-col gap-[11px] mt-[18px]">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-mkt-soft hover:text-mkt-accent-hover transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3.5 mt-[52px] pt-[22px] border-t border-mkt-ink/[.09]">
        <span className="text-[12.5px] text-mkt-faint">© {new Date().getFullYear()} Centium. All rights reserved.</span>
        <span className="text-[12.5px] text-mkt-faint">Centium supports your health journey — it does not provide medical diagnosis or treatment.</span>
      </div>
    </div>
  </footer>
);
