import { readFileSync } from "node:fs";

/*
 * Borra todas las cuentas de prueba (correo @aforoon.test) y lo que crearon. Corre antes
 * y después de toda la suite: si una prueba se corta por tiempo, su limpieza propia puede
 * no alcanzar a terminar, y así no quedan restos que confundan a la siguiente corrida.
 */

function env() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => /^[A-Z_]+=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
}

export default async function limpiarCuentasDePrueba() {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key } = env();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  let removed = 0;
  for (;;) {
    const res = await fetch(`${url}/auth/v1/admin/users?per_page=200`, { headers });
    const users = ((await res.json()).users ?? []) as { id: string; email?: string }[];
    const test = users.filter((u) => u.email?.endsWith("@aforoon.test"));
    if (!test.length) break;
    // Primero las personas: quienes no son administración y después quienes aprobaron.
    const ids = test.map((u) => u.id).join(",");
    await fetch(`${url}/rest/v1/personas?user_id=in.(${ids})&rol=neq.admin`, { method: "DELETE", headers });
    await fetch(`${url}/rest/v1/personas?user_id=in.(${ids})`, { method: "DELETE", headers });
    for (const u of test) {
      await fetch(`${url}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers });
      removed++;
    }
    if (users.length < 200) break;
  }
  if (removed) console.log(`Limpieza: ${removed} cuentas de prueba borradas.`);
}
