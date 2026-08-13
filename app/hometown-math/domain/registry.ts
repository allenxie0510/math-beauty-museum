import type { ConceptCandidate, HometownConceptId, OverlayGeometry } from "./types";

export type ConceptRegistryEntry = {
  id: HometownConceptId;
  labelZh: string;
  labelEn: string;
  shortTitle: string;
  childExplanation: string;
  demoId: string;
  keywords: string[];
  overlay: OverlayGeometry;
};

export const CONCEPT_REGISTRY: readonly ConceptRegistryEntry[] = [
  { id: "symmetry.axial", labelZh: "轴对称", labelEn: "AXIAL SYMMETRY", shortTitle: "一条线，两边相映", childExplanation: "沿着中线看过去，两边像照镜子一样彼此呼应。", demoId: "tessellation", keywords: ["蝴蝶", "叶", "窗", "门", "剪纸", "脸谱"], overlay: { type: "axis", points: [[.5, .14], [.5, .88]] } },
  { id: "symmetry.rotational", labelZh: "旋转对称", labelEn: "ROTATIONAL SYMMETRY", shortTitle: "转一转，图案又重合", childExplanation: "图案围绕中心重复出现，转过一定角度仍能彼此重合。", demoId: "tessellation", keywords: ["花", "窗花", "蛛网", "风车", "圆纹"], overlay: { type: "radial", center: [.5, .5], radius: .3, spacing: 8 } },
  { id: "fractal.self_similarity", labelZh: "分形与自相似", labelEn: "SELF-SIMILARITY", shortTitle: "小枝里藏着整棵树", childExplanation: "局部与整体有相似的轮廓，大小不同却保持同一种生长节奏。", demoId: "fractal", keywords: ["山", "树", "枝", "蕨", "云", "菜花"], overlay: { type: "nested", points: [[.15, .18], [.82, .82]] } },
  { id: "pattern.repetition", labelZh: "重复与平移", labelEn: "REPETITION", shortTitle: "一个单元，铺成一片", childExplanation: "相同的基本单元沿着方向重复，形成稳定又有节奏的纹样。", demoId: "tessellation", keywords: ["竹编", "编织", "砖", "瓦", "布", "纹样", "篮"], overlay: { type: "repeat", points: [[.2, .5], [.72, .5]], spacing: .14 } },
  { id: "geometry.arch", labelZh: "拱与三角结构", labelEn: "ARCH GEOMETRY", shortTitle: "弧线托起一座桥", childExplanation: "拱形把力量向两边传递，三角形让结构更加稳定。", demoId: "catenary", keywords: ["桥", "拱", "屋顶", "梁", "塔", "亭"], overlay: { type: "arch", points: [[.16, .7], [.5, .25], [.84, .7]] } },
  { id: "geometry.hexagon", labelZh: "六边形镶嵌", labelEn: "HEXAGON TILING", shortTitle: "六条边，紧密相连", childExplanation: "六边形可以不留空隙地排在一起，节省空间又十分牢固。", demoId: "tessellation", keywords: ["蜂巢", "六边形", "网格", "龟甲", "地砖"], overlay: { type: "hexgrid", center: [.5, .5], radius: .09, spacing: .17 } },
  { id: "spiral.phyllotaxis", labelZh: "螺旋与叶序", labelEn: "SPIRAL PHYLLOTAXIS", shortTitle: "旋转着长大的种子", childExplanation: "新的种子按稳定角度依次出现，让有限空间容纳更多生命。", demoId: "phyllotaxis", keywords: ["向日葵", "松果", "花心", "螺旋", "贝壳"], overlay: { type: "spiral", center: [.5, .5], radius: .34, rotation: 0 } },
  { id: "wave.periodicity", labelZh: "波与周期", labelEn: "WAVE PERIODICITY", shortTitle: "起伏之间藏着节拍", childExplanation: "相似的波峰和波谷不断出现，距离与高度描述了它的节奏。", demoId: "sine", keywords: ["水", "波", "涟漪", "山脊", "梯田", "声"], overlay: { type: "wave", points: [[.08, .56], [.92, .56]], spacing: .18 } },
] as const;

export const CONCEPT_BY_ID = Object.fromEntries(CONCEPT_REGISTRY.map((item) => [item.id, item])) as Record<HometownConceptId, ConceptRegistryEntry>;

export function candidatesFromFilename(filename: string): ConceptCandidate[] {
  const normalized = filename.toLowerCase();
  return CONCEPT_REGISTRY.flatMap((entry) => {
    const hits = entry.keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
    if (!hits) return [];
    return [{ conceptId: entry.id, labelZh: entry.labelZh, confidence: Math.min(.92, .58 + hits * .12), evidence: `文件名中的“${entry.keywords.find((keyword) => normalized.includes(keyword.toLowerCase()))}”提示可以观察${entry.labelZh}，仍需教师结合照片确认。`, overlay: entry.overlay, interactiveDemoId: entry.demoId }];
  }).sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}
