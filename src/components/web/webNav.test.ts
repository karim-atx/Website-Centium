import { test } from "node:test";
import assert from "node:assert/strict";
import { businessShortcutActive, clientSidebarActive, secondaryLayoutFor } from "./webNav";

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

test("More and Settings open in the secondary layout for business accounts only", () => {
  assert.equal(secondaryLayoutFor("/app/more", true), "business-more");
  assert.equal(secondaryLayoutFor("/app/business/more/seats", true), "business-more");
  assert.equal(secondaryLayoutFor("/app/business/more/help", true), "business-settings");
  assert.equal(secondaryLayoutFor("/app/settings", true), "business-settings");
  assert.equal(secondaryLayoutFor("/app/business/more/locations", true), null);
  assert.equal(secondaryLayoutFor("/app/settings", false), null);
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
});
