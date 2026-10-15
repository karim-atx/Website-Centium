import { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { CART_EVENT, readCart, type Cart } from "../../services/store/customer";

/** The signed-in customer's cart on this device, kept in step across pages. */
export function useCart(): { uid: string | null; cart: Cart | null } {
  const { authUserId } = useApp();
  const [cart, setCart] = useState<Cart | null>(() => readCart(authUserId));
  useEffect(() => {
    const sync = () => setCart(readCart(authUserId));
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [authUserId]);
  return { uid: authUserId, cart };
}
