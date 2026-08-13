import { buildLearningContent, CONCEPT_BY_ID } from "./registry";
import type { HometownConceptId, HometownSceneManifest, OverlayGeometry } from "./types";

const svgPhoto = (title: string, subtitle: string, accent: string, kind: "leaf" | "weave" | "bridge" | "water") => {
  const art = kind === "leaf"
    ? `<path d="M225 478C264 280 379 170 596 133C552 355 432 468 225 478Z" fill="none" stroke="${accent}" stroke-width="10"/><path d="M232 466C330 385 413 302 584 147" stroke="#f4e8c8" stroke-width="5"/><g stroke="${accent}" stroke-width="4" opacity=".7"><path d="M303 407l4-112"/><path d="M367 348l16-121"/><path d="M431 286l17-94"/><path d="M302 405l110 4"/><path d="M368 347l121-7"/><path d="M432 285l92-13"/></g>`
    : kind === "weave"
      ? `<g stroke-linecap="round" fill="none"><g stroke="${accent}" stroke-width="16">${Array.from({ length: 9 }, (_, i) => `<path d="M${120 + i * 78} 125L${65 + i * 78} 520"/>`).join("")}</g><g stroke="#f4e8c8" stroke-width="11" opacity=".8">${Array.from({ length: 8 }, (_, i) => `<path d="M85 ${145 + i * 50}L735 ${95 + i * 50}"/>`).join("")}</g></g>`
      : kind === "bridge"
        ? `<path d="M92 460H710" stroke="#f4e8c8" stroke-width="12"/><path d="M145 454C235 198 555 198 655 454" fill="none" stroke="${accent}" stroke-width="18"/><path d="M205 454C270 286 520 286 590 454" fill="none" stroke="#f4e8c8" stroke-width="8"/><g stroke="${accent}" stroke-width="5" opacity=".55"><path d="M177 390h444"/><path d="M227 314h344"/><path d="M303 254h192"/></g>`
        : `<g fill="none" stroke-linecap="round">${Array.from({ length: 6 }, (_, i) => `<path d="M60 ${220 + i * 48}C190 ${160 + i * 48} 290 ${285 + i * 48} 420 ${220 + i * 48}S650 ${160 + i * 48} 760 ${225 + i * 48}" stroke="${i % 2 ? "#f4e8c8" : accent}" stroke-width="${i % 2 ? 7 : 12}" opacity="${.92 - i * .08}"/>`).join("")}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><radialGradient id="g"><stop stop-color="${accent}" stop-opacity=".25"/><stop offset="1" stop-color="#08151b"/></radialGradient></defs><rect width="800" height="600" fill="#08151b"/><rect width="800" height="600" fill="url(#g)"/>${art}<text x="54" y="70" fill="#f7efd9" font-size="30" font-family="sans-serif" font-weight="700">${title}</text><text x="56" y="103" fill="#d5c7a6" font-size="15" font-family="sans-serif" letter-spacing="3">${subtitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const demoItem = (id: string, zoneId: string, title: string, conceptId: HometownConceptId, interpretation: string, evidence: string, accent: string, kind: "leaf" | "weave" | "bridge" | "water", order: number) => {
  const concept = CONCEPT_BY_ID[conceptId];
  const imageUrl = svgPhoto(title, concept.labelEn, accent, kind);
  return { id, zoneId, title, conceptId, conceptLabel: concept.labelZh, interpretation, evidence, learning: buildLearningContent(conceptId, concept.overlay, interpretation), interactiveDemoId: concept.demoId, overlay: concept.overlay as OverlayGeometry, imageUrl, thumbnailUrl: imageUrl, imageWidth: 800, imageHeight: 600, order };
};

export const DEFAULT_HOMETOWN_MANIFEST: HometownSceneManifest = {
  id: "hometown-demo",
  version: 1,
  slug: "our-hometown",
  title: "我们的家乡数学展",
  subtitle: "我的家乡，是一座数学馆",
  schoolClass: "乡村少年共同策展",
  locationLabel: "山水与村落之间",
  theme: "warm-rural-night",
  environment: { sky: "#071116", floor: "#101819", light: "#f3cf91" },
  zones: [
    { id: "nature", name: "自然的规律", subtitle: "叶脉、花朵与生长的秩序", accent: "#8ed3a6", anchor: [-8, 0, -9], exhibits: [
      demoItem("leaf-symmetry", "nature", "叶脉两边的回声", "symmetry.axial", "沿着主叶脉观察，左右轮廓近似相映，生长并不机械，却保持着平衡。", "主叶脉形成明显中轴，两侧支脉呈近似镜像分布。", "#8ed3a6", "leaf", 0),
      demoItem("flower-spiral", "nature", "花心里的旋转队伍", "spiral.phyllotaxis", "种子依次旋转出现，在有限的花盘里留出彼此生长的空间。", "从中心向外可追踪多组相反方向的螺旋线。", "#d8a16d", "leaf", 1),
    ] },
    { id: "labor", name: "劳动的智慧", subtitle: "手艺里一遍遍重复的单元", accent: "#e3a56f", anchor: [8, 0, -22], exhibits: [
      demoItem("bamboo-pattern", "labor", "竹篾编出的节奏", "pattern.repetition", "一根根竹篾按相同次序穿插，基本单元不断平移，织成牢固的表面。", "斜向竹篾交替穿过横向竹篾，重复单元清晰可辨。", "#e3a56f", "weave", 0),
      demoItem("basket-hex", "labor", "紧密相连的格子", "geometry.hexagon", "许多近似六边形的网眼彼此相接，用较少材料围出稳定空间。", "网眼由六条近似直边围合，并在平面上连续镶嵌。", "#d9be7a", "weave", 1),
    ] },
    { id: "architecture", name: "建筑的秩序", subtitle: "桥、屋顶与稳定的形状", accent: "#79b9d2", anchor: [-8, 0, -35], exhibits: [
      demoItem("stone-arch", "architecture", "弧线托起石桥", "geometry.arch", "拱形把上方的重量沿弧线传向两侧，让石块共同承担力量。", "桥洞上缘形成连续拱弧，两端落在稳定支点上。", "#79b9d2", "bridge", 0),
      demoItem("window-axis", "architecture", "窗格的左右平衡", "symmetry.axial", "窗格围绕中线对称排列，既方便建造，也让立面显得安定。", "中央竖框可作为对称轴，两侧格子尺寸和位置对应。", "#9aaee1", "bridge", 1),
    ] },
    { id: "landscape", name: "山水的节奏", subtitle: "水面、梯田与周期性的起伏", accent: "#77c9ce", anchor: [8, 0, -48], exhibits: [
      demoItem("water-wave", "landscape", "水面传来的节拍", "wave.periodicity", "相似的波峰和波谷向外传播，波长与振幅写下水面的节奏。", "连续亮纹之间的距离近似稳定，构成可观察的周期。", "#77c9ce", "water", 0),
      demoItem("mountain-fractal", "landscape", "山脊里的大小相似", "fractal.self_similarity", "远山的大轮廓与近处的小山脊彼此相似，尺度变化让景色层层展开。", "主山脊与次级支脊呈相似分叉轮廓，但不能视为严格分形。", "#a9bd90", "water", 1),
    ] },
  ],
  tourPath: ["leaf-symmetry", "bamboo-pattern", "stone-arch", "water-wave"],
};
