import { buildHometownManifest } from "../../../../hometown-math/domain/manifest";
import { readTeacherDraft, requireApiUser } from "../../../../hometown-math/services/server";
import { isSupabaseServerConfigured, supabaseReadTeacherDraft } from "../../../../hometown-math/services/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { id } = await params;
  const draft = isSupabaseServerConfigured() ? await supabaseReadTeacherDraft(id, identity.userId) : await readTeacherDraft(id, identity.userId);
  if (!draft) return Response.json({ error: "没有找到这个展览" }, { status: 404 });
  return Response.json({ manifest: buildHometownManifest(draft, Math.max(1, draft.manifestVersion + 1)) }, { headers: { "cache-control": "no-store" } });
}
