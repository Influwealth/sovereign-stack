const fs = require("fs");

// Fix 1: Strip BOM from user_map.json
const jsonPath = "wealthbridge-os/src/wallet-bridge/user_map.json";
let json = fs.readFileSync(jsonPath, "utf8");
if (json.charCodeAt(0) === 0xFEFF) {
  json = json.slice(1);
  fs.writeFileSync(jsonPath, json, "utf8");
  console.log("Fixed: BOM stripped from user_map.json");
}

// Fix 2: Add ESM __dirname shim to capsule-store.ts
const esmShim = '\nimport { fileURLToPath } from "node:url";\nimport { dirname } from "node:path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n';
const storePath = "wealthbridge-os/capsule-store.ts";
let store = fs.readFileSync(storePath, "utf8");
if (store.includes("__dirname") && !store.includes("fileURLToPath")) {
  store = store.replace(/^((?:import[^\n]+\n)+)/m, (m) => m + esmShim);
  fs.writeFileSync(storePath, store, "utf8");
  console.log("Fixed: __dirname shim added to capsule-store.ts");
}

// Fix 3: Fix wealthbridgeUser_ in payoutService.ts
const payoutPath = "wealthbridge-os/src/wallet-bridge/payoutService.ts";
let payout = fs.readFileSync(payoutPath, "utf8");
console.log("payoutService.ts line 12 area:");
console.log(payout.split("\n").slice(8, 18).join("\n"));
