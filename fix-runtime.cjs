const fs = require("fs");
const p = "wealthbridge-os/agent-federation/agent-runtime.ts";
let c = fs.readFileSync(p, "utf8");

// Remove the broken shim lines wherever they are
c = c.replace(/import { fileURLToPath } from "node:url";\n/, "");
c = c.replace(/import { dirname } from "node:path";\n/, "");
c = c.replace(/const __filename = fileURLToPath\(import\.meta\.url\);\n/, "");
c = c.replace(/const __dirname = dirname\(__filename\);\n/, "");

// Add shim cleanly after ALL import lines
const shim = 'import { fileURLToPath } from "node:url";\nimport { dirname as _dirname } from "node:path";\nconst __filename = fileURLToPath(import.meta.url);\nconst __dirname = _dirname(__filename);\n';
c = c.replace(/^((?:import[\s\S]*?;\n)+)/m, (m) => m + shim);

fs.writeFileSync(p, c, "utf8");
console.log("Fixed. Top 15 lines:");
console.log(c.split("\n").slice(0,15).join("\n"));
