import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function splitUrls(value: string) {
  return value.split(/[\\s,;]+/).map((value) => value.trim()).filter(Boolean);
}

async function hmacSha1Base64(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = request.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return json({ error: "Unauthorized" }, 401);

    const turnUrls = splitUrls(Deno.env.get("TURN_URLS") ?? "");
    const sharedSecret = Deno.env.get("TURN_SHARED_SECRET") ?? "";
    const requestedTtl = Number(Deno.env.get("TURN_CREDENTIAL_TTL") ?? "3600") || 3600;
    const ttl = Math.min(86400, Math.max(60, requestedTtl));
    if (!turnUrls.length || !sharedSecret) return json({ error: "TURN is not configured" }, 503);

    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const username = `${expiresAt}:${user.id}`;
    const credential = await hmacSha1Base64(sharedSecret, username);

    return json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: turnUrls, username, credential },
      ],
      expiresAt,
    });
  } catch (error) {
    console.error(error);
    return json({ error: "Unable to create TURN credentials" }, 500);
  }
});
