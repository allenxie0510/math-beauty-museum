"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  MATH_OBSERVER_ACTION_EVENT,
  MATH_OBSERVER_EVENT,
  MathObserverAction,
  MathObserverCue,
  MathObserverParticipation,
} from "./math-observer-events";
import { MATH_OBSERVER_PROFILES, observerActionScore, observerShouldConsider } from "./math-observer-policy";

const WELCOME: MathObserverCue = {
  id: "observer-welcome",
  message: "我是小观。先别急着找答案，动一动，再看哪里发生了变化。",
  priority: 3,
  once: true,
};

const SECTION_CUES: Record<string, string> = {
  hall: "换一个观察角度，形状可能会先告诉你答案。",
  workshop: "一次只改变一个条件，规律会更容易被看见。",
  garden: "看看谁在重复，谁在生长。",
  hometown: "熟悉的地方，也可能藏着数学。",
};

const IDLE_CUES: Record<string, string> = {
  hall: "可以试着转动视角，先找重复出现的部分。",
  workshop: "先动一小步，再停下来观察变化。",
  garden: "选一个你最想靠近的数学生命体。",
  hometown: "从一张熟悉的照片开始，也很好。",
};

const PARTICIPATION_ORDER: MathObserverParticipation[] = ["quiet", "balanced", "active"];
const PARTICIPATION_LABEL: Record<MathObserverParticipation, string> = { quiet: "安静", balanced: "平衡", active: "积极" };
const PARTICIPATION_MARK: Record<MathObserverParticipation, string> = { quiet: "·", balanced: "··", active: "···" };
const MIN_COOLDOWN_SECONDS = 6;
const MAX_COOLDOWN_SECONDS = 60;

type ObserverDecision = { action?: "silent" | "speak"; cueId?: string; text?: string; priority?: number };

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

function cueToAction(cue: MathObserverCue): MathObserverAction {
  const priority = cue.priority ?? 1;
  return {
    id: cue.id,
    scene: activeSectionId(),
    action: "prepared_cue",
    outcome: priority === 3 ? "success" : "neutral",
    importance: priority === 3 ? .95 : priority === 2 ? .68 : .48,
    suggestedCue: cue.message,
    once: cue.once,
    context: { priority, cooldownMs: cue.cooldownMs ?? null },
    occurredAt: Date.now(),
  };
}

