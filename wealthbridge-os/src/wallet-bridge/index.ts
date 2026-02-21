import { normalizeShopifyOrder } from "./shopifyWebhook";
import { handleOrderPayout } from "./payoutService";

export async function triggerPayoutFromShopify(rawBody: string, hmacHeader?: string) {
  // HMAC verification is wired in shopifyWebhook; you can extend this later.
  const payload = JSON.parse(rawBody);
  const order = normalizeShopifyOrder(payload);
  return await handleOrderPayout(order);
}

// Generic agent-level payout hook (used by agent-wallet.ts)
export async function triggerPayout(agentId: string, amount: number, currency: string) {
  const order = {
    orderId: `order_${Date.now()}`,
    customerId: agentId,
    totalPrice: String(amount),
    currency
  };
  return await handleOrderPayout(order);
}
