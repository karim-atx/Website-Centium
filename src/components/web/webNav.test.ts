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
