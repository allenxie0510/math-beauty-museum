"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { getAutoRenderProfile } from "./adaptive-rendering";
import { cueMathObserver, setMathObserverScene } from "./math-observer-events";

const LazyMathObserver = lazy(async () => {
  const observerModule = await import("./MathObserver");
  return { default: observerModule.MathObserver };
});

const LazyNatureMuseumWorld = lazy(async () => {
  const museumModule = await import("./NatureMuseum3D");
  return { default: museumModule.NatureMuseumWorld };
});

const LazyMathGardenWorld = lazy(async () => {
  const gardenModule = await import("./MathGarden3D");
  return { default: gardenModule.MathGardenWorld };
});

const LazyInteractiveWorkshop = lazy(async () => {
  const workshopModule = await import("./InteractiveWorkshop");
  return { default: workshopModule.InteractiveWorkshop };
});

const LazyHometownMathWorld = lazy(async () => {
  const hometownModule = await import("./HometownMathWorld");
  return { default: hometownModule.HometownMathWorld };
});

const LazyHometownTeacherStudio = lazy(async () => {
  const studioModule = await import("./HometownTeacherStudio");
  return { default: studioModule.HometownTeacherStudio };
});

function scrollToId(id: string, behavior: ScrollBehavior = "smooth") {
  const target = document.getElementById(id);
  if (!target) return;
  setMathObserverScene(id);
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY, behavior });
}

const PRIMARY_SECTION_IDS = ["hall", "workshop", "garden", "hometown"] as const;
const DETAIL_SURFACE_SELECTOR = '[aria-modal="true"], .garden-info-panel';

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

function HometownLoading() {
  return <section className="hometown-world hometown-loading" id="hometown" aria-busy="true"><div><i>⌁</i><span>正在打开家乡里的数学 · DISCOVERING HOMETOWN MATHEMATICS</span></div></section>;
}

function WorkshopLoading() {
  return <section className="workshop-world workshop-loading" id="workshop" aria-busy="true"><div><i>◎</i><span>正在打开互动工坊 · PREPARING THE WORKSHOP</span></div></section>;
}

function DeferredInteractiveWorkshop() {
  const trigger = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => {
    const section = trigger.current;
    if (shouldLoad || !section) return;
    if (!("IntersectionObserver" in window)) { const timer = window.setTimeout(() => setShouldLoad(true), 0); return () => window.clearTimeout(timer); }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShouldLoad(true); observer.disconnect(); } }, { rootMargin: "320px 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldLoad]);
  if (!shouldLoad) return <section ref={trigger} className="workshop-world workshop-loading" id="workshop" aria-busy="true"><div><i>◎</i><span>继续向下，互动工坊将在抵达前开启</span></div></section>;
  return <Suspense fallback={<WorkshopLoading />}><LazyInteractiveWorkshop /></Suspense>;
}