export function MathObserver() {
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState(WELCOME.message);
  const [participation, setParticipation] = useState<MathObserverParticipation>("balanced");
  const [cooldownSeconds, setCooldownSeconds] = useState(MATH_OBSERVER_PROFILES.balanced.cooldownMs / 1000);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const unlockedRef = useRef(false);
  const mutedRef = useRef(false);
  const speakingRef = useRef(false);
  const requestingSpeechRef = useRef(false);
  const participationRef = useRef<MathObserverParticipation>("balanced");
  const cooldownMsRef = useRef(MATH_OBSERVER_PROFILES.balanced.cooldownMs);
  const lastMessageRef = useRef(WELCOME.message);
  const lastSpokenAtRef = useRef(0);
  const lastInteractionAtRef = useRef(0);
  const activeInteractionRef = useRef(false);
  const sessionCueCountRef = useRef(0);
  const spokenIdsRef = useRef(new Set<string>());
  const recentMessagesRef = useRef<string[]>([]);
  const recentCueIdsRef = useRef<string[]>([]);
  const recentEventsRef = useRef<MathObserverAction[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef(new Map<string, string>());
  const decisionControllerRef = useRef<AbortController | null>(null);
  const timersRef = useRef(new Set<number>());
  const pendingActionRef = useRef<MathObserverAction | null>(null);
  const pendingActionTimerRef = useRef<number | null>(null);
  const considerActionRef = useRef<(action: MathObserverAction) => void>(() => undefined);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speakingRef.current = false;
    requestingSpeechRef.current = false;
    setSpeaking(false);
  }, []);

  const browserSpeech = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.volume = .86;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => { speakingRef.current = true; setSpeaking(true); };
    const finish = () => { speakingRef.current = false; setSpeaking(false); };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
    return true;
  }, []);

  const playSpeech = useCallback(async (text: string, force = false) => {
    if (!unlockedRef.current || mutedRef.current) return false;
    if (force) stopSpeech();
    if (requestingSpeechRef.current || speakingRef.current) return false;
    requestingSpeechRef.current = true;
    try {
      let objectUrl = audioUrlsRef.current.get(text);
      if (!objectUrl) {
        const response = await fetch("/api/observer/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!response.ok) throw new Error("qwen-tts-unavailable");
        objectUrl = URL.createObjectURL(await response.blob());
        audioUrlsRef.current.set(text, objectUrl);
      }
      const audio = new Audio(objectUrl);
      audio.volume = .9;
      audio.preload = "auto";
      audioRef.current = audio;
      audio.onplay = () => { speakingRef.current = true; setSpeaking(true); };
      const finish = () => {
        if (audioRef.current === audio) audioRef.current = null;
        speakingRef.current = false;
        setSpeaking(false);
      };
      audio.onended = finish;
      audio.onerror = finish;
      await audio.play();
      return true;
    } catch {
      return browserSpeech(text);
    } finally {
      requestingSpeechRef.current = false;
    }
  }, [browserSpeech, stopSpeech]);

  const deliverCue = useCallback(async (
    cue: MathObserverCue,
    force = false,
    options: { affectCooldown?: boolean; countSession?: boolean } = {},
  ) => {
    if (!unlockedRef.current || mutedRef.current) return false;
    if (cue.once && spokenIdsRef.current.has(cue.id) && !force) return false;
    const profile = MATH_OBSERVER_PROFILES[participationRef.current];
    const now = performance.now();
    const customCooldown = cue.cooldownMs ?? cooldownMsRef.current;
    if (!force && (speakingRef.current || requestingSpeechRef.current || now - lastSpokenAtRef.current < customCooldown)) return false;
    if (!force && sessionCueCountRef.current >= profile.maxSessionCues) return false;
    if (!force && recentMessagesRef.current.includes(cue.message)) return false;
    if (force || (cue.priority ?? 1) >= 3) stopSpeech();

    lastMessageRef.current = cue.message;
    setLastMessage(cue.message);
    const started = await playSpeech(cue.message, force);
    if (!started) return false;
    spokenIdsRef.current.add(cue.id);
    if (options.affectCooldown !== false) lastSpokenAtRef.current = performance.now();
    if (options.countSession !== false) sessionCueCountRef.current += 1;
    recentMessagesRef.current = [...recentMessagesRef.current.slice(-7), cue.message];
    recentCueIdsRef.current = [...recentCueIdsRef.current.slice(-11), cue.id];
    return true;
  }, [playSpeech, stopSpeech]);

  const queueAction = useCallback((action: MathObserverAction, waitMs: number) => {
    const current = pendingActionRef.current;
    const level = participationRef.current;
    if (!current || observerActionScore(action, level) >= observerActionScore(current, level)) pendingActionRef.current = action;
    if (pendingActionTimerRef.current !== null) {
      window.clearTimeout(pendingActionTimerRef.current);
      timersRef.current.delete(pendingActionTimerRef.current);
    }
    const timer = window.setTimeout(() => {
      timersRef.current.delete(timer);
      pendingActionTimerRef.current = null;
      const pending = pendingActionRef.current;
      pendingActionRef.current = null;
      if (pending) considerActionRef.current(pending);
    }, Math.max(250, waitMs));
    pendingActionTimerRef.current = timer;
    timersRef.current.add(timer);
  }, []);

  const considerAction = useCallback(async (action: MathObserverAction) => {
    action = { ...action, occurredAt: action.occurredAt ?? Date.now() };
    recentEventsRef.current = [...recentEventsRef.current.slice(-9), action];
    if (!unlockedRef.current || mutedRef.current) return;
    if (action.once && spokenIdsRef.current.has(action.id)) return;
    const level = participationRef.current;
    const profile = MATH_OBSERVER_PROFILES[level];
    const score = observerActionScore(action, level);
    if (!observerShouldConsider(action, level)) return;
    if (sessionCueCountRef.current >= profile.maxSessionCues) return;
    const now = performance.now();
    const cooldownRemaining = Math.max(0, cooldownMsRef.current - (now - lastSpokenAtRef.current));
    if (cooldownRemaining > 0) {
      queueAction(action, cooldownRemaining + 120);
      return;
    }
    if (activeInteractionRef.current || now - lastInteractionAtRef.current < 900 || speakingRef.current || requestingSpeechRef.current) {
      queueAction(action, 1050);
      return;
    }

    decisionControllerRef.current?.abort();
    const controller = new AbortController();
    decisionControllerRef.current = controller;
    try {
      const response = await fetch("/api/observer/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          participation: level,
          score,
          event: action,
          recentEvents: recentEventsRef.current,
          recentCueIds: recentCueIdsRef.current,
        }),
      });
      if (!response.ok) throw new Error("qwen-observer-unavailable");
      const decision = await response.json() as ObserverDecision;
      if (decision.action !== "speak" || !decision.text) return;
      await deliverCue({
        id: decision.cueId || action.id,
        message: decision.text,
        once: action.once,
        priority: (decision.priority ?? 0) >= .82 ? 3 : (decision.priority ?? 0) >= .62 ? 2 : 1,
      });
    } catch (error) {
      if ((error as Error).name === "AbortError" || !action.suggestedCue) return;
      await deliverCue({ id: action.id, message: action.suggestedCue, once: action.once, priority: score >= .86 ? 3 : 1 });
    }
  }, [deliverCue, queueAction]);
  considerActionRef.current = considerAction;

  useEffect(() => {
    let preferenceTimer = 0;
    try {
      const storedMuted = localStorage.getItem("math-observer-muted") === "true";
      const storedLevel = localStorage.getItem("math-observer-participation") as MathObserverParticipation | null;
      const nextLevel = PARTICIPATION_ORDER.includes(storedLevel as MathObserverParticipation) ? storedLevel as MathObserverParticipation : "balanced";
      const storedCooldown = Number(localStorage.getItem("math-observer-cooldown-seconds"));
      const nextCooldown = Number.isFinite(storedCooldown) && storedCooldown >= MIN_COOLDOWN_SECONDS && storedCooldown <= MAX_COOLDOWN_SECONDS
        ? storedCooldown
        : MATH_OBSERVER_PROFILES[nextLevel].cooldownMs / 1000;
      mutedRef.current = storedMuted;
      participationRef.current = nextLevel;
      cooldownMsRef.current = nextCooldown * 1000;
      preferenceTimer = window.setTimeout(() => { setMuted(storedMuted); setParticipation(nextLevel); setCooldownSeconds(nextCooldown); }, 0);
    } catch { /* Device preferences are optional. */ }

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      setReady(true);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        deliverCue(WELCOME, true, { affectCooldown: false, countSession: false });
      }, 420);
      timersRef.current.add(timer);
    };
    const interactionStart = () => { activeInteractionRef.current = true; lastInteractionAtRef.current = performance.now(); unlock(); };
    const interactionEnd = () => { activeInteractionRef.current = false; lastInteractionAtRef.current = performance.now(); };
    const activity = () => { lastInteractionAtRef.current = performance.now(); };
    window.addEventListener("pointerdown", interactionStart, { capture: true });
    window.addEventListener("pointerup", interactionEnd, { capture: true });
    window.addEventListener("pointercancel", interactionEnd, { capture: true });
    window.addEventListener("keydown", interactionStart, { capture: true });
    window.addEventListener("keyup", interactionEnd, { capture: true });
    window.addEventListener("wheel", activity, { passive: true });
    return () => {
      window.clearTimeout(preferenceTimer);
      window.removeEventListener("pointerdown", interactionStart, { capture: true });
      window.removeEventListener("pointerup", interactionEnd, { capture: true });
      window.removeEventListener("pointercancel", interactionEnd, { capture: true });
      window.removeEventListener("keydown", interactionStart, { capture: true });
      window.removeEventListener("keyup", interactionEnd, { capture: true });
      window.removeEventListener("wheel", activity);
      decisionControllerRef.current?.abort();
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
      pendingActionTimerRef.current = null;
      pendingActionRef.current = null;
      stopSpeech();
      audioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioUrlsRef.current.clear();
    };
  }, [deliverCue, stopSpeech]);

  useEffect(() => {
    const handleCue = (event: Event) => considerAction(cueToAction((event as CustomEvent<MathObserverCue>).detail));
    const handleAction = (event: Event) => considerAction((event as CustomEvent<MathObserverAction>).detail);
    window.addEventListener(MATH_OBSERVER_EVENT, handleCue);
    window.addEventListener(MATH_OBSERVER_ACTION_EVENT, handleAction);
    return () => {
      window.removeEventListener(MATH_OBSERVER_EVENT, handleCue);
      window.removeEventListener(MATH_OBSERVER_ACTION_EVENT, handleAction);
    };
  }, [considerAction]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!unlockedRef.current) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const section = visible?.target.id;
      if (!section || !SECTION_CUES[section]) return;
      considerAction({
        id: `observer-section-${section}`,
        scene: section,
        action: "section_entered",
        outcome: "neutral",
        importance: .52,
        suggestedCue: SECTION_CUES[section],
        once: true,
      });
    }, { threshold: [.58] });
    ["hall", "workshop", "garden", "hometown"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [considerAction]);

  useEffect(() => {
    let idleTimer = 0;
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      if (!unlockedRef.current) return;
      const idleMs = MATH_OBSERVER_PROFILES[participation].idleMs;
      idleTimer = window.setTimeout(() => {
        const section = activeSectionId();
        considerAction({
          id: `observer-idle-${section}`,
          scene: section,
          action: "user_idle",
          outcome: "idle",
          importance: .7,
          idleMs,
          suggestedCue: IDLE_CUES[section],
          once: true,
        });
      }, idleMs);
    };
    ["pointerdown", "keydown", "wheel"].forEach((eventName) => window.addEventListener(eventName, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      window.clearTimeout(idleTimer);
      ["pointerdown", "keydown", "wheel"].forEach((eventName) => window.removeEventListener(eventName, resetIdle));
    };
  }, [considerAction, participation]);

  const toggleMuted = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    try { localStorage.setItem("math-observer-muted", String(next)); } catch { /* Preference remains in memory. */ }
    if (next) stopSpeech();
    else deliverCue({ id: "observer-unmuted", message: "我在。需要时，我会提醒你。", priority: 3 }, true);
  };

  const selectParticipation = (next: MathObserverParticipation) => {
    participationRef.current = next;
    setParticipation(next);
    try { localStorage.setItem("math-observer-participation", next); } catch { /* Preference remains in memory. */ }
  };

  const changeCooldown = (seconds: number) => {
    const next = Math.max(MIN_COOLDOWN_SECONDS, Math.min(MAX_COOLDOWN_SECONDS, seconds));
    cooldownMsRef.current = next * 1000;
    setCooldownSeconds(next);
    try { localStorage.setItem("math-observer-cooldown-seconds", String(next)); } catch { /* Preference remains in memory. */ }
    if (pendingActionRef.current) queueAction(pendingActionRef.current, Math.max(250, next * 1000 - (performance.now() - lastSpokenAtRef.current) + 120));
  };

  const replay = () => deliverCue({ id: "observer-replay", message: lastMessageRef.current, priority: 3 }, true);

  return (
    <aside className={`math-observer ${ready ? "is-ready" : ""} ${speaking ? "is-speaking" : ""} ${muted ? "is-muted" : ""}`} aria-label="数学观察员小观">
      <button className="math-observer-character" type="button" onClick={replay} aria-label="让数学观察员小观重复刚才的语音">
        <span className="math-observer-halo" aria-hidden="true" />
        <Image src="/math-observer-xiaoguan.png" alt="数学观察员小观" width={512} height={512} unoptimized />
      </button>
      <div className="math-observer-preferences">
        <button className="math-observer-level" type="button" onClick={() => setSettingsOpen((open) => !open)} title={`参与度：${PARTICIPATION_LABEL[participation]} · 冷却 ${cooldownSeconds} 秒`} aria-label={`设置小观参与度与冷却时间，当前${PARTICIPATION_LABEL[participation]}，${cooldownSeconds}秒`} aria-expanded={settingsOpen} data-level={participation}>{PARTICIPATION_MARK[participation]}</button>
        {settingsOpen && <div className="math-observer-settings" role="group" aria-label="小观参与设置">
          <span>参与度</span>
          <div>{PARTICIPATION_ORDER.map((level) => <button key={level} type="button" className={participation === level ? "active" : ""} aria-pressed={participation === level} onClick={() => selectParticipation(level)}>{PARTICIPATION_LABEL[level]}</button>)}</div>
          <label><span>提示间隔 <b>{cooldownSeconds} 秒</b></span><input type="range" min={MIN_COOLDOWN_SECONDS} max={MAX_COOLDOWN_SECONDS} step="1" value={cooldownSeconds} onChange={(event) => changeCooldown(Number(event.target.value))} /></label>
        </div>}
      </div>
      <button className="math-observer-audio" type="button" onClick={toggleMuted} aria-label={muted ? "开启小观的语音" : "关闭小观的语音"}>{muted ? "🔇" : "🔊"}</button>
      <span className="math-observer-live" role="status" aria-live="polite">{speaking ? lastMessage : `小观参与度：${PARTICIPATION_LABEL[participation]}`}</span>
    </aside>
  );
}
