import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ChatGPTUser } from "../../chatgpt-auth";
import { buildHometownManifest } from "../domain/manifest";
import { buildLearningContent, CONCEPT_BY_ID, candidatesFromFilename } from "../domain/registry";
import type {
  ConceptCandidate,
  HometownConceptId,
  HometownSceneManifest,
  MathLearningContent,
  OverlayGeometry,
  TeacherExhibitionDraft,
} from "../domain/types";
import { DEFAULT_ZONES, makeId, safeSlug } from "./server";

const BUCKET = "hometown-media";
let serviceClient: SupabaseClient | null = null;

export function isSupabaseServerConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function supabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Supabase server environment is incomplete");
  serviceClient ??= createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return serviceClient;
}

function assert<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("Supabase returned no data");
  return data;
}

export async function supabaseListExhibitions(ownerId: string) {
  const result = await supabase()
    .from("hometown_exhibitions")
    .select("*")
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });
  return assert(result.data, result.error).map(mapExhibitionListRow);
}

export async function supabaseCreateExhibition(
  identity: ChatGPTUser,
  payload: { title?: string; schoolClass?: string; locationLabel?: string },
) {
  const title = payload.title?.trim().slice(0, 40) || "我们的家乡数学展";
  const id = makeId("exhibition");
  const slug = `${safeSlug(title)}-${crypto.randomUUID().slice(0, 6)}`;
  const client = supabase();
  const exhibitionResult = await client.from("hometown_exhibitions").insert({
    id,
    owner_id: identity.userId,
    owner_email: identity.email,
    slug,
    title,
    school_class: payload.schoolClass?.trim().slice(0, 60) || "",
    location_label: payload.locationLabel?.trim().slice(0, 60) || "",
  });
  if (exhibitionResult.error) throw new Error(exhibitionResult.error.message);
  const zoneResult = await client.from("hometown_zones").insert(
    DEFAULT_ZONES.map(([zoneId, name, subtitle], order) => ({
      id: `${id}_${zoneId}`,
      exhibition_id: id,
      name,
      subtitle,
      order_index: order,
    })),
  );
  if (zoneResult.error) {
    await client.from("hometown_exhibitions").delete().eq("id", id);
    throw new Error(zoneResult.error.message);
  }
  return { id, slug };
}

export async function supabaseOwnsExhibition(id: string, ownerId: string) {
  const result = await supabase()
    .from("hometown_exhibitions")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function supabaseReadTeacherDraft(
  id: string,
  ownerId: string,
): Promise<TeacherExhibitionDraft | null> {
  const exhibition = await supabaseOwnsExhibition(id, ownerId);
  if (!exhibition) return null;
  const client = supabase();
  const [zoneResult, exhibitResult, assetResult] = await Promise.all([
    client.from("hometown_zones").select("*").eq("exhibition_id", id).order("order_index"),
    client.from("hometown_exhibits").select("*").eq("exhibition_id", id).order("order_index"),
    client.from("hometown_assets").select("*").eq("exhibition_id", id),
  ]);
  const zones = assert(zoneResult.data, zoneResult.error);
  const exhibits = assert(exhibitResult.data, exhibitResult.error);
  const assets = assert(assetResult.data, assetResult.error);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));

  return {
    id: exhibition.id,
    slug: exhibition.slug,
    title: exhibition.title,
    schoolClass: exhibition.school_class,
    locationLabel: exhibition.location_label,
    visibility: exhibition.visibility,
    manifestVersion: exhibition.manifest_version,
    zones: zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      subtitle: zone.subtitle,
      order: zone.order_index,
    })),
    exhibits: exhibits.flatMap((exhibit) => {
      const asset = assetsById.get(exhibit.asset_id);
      if (!asset) return [];
      const overlay = jsonValue<OverlayGeometry | null>(exhibit.overlay_json, null);
      const conceptId = exhibit.concept_id as HometownConceptId | null;
      return [{
        id: exhibit.id,
        assetId: asset.id,
        filename: asset.filename,
        imageUrl: mediaUrl(asset.object_key),
        thumbnailUrl: mediaUrl(asset.thumbnail_key),
        imageWidth: asset.width,
        imageHeight: asset.height,
        status: asset.status,
        zoneId: exhibit.zone_id,
        order: exhibit.order_index,
        title: exhibit.title,
        interpretation: exhibit.interpretation,
        evidence: exhibit.evidence,
        conceptId,
        overlay,
        learning: learningValue(exhibit.learning_json, conceptId, overlay, exhibit.interpretation),
        candidates: jsonValue<ConceptCandidate[]>(exhibit.candidates_json, []),
        teacherConfirmed: exhibit.teacher_confirmed,
      }];
    }),
  };
}

