import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { hometownExhibitions, hometownZones } from "../../../../db/schema";
import { DEFAULT_ZONES, makeId, requireApiUser, safeSlug } from "../../../hometown-math/services/server";

export async function GET() {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const exhibitions = await getDb().select().from(hometownExhibitions).where(eq(hometownExhibitions.ownerId, identity.userId)).orderBy(desc(hometownExhibitions.updatedAt));
  return Response.json({ exhibitions });
}

export async function POST(request: Request) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const payload = await request.json().catch(() => ({})) as { title?: string; schoolClass?: string; locationLabel?: string };
  const title = payload.title?.trim().slice(0, 40) || "我们的家乡数学展";
  const id = makeId("exhibition");
  const slug = `${safeSlug(title)}-${crypto.randomUUID().slice(0, 6)}`;
  const db = getDb();
  await db.batch([
    db.insert(hometownExhibitions).values({ id, ownerId: identity.userId, ownerEmail: identity.email, slug, title, schoolClass: payload.schoolClass?.trim().slice(0, 60) || "", locationLabel: payload.locationLabel?.trim().slice(0, 60) || "" }),
    ...DEFAULT_ZONES.map(([zoneId, name, subtitle], order) => db.insert(hometownZones).values({ id: `${id}_${zoneId}`, exhibitionId: id, name, subtitle, orderIndex: order })),
  ]);
  return Response.json({ id, slug }, { status: 201 });
}
