import { latestPublicManifest } from "../../../../hometown-math/services/server";
import { isSupabaseServerConfigured, supabaseLatestPublicManifest } from "../../../../hometown-math/services/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const manifest = isSupabaseServerConfigured() ? await supabaseLatestPublicManifest(slug) : await latestPublicManifest(slug);
  return manifest ? Response.json({ manifest }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } }) : Response.json({ error: "这个展览还没有发布" }, { status: 404 });
}