export async function supabaseUpdateExhibition(
  id: string,
  ownerId: string,
  payload: {
    title?: string;
    schoolClass?: string;
    locationLabel?: string;
    zones?: Array<{ id: string; name: string; subtitle: string; order: number }>;
  },
) {
  if (!(await supabaseOwnsExhibition(id, ownerId))) return false;
  const updates: Record<string, string> = {};
  if (payload.title) updates.title = payload.title.trim().slice(0, 40);
  if (payload.schoolClass !== undefined) updates.school_class = payload.schoolClass.trim().slice(0, 60);
  if (payload.locationLabel !== undefined) updates.location_label = payload.locationLabel.trim().slice(0, 60);
  const client = supabase();
  if (Object.keys(updates).length) {
    const result = await client.from("hometown_exhibitions").update(updates).eq("id", id).eq("owner_id", ownerId);
    if (result.error) throw new Error(result.error.message);
  }
  await Promise.all((payload.zones ?? []).map(async (zone) => {
    const result = await client.from("hometown_zones").update({
      name: zone.name.trim().slice(0, 20),
      subtitle: zone.subtitle.trim().slice(0, 50),
      order_index: zone.order,
    }).eq("id", zone.id).eq("exhibition_id", id);
    if (result.error) throw new Error(result.error.message);
  }));
  return true;
}

export async function supabaseDeleteExhibition(id: string, ownerId: string) {
  if (!(await supabaseOwnsExhibition(id, ownerId))) return false;
  const client = supabase();
  const assetResult = await client.from("hometown_assets").select("object_key, thumbnail_key").eq("exhibition_id", id);
  const assets = assert(assetResult.data, assetResult.error);
  if (assets.length) {
    await client.storage.from(BUCKET).remove(
      assets.flatMap((asset) => [asset.object_key, asset.thumbnail_key]),
    );
  }
  const result = await client.from("hometown_exhibitions").delete().eq("id", id).eq("owner_id", ownerId);
  if (result.error) throw new Error(result.error.message);
  return true;
}

export async function supabaseUpdateExhibit(
  id: string,
  ownerId: string,
  payload: {
    conceptId?: HometownConceptId;
    title?: string;
    interpretation?: string;
    evidence?: string;
    learning?: MathLearningContent;
    overlay?: OverlayGeometry;
    zoneId?: string;
    order?: number;
    teacherConfirmed?: boolean;
    rejected?: boolean;
  },
) {
  const client = supabase();
  const rowResult = await client.from("hometown_exhibits").select("*").eq("id", id).maybeSingle();
  if (rowResult.error) throw new Error(rowResult.error.message);
  const row = rowResult.data;
  if (!row || !(await supabaseOwnsExhibition(row.exhibition_id, ownerId))) return false;
  if (payload.conceptId && !CONCEPT_BY_ID[payload.conceptId]) throw new Error("概念不在受控 Registry 中");
  const updates: Record<string, unknown> = {};
  if (payload.conceptId) updates.concept_id = payload.conceptId;
  if (payload.title !== undefined) updates.title = payload.title.trim().slice(0, 18);
  if (payload.interpretation !== undefined) updates.interpretation = payload.interpretation.trim().slice(0, 220);
  if (payload.evidence !== undefined) updates.evidence = payload.evidence.trim().slice(0, 220);
  if (payload.overlay !== undefined) updates.overlay_json = payload.overlay;
  if (payload.learning !== undefined) updates.learning_json = payload.learning;
  else if (payload.conceptId || payload.overlay || payload.interpretation !== undefined || payload.evidence !== undefined) {
    const conceptId = payload.conceptId ?? row.concept_id as HometownConceptId | null;
    const overlay = payload.overlay ?? jsonValue<OverlayGeometry>(row.overlay_json, CONCEPT_BY_ID[conceptId!]?.overlay);
    if (conceptId && overlay) updates.learning_json = buildLearningContent(conceptId, overlay, payload.interpretation ?? row.interpretation);
  }
  if (payload.zoneId !== undefined) updates.zone_id = payload.zoneId;
  if (payload.order !== undefined) updates.order_index = payload.order;
  if (payload.teacherConfirmed !== undefined) updates.teacher_confirmed = payload.teacherConfirmed;
  if (payload.rejected !== undefined) updates.rejected = payload.rejected;
  const updateResult = await client.from("hometown_exhibits").update(updates).eq("id", id);
  if (updateResult.error) throw new Error(updateResult.error.message);
  const assetResult = await client.from("hometown_assets").update({
    status: payload.rejected ? "REJECTED" : payload.teacherConfirmed ? "APPROVED" : "REVIEW_REQUIRED",
  }).eq("id", row.asset_id);
  if (assetResult.error) throw new Error(assetResult.error.message);
  return true;
}

