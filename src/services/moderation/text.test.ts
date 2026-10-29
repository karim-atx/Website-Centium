import { strict as assert } from "node:assert";
import { test } from "node:test";
import { BLOCKED_TEXT, CONTACT_TEXT, contactRefusal, hasContactDetails, moderationRefusal } from "./text.ts";

test("contact details: phones and emails, not prices, dates, weights or mentions", () => {
  for (const s of ["Call me on +961 3 123 456", "whatsapp 03/123456", "70123456", "mail sara.k@gmail.com", "(01) 234-5678"])
    assert.equal(hasContactDetails(s), true, s);
  for (const s of ["Lost 5 kg in 12 weeks", "Session on 12/10/2026", "Costs 150000 LBP", "1500000 LBP a month", "2500000 steps this year", "thanks @sara_runs", "10,000 steps a day", "", "Open 9:00-17:00"])
    assert.equal(hasContactDetails(s), false, s);
});

test("the two sentences", () => {
  assert.equal(contactRefusal("fine", "call 03 123 456"), CONTACT_TEXT);
  assert.equal(contactRefusal("fine", null), null);
  assert.equal(moderationRefusal({ code: "ATX60" }), BLOCKED_TEXT);
  assert.equal(moderationRefusal({ code: "ATX02" }), null);
});
