const fs = require("fs");

// Fix 1: agent-runtime.ts - force shim at top regardless of imports
const rtPath = "wealthbridge-os/agent-federation/agent-runtime.ts";
let rt = fs.readFileSync(rtPath, "utf8");
console.log("agent-runtime.ts top 5 lines:");
console.log(rt.split("\n").slice(0,5).join("\n"));
if (rt.includes("__dirname") && !rt.includes("fileURLToPath")) {
  const shim = 'import { fileURLToPath } from "node:url";\nimport { dirname } from "node:path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n';
  rt = shim + rt;
  fs.writeFileSync(rtPath, rt, "utf8");
  console.log("FIXED: agent-runtime.ts");
}

// Fix 2: payoutService - order.userId -> order.customer?.id
const psPath = "wealthbridge-os/src/wallet-bridge/payoutService.ts";
let ps = fs.readFileSync(psPath, "utf8");
ps = ps.replace("const userId = order.userId;", 'const userId = order.userId ?? order.customer?.id ?? "unknown";');
fs.writeFileSync(psPath, ps, "utf8");
console.log("FIXED: payoutService.ts userId fallback");
