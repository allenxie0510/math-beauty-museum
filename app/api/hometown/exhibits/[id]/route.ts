import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { hometownAssets, hometownExhibits } from "../../../../../db/schema";
import { CONCEPT_BY_ID } from "../../../../hometown-math/domain/registry";
import type { HometownConceptId, OverlayGeometry } from "../../../../hometown-math/domain/types";
import { ownsExhibition, requireApiUser } from "../../../../hometown-math/services/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { id } = await params;
  const [row] = await getDb().select().from(hometownExhibits).where(eq(hometownExhibits.id, id)).limit(1);
  if (!row || !await ownsExhibition(row.exhibitionId, identity.userId)) return Response.json({ error: "无权修改这个展项" }, { status: 403 });
  const payload = await request.json() as { conceptId?: HometownConceptId; title?: string; interpretation?: string; evidence?: string; overlay?: OverlayGeometry; zoneId?: string; order?: number; teacherConfirmed?: boolean; rejected?: boolean };
  const concept = payload.conceptId ? CONCEPT_BY_ID[payload.conceptId] : null;
  if (payload.conceptId && !concept) return Response.json({ error: "概念不在受控 Registry 中" }, { status: 400 });
  const updates: Record<string, string | number | boolean | null> = { updatedAt: new Date().toISOString() };
  if (payload.conceptId) updates.conceptId = payload.conceptId;
  if (payload.title !== undefined) updates.title = payload.title.trim().slice(0, 18);
  if (payload.interpretation !== undefined) updates.interpretation = payload.interpretation.trim().slice(0, 220);
  if (payload.evidence !== undefined) updates.evidence = payload.evidence.trim().slice(0, 220);
  if (payload.overlay !== undefined) updates.overlayJson = JSON.stringify(payload.overlay);
  if (payload.zoneId !== undefined) updates.zoneId = payload.zoneId;
  if (payload.order !== undefined) updates.orderIndex = payload.order;
  if (payload.teacherConfirmed !== undefined) updates.teacherConfirmed = payload.teacherConfirmed;
  if (payload.rejected !== undefined) updates.rejected = payload.rejected;
  const db = getDb();
  await db.batch([
    db.update(hometownExhibits).set(updates).where(eq(hometownExhibits.id, id)),
    db.update(hometownAssets).set({ status: payload.rejected ? "REJECTED" : payload.teacherConfirmed ? "APPROVED" : "REVIEW_REQUIRED" }).where(eq(hometownAssets.id, row.assetId)),
  ]);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { id } = await params;
  const db = getDb();
  const [row] = await db.select({ exhibit: hometownExhibits, asset: hometownAssets }).from(hometownExhibits).innerJoin(hometownAssets, eq(hometownExhibits.assetId, hometownAssets.id)).where(eq(hometownExhibits.id, id)).limit(1);
  if (!row || !await ownsExhibition(row.exhibit.exhibitionId, identity.userId)) return Response.json({ error: "无权删除这个展项" }, { status: 403 });
  await Promise.allSettled([env.MEDIA.delete(row.asset.objectKey), env.MEDIA.delete(row.asset.thumbnailKey)]);
  await db.batch([db.delete(hometownExhibits).where(and(eq(hometownExhibits.id, id), eq(hometownExhibits.exhibitionId, row.exhibit.exhibitionId))), db.delete(hometownAssets).where(eq(hometownAssets.id, row.asset.id))]);
  return Response.json({ ok: true });
}
