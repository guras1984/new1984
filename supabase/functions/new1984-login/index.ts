const cors = {
  "Access-Control-Allow-Origin": "https://guras1984.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  try {
    const { player_id, password } = await request.json();
    if (typeof player_id !== "string" || !/^[a-z0-9_-]{3,16}$/.test(player_id) ||
        typeof password !== "string" || password.length < 8 || password.length > 72) {
      return json({ error: "INVALID_CREDENTIALS" }, 400);
    }
    const base = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lookup = await fetch(`${base}/rest/v1/rpc/new1984_get_player_email`, {
      method: "POST",
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_player_id: player_id }),
    });
    if (!lookup.ok) return json({ error: "LOGIN_UNAVAILABLE" }, 503);
    const email = await lookup.json();
    if (typeof email !== "string") return json({ error: "INVALID_CREDENTIALS" }, 401);
    const auth = await fetch(`${base}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const session = await auth.json();
    if (!auth.ok) return json({ error: "INVALID_CREDENTIALS" }, 401);
    return json(session);
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
});
