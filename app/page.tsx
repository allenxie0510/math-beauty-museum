"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";

const LazyNatureMuseumWorld = lazy(async () => {
  const museumModule = await import("./NatureMuseum3D");
  return { default: museumModule.NatureMuseumWorld };
});

const LazyMathGardenWorld = lazy(async () => {
  const gardenModule = await import("./MathGarden3D");
  return { default: gardenModule.MathGardenWorld };
});

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function MuseumLoading() {
  return (
    <section className="nature-museum nature-museum-gallery museum-loading" id="hall" aria-busy="true" aria-label="数学美学展厅正在开启" style={{ "--hall-accent": "#9fb4ff" } as React.CSSProperties}>
      <div className="nature-webgl-fallback" role="status"><i aria-hidden="true" /><span>正在开启沉浸式展馆 · ENTERING MATH BEAUTY MUSEUM</span></div>
      <div className="nature-museum-shade" aria-hidden="true" />
      <div className="nature-museum-title atrium-title">
        <span>THE LANGUAGE BEHIND BEAUTY · PROLOGUE</span>
        <h2>数学美学展</h2>
        <strong>MATH BEAUTY MUSEUM</strong>
        <p>展馆正在开启，公式背后的世界即将出现</p>
      </div>
    </section>
  );
}

function GardenLoading() {
  return (
    <section className="garden-world" id="garden" aria-busy="true" aria-label="数学探索花园正在准备">
      <div className="garden-webgl garden-webgl-loading"><div className="webgl-fallback">正在准备数学花园 · MATHEMATICAL GARDEN</div></div>
      <div className="garden-sky-title"><span>THE MATHEMATICAL GARDEN</span><h2>数学探索花园</h2><p>抵达这里时，3D 花园将自动开启</p></div>
    </section>
  );
}

function DeferredMathGarden({ onProgress }: { onProgress: (count: number) => void }) {
  const trigger = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const section = trigger.current;
    if (shouldLoad || !section) return;
    if (!("IntersectionObserver" in window)) {
      const timer = window.setTimeout(() => setShouldLoad(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setShouldLoad(true);
      observer.disconnect();
    }, { rootMargin: "240px 0px", threshold: 0 });
    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldLoad]);

  if (!shouldLoad) {
    return (
      <section className="garden-world" id="garden" ref={trigger} aria-busy="true" aria-label="数学探索花园尚未载入">
        <div className="garden-webgl garden-webgl-loading"><div className="webgl-fallback">向下探索，数学花园将在抵达前开启</div></div>
        <div className="garden-sky-title"><span>THE MATHEMATICAL GARDEN</span><h2>数学探索花园</h2><p>八件数学生命体正在等待被发现</p></div>
      </section>
    );
  }

  return <Suspense fallback={<GardenLoading />}><LazyMathGardenWorld onProgress={onProgress} /></Suspense>;
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

  useEffect(() => {
    const body = document.body;
    const setGardenTheme = (active: boolean) => body.classList.toggle("garden-nav-theme", active);
    const updateTheme = () => {
      const garden = document.getElementById("garden");
      if (!garden) return setGardenTheme(false);
      const bounds = garden.getBoundingClientRect();
      const viewportCenter = window.innerHeight * 0.5;
      setGardenTheme(bounds.top <= viewportCenter && bounds.bottom >= viewportCenter);
    };
    updateTheme();
    window.addEventListener("scroll", updateTheme, { passive: true });
    window.addEventListener("resize", updateTheme, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateTheme);
      window.removeEventListener("resize", updateTheme);
      body.classList.remove("garden-nav-theme");
    };
  }, []);

  return (
    <main className={`immersive-main ${certificateOpen ? "certificate-mode" : ""}`}>
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

      <Suspense fallback={<MuseumLoading />}><LazyNatureMuseumWorld /></Suspense>
      <DeferredMathGarden onProgress={updateGardenProgress} />

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
