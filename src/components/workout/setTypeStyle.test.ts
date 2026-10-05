import { strict as assert } from "node:assert";
import { test } from "node:test";
import { contrastRatio } from "../../data/folderColors.ts";
import { TYPE_STYLE, typeStyles } from "./setTypeStyle.ts";

test("set types: light is unchanged, dark ink and label read at 4.5:1 on the dark field", () => {
  assert.equal(typeStyles(false), TYPE_STYLE);
  for (const [kind, t] of Object.entries(typeStyles(true))) {
    assert.ok(contrastRatio(t.ink, t.field) >= 4.5, kind);
    assert.ok(contrastRatio(t.label, t.field) >= 4.5, kind);
  }
  assert.equal(typeStyles(true).skipped.row, "transparent");
});
