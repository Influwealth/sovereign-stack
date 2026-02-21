import axios from "axios";

const baseURL = process.env.CIRCLE_BASE_URL || "https://api.circle.com/v1";
const apiKey = process.env.CIRCLE_API_KEY || "";

if (!apiKey) {
  console.warn("[wallet-bridge] CIRCLE_API_KEY is not set. Payouts will fail until configured.");
}

const client = axios.create({
  baseURL,
  headers: {
    Authorization: `Bearer ${process.env.CIRCLE_API_KEY || ""}`,
    "Content-Type": "application/json"
  }
});

export async function createPayout(usdcAmount: string, destinationWalletId: string, referenceId: string) {
  const body = {
    idempotencyKey: referenceId,
    amount: {
      amount: usdcAmount,
      currency: "USD"
    },
    destination: {
      type: "wallet",
      id: destinationWalletId
    }
  };

  const res = await client.post("/payouts", body);
  return res.data;
}

