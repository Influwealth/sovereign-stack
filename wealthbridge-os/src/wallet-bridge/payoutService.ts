import { createPayout } from "./circleClient";
import { resolveWalletIdForUser } from "./userMap";

export interface NormalizedOrder {
  orderId: string;
  customerId: string;
  totalPrice: string;
  currency: string;
}

export async function handleOrderPayout(order: NormalizedOrder) {
  const userId = wealthbridgeUser_;
  const walletId = resolveWalletIdForUser(userId);

  if (!walletId) {
    console.warn("[wallet-bridge] No wallet mapping for user:", userId);
    return { status: "no_wallet", userId };
  }

  const referenceId = order--;
  const res = await createPayout(order.totalPrice, walletId, referenceId);

  return {
    status: "payout_triggered",
    referenceId,
    circleResponse: res
  };
}
