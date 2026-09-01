"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Image from "next/image";
import {
  MATH_OBSERVER_ACTION_EVENT,
  MATH_OBSERVER_EVENT,
  MATH_OBSERVER_SCENE_EVENT,
  MathObserverAction,
  MathObserverCue,
  MathObserverParticipation,
  MathObserverScene,
} from "./math-observer-events";
import { MATH_OBSERVER_PROFILES, observerActionScore, observerShouldConsider } from "./math-observer-policy";

const WELCOME: MathObserverCue = {
  id: "observer-welcome",
  message: "我是小派。叫我小派，就能向我提问。先动一动，再看哪里发生了变化。",
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
  "workshop-paper": "先圈出一个小形状，再看看它展开后怎样重复。",
  "workshop-slice": "只改变光片的一个参数，看看截面轮廓怎样变化。",
  garden: "选一个你最想靠近的数学生命体。",
  hometown: "从一张熟悉的照片开始，也很好。",
};

const SCENE_REPLAY_CUES: Record<string, string> = {
  hall: "我正在看当前展厅。先动一个参数，再观察变化。",
  workshop: "我已经来到互动工坊。选一个游戏开始探索吧。",
  "workshop-paper": "我正在看剪纸。先改变一个条件，再观察重复。",
  "workshop-slice": "我正在看空间切片。先移动光片，再观察截面。",
  garden: "我正在看数学花园。选一个生命体，再改变一个参数。",
  hometown: "我正在看家乡数学馆。先从一张照片寻找规律。",
  "hometown-studio": "我正在看教师策展台。先完成当前展览的设置。",
  certificate: "我正在看探索证书。可以填写名字并保存。",
};

const PARTICIPATION_ORDER: MathObserverParticipation[] = ["quiet", "balanced", "active"];
const PARTICIPATION_LABEL: Record<MathObserverParticipation, string> = { quiet: "静音", balanced: "平衡", active: "积极" };
const MIN_COOLDOWN_SECONDS = 3;
const MAX_COOLDOWN_SECONDS = 30;
const VOICE_WAKE_PATTERN = /小\s*(?:π|派|拍|pai)/i;

type VoiceState = "idle" | "waking" | "listening" | "thinking" | "answering" | "error";
type BrowserSpeechRecognitionResult = { isFinal?: boolean; 0?: { transcript?: string } };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: { resultIndex: number; results: ArrayLike<BrowserSpeechRecognitionResult> }) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type BrowserAudioSession = { type: "auto" | "ambient" | "playback" | "play-and-record" | "transient" | "transient-solo" };

function setBrowserAudioSession(type: BrowserAudioSession["type"]) {
  const audioNavigator = navigator as Navigator & { audioSession?: BrowserAudioSession };
  try {
    if (audioNavigator.audioSession) audioNavigator.audioSession.type = type;
  } catch { /* Audio Session API is optional and varies between Safari versions. */ }
}

function speechRecognitionConstructor() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function recorderMimeType() {
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function voiceStateLabel(state: VoiceState, enabled: boolean) {
  if (!enabled) return "语音问答已关闭";
  if (state === "waking") return "小π：我在";
  if (state === "listening") return "小π正在听";
  if (state === "thinking") return "小π正在思考";
  if (state === "answering") return "小π正在回答";
  if (state === "error") return "语音暂不可用";
  return "等待“小派”唤醒";
}

function ParticipationIcon({ level, thinking = false }: { level: MathObserverParticipation; thinking?: boolean }) {
  if (level === "quiet") {
    return <svg className="math-observer-level-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 9.5v5h3.4l4.6 3.8V5.7L7.4 9.5H4Z" fill="currentColor" />
      <path d="m15.5 8 5 8m0-8-5 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>;
  }

  return <span className="math-observer-level-dots" aria-hidden="true">
    {Array.from({ length: thinking ? 3 : level === "balanced" ? 1 : 2 }, (_, index) => <i key={index} />)}
  </span>;
}

type ObserverDecision = { action?: "silent" | "speak"; cueId?: string; text?: string; priority?: number };
type ObserverPosition = { left: number; top: number };

function clampObserverPosition(left: number, top: number, width: number, height: number): ObserverPosition {
  const margin = 8;
  return {
    left: Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin)),
    top: Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin)),
  };
}

function normalizeScene(scene: string) {
  return scene === "space-slice" ? "workshop-slice" : scene;
}