export async function supabaseDeleteExhibit(id: string, ownerId: string) {
  const client = supabase();
  const exhibitResult = await client.from("hometown_exhibits").select("*").eq("id", id).maybeSingle();
  if (exhibitResult.error) throw new Error(exhibitResult.error.message);
  const exhibit = exhibitResult.data;
  if (!exhibit || !(await supabaseOwnsExhibition(exhibit.exhibition_id, ownerId))) return false;
  const assetResult = await client.from("hometown_assets").select("*").eq("id", exhibit.asset_id).single();
  const asset = assert(assetResult.data, assetResult.error);
  await client.storage.from(BUCKET).remove([asset.object_key, asset.thumbnail_key]);
  const deleteResult = await client.from("hometown_assets").delete().eq("id", asset.id);
  if (deleteResult.error) throw new Error(deleteResult.error.message);
  return true;
}

export async function supabaseUploadExhibit(
  identity: ChatGPTUser,
  form: FormData,
) {
  const exhibitionId = String(form.get("exhibitionId") ?? "");
  const file = form.get("file");
  const thumbnail = form.get("thumbnail");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);
  if (!(await supabaseOwnsExhibition(exhibitionId, identity.userId))) return { error: "无权上传到这个展览", status: 403 };
  if (!(file instanceof File) || !(thumbnail instanceof File)) return { error: "缺少图片或缩略图", status: 400 };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 12 * 1024 * 1024) return { error: "仅支持 12MB 以内的 JPG、PNG 或 WebP", status: 400 };
  const assetId = makeId("asset");
  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const objectKey = `hometown/${identity.userId}/${exhibitionId}/${assetId}.${extension}`;
  const thumbnailKey = `hometown/${identity.userId}/${exhibitionId}/${assetId}-thumb.webp`;
  const client = supabase();
  const [originalUpload, thumbnailUpload] = await Promise.all([
    client.storage.from(BUCKET).upload(objectKey, await file.arrayBuffer(), { contentType: file.type }),
    client.storage.from(BUCKET).upload(thumbnailKey, await thumbnail.arrayBuffer(), { contentType: "image/webp" }),
  ]);
  if (originalUpload.error || thumbnailUpload.error) {
    await client.storage.from(BUCKET).remove([objectKey, thumbnailKey]);
    throw new Error(originalUpload.error?.message ?? thumbnailUpload.error?.message);
  }
  const clientCandidates = jsonValue<ConceptCandidate[]>(String(form.get("candidates") ?? "[]"), []);
  const candidates = [...clientCandidates, ...candidatesFromFilename(file.name)]
    .filter((candidate, index, values) => values.findIndex((item) => item.conceptId === candidate.conceptId) === index)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  const recommended = candidates.find((candidate) => candidate.confidence >= 0.55);
  const concept = recommended ? CONCEPT_BY_ID[recommended.conceptId] : null;
  const exhibitId = makeId("exhibit");
  const countResult = await client.from("hometown_exhibits").select("id", { count: "exact", head: true }).eq("exhibition_id", exhibitionId);
  const assetInsert = await client.from("hometown_assets").insert({
    id: assetId,
    exhibition_id: exhibitionId,
    owner_id: identity.userId,
    object_key: objectKey,
    thumbnail_key: thumbnailKey,
    filename: file.name.slice(0, 180),
    content_type: file.type,
    byte_size: file.size,
    width,
    height,
    status: "REVIEW_REQUIRED",
  });
  if (assetInsert.error) throw new Error(assetInsert.error.message);
  const overlay = concept?.overlay;
  const interpretation = concept?.childExplanation ?? "这张照片尚未发现足够清晰的数学证据。请教师观察后手动选择，或将它移出本次展览。";
  const exhibitInsert = await client.from("hometown_exhibits").insert({
    id: exhibitId,
    exhibition_id: exhibitionId,
    asset_id: assetId,
    zone_id: `${exhibitionId}_nature`,
    order_index: countResult.count ?? 0,
    title: concept?.shortTitle ?? "等待发现",
    concept_id: recommended?.conceptId ?? null,
    interpretation,
    evidence: recommended?.evidence ?? "视觉证据不足，系统没有强行匹配数学概念。",
    learning_json: concept && recommended && overlay ? buildLearningContent(recommended.conceptId, overlay, interpretation) : {},
    overlay_json: overlay ?? {},
    candidates_json: candidates,
  });
  if (exhibitInsert.error) throw new Error(exhibitInsert.error.message);
  return { exhibitId, noClearMath: candidates.length === 0, candidates };
}

