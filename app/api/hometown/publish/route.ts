import { publishDraft, readTeacherDraft, requireApiUser } from "../../../hometown-math/services/server";
import { validateForPublish } from "../../../hometown-math/domain/manifest";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { hometownExhibitions } from "../../../../db/schema";
import { isSupabaseServerConfigured, supabasePublishDraft, supabaseReadTeacherDraft, supabaseUnpublish } from "../../../hometown-math/services/supabase-server";

export async function POST(request: Request) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { exhibitionId } = await request.json() as { exhibitionId?: string };
  if (!exhibitionId) return Response.json({ error: "缺少 exhibitionId" }, { status: 400 });
  const draft = isSupabaseServerConfigured() ? await supabaseReadTeacherDraft(exhibitionId, identity.userId) : await readTeacherDraft(exhibitionId, identity.userId);
  if (!draft) return Response.json({ error: "没有找到这个展览" }, { status: 404 });
  const errors = validateForPublish(draft);
  if (errors.length) return Response.json({ error: "发布前还需完成审核", details: errors }, { status: 422 });
  const manifest = isSupabaseServerConfigured() ? await supabasePublishDraft(exhibitionId, identity.userId) : await publishDraft(exhibitionId, identity.userId);
  return Response.json({ manifest, url: `/?hometown=${encodeURIComponent(manifest!.slug)}` });
}

export async function DELETE(request: Request) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { exhibitionId } = await request.json() as { exhibitionId?: string };
  if (!exhibitionId) return Response.json({ error: "缺少 exhibitionId" }, { status: 400 });
  if (isSupabaseServerConfigured()) return await supabaseUnpublish(exhibitionId, identity.userId) ? Response.json({ ok: true }) : Response.json({ error: "没有找到这个展览" }, { status: 404 });
  const result = await getDb().update(hometownExhibitions).set({ visibility: "unpublished", updatedAt: new Date().toISOString() }).where(and(eq(hometownExhibitions.id, exhibitionId), eq(hometownExhibitions.ownerId, identity.userId))).returning({ id: hometownExhibitions.id });
  return result.length ? Response.json({ ok: true }) : Response.json({ error: "没有找到这个展览" }, { status: 404 });
}
