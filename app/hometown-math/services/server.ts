import { env } from "cloudflare:workers";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  hometownAssets,
  hometownExhibitions,
  hometownExhibits,
  hometownPublishedManifests,
  hometownZones,
} from "../../../db/schema";
import { getChatGPTUser, type ChatGPTUser } from "../../chatgpt-auth";
import { buildLearningContent, CONCEPT_BY_ID } from "../domain/registry";
import { buildHometownManifest } from "../domain/manifest";
import type { HometownConceptId, MathLearningContent, OverlayGeometry, TeacherExhibitionDraft } from "../domain/types";

export const DEFAULT_ZONES = [
  ["nature", "自然的规律", "叶脉、花朵与生长的秩序"],
  ["labor", "劳动的智慧", "手艺里一遍遍重复的单元"],
  ["architecture", "建筑的秩序", "桥、屋顶与稳定的形状"],
  ["landscape", "山水的节奏", "水面、梯田与周期性的起伏"],
] as const;

export async function requireApiUser(): Promise<ChatGPTUser | Response> {
  const user = await getChatGPTUser();
  return user ?? Response.json({ error: "请先使用 ChatGPT 登录教师工作台" }, { status: 401 });
}

export function makeId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

export function safeSlug(input: string) {
  const cleaned = input.toLowerCase().trim().replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 44);
  return cleaned || `hometown-${crypto.randomUUID().slice(0, 8)}`;
}

export async function ownsExhibition(id: string, ownerId: string) {
  const [row] = await getDb().select().from(hometownExhibitions).where(and(eq(hometownExhibitions.id, id), eq(hometownExhibitions.ownerId, ownerId))).limit(1);
  return row ?? null;
}

export async function readTeacherDraft(id: string, ownerId: string): Promise<TeacherExhibitionDraft | null> {
  const exhibition = await ownsExhibition(id, ownerId);
  if (!exhibition) return null;
  const db = getDb();
  const [zones, exhibitRows] = await Promise.all([
    db.select().from(hometownZones).where(eq(hometownZones.exhibitionId, id)).orderBy(asc(hometownZones.orderIndex)),
    db.select({ exhibit: hometownExhibits, asset: hometownAssets })
      .from(hometownExhibits)
      .innerJoin(hometownAssets, eq(hometownExhibits.assetId, hometownAssets.id))
      .where(eq(hometownExhibits.exhibitionId, id))
      .orderBy(asc(hometownExhibits.zoneId), asc(hometownExhibits.orderIndex)),
  ]);
  return {
    id: exhibition.id,
    slug: exhibition.slug,
    title: exhibition.title,
    schoolClass: exhibition.schoolClass,
    locationLabel: exhibition.locationLabel,
    visibility: exhibition.visibility as "unpublished" | "link-only",
    manifestVersion: exhibition.manifestVersion,
    zones: zones.map((zone) => ({ id: zone.id, name: zone.name, subtitle: zone.subtitle, order: zone.orderIndex })),
    exhibits: exhibitRows.map(({ exhibit, asset }) => ({
      id: exhibit.id,
      assetId: asset.id,
      filename: asset.filename,
      imageUrl: `/api/hometown/media?key=${encodeURIComponent(asset.objectKey)}`,
      thumbnailUrl: `/api/hometown/media?key=${encodeURIComponent(asset.thumbnailKey)}`,
      imageWidth: asset.width,
      imageHeight: asset.height,
      status: asset.status as TeacherExhibitionDraft["exhibits"][number]["status"],
      zoneId: exhibit.zoneId,
      order: exhibit.orderIndex,
      title: exhibit.title,
      interpretation: exhibit.interpretation,
      evidence: exhibit.evidence,
      conceptId: exhibit.conceptId as HometownConceptId | null,
      overlay: parseJson<OverlayGeometry | null>(exhibit.overlayJson, null),
      learning: learningFromJson(exhibit.learningJson, exhibit.conceptId as HometownConceptId | null, parseJson<OverlayGeometry | null>(exhibit.overlayJson, null), exhibit.interpretation),
      candidates: parseJson(exhibit.candidatesJson, []),
      teacherConfirmed: exhibit.teacherConfirmed,
    })),
  };
}

