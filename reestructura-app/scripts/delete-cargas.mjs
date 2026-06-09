/**
 * Borra cargas (shortlist_uploads) específicas por nombre de archivo.
 * Gracias a los ON DELETE CASCADE, al borrar la carga se eliminan también
 * sus clientes, negociaciones y actividad_log vinculados.
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY y NEXT_PUBLIC_SUPABASE_URL en .env.local
 *
 * Uso:
 *   node scripts/delete-cargas.mjs            (simulación, no borra)
 *   node scripts/delete-cargas.mjs --confirm  (borra de verdad)
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

// Nombres exactos de archivo de las cargas a borrar
const FILENAMES = [
  "shortlist-carga (8).csv",
  "shortlist-carga (W4 09-06-26).csv",
];

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

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  // 1. Buscar las cargas por nombre
  const { data: uploads, error: upErr } = await admin
    .from("shortlist_uploads")
    .select("id, filename, uploaded_at, client_count, status, week_of")
    .in("filename", FILENAMES);

  if (upErr) throw new Error(`shortlist_uploads: ${upErr.message}`);

  if (!uploads || uploads.length === 0) {
    console.log("No se encontró ninguna carga con esos nombres. Nada que borrar.");
    process.exit(0);
  }

  console.log("Cargas encontradas:");
  for (const u of uploads) {
    console.log(
      `  - ${u.filename} | ${u.uploaded_at} | semana ${u.week_of} | client_count=${u.client_count} | ${u.status} | id=${u.id}`,
    );
  }

  const uploadIds = uploads.map((u) => u.id);

  // 2. Conteo real de clientes vinculados
  const { count: clientesCount, error: cErr } = await admin
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .in("upload_id", uploadIds);
  if (cErr) throw new Error(`clientes: ${cErr.message}`);

  console.log(`\nClientes vinculados a estas cargas: ${clientesCount ?? 0}`);
  console.log(
    "(Las negociaciones y actividad_log de esos clientes se borran en cascada.)",
  );

  if (!confirm) {
    console.log("\nModo SIMULACIÓN. No se borró nada.");
    console.log("Para borrar de verdad ejecutá:");
    console.log("  node scripts/delete-cargas.mjs --confirm");
    process.exit(0);
  }

  // 3. Borrar las cargas (cascada se encarga de clientes/negociaciones/actividad)
  console.log("\nBorrando cargas (cascada)…");
  const { error: delErr } = await admin
    .from("shortlist_uploads")
    .delete()
    .in("id", uploadIds);
  if (delErr) throw new Error(`delete shortlist_uploads: ${delErr.message}`);

  // 4. Verificación
  const { count: remaining, error: rErr } = await admin
    .from("clientes")
    .select("*", { count: "exact", head: true })
    .in("upload_id", uploadIds);
  if (rErr) throw new Error(`verificación clientes: ${rErr.message}`);

  console.log("\nListo.");
  console.log(`Cargas borradas: ${uploads.length}`);
  console.log(`Clientes restantes vinculados a esas cargas: ${remaining ?? 0} (debería ser 0)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
