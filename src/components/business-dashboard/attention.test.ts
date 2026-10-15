import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { attentionItems, toAttentionRows } from "./attention";

describe("B15 attention (business_attention)", () => {
  it("maps items in the server's order with severity tones", () => {
    const items = attentionItems(
      toAttentionRows([
        { item: "not_on_explore", count: 1, severity: "high" },
        { item: "classes_under_40pct_next_48h", count: "2", severity: "medium" },
        { item: "no_free_seats", count: 1, severity: "low" },
      ])
    );
    assert.deepEqual(items.map((i) => [i.title, i.sub, i.action, i.tone]), [
      ["Your listing is hidden", "Clients can't find you on Explore", "Turn on", "high"],
      ["2 classes under 40% booked", "In the next 48 hours", "Open", "caution"],
      ["No free seats", "Every seat is in use", "Add", "primary"],
    ]);
  });

  it("drops zero counts and items this build does not know", () => {
    assert.deepEqual(attentionItems(toAttentionRows([{ item: "orders_to_pack", count: 0, severity: "medium" }, { item: "new_thing", count: 3, severity: "low" }])), []);
    assert.equal(attentionItems(toAttentionRows([{ item: "orders_to_pack", count: 1, severity: "medium" }]))[0].sub, "1 order");
  });
});