export async function supabasePublishDraft(id: string, ownerId: string) {
  const draft = await supabaseReadTeacherDraft(id, ownerId);
  if (!draft) return null;
  const version = draft.manifestVersion + 1;
  const manifest = buildHometownManifest(draft, version);
  const client = supabase();
  const manifestResult = await client.from("hometown_published_manifests").insert({
    id: makeId("manifest"),
    exhibition_id: id,
    slug: draft.slug,
    version,
    manifest_json: manifest,
  });
  if (manifestResult.error) throw new Error(manifestResult.error.message);
  const exhibitionResult = await client.from("hometown_exhibitions").update({ visibility: "link-only", manifest_version: version }).eq("id", id).eq("owner_id", ownerId);
  if (exhibitionResult.error) throw new Error(exhibitionResult.error.message);
  return manifest;
}

export async function supabaseUnpublish(id: string, ownerId: string) {
  const result = await supabase().from("hometown_exhibitions").update({ visibility: "unpublished" }).eq("id", id).eq("owner_id", ownerId).select("id");
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data?.length);
}

export async function supabaseLatestPublicManifest(slug: string): Promise<HometownSceneManifest | null> {
  const client = supabase();
  const exhibitionResult = await client.from("hometown_exhibitions").select("id").eq("slug", slug).eq("visibility", "link-only").maybeSingle();
  if (exhibitionResult.error) throw new Error(exhibitionResult.error.message);
  if (!exhibitionResult.data) return null;
  const manifestResult = await client.from("hometown_published_manifests").select("manifest_json").eq("exhibition_id", exhibitionResult.data.id).order("version", { ascending: false }).limit(1).maybeSingle();
  if (manifestResult.error) throw new Error(manifestResult.error.message);
  return manifestResult.data?.manifest_json as HometownSceneManifest | null;
}

export async function supabaseReadMedia(key: string) {
  if (!key || key.includes("..")) return null;
  const result = await supabase().storage.from(BUCKET).download(key);
  if (result.error || !result.data) return null;
  return result.data;
}

function mediaUrl(key: string) {
  return `/api/hometown/media?key=${encodeURIComponent(key)}`;
}

function mapExhibitionListRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    visibility: row.visibility,
    manifestVersion: row.manifest_version,
    updatedAt: row.updated_at,
  };
}

function emptyLearning(): MathLearningContent {
  return { observation: "等待教师观察照片", measurementLabel: "尚未测量", measurementValue: "—", measurementDetail: "请先选择数学概念并校准照片标注。", formula: "—", formulaMeaning: "完成测量后显示公式。", variables: [], reasoning: [], whyItMatters: "", applications: [], explorePrompt: "", precision: "approximate" };
}

function learningValue(value: unknown, conceptId: HometownConceptId | null, overlay: OverlayGeometry | null, interpretation: string): MathLearningContent {
  const parsed = jsonValue<Partial<MathLearningContent>>(value, {});
  if (parsed.formula && parsed.measurementValue && Array.isArray(parsed.reasoning)) return parsed as MathLearningContent;
  return conceptId && overlay ? buildLearningContent(conceptId, overlay, interpretation) : emptyLearning();
}

function jsonValue<T>(value: unknown, fallback: T): T {
  if (value !== null && typeof value === "object") return value as T;
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
}
