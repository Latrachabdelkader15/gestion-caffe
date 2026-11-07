/** Affiche l'adresse à taper sur les tablettes / téléphones du café. */
import { networkInterfaces } from "node:os";

const port = process.env.PORT ?? "3000";
const ips = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === "IPv4" && !i.internal)
  .map((i) => i!.address);

console.log("\nApplication du café accessible sur le réseau local :");
for (const ip of ips) console.log(`  → http://${ip}:${port}`);
if (ips.length === 0) console.log("  (aucune connexion réseau détectée)");
console.log("");
