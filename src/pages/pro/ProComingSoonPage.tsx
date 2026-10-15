import React from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { ComingSoon } from "../../components/pro/ComingSoon";

/**
 * Release 3 W1: the page a route shows until the batch that owns it fills its
 * file (FINAL_PLAN section 2: W2 Home, W3 Clients, W4 Calendar, W5 Library,
 * Meal plans and Insights, W6 More). Its title and the Coming soon state only:
 * never sample data. Each page file under pages/pro is replaced by its batch;
 * the routes (ProRoutes.tsx, App.tsx) don't change.
 */
export const ProComingSoonPage: React.FC<{ title: string; line?: string; showBack?: boolean }> = ({ title, line, showBack }) => (
  <div>
    <PageHeader title={title} showBack={showBack} />
    <ComingSoon line={line} />
  </div>
);
