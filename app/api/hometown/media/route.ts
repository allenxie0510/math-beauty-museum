import { env } from "cloudflare:workers";
import { isSupabaseServerConfigured, supabaseReadMedia } from "../../../hometown-math/services/supabase-server";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (isSupabaseServerConfigured()) {
    const object = await supabaseReadMedia(key);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.stream(), { headers: { "content-type": object.type || (key.endsWith(".webp") ? "image/webp" : "application/octet-stream"), "cache-control": "public, max-age=31536000, immutable" } });
  }
  if (!key.startsWith("hometown/")) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
