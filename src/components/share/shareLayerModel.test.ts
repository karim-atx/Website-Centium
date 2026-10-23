// Market + Share 3.0 · P-SH.3 ADDED "Your photo": the layer's layout.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LAYER, LAYER_LINK_ROOM, LAYER_QR_TILE, layoutShareLayer, profileInitials, type CardMeasure } from "./shareLayerModel";
import { winCard, milestoneCard, type CardSpec } from "./shareCardModel";

// Manrope's ascent and descent (1.066 and 0.3 of the size), rounded to whole
// px as Blink lays text out; 0.55 of the size per character.
const measure: CardMeasure = {
  width: (text, font, ls) => {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);
    return [...text].length * (size * 0.55 + ls);
  },
  extent: (font) => {
    const size = Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]);
    return { ascent: Math.round(size * 1.066), descent: Math.round(size * 0.3) };
  },
};

const pro = { name: "Rana", handle: "ranakhoury" };
const pr = winCard({ winId: "w", clientId: "c", kind: "pr", occurredAt: "2026-10-14T09:00:00Z", value: { pr_exercise: "Back squat", pr_load_kg: 120 } }) as CardSpec;

test("the PR layer stacks as the yp* frames draw it (100 wide, 109 tall)", () => {
  const L = layoutShareLayer({ spec: pr, pro, client: "S.R." }, measure);
  assert.equal(L.W, 100);
  // Frame yp1Default: the layer's rows at 460.5 (head), 483.8 (eyebrow), 493.8 (number), 520.5 (subject), 535.5 (line), 551.5 (QR row); bottom 569.5.
  assert.equal(L.boxes.head.h, 16.25);
  assert.equal(L.boxes.eyebrow.y, 23.25);
  assert.equal(L.boxes.eyebrow.h, 8);
  assert.equal(L.boxes.subject.y, 60);
  assert.equal(L.boxes.line.y, 75);
  assert.equal(L.boxes.foot.y, 91);
  assert.equal(L.boxes.qr.w, 18);
  assert.equal(L.H, 109);
  // White text, the line and handle at 0.94, the client filled in.
  const texts = L.ops.filter((o) => o.k === "text");
  assert.ok(texts.every((o) => o.k === "text" && o.color === "#FFFFFF"));
  const line = texts.find((o) => o.k === "text" && o.text === "S.R. · estimated 1RM");
  assert.ok(line && line.k === "text" && line.alpha === LAYER.sub);
  assert.ok(texts.some((o) => o.k === "text" && o.text === "NEW PERSONAL RECORD"));
  // The QR keeps its white tile with a drop shadow, no ring.
  const qr = L.ops.find((o) => o.k === "qr");
  assert.ok(qr && qr.k === "qr" && qr.ring === "" && qr.drop?.blur === 4);
  assert.deepEqual(L.shadow, { color: "rgba(0,0,0,0.42)", offsetY: 1, blur: 8 });
});

test("the QR switch drops the QR row; switched-off stats leave the layer", () => {
  const off = layoutShareLayer({ spec: pr, pro, qr: false }, measure);
  assert.ok(!off.ops.some((o) => o.k === "qr"));
  assert.equal(off.H, 84);
  const mile = milestoneCard({ sessionsDelivered: 500, clientsCoached: 64, averageRating: 4.8, reviewCount: 38, yearsOnCentium: 3 });
  const all = layoutShareLayer({ spec: mile, pro }, measure);
  const some = layoutShareLayer({ spec: mile, pro, hide: [1] }, measure);
  const vals = (l: typeof all) => l.ops.filter((o) => o.k === "text").map((o) => (o.k === "text" ? o.text : ""));
  assert.ok(vals(all).includes("4.8"));
  assert.ok(!vals(some).includes("4.8"));
  assert.ok(all.ops.some((o) => o.k === "star"));
  assert.ok(!some.ops.some((o) => o.k === "star"));
  const none = layoutShareLayer({ spec: mile, pro, hide: [0, 1, 2] }, measure);
  assert.ok(!none.ops.some((o) => o.k === "rule"));
  assert.ok(none.H < all.H);
});

test("the profile link shrinks to the room beside the QR tile, never wider", () => {
  assert.equal(LAYER_QR_TILE, 18);
  assert.equal(LAYER_LINK_ROOM, 78);
  const long = layoutShareLayer({ spec: pr, pro: { name: "Rana", handle: "a-very-long-handle-for-a-coach" } }, measure);
  const link = long.ops.find((o) => o.k === "text" && o.text.includes("/p/"));
  assert.ok(link && link.k === "text");
  assert.ok(measure.width(link.text, link.font, 0) <= LAYER_LINK_ROOM + 0.5);
  const short = layoutShareLayer({ spec: pr, pro: { name: "Rana", handle: "ab" } }, measure);
  const s = short.ops.find((o) => o.k === "text" && o.text.includes("/p/"));
  assert.ok(s && s.k === "text" && s.font.includes(" 5.4px "));
});

test("no handle: no handle line, link or QR", () => {
  const L = layoutShareLayer({ spec: pr, pro: { name: "Rana", handle: null } }, measure);
  assert.ok(!L.ops.some((o) => o.k === "qr"));
  assert.ok(!L.ops.some((o) => o.k === "text" && o.text.includes("on Centium")));
  assert.equal(L.boxes.head.h, 13.5);
});

test("profile initials", () => {
  assert.equal(profileInitials("Rana Khoury"), "RK");
  assert.equal(profileInitials(" rami "), "R");
  assert.equal(profileInitials("Ana Maria Lopez"), "AM");
});
