"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MATH_OBSERVER_EVENT, MathObserverCue } from "./math-observer-events";

const WELCOME: MathObserverCue = {
  id: "observer-welcome",
  message: "我是小观。先别急着找答案，动一动，再看哪里发生了变化。",
  priority: 3,
  once: true,
};

const SECTION_CUES: Record<string, MathObserverCue> = {
  hall: { id: "observer-section-hall", message: "换一个观察角度，形状可能会先告诉你答案。", once: true },
  workshop: { id: "observer-section-workshop", message: "一次只改变一个条件，规律会更容易被看见。", once: true },
  garden: { id: "observer-section-garden", message: "看看谁在重复，谁在生长。", once: true },
  hometown: { id: "observer-section-hometown", message: "熟悉的地方，也可能藏着数学。", once: true },
};

const IDLE_CUES: Record<string, MathObserverCue> = {
  hall: { id: "observer-idle-hall", message: "可以试着转动视角，先找重复出现的部分。", once: true },
  workshop: { id: "observer-idle-workshop", message: "先动一小步，再停下来观察变化。", once: true },
  garden: { id: "observer-idle-garden", message: "选一个你最想靠近的数学生命体。", once: true },
  hometown: { id: "observer-idle-hometown", message: "从一张熟悉的照片开始，也很好。", once: true },
};

function activeSectionId() {
  const center = window.innerHeight / 2;
  return ["hall", "workshop", "garden", "hometown"]
    .map((id) => ({ id, element: document.getElementById(id) }))
    .filter((entry): entry is { id: string; element: HTMLElement } => !!entry.element)
    .map((entry) => {
      const bounds = entry.element.getBoundingClientRect();
      const distance = bounds.top <= center && bounds.bottom >= center ? 0 : Math.min(Math.abs(bounds.top - center), Math.abs(bounds.bottom - center));
      return { id: entry.id, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.id ?? "hall";
}

function preferredVoice() {
  const voices = window.speechSynthesis.getVoices();
  const chinese = voices.filter((voice) => /^zh([_-]|$)/i.test(voice.lang));
  const youthfulMale = /li[- ]?mu|yunxi|yunyang|yunjian|male|boy|男/i;
  return chinese.find((voice) => youthfulMale.test(voice.name)) ?? chinese[0] ?? voices.find((voice) => /^zh/i.test(voice.lang)) ?? null;
}

export function MathObserver() {
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState(WELCOME.message);
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const lastMessageRef = useRef(WELCOME.message);
  const lastSpokenAtRef = useRef(0);
  const spokenIdsRef = useRef(new Set<string>());

  const speak = useCallback((cue: MathObserverCue, force = false) => {
    lastMessageRef.current = cue.message;
    setLastMessage(cue.message);
    if (!unlockedRef.current || mutedRef.current || !("speechSynthesis" in window)) return;
    if (cue.once && spokenIdsRef.current.has(cue.id) && !force) return;
    const now = performance.now();
    const cooldown = cue.cooldownMs ?? 9000;
    if (!force && (speakingRef.current || ((cue.priority ?? 1) < 3 && now - lastSpokenAtRef.current < cooldown))) return;
    if (force || (cue.priority ?? 1) >= 3) window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cue.message);
    utterance.lang = "zh-CN";
    utterance.rate = 1.06;
    utterance.pitch = 1.14;
    utterance.volume = .82;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { speakingRef.current = true; setSpeaking(true); };
    const finish = () => { speakingRef.current = false; setSpeaking(false); };
    utterance.onend = finish;
    utterance.onerror = finish;
    spokenIdsRef.current.add(cue.id);
    lastSpokenAtRef.current = now;
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
    let preferenceTimer = 0;
    try {
      const storedMuted = localStorage.getItem("math-observer-muted") === "true";
      mutedRef.current = storedMuted;
      preferenceTimer = window.setTimeout(() => setMuted(storedMuted), 0);
    } catch { /* Preferences are optional when storage is unavailable. */ }

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      setReady(true);
      window.setTimeout(() => speak(WELCOME), 420);
    };
    window.addEventListener("pointerdown", unlock, { capture: true, once: true });
    window.addEventListener("keydown", unlock, { capture: true, once: true });
    return () => {
      window.clearTimeout(preferenceTimer);
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      window.speechSynthesis?.cancel();
    };
  }, [speak]);

  useEffect(() => {
    const handleCue = (event: Event) => speak((event as CustomEvent<MathObserverCue>).detail);
    window.addEventListener(MATH_OBSERVER_EVENT, handleCue);
    return () => window.removeEventListener(MATH_OBSERVER_EVENT, handleCue);
  }, [speak]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!unlockedRef.current) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible?.target.id && SECTION_CUES[visible.target.id]) speak(SECTION_CUES[visible.target.id]);
    }, { threshold: [.58] });
    ["hall", "workshop", "garden", "hometown"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [speak]);

  useEffect(() => {
    let idleTimer = 0;
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      if (!unlockedRef.current) return;
      idleTimer = window.setTimeout(() => {
        const cue = IDLE_CUES[activeSectionId()];
        if (cue) speak(cue);
      }, 26000);
    };
    ["pointerdown", "keydown", "wheel"].forEach((eventName) => window.addEventListener(eventName, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      window.clearTimeout(idleTimer);
      ["pointerdown", "keydown", "wheel"].forEach((eventName) => window.removeEventListener(eventName, resetIdle));
    };
  }, [speak]);

  const toggleMuted = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try { localStorage.setItem("math-observer-muted", String(next)); } catch { /* Preference remains in memory. */ }
    if (next) {
      window.speechSynthesis?.cancel();
      speakingRef.current = false;
      setSpeaking(false);
    } else {
      speak({ id: "observer-unmuted", message: "我在。需要时，我会提醒你。", priority: 3 }, true);
    }
  };

  const replay = () => speak({ id: "observer-replay", message: lastMessageRef.current, priority: 3 }, true);

  return (
    <aside className={`math-observer ${ready ? "is-ready" : ""} ${speaking ? "is-speaking" : ""} ${muted ? "is-muted" : ""}`} aria-label="数学观察员小观">
      <button className="math-observer-character" type="button" onClick={replay} aria-label="让数学观察员小观重复刚才的语音">
        <span className="math-observer-halo" aria-hidden="true" />
        <Image src="/math-observer-xiaoguan.png" alt="数学观察员小观" width={512} height={512} unoptimized />
      </button>
      <button className="math-observer-audio" type="button" onClick={toggleMuted} aria-label={muted ? "开启小观的语音" : "关闭小观的语音"}>{muted ? "🔇" : "🔊"}</button>
      <span className="math-observer-live" role="status" aria-live="polite">{speaking ? lastMessage : ""}</span>
    </aside>
  );
}
