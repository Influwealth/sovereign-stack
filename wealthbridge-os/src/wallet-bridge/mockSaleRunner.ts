import { triggerPayoutFromShopify } from "./index";

async function main() {
  const fakeOrder = {
    id: 123456789,
    customer: { id: "001" },
    total_price: "15.00",
    currency: "USD"
  };

  const rawBody = JSON.stringify(fakeOrder);

  console.log("[MOCK SALE] Simulating Shopify order → Wallet Bridge payout...");
  const result = await triggerPayoutFromShopify(rawBody);

  console.log("[MOCK SALE] Result:");
  console.dir(result, { depth: null });
}

main().catch((err) => {
  console.error("[MOCK SALE] Error:", err);
  process.exit(1);
});
