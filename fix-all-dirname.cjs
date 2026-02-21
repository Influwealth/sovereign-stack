const fs = require("fs");
const path = require("path");

const esmShim = '\nimport { fileURLToPath } from "node:url";\nimport { dirname } from "node:path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = dirname(__filename);\n';

// Find every .ts file in wealthbridge-os
function walk(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
    else if (f.endsWith(".ts")) results.push(full);
  });
  return results;
}

const files = walk("wealthbridge-os");
files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  if (c.includes("__dirname") && !c.includes("fileURLToPath")) {
    c = c.replace(/^((?:import[^\n]+\n)+)/m, (m) => m + esmShim);
    fs.writeFileSync(f, c, "utf8");
    console.log("FIXED:", f);
  }
});

// Show mockSaleRunner order object so we can see userId
const runner = fs.readFileSync("wealthbridge-os/src/wallet-bridge/mockSaleRunner.ts", "utf8");
console.log("\n--- mockSaleRunner.ts ---");
console.log(runner);
