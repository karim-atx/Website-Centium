import { strict as assert } from "node:assert";
import { test } from "node:test";
import { pageFacts, storeErrorText, toMyOrder, toOrder, toProduct, toReturn, withFacts } from "./mapping.ts";

const items = [
  { id: "i1", order_id: "o1", offering_id: "p1", name: "Protein Bar", unit_price: "2.50", quantity: 4, line_total: "10.00" },
  { id: "i2", order_id: "o1", offering_id: null, name: "Old shaker", unit_price: "8.00", quantity: 1, line_total: "8.00" },
];

test("toOrder reads the B11 store_orders row (order_number, quantity, payment_status)", () => {
  const o = toOrder({
    id: "o1",
    business_id: "b1",
    order_number: 1042,
    customer_id: "c1",
    fulfilment: "pickup",
    delivery_address: null,
    subtotal: "18.00",
    delivery_fee: "0.00",
    total: "18.00",
    payment_method: "cash",
    payment_status: "paid",
    paid_at: "2026-10-15T09:00:00Z",
    status: "ready_for_pickup",
    note: " ",
    placed_at: "2026-10-15T08:00:00Z",
    packed_at: "2026-10-15T08:30:00Z",
    completed_at: null,
    cancelled_at: null,
    cancel_reason: null,
    store_order_items: items,
  });
  assert.equal(o.number, 1042);
  assert.equal(o.fulfilment, "pickup");
  assert.equal(o.paymentStatus, "paid");
  assert.equal(o.total, 18);
  assert.equal(o.itemCount, 5);
  assert.equal(o.items[0].qty, 4);
  assert.equal(o.items[0].lineTotal, 10);
  assert.equal(o.items[1].offeringId, null);
  assert.equal(o.note, null);
  assert.equal(o.customerLabel, null, "a raw row never carries a name");
  assert.equal(o.canCancel, false);
});

test("store_orders_page facts: the server's masked label, the minor flag, the open return", () => {
  const f = pageFacts({ order_id: "o1", customer_label: "Member #0042", customer_is_minor: true, open_return: "approved" });
  assert.deepEqual(f, { label: "Member #0042", isMinor: true, openReturn: "approved" });
  assert.equal(pageFacts({ customer_label: null, customer_is_minor: null, open_return: null }).label, "Guest");
  const o = withFacts(toOrder({ id: "o1", status: "placed", store_order_items: [] }), f);
  assert.equal(o.customerLabel, "Member #0042");
  assert.equal(o.customerIsMinor, true);
  assert.equal(o.openReturn, "approved");
});

test("my_orders rows: business name, can_cancel and can_return as the server says", () => {
  const o = toMyOrder({
    order_id: "o9",
    business_id: "b1",
    business_name: "Northside Supplies",
    order_number: 7,
    placed_at: "2026-10-01T10:00:00Z",
    status: "completed",
    fulfilment: "delivery",
    item_count: 3,
    total: "42.50",
    payment_status: "pending",
    can_cancel: false,
    can_return: true,
    total_count: 1,
  });
  assert.equal(o.id, "o9");
  assert.equal(o.storeName, "Northside Supplies");
  assert.equal(o.itemCount, 3);
  assert.equal(o.total, 42.5);
  assert.equal(o.canReturn, true);
  assert.equal(o.canCancel, false);
});

test("toReturn: the customer's [{item_id, quantity}] read against the order's own lines", () => {
  const r = toReturn({
    id: "r1",
    order_id: "o1",
    kind: "refund",
    status: "received",
    reason: "Damaged: box crushed",
    items: [{ item_id: "i1", quantity: 2 }],
    refund_amount: null,
    created_at: "2026-10-15T10:00:00Z",
    resolved_at: null,
    store_orders: { order_number: 1042, placed_at: "2026-10-10T10:00:00Z", payment_method: "cash", store_order_items: items },
  });
  assert.equal(r.orderNumber, 1042);
  assert.deepEqual(r.items, [{ itemId: "i1", name: "Protein Bar", qty: 2, amount: 5 }]);
  assert.equal(r.refundAmount, 5, "suggested from the returned lines until a refund is recorded");
  assert.equal(r.requestedAt, "2026-10-15T10:00:00Z");
  const done = toReturn({ id: "r1", status: "refunded", kind: "refund", items: [], refund_amount: "4.00", store_orders: null });
  assert.equal(done.refundAmount, 4, "the recorded refund wins");
  assert.equal(toReturn({ id: "r2", kind: "exchange", items: [] }).kind, "exchange");
});

