import React from "react";
import { useBusinessNavKind } from "../../components/navigation/useBusinessNavKind";
import { ConsoleGate } from "../../components/business-console/ConsoleGate";
import { FrontDeskPageWeb } from "../business-ops/frontdesk/FrontDeskPage.web";
import { MembershipsWeb } from "../business-ops/plans/MembershipsTab.web";
import BusinessOperationsTab from "./BusinessOperationsTab";

// Website viewport v1: the business navbar's per-type tab
// (/app/business/operations) from 1024px wide. A gym gets the Front desk's
// web page (WB-FD), behind the same permission gates as on mobile; every
// other type (Schedule, Orders, Appointments: their own web designs, built
// by their areas) shows its mobile tab in the centred column meanwhile.

const MobileColumn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-web-frame="mobile" className="max-w-[430px] mx-auto px-4 pt-6 pb-12">
    {children}
  </div>
);

export default function BusinessOperationsTabWeb() {
  const kind = useBusinessNavKind();
  if (kind === "gym")
    return (
      <ConsoleGate need={["front_desk", "members"]}>
        <FrontDeskPageWeb
          memberships={(onAddRef) => (
            <ConsoleGate need="members">
              <MembershipsWeb onAddRef={onAddRef} />
            </ConsoleGate>
          )}
        />
      </ConsoleGate>
    );
  return (
    <MobileColumn>
      <BusinessOperationsTab />
    </MobileColumn>
  );
}
