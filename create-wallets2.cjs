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

function get(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.circle.com",
      path,
      method: "GET",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" }
    }, (res) => {
      let raw = "";
      res.on("data", d => raw += d);
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  // First check what wallets already exist
  console.log("Checking existing wallets...");
  const existing = await get("/v1/wallets");
  console.log("Existing wallets:", JSON.stringify(existing, null, 2));

  // Try creating a standard wallet
  console.log("\nCreating wallet...");
  const w = await post("/v1/wallets", {
    idempotencyKey: "wb_wallet_sovereign_001",
    description: "WealthBridge Agent Wallet"
  });
  console.log("Create wallet response:", JSON.stringify(w, null, 2));
}
main();
