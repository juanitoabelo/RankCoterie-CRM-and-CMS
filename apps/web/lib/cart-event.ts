/** Fired on window whenever the cart contents change. `detail` is the new
 *  item count when known; omit it to make listeners refetch. */
export const CART_UPDATED_EVENT = "canopy:cart-updated";

export function notifyCartUpdated(itemCount?: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT, { detail: itemCount }));
}
