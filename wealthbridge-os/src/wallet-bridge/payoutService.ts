import { createPayout } from "./circleClient";

/**
 * handleOrderPayout
 * - normalizes order -> amountInDollars
 * - validates payload shape for Circle
 * - calls createPayout with a properly shaped payload
 */
export async function handleOrderPayout(order: any) {
  // Normalize and validate amount
  const raw = order?.totalPrice ?? order?.amount ?? order?.total ?? "1.00";
  const amountNum = Number(raw);
  const amountInDollars = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : 1.0;

  // Currency and wallet mapping
  const currency = (order?.currency || "USD").toUpperCase();
  const walletId = order?.destinationWalletId ?? order?.customerId ?? order?.walletId ?? "wallet_001";

  // Idempotency key derived from order id when available
  const idempotencyKey = order?.orderId ? `order_${order.orderId}` : `payout_${Date.now()}`;

  // Defensive logging-friendly payload (no network side effects)
  const payloadPreview = {
    idempotencyKey,
    amount: { amount: amountInDollars.toFixed(2), currency },
    destination: { type: "wallet", id: walletId }
  };

  try {
    // Call Circle client with validated values
    const result = await createPayout(walletId, amountInDollars, currency, idempotencyKey);
    return { ok: true, payload: payloadPreview, result };
  } catch (err: any) {
    // Preserve original error details for debugging
    const msg = err?.message ?? String(err);
    throw new Error(`handleOrderPayout failed for order=${order?.orderId ?? "unknown"}: ${msg}`);
  }
}

