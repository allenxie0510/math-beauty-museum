import type { Metadata } from "next";
import "./about.css";

export const metadata: Metadata = {
  title: "关于数学美学馆 · Math Beauty Museum",
  description: "关于数学美学馆的起点、愿望与创造者。",
};

export default function AboutPage() {
  return (
    <main className="about-page">
      <div className="about-glow" aria-hidden="true" />
      <div className="about-orbit about-orbit-a" aria-hidden="true" />
      <div className="about-orbit about-orbit-b" aria-hidden="true" />

      <header className="about-header">
        <a className="about-brand" href="/" aria-label="返回数学美学展首页">
          <img src="/forma-animation-math-white.svg" width="512" height="512" alt="" />
          <span>数学美学展<small>Math Beauty Museum</small></span>
        </a>
        <a className="about-back" href="/"><span aria-hidden="true">←</span> 返回展馆</a>
      </header>

      <section className="about-layout">
        <article className="about-story">
          <p className="about-eyebrow">ABOUT · 共同创造的开始</p>
          <h1>关于<br /><em>数学美学馆</em></h1>
          <div className="about-story-copy">
            <p>《数学美学馆》这个项目最早因为11岁儿子对数学的兴趣开始，开发过程中，他也一直是我的“小产品经理”。我们一起把最初那个小小的念头做成了一个真正的产品。</p>
            <p>我希望孩子不是因为父母的压力而去学习数学，而是因为兴趣，因为热爱，因为感受到了数学的美与规律，主动去探究其中的奥秘。如果这个产品能点亮一些孩子对数学的兴趣，我内心就会很满足。</p>
            <p>我是一个设计师，也是一个 Vibe coder，如果你有任何关于 AI、教育相关的话题想与我讨论，欢迎与我直接交流～～</p>
          </div>
        </article>

        <aside className="about-contact" aria-label="微信联系方式">
          <div className="about-contact-heading">
            <span>WECHAT</span>
            <i aria-hidden="true">01</i>
          </div>
          <div className="about-qr-frame">
            <img src="/wechat-qr.jpg" width="653" height="644" alt="作者的微信二维码" />
          </div>
          <strong>扫码与我交流</strong>
          <p>AI · 设计 · 教育</p>
        </aside>
      </section>

      <footer className="about-footer">
        <span>看见公式背后的美</span>
        <span>MATHEMATICS · CURIOSITY · BEAUTY</span>
      </footer>
    </main>
  );
}
