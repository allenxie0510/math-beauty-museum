import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { hometownExhibitions, hometownZones } from "../../../../../db/schema";
import { deleteExhibition, ownsExhibition, readTeacherDraft, requireApiUser } from "../../../../hometown-math/services/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { id } = await params;
  const draft = await readTeacherDraft(id, identity.userId);
  return draft ? Response.json({ exhibition: draft }) : Response.json({ error: "没有找到这个展览" }, { status: 404 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { id } = await params;
  if (!await ownsExhibition(id, identity.userId)) return Response.json({ error: "无权修改这个展览" }, { status: 403 });
  const payload = await request.json() as { title?: string; schoolClass?: string; locationLabel?: string; zones?: Array<{ id: string; name: string; subtitle: string; order: number }> };
  const db = getDb();
  const updates: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (payload.title) updates.title = payload.title.trim().slice(0, 40);
  if (payload.schoolClass !== undefined) updates.schoolClass = payload.schoolClass.trim().slice(0, 60);
  if (payload.locationLabel !== undefined) updates.locationLabel = payload.locationLabel.trim().slice(0, 60);
  const statements = [db.update(hometownExhibitions).set(updates).where(and(eq(hometownExhibitions.id, id), eq(hometownExhibitions.ownerId, identity.userId)))];
  for (const zone of payload.zones ?? []) statements.push(db.update(hometownZones).set({ name: zone.name.trim().slice(0, 20), subtitle: zone.subtitle.trim().slice(0, 50), orderIndex: zone.order }).where(and(eq(hometownZones.id, zone.id), eq(hometownZones.exhibitionId, id))));
  await db.batch(statements);
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const { id } = await params;
  return await deleteExhibition(id, identity.userId) ? Response.json({ ok: true }) : Response.json({ error: "没有找到这个展览" }, { status: 404 });
}
