const fs = require("fs");
const path = require("path");

const esmShim = `\nimport { fileURLToPath } from "node:url";\nimport { dirname } from "node:path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n`;

const files = [
  "wealthbridge-os/src/wallet-bridge/userMap.ts"
];

files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  if (c.includes("__dirname") && !c.includes("fileURLToPath")) {
    c = c.replace(/^((?:import[^\n]+\n)+)/m, (match) => match + esmShim);
    fs.writeFileSync(f, c, "utf8");
    console.log("Fixed:", f);
  } else {
    console.log("Skipped (already fixed or no __dirname):", f);
  }
});