test("toProduct reads stock, visible, image_url and the category", () => {
  const p = toProduct({
    id: "p1",
    title: "Whey 2 kg",
    price: "58.00",
    description: null,
    category: "supplements",
    stock: 3,
    visible: false,
    image_url: "https://x/product-images/u/b/f.jpg",
    category_id: "c1",
    product_categories: { name: "Protein", glyph: "milk" },
  });
  assert.equal(p.stock, 3);
  assert.equal(p.visible, false);
  assert.equal(p.category, "Protein");
  assert.equal(p.categoryGlyph, "milk");
  assert.equal(p.categoryId, "c1");
  assert.equal(p.imageUrl, "https://x/product-images/u/b/f.jpg");
  const base = toProduct({ id: "p2", title: "Bar", price: null, category: "stores" });
  assert.equal(base.stock, null);
  assert.equal(base.visible, true, "before B11 every product is visible");
});

test("B11 errors read as sentences", () => {
  const f = "Couldn't place your order. Try again.";
  assert.equal(storeErrorText({ code: "ATXE8", message: "only 1 of Protein Bar left" }, f), "Only 1 of Protein Bar left. Lower the quantity and try again.");
  assert.equal(storeErrorText({ code: "ATXE8", message: "only 0 of Protein Bar left" }, f), "Protein Bar is out of stock. Remove it to order the rest.");
  assert.equal(storeErrorText({ code: "ATXE9", message: "this store is not taking orders" }, f), "This store isn't taking orders right now.");
  assert.equal(storeErrorText({ code: "ATXF0", message: "this store does not offer delivery" }, f), "This store doesn't offer delivery. Choose pickup.");
  assert.equal(storeErrorText({ code: "ATXF0", message: "this store does not offer pickup" }, f), "This store doesn't offer pickup. Choose delivery.");
  assert.equal(storeErrorText({ code: "ATXF1", message: "only an order completed in the last 30 days can be returned" }, f), "Only an order completed in the last 30 days can be returned.");
  assert.equal(storeErrorText({ code: "ATXF1", message: "this store does not offer exchanges" }, f), "This store doesn't offer exchanges. Ask for a refund instead.");
  assert.equal(storeErrorText({ code: "ATXF1", message: "a return for this order is already open" }, f), "A return for this order is already open.");
  assert.equal(storeErrorText({ code: "ATX10", message: "that order can no longer be cancelled (it is packed)" }, f), "This order can't be cancelled any more. The store has started on it.");
  assert.equal(storeErrorText({ code: "ATX10", message: "an order cannot go from packed to packed" }, f), "This was already updated. Refresh to see where it is now.");
  assert.equal(storeErrorText({ code: "ATX09", message: "you do not have permission to refund this business's payments" }, f), "Recording a refund needs the Revenue permission. Ask the owner.");
  assert.equal(storeErrorText({ code: "22023", message: "that payment has not been paid, so there is nothing to refund (it is pending)" }, f), "This order isn't marked paid, so there's nothing to refund yet. Mark it paid on the order first.");
  assert.equal(storeErrorText({ code: "22023", message: "that would refund 30, more than the 20 paid (0 already refunded)" }, f), "That's more than was paid for this order.");
  assert.equal(storeErrorText({ code: "42501", message: "x" }, f), f);
  assert.equal(storeErrorText(null, f), f);
});