function DeferredHometownMath({ slug, previewManifest, onOpenStudio, onExploreDemo, onDetailChange }: { slug?: string | null; previewManifest?: import("./hometown-math/domain/types").HometownSceneManifest | null; onOpenStudio: () => void; onExploreDemo: (demoId: string, exhibitId: string) => void; onDetailChange: (open: boolean) => void }) {
  const trigger = useRef<HTMLElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => {
    const section = trigger.current;
    if (shouldLoad || !section) return;
    if (!("IntersectionObserver" in window)) { const timer = window.setTimeout(() => setShouldLoad(true), 0); return () => window.clearTimeout(timer); }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShouldLoad(true); observer.disconnect(); } }, { rootMargin: "320px 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [shouldLoad]);
  if (!shouldLoad) return <section ref={trigger} className="hometown-world hometown-loading" id="hometown" aria-busy="true"><div><i>⌁</i><span>继续向下，家乡数学馆将在抵达前开启</span></div></section>;
  return <Suspense fallback={<HometownLoading/>}><LazyHometownMathWorld slug={slug} previewManifest={previewManifest} onOpenStudio={onOpenStudio} onExploreDemo={onExploreDemo} onDetailChange={onDetailChange}/></Suspense>;
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
      <button className="dialog-outside-dismiss" onClick={close} aria-label="关闭证书" tabIndex={-1}/>
      <button className="modal-close" onClick={close} aria-label="关闭证书">×</button>
      <div className="certificate-modal">
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
  const [studioOpen, setStudioOpen] = useState(false);
  const [hometownSlug, setHometownSlug] = useState<string | null>(null);
  const [hometownPreview, setHometownPreview] = useState<import("./hometown-math/domain/types").HometownSceneManifest | null>(null);
  const hometownReturnExhibit = useRef<string | null>(null);
  const certificateUnlocked = useRef(false);

  useEffect(() => {
    const supportsBackdropFilter = CSS.supports("backdrop-filter", "blur(1px)") || CSS.supports("-webkit-backdrop-filter", "blur(1px)");
    const phoneLikeDevice = window.innerWidth < 900 && window.matchMedia("(pointer: coarse)").matches;
    const enablePremiumGlass = supportsBackdropFilter && (!phoneLikeDevice || !getAutoRenderProfile().lowDetail);
    document.body.classList.toggle("premium-nav-glass", enablePremiumGlass);
    return () => document.body.classList.remove("premium-nav-glass");
  }, []);

  useEffect(() => {
    const body = document.body;
    const root = document.documentElement;
    const initialBodyOverflow = body.style.overflow;
    const initialRootOverflow = root.style.overflow;
    const initialOverscroll = root.style.overscrollBehavior;
    const detailModeClasses = ["exhibit-mode", "garden-detail-mode", "workshop-detail-mode", "hometown-detail-mode"];
    let locked = false;
    let frame = 0;

    const synchronizeDetailState = () => {
      const detailOpen = Boolean(document.querySelector(DETAIL_SURFACE_SELECTOR));
      if (body.classList.contains("page-detail-open") !== detailOpen) body.classList.toggle("page-detail-open", detailOpen);
      if (!detailOpen) detailModeClasses.forEach((className) => { if (body.classList.contains(className)) body.classList.remove(className); });
      if (detailOpen === locked) return;
      locked = detailOpen;
      body.style.overflow = detailOpen ? "hidden" : initialBodyOverflow;
      root.style.overflow = detailOpen ? "hidden" : initialRootOverflow;
      root.style.overscrollBehavior = detailOpen ? "none" : initialOverscroll;
    };
    const scheduleSynchronization = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(synchronizeDetailState);
    };
    const observer = new MutationObserver(scheduleSynchronization);
    observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    synchronizeDetailState();
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      body.classList.remove("page-detail-open", ...detailModeClasses);
      body.style.overflow = initialBodyOverflow;
      root.style.overflow = initialRootOverflow;
      root.style.overscrollBehavior = initialOverscroll;
    };
  }, []);

  useEffect(() => {
    let accumulatedDelta = 0;
    let cooldownUntil = 0;
    let resetTimer = 0;
    const handlePrimaryWheel = (event: WheelEvent) => {
      if (event.ctrlKey || document.body.classList.contains("page-detail-open")) return;
      if (document.querySelector(DETAIL_SURFACE_SELECTOR)) { event.preventDefault(); event.stopPropagation(); return; }
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now < cooldownUntil) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = Math.max(-120, Math.min(120, event.deltaY * unit));
      if (Math.sign(delta) !== Math.sign(accumulatedDelta)) accumulatedDelta = 0;
      accumulatedDelta += delta;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { accumulatedDelta = 0; }, 180);
      if (Math.abs(accumulatedDelta) < 36) return;

      const sections = PRIMARY_SECTION_IDS.map((id) => document.getElementById(id)).filter((section): section is HTMLElement => Boolean(section));
      if (!sections.length) return;
      const currentIndex = sections.reduce((closest, section, index) => Math.abs(section.getBoundingClientRect().top) < Math.abs(sections[closest].getBoundingClientRect().top) ? index : closest, 0);
      const nextIndex = Math.max(0, Math.min(sections.length - 1, currentIndex + (accumulatedDelta > 0 ? 1 : -1)));
      accumulatedDelta = 0;
      if (nextIndex === currentIndex) return;
      cooldownUntil = now + 760;
      scrollToId(sections[nextIndex].id, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth");
    };
    window.addEventListener("wheel", handlePrimaryWheel, { passive: false, capture: true });
    return () => {
      window.clearTimeout(resetTimer);
      window.removeEventListener("wheel", handlePrimaryWheel, true);
    };
  }, []);

  const updateGardenProgress = useCallback((value: number) => {
    setGardenProgress(value);
    if (value === 1) cueMathObserver({ id: "observer-garden-first", message: "第一个发现。试着说出，是哪一种重复吸引了你。", once: true, priority: 2 });
    if (value >= 5) cueMathObserver({ id: "observer-garden-five", message: "五项发现完成了。你的证书已经亮起。", once: true, priority: 3 });
    if (value >= 5 && !certificateUnlocked.current) {
      certificateUnlocked.current = true;
      setUnlockNotice(true);
    }
  }, []);

  const openCertificate = useCallback(() => {
    setUnlockNotice(false);
    setMathObserverScene("certificate");
    setCertificateOpen(true);
  }, []);

  const closeCertificate = useCallback(() => {
    setCertificateOpen(false);
    setMathObserverScene("garden");
  }, []);

  useEffect(() => {
    if (!unlockNotice) return;
    const timer = window.setTimeout(() => setUnlockNotice(false), 4200);
    return () => window.clearTimeout(timer);
  }, [unlockNotice]);

  useEffect(() => {
    const body = document.body;
    const updateTheme = () => {
      const garden = document.getElementById("garden");
      const workshop = document.getElementById("workshop");
      const viewportCenter = window.innerHeight * 0.5;
      const containsCenter = (element: HTMLElement | null) => {
        if (!element) return false;
        const bounds = element.getBoundingClientRect();
        return bounds.top <= viewportCenter && bounds.bottom >= viewportCenter;
      };
      body.classList.toggle("garden-nav-theme", containsCenter(garden));
      body.classList.toggle("workshop-nav-theme", containsCenter(workshop));
    };
    updateTheme();
    window.addEventListener("scroll", updateTheme, { passive: true });
    window.addEventListener("resize", updateTheme, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateTheme);
      window.removeEventListener("resize", updateTheme);
      body.classList.remove("garden-nav-theme", "workshop-nav-theme");
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setHometownSlug(params.get("hometown"));
      if (params.get("studio") === "hometown") { setMathObserverScene("hometown-studio"); setStudioOpen(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const returnToHometown = () => {
      const exhibitId = hometownReturnExhibit.current;
      if (!exhibitId) return;
      hometownReturnExhibit.current = null;
      scrollToId("hometown");
      window.setTimeout(() => window.dispatchEvent(new CustomEvent("open-hometown-exhibit", { detail: { exhibitId } })), 520);
    };
    window.addEventListener("museum-demo-closed", returnToHometown);
    return () => window.removeEventListener("museum-demo-closed", returnToHometown);
  }, []);

  const previewHometown = useCallback((slug: string, manifest?: import("./hometown-math/domain/types").HometownSceneManifest) => {
    setHometownSlug(slug);
    setHometownPreview(manifest ?? null);
    setStudioOpen(false);
    setMathObserverScene("hometown");
    window.history.replaceState(null, "", `/?hometown=${encodeURIComponent(slug)}#hometown`);
    window.setTimeout(() => scrollToId("hometown"), 50);
  }, []);

  const exploreMuseumDemo = useCallback((demoId: string, exhibitId: string) => {
    hometownReturnExhibit.current = exhibitId;
    scrollToId("hall", "auto");
    window.requestAnimationFrame(() => {
      scrollToId("hall", "auto");
      window.dispatchEvent(new CustomEvent("open-museum-demo", { detail: { demoId } }));
    });
  }, []);

  return (
    <main className={`immersive-main ${certificateOpen ? "certificate-mode" : ""} ${studioOpen ? "studio-mode" : ""}`}>
      <header className="site-header">
        <button className="brand" onClick={() => scrollToId("hall")}>
          <span className="brand-mark">φ</span>
          <span>数学美学展<small>Math Beauty Museum</small></span>
        </button>
        <nav aria-label="沉浸空间导航">
          <button onClick={() => scrollToId("hall")}>四展馆</button>
          <button onClick={() => scrollToId("workshop")}>互动工坊</button>
          <button onClick={() => scrollToId("garden")}>数学花园</button>
          <button onClick={() => scrollToId("hometown")}>我的家乡数学馆</button>
        </nav>
        <button
          className={"progress-button " + (gardenProgress >= 5 ? "certificate-ready" : "")}
          style={{ "--progress-value": `${Math.min(gardenProgress, 5) / 5 * 100}%` } as React.CSSProperties}
          onClick={() => gardenProgress >= 5 ? openCertificate() : scrollToId("garden")}
          aria-label={gardenProgress >= 5 ? "领取已解锁的数学之美证书" : "查看探险家进度"}
        >
          <span>{gardenProgress >= 5 ? "🏆" : Math.min(gardenProgress, 5) + "/5"}</span>
          <i>{gardenProgress >= 5 ? "领取证书" : "探险家进度"}</i>
        </button>
      </header>

      <Suspense fallback={null}><LazyMathObserver /></Suspense>

      <Suspense fallback={<MuseumLoading />}><LazyNatureMuseumWorld /></Suspense>
      <DeferredInteractiveWorkshop />
      <DeferredMathGarden onProgress={updateGardenProgress} />
      <DeferredHometownMath slug={hometownSlug} previewManifest={hometownPreview} onOpenStudio={() => { setMathObserverScene("hometown-studio"); setStudioOpen(true); }} onExploreDemo={exploreMuseumDemo} onDetailChange={() => undefined}/>

      {unlockNotice && (
        <div className="certificate-unlock-toast" role="status">
          <span>🏆</span>
          <p><b>证书已解锁</b>点击右上角奖杯领取</p>
          <button onClick={() => setUnlockNotice(false)} aria-label="关闭证书解锁通知">×</button>
        </div>
      )}
      {certificateOpen && <Certificate name={name} setName={setName} close={closeCertificate} />}
      {studioOpen && <Suspense fallback={<div className="studio-loading" role="status">正在打开教师策展台…</div>}><LazyHometownTeacherStudio close={() => { setStudioOpen(false); setMathObserverScene("hometown"); }} preview={previewHometown}/></Suspense>}
    </main>
  );
}
