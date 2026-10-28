const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const cosmetics: Record<string, string> = {
  comet: "trail", orbit: "aura", prism: "wings", aqua: "trail", flame: "trail", galaxy: "trail", halo: "aura", crown: "wings",
  feather: "wings", sidefins: "wings", engines: "wings", stars: "aura",
};
const bytesToHex = (bytes: Uint8Array) => Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
const hexToBytes = (hex: string) => new Uint8Array(hex.match(/.{2}/g)!.map((value) => parseInt(value, 16)));

async function hashPassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function equalHash(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function cleanProfile(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("INVALID_PROFILE");
  const profile = value as Record<string, unknown>;
  const gems = Number(profile.gems);
  if (!Number.isInteger(gems) || gems < 0 || gems > 10_000_000 || !Array.isArray(profile.owned) || profile.owned.length > Object.keys(cosmetics).length ||
      !profile.owned.every((id) => typeof id === "string" && Object.hasOwn(cosmetics, id)) ||
      !profile.equipped || typeof profile.equipped !== "object" || Array.isArray(profile.equipped)) {
    throw new Error("INVALID_PROFILE");
  }
  const owned = [...new Set(profile.owned as string[])];
  const equipped: Record<string, string | null> = {};
  for (const [slot, id] of Object.entries(profile.equipped as Record<string, unknown>)) {
    if (!["trail", "aura", "wings"].includes(slot) ||
        (id !== null && (typeof id !== "string" || cosmetics[id] !== slot || !owned.includes(id)))) {
      throw new Error("INVALID_PROFILE");
    }
    equipped[slot] = id as string | null;
  }
  return { gems, owned, equipped };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const body = await request.json();
    const playerId = typeof body.player_id === "string" ? body.player_id.trim().toLowerCase() : "";
    const password = body.password;
    const action = body.action;
    if (!/^[a-z0-9_-]{3,16}$/.test(playerId) || typeof password !== "string" || password.length < 8 || password.length > 72 ||
        !["create", "login", "save", "load"].includes(action)) {
      return json({ error: "INVALID_REQUEST" }, 400);
    }

    const base = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !serviceKey) return json({ error: "VAULT_UNAVAILABLE" }, 503);
    const table = `${base}/rest/v1/new1984_vaults`;
    const headers = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    if (action === "create") {
      const profile = cleanProfile(body.profile);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const row = {
        player_id: playerId,
        password_salt: bytesToHex(salt),
        password_hash: await hashPassword(password, salt),
        ...profile,
      };
      const created = await fetch(table, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(row),
      });
      if (created.status === 409) return json({ error: "USERNAME_TAKEN" }, 409);
      if (!created.ok) return json({ error: "VAULT_UNAVAILABLE" }, 503);
      return json({ ok: true });
    }

    const query = new URLSearchParams({
      select: "password_salt,password_hash,gems,owned,equipped,failed_attempts,locked_until",
      player_id: `eq.${playerId}`,
      limit: "1",
    });
    const lookup = await fetch(`${table}?${query}`, { headers });
    if (!lookup.ok) return json({ error: "VAULT_UNAVAILABLE" }, 503);
    const rows = await lookup.json();
    const row = rows[0];
    if (!row) return json({ error: "INVALID_CREDENTIALS" }, 401);

    if (row.locked_until && Date.parse(row.locked_until) > Date.now()) {
      return json({ error: "TOO_MANY_ATTEMPTS" }, 429);
    }
    const candidate = await hashPassword(password, hexToBytes(row.password_salt));
    if (!equalHash(candidate, row.password_hash)) {
      const failedAttempts = Math.min(8, Number(row.failed_attempts || 0) + 1);
      const lockedUntil = failedAttempts >= 8 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
      await fetch(`${table}?player_id=eq.${encodeURIComponent(playerId)}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ failed_attempts: failedAttempts, locked_until: lockedUntil }),
      });
      return json({ error: "INVALID_CREDENTIALS" }, 401);
    }

    await fetch(`${table}?player_id=eq.${encodeURIComponent(playerId)}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ failed_attempts: 0, locked_until: null }),
    });

    if (action === "save") {
      const profile = cleanProfile(body.profile);
      const saved = await fetch(`${table}?player_id=eq.${encodeURIComponent(playerId)}`, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ ...profile, updated_at: new Date().toISOString() }),
      });
      if (!saved.ok) return json({ error: "VAULT_UNAVAILABLE" }, 503);
      return json({ ok: true });
    }
    if (action === "load") {
      return json({ profile: { gems: row.gems, owned: row.owned, equipped: row.equipped } });
    }
    return json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PROFILE") return json({ error: "INVALID_REQUEST" }, 400);
    return json({ error: "INVALID_REQUEST" }, 400);
  }
});
