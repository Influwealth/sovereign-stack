const fs = require("fs");
const p = "wealthbridge-os/src/wallet-bridge/user_map.json";
const map = {
  "agent_001": "wallet_001",
  "001": "wallet_001",
  "unknown": "wallet_001"
};
fs.writeFileSync(p, JSON.stringify(map, null, 2), "utf8");
console.log("Fixed: user_map.json updated.");
