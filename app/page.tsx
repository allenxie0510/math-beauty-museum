"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MathGardenWorld } from "./MathGarden3D";
import { NatureMuseumWorld } from "./NatureMuseum3D";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function Certificate({ name, setName, close }: { name: string; setName: (name: string) => void; close: () => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="数学之美发现者证书">
      <div className="certificate-modal">
        <button className="modal-close" onClick={close} aria-label="关闭证书">×</button>
        <div className="certificate-inner">
          <div className="certificate-orbit orbit-a" />
          <div className="certificate-orbit orbit-b" />
          <span className="certificate-symbol">φ</span>
          <Mark>THE LANGUAGE OF THE UNIVERSE</Mark>
          <p className="certificate-kicker">数学美学展 · 探索证明</p>
          <h2>数学之美<br />发现者证书</h2>
          <p>恭喜</p>
          <input value={name} onChange={(event) => setName(event.target.value)} aria-label="你的名字" placeholder="在这里写下你的名字" />
          <p>发现了数学隐藏在世界中的美。<br />完成了自然、建筑、声音与宇宙中的五项探索。</p>
          <div className="certificate-formulas"><span>φ</span><span>∞</span><span>△</span><span>∿</span><span>✦</span></div>
          <div className="certificate-domains"><span>✓ 黄金比例</span><span>✓ 分形森林</span><span>✓ 声音波纹</span><span>✓ 宇宙螺旋</span></div>
          <p className="certificate-explorer">MATH BEAUTY EXPLORER</p>
          <div className="certificate-footer"><span>MATH BEAUTY MUSEUM</span><span>{new Date().getFullYear()} · 数学探索编号 0518</span></div>
        </div>
        <button className="print-button" onClick={() => window.print()}>打印 / 保存证书 <span>↗</span></button>
      </div>
    </div>
  );
}

export default function Home() {
  const [certificateOpen, setCertificateOpen] = useState(false);
  const [name, setName] = useState("Allen");
  const [gardenProgress, setGardenProgress] = useState(0);
  const [unlockNotice, setUnlockNotice] = useState(false);
  const certificateUnlocked = useRef(false);

  const updateGardenProgress = useCallback((value: number) => {
    setGardenProgress(value);
    if (value >= 5 && !certificateUnlocked.current) {
      certificateUnlocked.current = true;
      setUnlockNotice(true);
    }
  }, []);

  const openCertificate = useCallback(() => {
    setUnlockNotice(false);
    setCertificateOpen(true);
  }, []);

  useEffect(() => {
    if (!unlockNotice) return;
    const timer = window.setTimeout(() => setUnlockNotice(false), 4200);
    return () => window.clearTimeout(timer);
  }, [unlockNotice]);

  return (
    <main className="immersive-main">
      <header className="site-header">
        <button className="brand" onClick={() => scrollToId("hall")}>
          <span className="brand-mark">φ</span>
          <span>数学美学展<small>Math Beauty Museum</small></span>
        </button>
        <nav aria-label="沉浸空间导航">
          <button onClick={() => scrollToId("hall")}>四展馆</button>
          <button onClick={() => scrollToId("garden")}>数学花园</button>
        </nav>
        <button
          className={"progress-button " + (gardenProgress >= 5 ? "certificate-ready" : "")}
          onClick={() => gardenProgress >= 5 ? openCertificate() : scrollToId("garden")}
          aria-label={gardenProgress >= 5 ? "领取已解锁的数学之美证书" : "查看探险家进度"}
        >
          <span>{gardenProgress >= 5 ? "🏆" : Math.min(gardenProgress, 5) + "/5"}</span>
          <i>{gardenProgress >= 5 ? "领取证书" : "探险家进度"}</i>
        </button>
      </header>

      <NatureMuseumWorld />
      <MathGardenWorld onProgress={updateGardenProgress} />

      {unlockNotice && (
        <div className="certificate-unlock-toast" role="status">
          <span>🏆</span>
          <p><b>证书已解锁</b>点击右上角奖杯领取</p>
          <button onClick={() => setUnlockNotice(false)} aria-label="关闭证书解锁通知">×</button>
        </div>
      )}
      {certificateOpen && <Certificate name={name} setName={setName} close={() => setCertificateOpen(false)} />}
    </main>
  );
}
