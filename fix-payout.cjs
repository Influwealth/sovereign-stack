const fs = require("fs");
const p = "wealthbridge-os/src/wallet-bridge/payoutService.ts";
let c = fs.readFileSync(p, "utf8");
c = c.replace("const userId = wealthbridgeUser_;", "const userId = order.userId;");
fs.writeFileSync(p, c, "utf8");
console.log("Fixed.");
