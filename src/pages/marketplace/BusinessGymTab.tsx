import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { useApp } from "../../context/AppContext";
import { QrPattern } from "../../components/marketplace/GymDetailSheet";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";
import clsx from "clsx";
import type { MembershipBilling, MembershipPlan } from "../../types";

const billingOptions: { value: MembershipBilling; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "annually", label: "Annually" },
];
const paymentOptions = ["Card", "Cash", "Whish Money"];

// V10 (QA 10.0): "In the operations tab, I want a button that has to do
// with the gym itself. Inside it can list/edit/delete the different type
// of gym memberships it can offer, by stating the price, type (Daily,
// monthly, annually), and payment type as seen in the Client UI. Look up
// and implement how it can generate unique QR codes for each client that
// will show up in the client UI upon purchase." Each plan's QR reuses the
// same deterministic-pattern generator the client's purchased-pass QR
// already uses (seeded by businessId + plan name), so it's a real, unique
// per-plan code the moment a client buys it — same mechanism, not a
// separate one.
export default function BusinessGymTab() {
  const { user, businessListing, addMembershipPlan, updateMembershipPlan, removeMembershipPlan } = useApp();
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billing, setBilling] = useState<MembershipBilling>("monthly");
  const [paymentType, setPaymentType] = useState(paymentOptions[0]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setName("");
    setPrice("");
    setBilling("monthly");
    setPaymentType(paymentOptions[0]);
    setSheetOpen(true);
  };
  const openEdit = (p: MembershipPlan) => {
    setEditing(p);
    setName(p.name);
    setPrice(p.price);
    setBilling(p.billing);
    setPaymentType(p.paymentType);
    setSheetOpen(true);
  };

  const save = () => {
    if (!name.trim() || !price.trim()) return;
    if (editing) updateMembershipPlan(editing.id, { name: name.trim(), price: price.trim(), billing, paymentType });
    else addMembershipPlan({ name: name.trim(), price: price.trim(), billing, paymentType });
    setSheetOpen(false);
  };

  return (
    <div>
      <PageHeader title="Gym" subtitle="Membership plans clients can buy on Explore" showBack />

      <div className="space-y-2.5">
        {businessListing.membershipPlans.map((p) => (
          <Card key={p.id} className="flex items-center gap-3">
            <QrPattern seed={`${user.businessId ?? "biz"}-${p.name}`} className="w-14 h-14 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-charcoal truncate">{p.name}</p>
              <p className="text-xs text-charcoal-faint">
                {p.price} · {p.billing} · {p.paymentType}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => openEdit(p)}
                aria-label={`Edit ${p.name}`}
                className="tap w-8 h-8 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  if (confirmDeleteId === p.id) {
                    removeMembershipPlan(p.id);
                    setConfirmDeleteId(null);
                  } else {
                    setConfirmDeleteId(p.id);
                    setTimeout(() => setConfirmDeleteId((c) => (c === p.id ? null : c)), 3000);
                  }
                }}
                aria-label={`Delete ${p.name}`}
                className={clsx(
                  "tap w-8 h-8 rounded-full flex items-center justify-center",
                  confirmDeleteId === p.id ? "bg-teal text-white" : "bg-cream-soft text-charcoal-soft"
                )}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </Card>
        ))}
        {businessListing.membershipPlans.length === 0 && (
          <Card className="text-center py-8">
            <KeyRound size={22} className="text-charcoal-faint mx-auto mb-2" />
            <p className="text-sm text-charcoal-faint">No membership plans yet.</p>
          </Card>
        )}
      </div>

      <Button variant="outline" fullWidth className="mt-4" onClick={openNew}>
        <Plus size={15} /> Add membership plan
      </Button>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={editing ? "Edit Plan" : "New Plan"}>
        <div className="space-y-4 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Plan name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monthly Membership"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Price</span>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="$45"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Billing type</span>
            <div className="flex gap-2">
              {billingOptions.map((b) => (
                <button
                  key={b.value}
                  onClick={() => setBilling(b.value)}
                  className={clsx(
                    "tap flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                    billing === b.value ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Payment type</span>
            <div className="flex gap-2">
              {paymentOptions.map((p) => (
                <button
                  key={p}
                  onClick={() => setPaymentType(p)}
                  className={clsx(
                    "tap flex-1 rounded-xl py-2 text-xs font-semibold border transition-colors",
                    paymentType === p ? "bg-primary text-white border-primary" : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <Button fullWidth size="lg" onClick={save} disabled={!name.trim() || !price.trim()}>
            {editing ? "Save changes" : "Add plan"}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
