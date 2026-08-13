import { CONCEPT_BY_ID, candidatesFromFilename } from "../domain/registry";
import type { ConceptCandidate, HometownConceptId, OverlayGeometry } from "../domain/types";

export type PreparedImage = {
  display: Blob;
  thumbnail: Blob;
  width: number;
  height: number;
  candidates: ConceptCandidate[];
};

export async function prepareHometownImage(file: File): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const display = await resizeToBlob(bitmap, 1920, .88);
    const thumbnail = await resizeToBlob(bitmap, 400, .78);
    const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
    const { candidates: visual, bounds } = analyzePixels(bitmap);
    const named = candidatesFromFilename(file.name);
    const byId = new Map<HometownConceptId, ConceptCandidate>();
    [...named, ...visual].forEach((candidate) => {
      const previous = byId.get(candidate.conceptId);
      if (!previous || candidate.confidence > previous.confidence) byId.set(candidate.conceptId, candidate);
    });
    const candidates = [...byId.values()].sort((a, b) => b.confidence - a.confidence).filter((item) => item.confidence >= .55).slice(0, 3).map((item) => ({ ...item, overlay: fitOverlayToBounds(item.overlay, bounds) }));
    return { display, thumbnail, width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale), candidates };
  } finally {
    bitmap.close();
  }
}

async function resizeToBlob(bitmap: ImageBitmap, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false })!;
  context.drawImage(bitmap, 0, 0, width, height);
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片压缩失败")), "image/webp", quality));
}

function analyzePixels(bitmap: ImageBitmap): { candidates: ConceptCandidate[]; bounds: { left: number; top: number; right: number; bottom: number; centerX: number; centerY: number } } {
  const size = 96;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(bitmap, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const gray = new Float32Array(size * size);
  const saliency = new Float32Array(size * size);
  for (let i = 0; i < gray.length; i++) gray[i] = pixels[i * 4] * .299 + pixels[i * 4 + 1] * .587 + pixels[i * 4 + 2] * .114;
  let symmetryError = 0;
  let textureEnergy = 0;
  let waveEnergy = 0;
  for (let y = 2; y < size - 2; y++) for (let x = 2; x < size / 2; x++) {
    symmetryError += Math.abs(gray[y * size + x] - gray[y * size + (size - 1 - x)]);
    textureEnergy += Math.abs(gray[y * size + x] - gray[y * size + x + 4]);
    waveEnergy += Math.abs(gray[(y - 2) * size + x] - gray[(y + 2) * size + x]);
  }
  const samples = (size - 4) * (size / 2 - 2);
  const symmetry = 1 - symmetryError / samples / 255;
  const repetition = Math.min(1, textureEnergy / samples / 45);
  const wave = Math.min(1, waveEnergy / samples / 38);
  let totalWeight = 0, weightedX = 0, weightedY = 0;
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const index = y * size + x;
    const edge = Math.abs(gray[index - 1] - gray[index + 1]) + Math.abs(gray[index - size] - gray[index + size]);
    const r = pixels[index * 4], g = pixels[index * 4 + 1], b = pixels[index * 4 + 2];
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    const weight = edge * .75 + saturation * .25;
    saliency[index] = weight;
    totalWeight += weight;
    weightedX += x * weight;
    weightedY += y * weight;
  }
  const centerX = totalWeight ? weightedX / totalWeight : size / 2;
  const centerY = totalWeight ? weightedY / totalWeight : size / 2;
  let spreadX = 0, spreadY = 0;
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const weight = saliency[y * size + x];
    spreadX += Math.abs(x - centerX) * weight;
    spreadY += Math.abs(y - centerY) * weight;
  }
  const halfWidth = Math.max(size * .2, Math.min(size * .43, totalWeight ? spreadX / totalWeight * 2.15 : size * .32));
  const halfHeight = Math.max(size * .2, Math.min(size * .43, totalWeight ? spreadY / totalWeight * 2.15 : size * .32));
  const bounds = { left: Math.max(.04, (centerX - halfWidth) / size), top: Math.max(.04, (centerY - halfHeight) / size), right: Math.min(.96, (centerX + halfWidth) / size), bottom: Math.min(.96, (centerY + halfHeight) / size), centerX: centerX / size, centerY: centerY / size };
  const candidates: ConceptCandidate[] = [];
  if (symmetry > .73) candidates.push(candidate("symmetry.axial", .55 + (symmetry - .73) * .9, "图像左右两侧的明暗轮廓高度相似，中央附近可能存在对称轴。"));
  if (repetition > .64) candidates.push(candidate("pattern.repetition", .55 + (repetition - .64) * .75, "画面中出现间距相近的明暗变化，可以继续寻找重复单元。"));
  if (wave > .72 && repetition > .5) candidates.push(candidate("wave.periodicity", .55 + (wave - .72) * .72, "横向轮廓呈连续起伏，可能观察到波峰、波谷与周期。"));
  return { candidates, bounds };
}

function fitOverlayToBounds(overlay: OverlayGeometry, bounds: { left: number; top: number; right: number; bottom: number; centerX: number; centerY: number }): OverlayGeometry {
  const radius = Math.max(.08, Math.min(.44, Math.min(bounds.right - bounds.left, bounds.bottom - bounds.top) / 2));
  if (["radial", "spiral", "hexgrid"].includes(overlay.type)) return { ...overlay, center: [bounds.centerX, bounds.centerY], radius };
  if (overlay.type === "axis") return { ...overlay, points: [[bounds.centerX, bounds.top], [bounds.centerX, bounds.bottom]] };
  if (overlay.type === "nested") return { ...overlay, points: [[bounds.left, bounds.top], [bounds.right, bounds.bottom]] };
  if (overlay.type === "arch") return { ...overlay, points: [[bounds.left, bounds.bottom], [bounds.centerX, bounds.top], [bounds.right, bounds.bottom]] };
  return { ...overlay, points: [[bounds.left, bounds.centerY], [bounds.right, bounds.centerY]], center: [bounds.centerX, bounds.centerY], radius };
}

function candidate(id: HometownConceptId, confidence: number, evidence: string): ConceptCandidate {
  const item = CONCEPT_BY_ID[id];
  return { conceptId: id, labelZh: item.labelZh, confidence: Math.min(.89, confidence), evidence, overlay: item.overlay, interactiveDemoId: item.demoId };
}
