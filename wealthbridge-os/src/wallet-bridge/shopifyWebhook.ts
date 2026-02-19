import crypto from "crypto";

const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET || "";

export function verifyShopifyHmac(rawBody: string, hmacHeader: string | undefined): boolean {
  if (!shopifySecret) {
    console.warn("[wallet-bridge] SHOPIFY_WEBHOOK_SECRET not set. Skipping HMAC verification.");
    return false;
  }
  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", shopifySecret)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

export function normalizeShopifyOrder(payload: any) {
  return {
    orderId: String(payload.id),
    customerId: String(payload.customer?.id || ""),
    totalPrice: String(payload.total_price || "0"),
    currency: payload.currency || "USD"
  };
}