function sceneKey(scene: MathObserverScene) {
  const context = Object.entries(scene.context ?? {}).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([normalizeScene(scene.scene), context]);
}

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
  const [speaking, setSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState(WELCOME.message);
  const [participation, setParticipation] = useState<MathObserverParticipation>("balanced");
  const [cooldownSeconds, setCooldownSeconds] = useState(MATH_OBSERVER_PROFILES.balanced.cooldownMs / 1000);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [observerPosition, setObserverPosition] = useState<ObserverPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceEpoch, setVoiceEpoch] = useState(0);
  const observerRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; left: number; top: number; width: number; height: number; moved: boolean } | null>(null);
  const suppressReplayRef = useRef(false);
  const unlockedRef = useRef(false);
  const speakingRef = useRef(false);
  const requestingSpeechRef = useRef(false);
  const participationRef = useRef<MathObserverParticipation>("balanced");
  const cooldownMsRef = useRef(MATH_OBSERVER_PROFILES.balanced.cooldownMs);
  const lastMessageRef = useRef(WELCOME.message);
  const lastSpokenAtRef = useRef(0);
  const lastInteractionAtRef = useRef(0);
  const activeInteractionRef = useRef(false);
  const spokenIdsRef = useRef(new Set<string>());
  const recentMessagesRef = useRef<string[]>([]);
  const recentCueIdsRef = useRef<string[]>([]);
  const recentEventsRef = useRef<MathObserverAction[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioUrlsRef = useRef(new Map<string, string>());
  const decisionControllerRef = useRef<AbortController | null>(null);
  const speechControllerRef = useRef<AbortController | null>(null);
  const speechRunRef = useRef(0);
  const voiceEnabledRef = useRef(false);
  const voiceBusyRef = useRef(false);
  const voiceSessionRef = useRef(0);
  const voiceRequestControllerRef = useRef<AbortController | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const wakeRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const beginVoiceSessionRef = useRef<() => void>(() => undefined);
  const enableVoiceRef = useRef<(askNow?: boolean) => void>(() => undefined);
  const voiceEnablingRef = useRef(false);
  const pendingVoiceQuestionRef = useRef(false);
  const voiceRetryAtRef = useRef(0);
  const voiceRecoveryAttemptsRef = useRef(0);
  const wakeRecognitionBlockedRef = useRef(false);
  const activeSceneRef = useRef("hall");
  const activeSceneContextRef = useRef<Record<string, string | number | boolean | null>>({});
  const activeSceneKeyRef = useRef(sceneKey({ scene: "hall" }));
  const sceneVersionRef = useRef(0);
  const timersRef = useRef(new Set<number>());
  const pendingActionRef = useRef<MathObserverAction | null>(null);
  const pendingActionTimerRef = useRef<number | null>(null);
  const considerActionRef = useRef<(action: MathObserverAction) => void>(() => undefined);

  const stopSpeech = useCallback(() => {
    speechRunRef.current += 1;
    speechControllerRef.current?.abort();
    speechControllerRef.current = null;
    window.speechSynthesis?.cancel();
    if (utteranceRef.current) {
      utteranceRef.current.onstart = null;
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.onplaying = null;
      audio.onended = null;
      audio.onerror = null;
      audio.onstalled = null;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute("src");
      audio.load();
    }
    speakingRef.current = false;
    requestingSpeechRef.current = false;
    setSpeaking(false);
  }, []);

  const browserSpeech = useCallback((text: string, runId: number, sceneVersion: number) => {
    if (!("speechSynthesis" in window)) return Promise.resolve(false);
    if (runId !== speechRunRef.current || sceneVersion !== sceneVersionRef.current) return Promise.resolve(false);
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utteranceRef.current = utterance;
    utterance.lang = "zh-CN";
    utterance.rate = 1.02;
    utterance.pitch = 1;
    utterance.volume = .86;
    const voice = preferredVoice();
    if (voice) utterance.voice = voice;
    const isCurrent = () => utteranceRef.current === utterance && runId === speechRunRef.current && sceneVersion === sceneVersionRef.current;
    return new Promise<boolean>((resolve) => {
      let started = false;
      let settled = false;
      const settle = (value: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startTimer);
        resolve(value);
      };
      utterance.onstart = () => {
        if (!isCurrent()) return;
        started = true;
        speakingRef.current = true;
        setSpeaking(true);
        settle(true);
      };
      const finish = () => {
        if (!isCurrent()) return;
        utteranceRef.current = null;
        speakingRef.current = false;
        setSpeaking(false);
        if (!started) settle(false);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      const startTimer = window.setTimeout(() => {
        if (!started && isCurrent()) {
          window.speechSynthesis.cancel();
          finish();
        }
        settle(false);
      }, 1800);
      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const playSpeech = useCallback(async (text: string, force = false, sceneVersion = sceneVersionRef.current) => {
    if (!unlockedRef.current || participationRef.current === "quiet") return false;
    if (force) stopSpeech();
    if (requestingSpeechRef.current || speakingRef.current) return false;
    const runId = ++speechRunRef.current;
    const controller = new AbortController();
    speechControllerRef.current = controller;
    requestingSpeechRef.current = true;
    try {
      let objectUrl = audioUrlsRef.current.get(text);
      if (!objectUrl) {
        const response = await fetch("/api/observer/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("qwen-tts-unavailable");
        const blob = await response.blob();
        if (controller.signal.aborted || runId !== speechRunRef.current || sceneVersion !== sceneVersionRef.current) return false;
        objectUrl = URL.createObjectURL(blob);
        audioUrlsRef.current.set(text, objectUrl);
      }
      if (controller.signal.aborted || runId !== speechRunRef.current || sceneVersion !== sceneVersionRef.current) return false;
      const audio = audioRef.current;
      if (!audio) throw new Error("observer-audio-not-ready");
      const isCurrent = () => audioRef.current === audio && runId === speechRunRef.current && sceneVersion === sceneVersionRef.current;
      let started = false;
      const finish = () => {
        if (!isCurrent()) return;
        speakingRef.current = false;
        setSpeaking(false);
      };
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const settle = (error?: unknown) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(startTimer);
          controller.signal.removeEventListener("abort", handleAbort);
          if (error) reject(error);
          else resolve();
        };
        const handleAbort = () => settle(new DOMException("Speech playback aborted", "AbortError"));
        audio.onplaying = () => {
          if (!isCurrent()) return;
          started = true;
          speakingRef.current = true;
          setSpeaking(true);
          settle();
        };
        audio.onended = () => {
          if (!started) settle(new Error("observer-audio-ended-before-playing"));
          finish();
        };
        audio.onerror = () => {
          const mediaCode = audio.error?.code ?? 0;
          settle(new Error(`observer-audio-error-${mediaCode}`));
          finish();
        };
        audio.onstalled = () => console.warn("[MathObserver] speech audio stalled", { readyState: audio.readyState, networkState: audio.networkState });
        const startTimer = window.setTimeout(() => settle(new Error("observer-audio-start-timeout")), 3000);
        controller.signal.addEventListener("abort", handleAbort, { once: true });
        audio.src = objectUrl;
        audio.load();
        void audio.play().catch(settle);
      });
      return true;
    } catch (error) {
      if (controller.signal.aborted || (error as Error).name === "AbortError" || runId !== speechRunRef.current || sceneVersion !== sceneVersionRef.current) return false;
      const failedAudio = audioRef.current;
      if (failedAudio) {
        failedAudio.onplaying = null;
        failedAudio.onended = null;
        failedAudio.onerror = null;
        failedAudio.onstalled = null;
        failedAudio.pause();
        failedAudio.removeAttribute("src");
        failedAudio.load();
      }
      speakingRef.current = false;
      setSpeaking(false);
      console.warn("[MathObserver] speech audio playback failed; using browser voice", {
        name: (error as Error).name,
        message: (error as Error).message,
        userAgent: navigator.userAgent,
      });
      return await browserSpeech(text, runId, sceneVersion);
    } finally {
      if (speechControllerRef.current === controller) speechControllerRef.current = null;
      if (runId === speechRunRef.current) requestingSpeechRef.current = false;
    }
  }, [browserSpeech, stopSpeech]);

  const stopWakeRecognition = useCallback(() => {
    const recognition = wakeRecognitionRef.current;
    wakeRecognitionRef.current = null;
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try { recognition.abort(); } catch { /* Recognition may already be stopped. */ }
  }, []);

  const releaseVoiceStream = useCallback(() => {
    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    stream?.getTracks().forEach((track) => track.stop());
    setBrowserAudioSession("playback");
  }, []);

  const ensureVoiceStream = useCallback(async () => {
    const current = mediaStreamRef.current;
    if (current?.active && current.getAudioTracks().some((track) => track.readyState === "live")) return current;
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) throw new Error("voice-input-unsupported");
    setBrowserAudioSession("play-and-record");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch (error) {
      setBrowserAudioSession("playback");
      throw error;
    }
    mediaStreamRef.current = stream;
    stream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
      if (mediaStreamRef.current !== stream || participationRef.current === "quiet") return;
      mediaStreamRef.current = null;
      voiceEnabledRef.current = false;
      voiceRetryAtRef.current = Date.now() + 1200;
      setVoiceEnabled(false);
      setVoiceState("error");
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        if (participationRef.current !== "quiet" && Date.now() >= voiceRetryAtRef.current) enableVoiceRef.current();
      }, 1400);
      timersRef.current.add(timer);
    }, { once: true }));
    return stream;
  }, []);

  const waitForSpeechToFinish = useCallback(async (session: number, sceneVersion: number) => {
    const startedAt = performance.now();
    while (session === voiceSessionRef.current && sceneVersion === sceneVersionRef.current) {
      if (!speakingRef.current && !requestingSpeechRef.current) return true;
      if (performance.now() - startedAt > 20000) return false;
      await new Promise((resolve) => window.setTimeout(resolve, 80));
    }
    return false;
  }, []);

  const recordQuestion = useCallback(async (session: number, followup: boolean) => {
    const stream = await ensureVoiceStream();
    if (session !== voiceSessionRef.current) {
      releaseVoiceStream();
      return null;
    }
    setVoiceState("listening");
    return await new Promise<Blob | null>((resolve) => {
      const mimeType = recorderMimeType();
      let recorder: MediaRecorder;
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      } catch (error) {
        releaseVoiceStream();
        throw error;
      }
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];
      const startedAt = performance.now();
      const noSpeechLimit = followup ? 5200 : 8500;
      const maximumLength = followup ? 10000 : 12000;
      let heardSpeech = false;
      let lastSpeechAt = startedAt;
      let frame = 0;
      let audioContext: AudioContext | null = null;
      let analyser: AnalyserNode | null = null;
      let samples: Uint8Array<ArrayBuffer> | null = null;

      try {
        audioContext = new AudioContext();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = .45;
        audioContext.createMediaStreamSource(stream).connect(analyser);
        samples = new Uint8Array(analyser.fftSize);
      } catch {
        heardSpeech = true;
      }

      const stop = () => {
        if (recorder.state !== "inactive") recorder.stop();
      };
      const watch = () => {
        if (recorder.state === "inactive") return;
        const now = performance.now();
        if (analyser && samples) {
          analyser.getByteTimeDomainData(samples);
          let energy = 0;
          for (const sample of samples) {
            const amplitude = (sample - 128) / 128;
            energy += amplitude * amplitude;
          }
          const rms = Math.sqrt(energy / samples.length);
          if (rms > .022) {
            heardSpeech = true;
            lastSpeechAt = now;
          }
        }
        if ((heardSpeech && now - lastSpeechAt > 700 && now - startedAt > 650)
          || (!heardSpeech && now - startedAt > noSpeechLimit)
          || now - startedAt > maximumLength
          || session !== voiceSessionRef.current) {
          stop();
          return;
        }
        frame = window.requestAnimationFrame(watch);
      };

      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = stop;
      recorder.onstop = () => {
        window.cancelAnimationFrame(frame);
        if (mediaRecorderRef.current === recorder) mediaRecorderRef.current = null;
        void audioContext?.close();
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        releaseVoiceStream();
        resolve(session === voiceSessionRef.current && heardSpeech && blob.size > 200 ? blob : null);
      };
      recorder.start(160);
      frame = window.requestAnimationFrame(watch);
    });
  }, [ensureVoiceStream, releaseVoiceStream]);

  const runVoiceConversation = useCallback(async (session: number) => {
    const sceneVersion = sceneVersionRef.current;
    voiceBusyRef.current = true;
    stopWakeRecognition();
    stopSpeech();
    decisionControllerRef.current?.abort();
    voiceRequestControllerRef.current?.abort();
    setVoiceState("waking");
    lastMessageRef.current = "我在";
    setLastMessage("我在");
    const acknowledged = await playSpeech("我在", true, sceneVersion);
    if (!acknowledged || !await waitForSpeechToFinish(session, sceneVersion)) return;

    for (let round = 0; round < 2 && session === voiceSessionRef.current && sceneVersion === sceneVersionRef.current; round += 1) {
      const audio = await recordQuestion(session, round > 0).catch(() => null);
      if (!audio || session !== voiceSessionRef.current || sceneVersion !== sceneVersionRef.current) break;
      setVoiceState("thinking");
      const controller = new AbortController();
      voiceRequestControllerRef.current = controller;
      try {
        const form = new FormData();
        form.append("audio", audio, `xiaopi-question.${audio.type.includes("mp4") ? "m4a" : "webm"}`);
        const listenResponse = await fetch("/api/observer/listen", { method: "POST", body: form, signal: controller.signal });
        if (!listenResponse.ok) throw new Error("observer-asr-unavailable");
        const { transcript } = await listenResponse.json() as { transcript?: string };
        if (!transcript?.trim()) throw new Error("observer-empty-transcript");
        const answerResponse = await fetch("/api/observer/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            question: transcript,
            currentScene: { scene: activeSceneRef.current, context: activeSceneContextRef.current },
            recentEvents: recentEventsRef.current,
          }),
        });
        if (!answerResponse.ok) throw new Error("observer-answer-unavailable");
        const { answer } = await answerResponse.json() as { answer?: string };
        if (!answer?.trim() || session !== voiceSessionRef.current || sceneVersion !== sceneVersionRef.current) break;
        lastMessageRef.current = answer;
        setLastMessage(answer);
        setVoiceState("answering");
        const started = await playSpeech(answer, true, sceneVersion);
        if (!started || !await waitForSpeechToFinish(session, sceneVersion)) break;
      } catch (error) {
        if ((error as Error).name === "AbortError" || session !== voiceSessionRef.current || sceneVersion !== sceneVersionRef.current) break;
        const fallback = "刚才没听清，请再叫我小派。";
        lastMessageRef.current = fallback;
        setLastMessage(fallback);
        setVoiceState("answering");
        await playSpeech(fallback, true, sceneVersion);
        await waitForSpeechToFinish(session, sceneVersion);
        break;
      } finally {
        if (voiceRequestControllerRef.current === controller) voiceRequestControllerRef.current = null;
      }
    }

    if (session === voiceSessionRef.current) {
      voiceBusyRef.current = false;
      setVoiceState("idle");
    }
  }, [playSpeech, recordQuestion, stopSpeech, stopWakeRecognition, waitForSpeechToFinish]);

  const beginVoiceSession = useCallback(() => {
    if (!voiceEnabledRef.current || participationRef.current === "quiet" || voiceBusyRef.current) return;
    const session = ++voiceSessionRef.current;
    void runVoiceConversation(session).finally(() => {
      if (session === voiceSessionRef.current) {
        voiceBusyRef.current = false;
        setVoiceState("idle");
      }
    });
  }, [runVoiceConversation]);
  useEffect(() => { beginVoiceSessionRef.current = beginVoiceSession; }, [beginVoiceSession]);

  const cancelVoiceSession = useCallback((disable = false) => {
    voiceSessionRef.current += 1;
    voiceBusyRef.current = false;
    voiceRequestControllerRef.current?.abort();
    voiceRequestControllerRef.current = null;
    stopWakeRecognition();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    mediaRecorderRef.current = null;
    stopSpeech();
    setVoiceState("idle");
    setVoiceEpoch((value) => value + 1);
    releaseVoiceStream();
    if (disable) {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
    }
  }, [releaseVoiceStream, stopSpeech, stopWakeRecognition]);

  const deliverCue = useCallback(async (
    cue: MathObserverCue,
    force = false,
    options: { affectCooldown?: boolean } = {},
  ) => {
    if (!unlockedRef.current || participationRef.current === "quiet" || voiceBusyRef.current) return false;
    if (cue.once && spokenIdsRef.current.has(cue.id) && !force) return false;
    const now = performance.now();
    const customCooldown = cue.cooldownMs ?? cooldownMsRef.current;
    if (!force && (speakingRef.current || requestingSpeechRef.current || now - lastSpokenAtRef.current < customCooldown)) return false;
    if (!force && recentMessagesRef.current.includes(cue.message)) return false;
    if (force || (cue.priority ?? 1) >= 3) stopSpeech();

    lastMessageRef.current = cue.message;
    setLastMessage(cue.message);
    const sceneVersion = sceneVersionRef.current;
    const started = await playSpeech(cue.message, force, sceneVersion);
    if (!started) return false;
    if (sceneVersion !== sceneVersionRef.current) return false;
    spokenIdsRef.current.add(cue.id);
    if (options.affectCooldown !== false) lastSpokenAtRef.current = performance.now();
    recentMessagesRef.current = [...recentMessagesRef.current.slice(-7), cue.message];
    recentCueIdsRef.current = [...recentCueIdsRef.current.slice(-11), cue.id];
    return true;
  }, [playSpeech, stopSpeech]);

  const transitionScene = useCallback((nextScene: MathObserverScene) => {
    const normalized = normalizeScene(nextScene.scene);
    const next = { ...nextScene, scene: normalized };
    const nextKey = sceneKey(next);
    if (activeSceneKeyRef.current === nextKey) return;
    activeSceneRef.current = normalized;
    activeSceneContextRef.current = { ...(next.context ?? {}) };
    activeSceneKeyRef.current = nextKey;
    sceneVersionRef.current += 1;
    decisionControllerRef.current?.abort();
    decisionControllerRef.current = null;
    if (pendingActionTimerRef.current !== null) {
      window.clearTimeout(pendingActionTimerRef.current);
      timersRef.current.delete(pendingActionTimerRef.current);
      pendingActionTimerRef.current = null;
    }
    pendingActionRef.current = null;
    recentEventsRef.current = [];
    recentCueIdsRef.current = [];
    recentMessagesRef.current = [];
    lastInteractionAtRef.current = performance.now();
    cancelVoiceSession();
    const replayCue = SCENE_REPLAY_CUES[normalized] ?? "我已经跟到当前场景。先动一动，再观察变化。";
    lastMessageRef.current = replayCue;
    setLastMessage(replayCue);
  }, [cancelVoiceSession]);

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
    const actionScene = normalizeScene(action.scene);
    if (actionScene !== activeSceneRef.current) return;
    if (!unlockedRef.current || participationRef.current === "quiet" || voiceBusyRef.current) return;
    const sceneVersion = sceneVersionRef.current;
    action = {
      ...action,
      scene: actionScene,
      context: { ...activeSceneContextRef.current, ...(action.context ?? {}) },
      occurredAt: action.occurredAt ?? Date.now(),
    };
    recentEventsRef.current = [...recentEventsRef.current.slice(-9), action];
    if (action.once && spokenIdsRef.current.has(action.id)) return;
    const level = participationRef.current;
    const score = observerActionScore(action, level);
    const immediate = action.action === "paper_pattern_revealed";
    if (!immediate && !observerShouldConsider(action, level)) return;
    const now = performance.now();
    const cooldownRemaining = Math.max(0, cooldownMsRef.current - (now - lastSpokenAtRef.current));
    if (!immediate && cooldownRemaining > 0) {
      queueAction(action, cooldownRemaining + 120);
      return;
    }
    if (!immediate && (activeInteractionRef.current || now - lastInteractionAtRef.current < 900 || speakingRef.current || requestingSpeechRef.current)) {
      queueAction(action, 1050);
      return;
    }
    if (immediate) stopSpeech();

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
          currentScene: { scene: activeSceneRef.current, context: activeSceneContextRef.current },
          event: action,
          recentEvents: recentEventsRef.current,
          recentCueIds: recentCueIdsRef.current,
        }),
      });
      if (!response.ok) throw new Error("qwen-observer-unavailable");
      const decision = await response.json() as ObserverDecision;
      if (participationRef.current !== level || sceneVersion !== sceneVersionRef.current || actionScene !== activeSceneRef.current) return;
      if (decision.action !== "speak" || !decision.text) return;
      await deliverCue({
        id: decision.cueId || action.id,
        message: decision.text,
        once: action.once,
        priority: (decision.priority ?? 0) >= .82 ? 3 : (decision.priority ?? 0) >= .62 ? 2 : 1,
      }, immediate);
    } catch (error) {
      if ((error as Error).name === "AbortError" || sceneVersion !== sceneVersionRef.current || actionScene !== activeSceneRef.current || !action.suggestedCue) return;
      await deliverCue({ id: action.id, message: action.suggestedCue, once: action.once, priority: score >= .86 ? 3 : 1 }, immediate);
    }
  }, [deliverCue, queueAction, stopSpeech]);
  useEffect(() => { considerActionRef.current = considerAction; }, [considerAction]);

  useEffect(() => {
    const timers = timersRef.current;
    const audioUrls = audioUrlsRef.current;
    let preferenceTimer = 0;
    try {
      const legacyMuted = localStorage.getItem("math-observer-muted") === "true";
      const storedLevel = localStorage.getItem("math-observer-participation") as MathObserverParticipation | null;
      const nextLevel = legacyMuted
        ? "quiet"
        : PARTICIPATION_ORDER.includes(storedLevel as MathObserverParticipation) ? storedLevel as MathObserverParticipation : "balanced";
      const storedCooldown = Number(localStorage.getItem("math-observer-cooldown-seconds"));
      const nextCooldown = Number.isFinite(storedCooldown) && storedCooldown >= MIN_COOLDOWN_SECONDS && storedCooldown <= MAX_COOLDOWN_SECONDS
        ? storedCooldown
        : MATH_OBSERVER_PROFILES[nextLevel].cooldownMs / 1000;
      participationRef.current = nextLevel;
      cooldownMsRef.current = nextCooldown * 1000;
      localStorage.removeItem("math-observer-muted");
      localStorage.setItem("math-observer-participation", nextLevel);
      preferenceTimer = window.setTimeout(() => { setParticipation(nextLevel); setCooldownSeconds(nextCooldown); }, 0);
    } catch { /* Device preferences are optional. */ }

    const unlock = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;
      setReady(true);
      const timer = window.setTimeout(() => {
        timersRef.current.delete(timer);
        deliverCue(WELCOME, true, { affectCooldown: false });
      }, 420);
      timersRef.current.add(timer);
    };
    const interactionStart = () => {
      activeInteractionRef.current = true;
      lastInteractionAtRef.current = performance.now();
      unlock();
      if (participationRef.current !== "quiet" && !voiceEnabledRef.current && !voiceEnablingRef.current && Date.now() >= voiceRetryAtRef.current) enableVoiceRef.current();
    };
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
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
      pendingActionTimerRef.current = null;
      pendingActionRef.current = null;
      stopSpeech();
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
      audioUrls.clear();
    };
  }, [deliverCue, stopSpeech]);

  useEffect(() => {
    const handleCue = (event: Event) => considerAction({
      ...cueToAction((event as CustomEvent<MathObserverCue>).detail),
      scene: activeSceneRef.current,
      context: activeSceneContextRef.current,
    });
    const handleAction = (event: Event) => considerAction((event as CustomEvent<MathObserverAction>).detail);
    const handleScene = (event: Event) => transitionScene((event as CustomEvent<MathObserverScene>).detail);
    window.addEventListener(MATH_OBSERVER_EVENT, handleCue);
    window.addEventListener(MATH_OBSERVER_ACTION_EVENT, handleAction);
    window.addEventListener(MATH_OBSERVER_SCENE_EVENT, handleScene);
    return () => {
      window.removeEventListener(MATH_OBSERVER_EVENT, handleCue);
      window.removeEventListener(MATH_OBSERVER_ACTION_EVENT, handleAction);
      window.removeEventListener(MATH_OBSERVER_SCENE_EVENT, handleScene);
    };
  }, [considerAction, transitionScene]);

  useEffect(() => {
    const Recognition = speechRecognitionConstructor();
    if (!Recognition || wakeRecognitionBlockedRef.current || !voiceEnabled || voiceState !== "idle" || speaking || participation === "quiet" || document.visibilityState !== "visible") return;
    const recognition = new Recognition();
    let restartTimer = 0;
    let disposed = false;
    const scheduleRestart = () => {
      if (disposed || wakeRecognitionBlockedRef.current || voiceBusyRef.current || !voiceEnabledRef.current || participationRef.current === "quiet" || document.visibilityState !== "visible") return;
      const attempt = Math.min(4, voiceRecoveryAttemptsRef.current);
      voiceRecoveryAttemptsRef.current += 1;
      const delay = Math.min(4000, 450 * (2 ** attempt));
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(() => {
        if (disposed || wakeRecognitionBlockedRef.current || voiceBusyRef.current || !voiceEnabledRef.current || participationRef.current === "quiet" || document.visibilityState !== "visible") return;
        try {
          recognition.start();
        } catch {
          setVoiceEpoch((value) => value + 1);
        }
      }, delay);
    };
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "zh-CN";
    recognition.maxAlternatives = 1;
    wakeRecognitionRef.current = recognition;
    recognition.onresult = (event) => {
      voiceRecoveryAttemptsRef.current = 0;
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index]?.[0]?.transcript ?? "";
        if (!VOICE_WAKE_PATTERN.test(transcript)) continue;
        stopWakeRecognition();
        beginVoiceSessionRef.current();
        break;
      }
    };
    recognition.onerror = (event) => {
      const error = event.error ?? "unknown";
      if (error === "not-allowed" || error === "service-not-allowed") {
        wakeRecognitionBlockedRef.current = true;
        setVoiceState("idle");
        return;
      }
      if (error === "audio-capture") {
        releaseVoiceStream();
        voiceEnabledRef.current = false;
        voiceRetryAtRef.current = Date.now() + 1500;
        setVoiceEnabled(false);
        setVoiceState("error");
        const timer = window.setTimeout(() => {
          timersRef.current.delete(timer);
          if (participationRef.current !== "quiet") enableVoiceRef.current();
        }, 1700);
        timersRef.current.add(timer);
      }
    };
    recognition.onend = () => {
      scheduleRestart();
    };
    try { recognition.start(); } catch { scheduleRestart(); }
    return () => {
      disposed = true;
      window.clearTimeout(restartTimer);
      if (wakeRecognitionRef.current === recognition) stopWakeRecognition();
    };
  }, [participation, releaseVoiceStream, speaking, stopWakeRecognition, voiceEnabled, voiceEpoch, voiceState]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") cancelVoiceSession();
      else {
        wakeRecognitionBlockedRef.current = false;
        voiceRecoveryAttemptsRef.current = 0;
      }
      setVoiceEpoch((value) => value + 1);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [cancelVoiceSession]);

  useEffect(() => () => {
    voiceRequestControllerRef.current?.abort();
    stopWakeRecognition();
    releaseVoiceStream();
  }, [releaseVoiceStream, stopWakeRecognition]);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      if (!unlockedRef.current) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const section = visible?.target.id;
      if (!section || !SECTION_CUES[section]) return;
      const detailedWorkshopOpen = section === "workshop" && activeSceneRef.current.startsWith("workshop-");
      if (!detailedWorkshopOpen) transitionScene({ scene: section });
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
  }, [considerAction, transitionScene]);

  useEffect(() => {
    let idleTimer = 0;
    const resetIdle = () => {
      window.clearTimeout(idleTimer);
      if (!unlockedRef.current || participation === "quiet") return;
      const idleMs = MATH_OBSERVER_PROFILES[participation].idleMs;
      idleTimer = window.setTimeout(() => {
        const section = activeSceneRef.current;
        const suggestedCue = IDLE_CUES[section] ?? IDLE_CUES[activeSectionId()];
        considerAction({
          id: `observer-idle-${section}`,
          scene: section,
          action: "user_idle",
          outcome: "idle",
          importance: .7,
          idleMs,
          suggestedCue,
          once: true,
        });
      }, idleMs);
    };
    ["pointerdown", "keydown", "wheel", MATH_OBSERVER_SCENE_EVENT].forEach((eventName) => window.addEventListener(eventName, resetIdle, { passive: true }));
    resetIdle();
    return () => {
      window.clearTimeout(idleTimer);
      ["pointerdown", "keydown", "wheel", MATH_OBSERVER_SCENE_EVENT].forEach((eventName) => window.removeEventListener(eventName, resetIdle));
    };
  }, [considerAction, participation]);

  const selectParticipation = (next: MathObserverParticipation) => {
    participationRef.current = next;
    setParticipation(next);
    try { localStorage.setItem("math-observer-participation", next); } catch { /* Preference remains in memory. */ }
    if (next !== "quiet") {
      voiceRetryAtRef.current = 0;
      wakeRecognitionBlockedRef.current = false;
      enableVoiceRef.current();
      return;
    }
    decisionControllerRef.current?.abort();
    decisionControllerRef.current = null;
    if (pendingActionTimerRef.current !== null) {
      window.clearTimeout(pendingActionTimerRef.current);
      timersRef.current.delete(pendingActionTimerRef.current);
      pendingActionTimerRef.current = null;
    }
    pendingActionRef.current = null;
    recentEventsRef.current = [];
    pendingVoiceQuestionRef.current = false;
    voiceRetryAtRef.current = 0;
    voiceRecoveryAttemptsRef.current = 0;
    wakeRecognitionBlockedRef.current = false;
    cancelVoiceSession(true);
  };

  const enableVoice = useCallback(async (askNow = false) => {
    if (askNow) pendingVoiceQuestionRef.current = true;
    if (participationRef.current === "quiet") {
      pendingVoiceQuestionRef.current = false;
      return;
    }
    if (voiceEnabledRef.current) {
      if (pendingVoiceQuestionRef.current && !voiceBusyRef.current) {
        pendingVoiceQuestionRef.current = false;
        beginVoiceSessionRef.current();
      }
      return;
    }
    if (voiceEnablingRef.current) return;
    voiceEnablingRef.current = true;
    try {
      await ensureVoiceStream();
      releaseVoiceStream();
      voiceEnabledRef.current = true;
      voiceRetryAtRef.current = 0;
      voiceRecoveryAttemptsRef.current = 0;
      setVoiceEnabled(true);
      setVoiceState("idle");
      if (pendingVoiceQuestionRef.current) {
        pendingVoiceQuestionRef.current = false;
        window.setTimeout(() => beginVoiceSessionRef.current(), 0);
      }
    } catch {
      voiceEnabledRef.current = false;
      voiceRetryAtRef.current = Date.now() + 4000;
      setVoiceEnabled(false);
      setVoiceState("error");
    } finally {
      voiceEnablingRef.current = false;
    }
  }, [ensureVoiceStream, releaseVoiceStream]);
  useEffect(() => { enableVoiceRef.current = (askNow = false) => { void enableVoice(askNow); }; }, [enableVoice]);

  const changeCooldown = (seconds: number) => {
    const next = Math.max(MIN_COOLDOWN_SECONDS, Math.min(MAX_COOLDOWN_SECONDS, seconds));
    cooldownMsRef.current = next * 1000;
    setCooldownSeconds(next);
    try { localStorage.setItem("math-observer-cooldown-seconds", String(next)); } catch { /* Preference remains in memory. */ }
    if (pendingActionRef.current) queueAction(pendingActionRef.current, Math.max(250, next * 1000 - (performance.now() - lastSpokenAtRef.current) + 120));
  };

  useEffect(() => {
    try {
      const storedPosition = JSON.parse(localStorage.getItem("math-observer-position") ?? "null") as Partial<ObserverPosition> | null;
      const bounds = observerRef.current?.getBoundingClientRect();
      if (bounds && Number.isFinite(storedPosition?.left) && Number.isFinite(storedPosition?.top)) {
        setObserverPosition(clampObserverPosition(Number(storedPosition?.left), Number(storedPosition?.top), bounds.width, bounds.height));
      }
    } catch { /* Keep the default bottom-right position. */ }

    const keepVisible = () => {
      const bounds = observerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setObserverPosition((current) => current ? clampObserverPosition(current.left, current.top, bounds.width, bounds.height) : current);
    };
    window.addEventListener("resize", keepVisible);
    return () => window.removeEventListener("resize", keepVisible);
  }, []);

  const beginObserverDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const bounds = observerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height, moved: false };
    suppressReplayRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const moveObserver = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) >= 4) drag.moved = true;
    if (!drag.moved) return;
    suppressReplayRef.current = true;
    setObserverPosition(clampObserverPosition(drag.left + deltaX, drag.top + deltaY, drag.width, drag.height));
  };

  const endObserverDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDragging(false);
    if (!drag.moved) return;
    const finalPosition = clampObserverPosition(drag.left + event.clientX - drag.startX, drag.top + event.clientY - drag.startY, drag.width, drag.height);
    setObserverPosition(finalPosition);
    try { localStorage.setItem("math-observer-position", JSON.stringify(finalPosition)); } catch { /* Position remains in memory. */ }
  };

  const wakeUnlessDragged = () => {
    if (suppressReplayRef.current) {
      suppressReplayRef.current = false;
      return;
    }
    if (participationRef.current === "quiet" || voiceBusyRef.current) return;
    if (voiceEnabledRef.current) beginVoiceSessionRef.current();
    else enableVoiceRef.current(true);
  };

  const observerStyle: CSSProperties | undefined = observerPosition
    ? { left: observerPosition.left, top: observerPosition.top, right: "auto", bottom: "auto" }
    : undefined;
  const settingsToRight = observerPosition !== null && observerPosition.left < 260;
  const settingsDown = observerPosition !== null && observerPosition.top < 250;
  const voiceStatus = voiceStateLabel(voiceState, voiceEnabled);

  return (
    <aside ref={observerRef} style={observerStyle} className={`math-observer ${ready ? "is-ready" : ""} ${speaking ? "is-speaking" : ""} ${dragging ? "is-dragging" : ""} ${voiceEnabled ? "voice-enabled" : ""} voice-${voiceState} ${settingsToRight ? "settings-to-right" : ""} ${settingsDown ? "settings-down" : ""}`} aria-label="数学观察员小π">
      <button className="math-observer-character" type="button" onClick={wakeUnlessDragged} onPointerDown={beginObserverDrag} onPointerMove={moveObserver} onPointerUp={endObserverDrag} onPointerCancel={endObserverDrag} title="拖动小π改变位置，点击唤醒语音提问" aria-label="拖动数学观察员小π改变位置，点击可唤醒语音提问">
        <span className="math-observer-halo" aria-hidden="true" />
        <Image src="/math-observer-talk-0.png" alt="数学观察员小π" width={512} height={512} draggable={false} unoptimized />
        <span className="math-observer-talk-sequence" aria-hidden="true" />
        <span className="math-observer-antenna-listen" aria-hidden="true"><i /></span>
      </button>
      <div className="math-observer-preferences">
        <button className="math-observer-level" type="button" onClick={() => setSettingsOpen((open) => !open)} title={`参与度：${PARTICIPATION_LABEL[participation]} · 冷却 ${cooldownSeconds} 秒`} aria-label={`设置小π参与度与冷却时间，当前${PARTICIPATION_LABEL[participation]}，${cooldownSeconds}秒`} aria-expanded={settingsOpen} data-level={participation}><ParticipationIcon level={participation} thinking={voiceState === "thinking"} /></button>
        {settingsOpen && <div className="math-observer-settings" role="group" aria-label="小π参与设置">
          <span>参与度</span>
          <div>{PARTICIPATION_ORDER.map((level) => <button key={level} type="button" className={participation === level ? "active" : ""} aria-pressed={participation === level} onClick={() => selectParticipation(level)}>{PARTICIPATION_LABEL[level]}</button>)}</div>
          <label><span>提示间隔 <b>{cooldownSeconds} 秒</b></span><input type="range" min={MIN_COOLDOWN_SECONDS} max={MAX_COOLDOWN_SECONDS} step="1" value={cooldownSeconds} style={{ background: `linear-gradient(90deg, #368e97 0 ${((cooldownSeconds - MIN_COOLDOWN_SECONDS) / (MAX_COOLDOWN_SECONDS - MIN_COOLDOWN_SECONDS)) * 100}%, #dcebed ${((cooldownSeconds - MIN_COOLDOWN_SECONDS) / (MAX_COOLDOWN_SECONDS - MIN_COOLDOWN_SECONDS)) * 100}% 100%)` }} onChange={(event) => changeCooldown(Number(event.target.value))} /></label>
        </div>}
      </div>
      <span className="math-observer-live" role="status" aria-live="polite">{voiceState !== "idle" ? voiceStatus : speaking ? lastMessage : `小π参与度：${PARTICIPATION_LABEL[participation]}`}</span>
      {/* The spoken answer is mirrored in the live text status above. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="auto" aria-hidden="true" />
    </aside>
  );
}
