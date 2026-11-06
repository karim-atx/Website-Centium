import { test } from "node:test";
import assert from "node:assert/strict";
import { businessShortcutActive, clientSidebarActive, proSidebarActive, secondaryLayoutFor } from "./webNav";

test("client sidebar: one row per path, Health keeps Cycle and Contraception", () => {
  assert.equal(clientSidebarActive("/app"), "home");
  assert.equal(clientSidebarActive("/app/food/nutrient-summary"), "food");
  assert.equal(clientSidebarActive("/app/cycle"), "health");
  assert.equal(clientSidebarActive("/app/forum/post/1"), "community");
  assert.equal(clientSidebarActive("/app/marketplace/gyms"), "explore");
  assert.equal(clientSidebarActive("/app/settings/language"), "settings");
  assert.equal(clientSidebarActive("/app/subscription"), "premium");
  assert.equal(clientSidebarActive("/app/more"), "more");
  assert.equal(clientSidebarActive("/app/profile"), "profile");
});

test("business sidebar: the secondary rows win over the tabs", () => {
  assert.equal(businessShortcutActive("/app/messages"), "messages");
  assert.equal(businessShortcutActive("/app/business/analytics/members/codes"), "members");
  assert.equal(businessShortcutActive("/app/business/analytics"), null);
  assert.equal(businessShortcutActive("/app/business/more/roles"), "more");
  assert.equal(businessShortcutActive("/app/business/services"), "more");
  assert.equal(businessShortcutActive("/app/settings/two-factor"), "settings");
});

test("More and Settings: business layouts, the shared Settings layout and the professional More", () => {
  assert.equal(secondaryLayoutFor("/app/more", true), "business-more");
  assert.equal(secondaryLayoutFor("/app/business/more/seats", true), "business-more");
  assert.equal(secondaryLayoutFor("/app/business/more/help", true), "business-settings");
  assert.equal(secondaryLayoutFor("/app/settings", true), "business-settings");
  assert.equal(secondaryLayoutFor("/app/business/more/locations", true), null);
  assert.equal(secondaryLayoutFor("/app/settings", false), "settings");
  assert.equal(secondaryLayoutFor("/app/get-support", false), "settings");
  assert.equal(secondaryLayoutFor("/app/more", false), null);
  assert.equal(secondaryLayoutFor("/app/more", false, true), "pro-more");
  assert.equal(secondaryLayoutFor("/app/more/forms", false, true), "pro-more");
  assert.equal(secondaryLayoutFor("/app/subscription", false, true), "pro-more");
  assert.equal(secondaryLayoutFor("/app/more/practice/invoice", false, true), "settings");
  assert.equal(secondaryLayoutFor("/app/more/practice-insights", false, true), null);
  assert.equal(secondaryLayoutFor("/app/more/businesses/x", false, true), null);
  assert.equal(secondaryLayoutFor("/app/more/care-network", false, true), null);
});

test("professional sidebar: slot 4 per lane, sidebar pages before More", () => {
  assert.equal(proSidebarActive("/app/pro"), "home");
  assert.equal(proSidebarActive("/app/pro/invite"), "home");
  assert.equal(proSidebarActive("/app/pro/clients/x/notes"), "clients");
  assert.equal(proSidebarActive("/app/pro/meal-plans/journals"), "slot4");
  assert.equal(proSidebarActive("/app/pro/insights/vitals"), "slot4");
  assert.equal(proSidebarActive("/app/pro/marketplace/offers"), "explore");
  assert.equal(proSidebarActive("/app/more/practice-insights/clients"), "insights");
  assert.equal(proSidebarActive("/app/more/practice/listing"), "settings");
  assert.equal(proSidebarActive("/app/more/forms"), "more");
  assert.equal(proSidebarActive("/app/subscription"), "more");
});

test("the adapted business pages fill the content area; everything else keeps the mobile column", async () => {
  const { webPageFor } = await import("./webPages");
  assert.equal(webPageFor("/app/business/services", true), true);
  assert.equal(webPageFor("/app/business/classes/rules", true), true);
  assert.equal(webPageFor("/app/business/classes", true), true); // area cs: WB-CS-SC
  assert.equal(webPageFor("/app/business/orders/a8000000-0000-4000-8000-000000001048", true), true); // area cs: WB-ST-OR.1
  assert.equal(webPageFor("/app/business/orders/list/to-fulfil", true), true); // area cs: WB-ST-OR.3 See all lists
  assert.equal(webPageFor("/app/business/appointments/day", true), true); // area cs: WB-ST-AP.4 Day list
  assert.equal(webPageFor("/app/business/services", false), false);
  assert.equal(webPageFor("/app/pro/clients", false, true), true); // WP-CL list-detail
  assert.equal(webPageFor("/app/pro/clients/x/overview", false, true), true); // WP-CL.1 client page
  assert.equal(webPageFor("/app/pro/clients/x/insights", false, true), false); // Client insights keeps the centred column
  assert.equal(webPageFor("/app/pro", false, true), true); // WP-HO Home
  assert.equal(webPageFor("/app/pro/calendar", false, true), true); // WP-CA
  assert.equal(webPageFor("/app/pro/calendar/availability", false, true), false); // WP-CA.5 not built yet
  assert.equal(webPageFor("/app/pro/insights/vitals", false, true), true); // WP-CO-IN
  assert.equal(webPageFor("/app/pro/marketplace/opportunities", false, true), false); // wait for v2
});
