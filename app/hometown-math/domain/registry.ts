import type { ConceptCandidate, HometownConceptId, MathLearningContent, OverlayGeometry } from "./types";

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

const rounded = (value: number) => String(Math.round(value * 10) / 10);

export function buildLearningContent(conceptId: HometownConceptId, overlay: OverlayGeometry, interpretation = ""): MathLearningContent {
  const count = Math.max(2, Math.round(overlay.spacing ?? 8));
  const angle = 360 / count;
  const base = {
    observation: interpretation || CONCEPT_BY_ID[conceptId].childExplanation,
    precision: "approximate" as const,
    reasoning: [] as string[],
    variables: [] as Array<{ symbol: string; meaning: string }>,
    applications: [] as string[],
    explorePrompt: "在照片附近寻找第二个相似例子，比较它们的数量、方向或间距。",
  };
  if (conceptId === "symmetry.rotational") return {
    ...base,
    measurementLabel: "近似重复方向",
    measurementValue: `${count} 重 · ${rounded(angle)}°`,
    measurementDetail: `照片中标出了 ${count} 个近似重复方向；自然物存在遮挡与生长误差，因此使用“近似”。`,
    formula: `θ ≈ 360° ÷ ${count} = ${rounded(angle)}°`,
    formulaMeaning: "把完整的一圈平均分给每个重复方向，就得到一次旋转的角度。",
    variables: [{ symbol: "n", meaning: `重复方向数，这张照片中取 n=${count}` }, { symbol: "θ", meaning: "相邻两个方向之间的旋转角" }],
    reasoning: ["先找到图案围绕的中心", `再数出约 ${count} 个重复方向`, `最后用 360°÷${count} 估算相邻方向的夹角`],
    whyItMatters: "均匀分布让形态从各个方向都保持平衡，也能在有限空间里安排更多结构。",
    applications: ["花瓣排列", "车轮设计", "建筑装饰", "传统纹样"],
    explorePrompt: "选两片相邻花瓣，从花心画线，测一测夹角是否接近计算结果。",
  };
  if (conceptId === "symmetry.axial") return {
    ...base,
    measurementLabel: "近似镜像中轴",
    measurementValue: "1 条对称轴",
    measurementDetail: "选择中轴两侧成对的轮廓点，比较它们到轴线的垂直距离。",
    formula: "d(P, l) ≈ d(P′, l)",
    formulaMeaning: "一对对应点 P 与 P′ 到对称轴 l 的距离近似相等。",
    variables: [{ symbol: "l", meaning: "照片中标出的对称轴" }, { symbol: "P、P′", meaning: "轴线两侧的一对对应位置" }, { symbol: "d", meaning: "点到轴线的垂直距离" }],
    reasoning: ["先沿主体的生长方向寻找中轴", "再在两边选择形状相似的位置", "比较两点到中轴的距离与方向"],
    whyItMatters: "轴对称带来视觉平衡，也常让结构受力和生长分布更均匀。",
    applications: ["叶片与昆虫", "门窗立面", "剪纸", "桥梁构件"],
    explorePrompt: "沿标出的轴线想象折叠照片，观察两侧哪些部分能重合、哪些只是近似。",
  };
  if (conceptId === "pattern.repetition") return {
    ...base,
    measurementLabel: "基本单元与间距",
    measurementValue: `${count} 个可见单元`,
    measurementDetail: "标注线连接重复方向，间隔 T 表示相邻基本单元之间的距离。",
    formula: "f(x + T) ≈ f(x)",
    formulaMeaning: "沿排列方向移动一个间距 T，看到的结构与原来的基本单元近似相同。",
    variables: [{ symbol: "T", meaning: "两个相邻重复单元的间距" }, { symbol: "f(x)", meaning: "位置 x 处观察到的形状或纹样" }],
    reasoning: ["圈出最小的重复单元", "确认它沿哪个方向继续出现", "比较相邻单元的间距是否接近"],
    whyItMatters: "重复规则能用少量方法生成大面积结构，便于制作、修补与传承。",
    applications: ["竹编", "砖瓦铺设", "布纹", "栏杆纹样"],
    explorePrompt: "用手指沿标注方向移动，找出最小的重复单元，并数一数它出现了几次。",
  };
  if (conceptId === "wave.periodicity") return {
    ...base,
    measurementLabel: "波峰间距",
    measurementValue: "波长 λ · 振幅 A",
    measurementDetail: "相邻波峰之间的距离是波长 λ，中线到波峰的高度是振幅 A。",
    formula: "y = A sin(2πx ÷ λ + φ)",
    formulaMeaning: "A 控制波有多高，λ 控制每次起伏相隔多远，φ 控制波从哪里开始。",
    variables: [{ symbol: "A", meaning: "中线到波峰的高度" }, { symbol: "λ", meaning: "相邻两个波峰的距离" }, { symbol: "φ", meaning: "波形的起始位置" }],
    reasoning: ["先找出连续的波峰和波谷", "画出穿过起伏中间的基准线", "比较相邻波峰的距离是否近似稳定"],
    whyItMatters: "周期帮助我们描述重复出现的节奏，从水纹、声音到季节变化都能用它研究。",
    applications: ["水面涟漪", "声音", "梯田轮廓", "音乐喷泉"],
    explorePrompt: "标出两个相邻波峰，测量它们的距离；再观察下一段是否保持相近。",
  };
  if (conceptId === "geometry.hexagon") return {
    ...base,
    measurementLabel: "六边形镶嵌",
    measurementValue: "6 边 · 内角约 120°",
    measurementDetail: "规则六边形的六条边等长，三个内角在一个顶点附近恰好围成一周。",
    formula: "3 × 120° = 360°",
    formulaMeaning: "三个规则六边形可以在一个顶点周围无缝相接。",
    variables: [{ symbol: "120°", meaning: "规则六边形的一个内角" }, { symbol: "360°", meaning: "围绕一个点的完整角度" }],
    reasoning: ["寻找一个六边形基本单元", "确认相邻单元是否共享边", "观察一个顶点周围能否由三个单元填满"],
    whyItMatters: "六边形能紧密铺满平面，并以较短边界围出较大空间。",
    applications: ["蜂巢", "龟甲纹", "网格结构", "地砖"],
    explorePrompt: "在标注中任选一个顶点，数一数有几个六边形在这里相遇。",
  };
  if (conceptId === "geometry.arch") return {
    ...base,
    measurementLabel: "拱顶与两侧支点",
    measurementValue: "跨度 L · 拱高 h",
    measurementDetail: "两端支点之间是跨度 L，支点连线到最高点的距离是拱高 h。",
    formula: "y ≈ a cosh(x ÷ a)",
    formulaMeaning: "悬链线模型描述均匀自重下自然形成的曲线；真实桥拱还需根据轮廓判断是否更接近圆弧或抛物线。",
    variables: [{ symbol: "x、y", meaning: "以拱中心为原点的水平与竖直位置" }, { symbol: "a", meaning: "控制拱形开阔程度的参数" }],
    reasoning: ["定位拱的两个支点", "找到拱顶最高点", "沿真实边缘比较不同曲线模型的贴合程度"],
    whyItMatters: "拱形把上方压力沿曲线传向两侧支点，使石块和砖块共同承重。",
    applications: ["石桥", "窑洞", "门券", "屋顶结构"],
    explorePrompt: "比较标注曲线和桥洞边缘：它更像圆弧、抛物线，还是悬链线？",
  };
  if (conceptId === "fractal.self_similarity") return {
    ...base,
    measurementLabel: "两级相似尺度",
    measurementValue: "尺度比 r",
    measurementDetail: "选择整体和局部的对应长度，计算它们的比值；只有多级保持相近才支持自相似判断。",
    formula: "Lₖ₊₁ ÷ Lₖ ≈ r",
    formulaMeaning: "相邻两级相似结构的长度比接近一个稳定值 r。",
    variables: [{ symbol: "Lₖ", meaning: "第 k 级枝条或轮廓的长度" }, { symbol: "r", meaning: "从一级缩放到下一级的尺度比" }],
    reasoning: ["先找出整体的主要轮廓", "再寻找形状相似的局部分支", "比较至少两级尺度比，避免只凭相似印象下结论"],
    whyItMatters: "重复使用相似的生长规则，可以用有限信息形成复杂而有层次的形态。",
    applications: ["蕨类分枝", "树冠", "河网", "山脊"],
    explorePrompt: "框出一段局部，再与整体比较：方向、分叉数和长宽比例有哪些相似？",
  };
  return {
    ...base,
    measurementLabel: "旋转生长参数",
    measurementValue: "序号 n · 发散角 α",
    measurementDetail: "依次标记结构出现的位置，比较相邻位置绕中心转过的角度是否稳定。",
    formula: "θₙ = nα，rₙ = c√n",
    formulaMeaning: "第 n 个结构旋转到角度 nα，并随 √n 向外移动；是否接近黄金角必须经过测量。",
    variables: [{ symbol: "n", meaning: "从中心向外的结构序号" }, { symbol: "α", meaning: "相邻结构的发散角" }, { symbol: "c", meaning: "控制整体疏密的尺度参数" }],
    reasoning: ["确定生长中心", "按出现顺序标记多个位置", "测量相邻位置的转角与半径变化"],
    whyItMatters: "稳定的发散角能减少遮挡，让种子或叶片更均匀地使用空间。",
    applications: ["向日葵花盘", "松果鳞片", "叶序", "贝壳螺旋"],
    explorePrompt: "从中心开始沿同一条螺旋数点，观察顺时针与逆时针方向各有多少条。",
  };
}
