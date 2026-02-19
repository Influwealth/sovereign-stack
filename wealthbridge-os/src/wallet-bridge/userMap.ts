import fs from "fs";
import path from "path";

const mapPath = path.join(__dirname, "user_map.json");

let userMap: Record<string, string> = {};

try {
  const raw = fs.readFileSync(mapPath, "utf8");
  userMap = JSON.parse(raw);
} catch (err) {
  console.warn("[wallet-bridge] Failed to load user_map.json, using empty map.", err);
}

export function resolveWalletIdForUser(userId: string): string | null {
  return userMap[userId] || null;
}
