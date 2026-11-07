import React from "react";
import { WebPageHeader } from "../../components/web/WebPageHeader";
import { useWebLayout, WEB_CONTENT_MAX } from "../../components/web/useWebLayout";

/**
 * Addendum A, WC-EX.4 / .5 / .6 (WC-EX Points Web, WC-EX Rewards Web): the
 * Explore child pages on web: the 64 page header with its back button, then
 * the body (24 / 32 padding, up to 1600 wide). `className` scopes the page's
 * own grid rules; the page's mobile header is left out on web.
 */
export const ExploreWebPage: React.FC<{ title: string; back: string; className?: string; css?: string; children: React.ReactNode }> = ({ title, back, className, css, children }) => {
  const { rail } = useWebLayout();
  return (
    <div>
      <WebPageHeader title={title} back={{ to: back, label: "Back" }} />
      {css && <style>{css}</style>}
      <div className={className} style={{ maxWidth: WEB_CONTENT_MAX, margin: "0 auto", boxSizing: "border-box", padding: `24px ${rail ? 24 : 32}px` }}>
        {children}
      </div>
    </div>
  );
};
