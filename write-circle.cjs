const fs = require("fs");
const content = `import axios from "axios";

export interface PayoutResult {
  id?: string;
  status?: string;
  raw?: any;
}

export async function createPayout(
  walletId: string,
  amountInDollars: number,
  currency = "USD",
  idempotencyKey?: string
): Promise<PayoutResult> {
  const apiKey = process.env.CIRCLE_API_KEY || "";
  const baseUrl = "https://api.circle.com/v1";
  const amountStr = Number(amountInDollars || 0).toFixed(2);

  const body = {
    idempotencyKey: idempotencyKey || \`payout_\${Date.now()}\`,
    amount: { amount: amountStr, currency },
    destination: { type: "wallet", id: walletId }
  };

  console.log("[circleClient] Using API key prefix:", apiKey.split(":")[0] || "(none)");
  console.log("[circleClient] Payout payload:", JSON.stringify(body));

  const headers = {
    "Content-Type": "application/json",
    Authorization: \`Bearer \${apiKey}\`
  };

  try {
    const resp = await axios.post(\`\${baseUrl}/payouts\`, body, { headers });
    console.log("[circleClient] Response status:", resp.status, "data:", resp.data);
    return { id: resp.data?.id, status: "ok", raw: resp.data };
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.error("[circleClient] Error status:", status, "data:", JSON.stringify(data));
    throw new Error(\`Circle payout failed: status=\${status} message=\${JSON.stringify(data)}\`);
  }
}
`;
fs.writeFileSync("wealthbridge-os/src/wallet-bridge/circleClient.ts", content, "utf8");
console.log("Written: circleClient.ts");