export async function publishDraft(id: string, ownerId: string) {
  const draft = await readTeacherDraft(id, ownerId);
  if (!draft) return null;
  const version = draft.manifestVersion + 1;
  const manifest = buildHometownManifest(draft, version);
  const manifestId = makeId("manifest");
  const db = getDb();
  await db.batch([
    db.insert(hometownPublishedManifests).values({ id: manifestId, exhibitionId: id, slug: draft.slug, version, manifestJson: JSON.stringify(manifest) }),
    db.update(hometownExhibitions).set({ visibility: "link-only", manifestVersion: version, updatedAt: new Date().toISOString() }).where(and(eq(hometownExhibitions.id, id), eq(hometownExhibitions.ownerId, ownerId))),
  ]);
  return manifest;
}

export async function latestPublicManifest(slug: string) {
  const [row] = await getDb().select({ manifestJson: hometownPublishedManifests.manifestJson }).from(hometownPublishedManifests).innerJoin(hometownExhibitions, eq(hometownPublishedManifests.exhibitionId, hometownExhibitions.id)).where(and(eq(hometownPublishedManifests.slug, slug), eq(hometownExhibitions.visibility, "link-only"))).orderBy(desc(hometownPublishedManifests.version)).limit(1);
  return row ? parseJson(row.manifestJson, null) : null;
}

export async function deleteExhibition(id: string, ownerId: string) {
  const exhibition = await ownsExhibition(id, ownerId);
  if (!exhibition) return false;
  const db = getDb();
  const assets = await db.select().from(hometownAssets).where(eq(hometownAssets.exhibitionId, id));
  await Promise.allSettled(assets.flatMap((asset) => [env.MEDIA.delete(asset.objectKey), env.MEDIA.delete(asset.thumbnailKey)]));
  await db.batch([
    db.delete(hometownPublishedManifests).where(eq(hometownPublishedManifests.exhibitionId, id)),
    db.delete(hometownExhibits).where(eq(hometownExhibits.exhibitionId, id)),
    db.delete(hometownAssets).where(eq(hometownAssets.exhibitionId, id)),
    db.delete(hometownZones).where(eq(hometownZones.exhibitionId, id)),
    db.delete(hometownExhibitions).where(and(eq(hometownExhibitions.id, id), eq(hometownExhibitions.ownerId, ownerId))),
  ]);
  return true;
}

export function conceptDefaults(conceptId: HometownConceptId) {
  const concept = CONCEPT_BY_ID[conceptId];
  return { title: concept.shortTitle, interpretation: concept.childExplanation, overlayJson: JSON.stringify(concept.overlay), learningJson: JSON.stringify(buildLearningContent(conceptId, concept.overlay, concept.childExplanation)) };
}

function emptyLearning(): MathLearningContent {
  return { observation: "等待教师观察照片", measurementLabel: "尚未测量", measurementValue: "—", measurementDetail: "请先选择数学概念并校准照片标注。", formula: "—", formulaMeaning: "完成测量后显示公式。", variables: [], reasoning: [], whyItMatters: "", applications: [], explorePrompt: "", precision: "approximate" };
}

function learningFromJson(value: string, conceptId: HometownConceptId | null, overlay: OverlayGeometry | null, interpretation: string): MathLearningContent {
  const parsed = parseJson<Partial<MathLearningContent>>(value, {});
  if (parsed.formula && parsed.measurementValue && Array.isArray(parsed.reasoning)) return parsed as MathLearningContent;
  return conceptId && overlay ? buildLearningContent(conceptId, overlay, interpretation) : emptyLearning();
}

function parseJson<T>(value: string, fallback: T): T {
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
