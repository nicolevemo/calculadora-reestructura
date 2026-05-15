/**
 * Borra clientes, negociaciones, cargas CSV y actividad (datos demo).
 * Requiere SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL en .env.local
 *
 * Uso: node scripts/reset-demo-shortlist-data.mjs
 *      node scripts/reset-demo-shortlist-data.mjs --confirm
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv() {
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const confirm = process.argv.includes("--confirm");
if (!confirm) {
  console.log("Modo simulación. Para borrar en Supabase ejecutá:");
  console.log("  node scripts/reset-demo-shortlist-data.mjs --confirm");
  console.log("\nO corré implementacion/14-reset-demo-shortlist-data.sql en el SQL Editor.");
  process.exit(0);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function count(table) {
  const { count, error } = await admin.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

async function deleteAll(table) {
  let query = admin.from(table).delete();
  if (table === "actividad_log") {
    query = query.gte("id", 0);
  } else {
    query = query.not("id", "is", null);
  }
  const { error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function main() {
  console.log("Conteos antes:");
  for (const t of ["shortlist_uploads", "clientes", "negociaciones", "actividad_log"]) {
    console.log(`  ${t}: ${await count(t)}`);
  }

  console.log("\nBorrando…");
  await deleteAll("actividad_log");
  await deleteAll("negociaciones");
  await deleteAll("clientes");
  await deleteAll("shortlist_uploads");

  console.log("\nConteos después:");
  for (const t of ["shortlist_uploads", "clientes", "negociaciones", "actividad_log"]) {
    console.log(`  ${t}: ${await count(t)}`);
  }
  console.log("\nListo. Usuarios e invitaciones no se tocaron.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
