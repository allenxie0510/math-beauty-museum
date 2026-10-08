const researchRoot = "https://github.com/openai/math/blob/adc7f1241b42e322a6451854ab7e4b4c146bf78a";

export const triangularLatticeResearch = {
  familyId: "090",
  title: "Universal optimality of the triangular lattice",
  frontierTitle: "三角晶格的普适最优性",
  frontierSummary: "从规则点阵的比较，走向所有等密度的平面配置。",
  origin: "OpenAI math · 内部模型生成的研究手稿",
  classicalBackground: "晶格、平行四边形面积与高斯势是已有的数学工具；ab sinθ = 1 是本实验的单位密度约束。",
  experimentScope: "拖动滑块，比较部分晶格的高斯能量。读数来自有限半径求和，帮助理解问题，不能代替证明。",
  frontierScope: "手稿声称：比较范围可扩展到所有满足密度条件的局部有限平面配置，以及整类非负、关于距离平方完全单调的势。",
  version: "2026-09-23 手稿 · 2026-10-08 调研快照",
  paperUrl: `${researchRoot}/preprints/Universal-optimality-of-the-triangular-lattice-September-23-2026/paper.pdf`,
  scopeUrl: `${researchRoot}/lean/docs/090.md`,
  repositoryUrl: `${researchRoot}/README.md`,
  claim: "该版本手稿声称：在单位密度的局部有限平面配置中，三角晶格对所有非负、关于距离平方完全单调的势，最小化每粒子能量下极限。密度按以原点为中心、不断扩大的圆盘定义。",
  verification: "仓库的形式化范围页列出三角晶格能量最小性与高斯 Fourier 证书，并链接所选 Comparator 声明。本馆未独立审查证明，也未运行 Lean 或 Comparator；不能据此把整个家族标为已复核。",
} as const;
