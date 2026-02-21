const fs = require("fs");
const p = "wealthbridge-os/src/wallet-bridge/userMap.ts";
let c = fs.readFileSync(p, "utf8");
// Add ESM __dirname shim after the last import line
c = c.replace(
  /^(import[^\n]+\n)+/m,
  (match) => match + '\nimport { fileURLToPath } from "node:url";\nimport { dirname } from "node:path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n'
);
fs.writeFileSync(p, c, "utf8");
console.log("Fixed. Preview:");
console.log(c.split("\n").slice(0, 12).join("\n"));
