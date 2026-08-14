import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { hometownAssets, hometownExhibits } from "../../../../db/schema";
import { candidatesFromFilename } from "../../../hometown-math/domain/registry";
import type { ConceptCandidate } from "../../../hometown-math/domain/types";
import { conceptDefaults, makeId, ownsExhibition, requireApiUser } from "../../../hometown-math/services/server";
import { isSupabaseServerConfigured, supabaseUploadExhibit } from "../../../hometown-math/services/supabase-server";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const identity = await requireApiUser();
  if (identity instanceof Response) return identity;
  const form = await request.formData();
  if (isSupabaseServerConfigured()) {
    const result = await supabaseUploadExhibit(identity, form);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result, { status: 201 });
  }
  const exhibitionId = String(form.get("exhibitionId") ?? "");
  const file = form.get("file");
  const thumbnail = form.get("thumbnail");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);
  if (!await ownsExhibition(exhibitionId, identity.userId)) return Response.json({ error: "无权上传到这个展览" }, { status: 403 });
  if (!(file instanceof File) || !(thumbnail instanceof File)) return Response.json({ error: "缺少图片或缩略图" }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size > 12 * 1024 * 1024) return Response.json({ error: "仅支持 12MB 以内的 JPG、PNG 或 WebP" }, { status: 400 });
  const assetId = makeId("asset");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `hometown/${identity.userId}/${exhibitionId}/${assetId}.${extension}`;
  const thumbnailKey = `hometown/${identity.userId}/${exhibitionId}/${assetId}-thumb.webp`;
  await Promise.all([
    env.MEDIA.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { exhibitionId, ownerId: identity.userId } }),
    env.MEDIA.put(thumbnailKey, thumbnail.stream(), { httpMetadata: { contentType: "image/webp" }, customMetadata: { exhibitionId, ownerId: identity.userId } }),
  ]);
  const clientCandidates = (() => {
    try { return JSON.parse(String(form.get("candidates") ?? "[]")) as ConceptCandidate[]; }
    catch { return []; }
  })();
  const candidates = [...clientCandidates, ...candidatesFromFilename(file.name)]
    .filter((candidate, index, values) => values.findIndex((item) => item.conceptId === candidate.conceptId) === index)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  const recommended = candidates.find((candidate) => candidate.confidence >= .55);
  const defaults = recommended ? conceptDefaults(recommended.conceptId) : null;
  const exhibitId = makeId("exhibit");
  const db = getDb();
  const existing = await db.select({ id: hometownExhibits.id }).from(hometownExhibits).where(eq(hometownExhibits.exhibitionId, exhibitionId));
  await db.batch([
    db.insert(hometownAssets).values({ id: assetId, exhibitionId, ownerId: identity.userId, objectKey, thumbnailKey, filename: file.name.slice(0, 180), contentType: file.type, byteSize: file.size, width, height, status: "REVIEW_REQUIRED" }),
    db.insert(hometownExhibits).values({ id: exhibitId, exhibitionId, assetId, zoneId: `${exhibitionId}_nature`, orderIndex: existing.length, title: defaults?.title ?? "等待发现", conceptId: recommended?.conceptId ?? null, interpretation: defaults?.interpretation ?? "这张照片尚未发现足够清晰的数学证据。请教师观察后手动选择，或将它移出本次展览。", evidence: recommended?.evidence ?? "视觉证据不足，系统没有强行匹配数学概念。", learningJson: defaults?.learningJson ?? "{}", overlayJson: defaults?.overlayJson ?? "{}", candidatesJson: JSON.stringify(candidates) }),
  ]);
  return Response.json({ exhibitId, noClearMath: candidates.length === 0, candidates }, { status: 201 });
}
