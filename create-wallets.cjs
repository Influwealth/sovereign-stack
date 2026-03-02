const https = require("https");

const apiKey = process.env.CIRCLE_API_KEY;

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "api.circle.com",
      path,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }, (res) => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log("Creating wallet set...");
  const ws = await post("/v1/developer/walletSets", {
    idempotencyKey: "wb_walletset_001",
    name: "WealthBridge Sovereign Set"
  });
  console.log("Wallet Set Response:", JSON.stringify(ws, null, 2));

  const wsId = ws.body?.data?.walletSet?.id;
  if (!wsId) { console.error("No wallet set ID returned. Stopping."); return; }

  console.log("\nCreating wallet...");
  const w = await post("/v1/developer/wallets", {
    idempotencyKey: "wb_wallet_001",
    accountType: "EOA",
    blockchains: ["MATIC-AMOY"],
    count: 1,
    walletSetId: wsId
  });
  console.log("Wallet Response:", JSON.stringify(w, null, 2));

  const walletId = w.body?.data?.wallets?.[0]?.id;
  if (walletId) {
    console.log("\n✅ REAL WALLET ID:", walletId);
    console.log("Copy this ID — next step will wire it into your code.");
  }
}
main();
