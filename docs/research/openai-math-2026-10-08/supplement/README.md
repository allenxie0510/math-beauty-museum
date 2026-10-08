# P1 定点补查（2026-10-08）

继续使用原提交 `adc7f1241b42e322a6451854ab7e4b4c146bf78a`，没有把新版本研究替换进交接基线。补充文件按原样保存，来源和 SHA256 见 manifest.json；许可证沿用 ../evidence/openai-math/LICENSE。

- MahlerConjecture.lean：具体声明只涉及原点对称紧凸体、非空内部、n≥1，以及体积乘积下界4ⁿ/n!。文件含 `sorry`，作为 Comparator 的目标声明，不能据此认定完整证明已核验。087范围页的非对称段落不一致未被本次补查解决；本次展品仅引用对称主张。
- standard-map-introduction.tex：确认本文采用单位环面上的 k，先更新 y，再用新 y 更新 x。主张是存在阈值后所有足够大的 k 都有相对于归一化面积的正测度熵。没有把实验的参数范围或相图外观当作 k₀ 的确定。

本次未执行 Lean、Comparator 或独立证明审查。
