import { CONCEPT_BY_ID } from "./registry";
import type { HometownSceneManifest, TeacherExhibitionDraft } from "./types";

const zoneVisuals = [
  { accent: "#8ed3a6", anchor: [-8, 0, -9] as [number, number, number] },
  { accent: "#e3a56f", anchor: [8, 0, -22] as [number, number, number] },
  { accent: "#79b9d2", anchor: [-8, 0, -35] as [number, number, number] },
  { accent: "#77c9ce", anchor: [8, 0, -48] as [number, number, number] },
];

export function buildHometownManifest(draft: TeacherExhibitionDraft, version: number): HometownSceneManifest {
  const approved = draft.exhibits.filter((item) => item.teacherConfirmed && item.conceptId && item.overlay && !item.status.includes("REJECTED"));
  return {
    id: draft.id,
    version,
    slug: draft.slug,
    title: draft.title,
    subtitle: "我的家乡，是一座数学馆",
    schoolClass: draft.schoolClass,
    locationLabel: draft.locationLabel,
    theme: "warm-rural-night",
    environment: { sky: "#071116", floor: "#101819", light: "#f3cf91" },
    zones: draft.zones.sort((a, b) => a.order - b.order).map((zone, zoneIndex) => ({
      id: zone.id,
      name: zone.name,
      subtitle: zone.subtitle,
      accent: zoneVisuals[zoneIndex % zoneVisuals.length].accent,
      anchor: zoneVisuals[zoneIndex % zoneVisuals.length].anchor,
      exhibits: approved.filter((item) => item.zoneId === zone.id).sort((a, b) => a.order - b.order).map((item) => {
        const concept = CONCEPT_BY_ID[item.conceptId!];
        return {
          id: item.id,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          title: item.title,
          conceptId: item.conceptId!,
          conceptLabel: concept.labelZh,
          interpretation: item.interpretation,
          evidence: item.evidence,
          interactiveDemoId: concept.demoId,
          overlay: item.overlay!,
          zoneId: zone.id,
          order: item.order,
        };
      }),
    })),
    tourPath: approved.sort((a, b) => a.order - b.order).map((item) => item.id),
  };
}

export function validateForPublish(draft: TeacherExhibitionDraft): string[] {
  const errors: string[] = [];
  if (!draft.title.trim() || draft.title.trim().length > 40) errors.push("展览标题需要 1–40 个字符");
  const active = draft.exhibits.filter((item) => item.status !== "REJECTED");
  if (!active.length) errors.push("至少需要一件已审核展品");
  active.forEach((item) => {
    if (!item.teacherConfirmed || !item.conceptId) errors.push(`${item.filename} 尚未由教师确认数学概念`);
    if (!item.title.trim() || item.title.trim().length > 18) errors.push(`${item.filename} 的儿童标题需要 1–18 个字符`);
    if (item.interpretation.trim().length < 20) errors.push(`${item.filename} 的解读还不够完整`);
  });
  return errors;
}
