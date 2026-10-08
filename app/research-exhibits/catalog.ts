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

export type ResearchRecord = {
  familyId: string; title: string; frontierTitle: string; version: string;
  classicalBackground: string; experimentScope: string; claim: string; verification: string;
  paperUrl: string; scopeUrl: string; comparatorUrl?: string;
};

export const mahlerResearch: ResearchRecord = {
  familyId: "087", title: "The symmetric Mahler conjecture and its equality cases",
  frontierTitle: "从二维对偶，走向所有维数的体积乘积",
  version: "2026-09-22 手稿 · 2026-10-08 调研快照",
  classicalBackground: "极对偶、二维对称凸体面积乘积下界 8，以及可逆线性变换下乘积不变，都是已有数学知识。",
  experimentScope: "这里操作的是二维对称 Lp 单位球与极对偶。面积为边界采样近似；二维画面不验证高维结论。",
  claim: "手稿声称：所有维数的原点对称凸体都满足 |K|·|K°| ≥ 4ⁿ/n!，并把等号情形刻画为 Hanner 凸体的可逆线性像。",
  verification: "范围页列出对称不等式与等号刻画。已核对所选 Comparator 的对称性、紧致性、凸性与非空内部条件；该文件含 sorry，是待比对的声明，不能当作完整证明。范围页对非对称结果的文字存在不一致，本展品只引用对称主张。本馆未运行 Lean 或独立审查证明。",
  paperUrl: `${researchRoot}/preprints/The-symmetric-Mahler-conjecture-and-its-equality-cases-September-22-2026/paper.pdf`,
  scopeUrl: `${researchRoot}/lean/docs/087.md`, comparatorUrl: `${researchRoot}/lean/ComparatorChallenges/MahlerConjecture.lean`,
};
export const standardMapResearch: ResearchRecord = {
  familyId: "146", title: "Positive Metric Entropy for the Standard Map at Large Parameters",
  frontierTitle: "从复杂轨迹，走向正测度熵",
  version: "2026-09-23 手稿 · 2026-10-08 调研快照",
  classicalBackground: "标准映射是经典的保面积动力系统。单位正方形的相对边连接成环面，每一步按模 1 返回。",
  experimentScope: "相图与双起点距离来自有限次迭代。不计算熵或 Lyapunov 指数；相图复杂程度不是正测度熵的证明。",
  claim: "手稿声称存在 k₀>0，使所有 k≥k₀ 的标准正弦映射相对于归一化面积具有正测度熵。它没有声称每条轨道都混沌或整个系统遍历。",
  verification: "已按该固定版本引言核对映射公式。范围页列出正测度熵及正面积双曲分量等声明；本馆未独立审查证明或运行 Lean。实验的 k 范围不代表理论阈值 k₀。",
  paperUrl: `${researchRoot}/preprints/Positive-Metric-Entropy-for-the-Standard-Map-at-Large-Parameters-September-23-2026/paper.pdf`, scopeUrl: `${researchRoot}/lean/docs/146.md`,
};
export const nodalResearch: ResearchRecord = {
  familyId: "350", title: "Sharp nodal length on smooth surfaces",
  frontierTitle: "闭曲面上的节点线长度上界",
  version: "2026-09-23 手稿 · 2026-10-08 调研快照",
  classicalBackground: "Laplace 特征函数与平坦环面上的 Fourier 模态是经典对象。同一特征值的模态可以线性组合。",
  experimentScope: "本实验在平坦环面 R²/Z² 上混合两个同频非零模态，用数值零等值线显示节点。线条粗细不表示节点长度。",
  claim: "手稿声称：对每个固定的光滑闭连通黎曼曲面，所有 λ>0 的非零实 Laplace 特征函数，其节点线长度不超过 C√λ；常数 C 依赖曲面。",
  verification: "范围页列出上述曲面上界，并另列高维反例。本展品不把结论推广到所有维数，也不使用有边界方板去验证闭曲面定理。本馆未独立审查证明或运行 Lean。",
  paperUrl: `${researchRoot}/preprints/Sharp-nodal-length-on-smooth-surfaces-September-23-2026/paper.pdf`, scopeUrl: `${researchRoot}/lean/docs/350.md`,
};
