import type { PaymentSourceKind } from "../../services/business-market/promoLogic";

// The "Promotion used" offer (Follow-up 20261121390000): after a payment is
// recorded (a mark-paid or a paid desk sale), the screen that recorded it
// calls offerPromotionUsed(); PromotionUsedHost (mounted once in the app
// shell) shows the optional picker. Fire and forget: nothing here can block
// or undo the payment itself.

export interface PromotionUsedOffer {
  kind: PaymentSourceKind;
  /** The booking, membership, order, appointment or desk sale id. */
  sourceId: string;
}

type Listener = (o: PromotionUsedOffer) => void;
const listeners = new Set<Listener>();

export function offerPromotionUsed(o: PromotionUsedOffer): void {
  for (const l of listeners) l(o);
}

export function onPromotionUsedOffer(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
