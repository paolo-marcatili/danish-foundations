import type { AudioReference } from "@hero-lang/content-schema";
import { publicUrl } from "./publicUrl";

export type SoundName =
  | "correct"
  | "wrong"
  | "hit"
  | "enemyHit"
  | "coin"
  | "start"
  | "timeout"
  | "levelUp"
  | "shop"
  | "super"
  | "fart"
  | "step"
  | "parry"
  | "magic"
  | "throw"
  | "defeat";

let audioContext: AudioContext | null = null;
let enabled = readAudioPreference();
let unlocked = false;
let currentLearningAudio: HTMLAudioElement | null = null;
let currentLearningAudioFinish: ((completed: boolean) => void) | null = null;
let currentSpeechFinish: ((completed: boolean) => void) | null = null;
let learningAudioMode: "human_only" | "human_and_automatic" = readLearningAudioMode();

export function isAudioEnabled(): boolean {
  return enabled;
}

export function getLearningAudioMode(): "human_only" | "human_and_automatic" {
  return learningAudioMode;
}

export function setLearningAudioMode(mode: "human_only" | "human_and_automatic"): void {
  learningAudioMode = mode;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("hero-language-camp:learning-audio-mode", mode);
  }
}

export async function setAudioEnabled(nextEnabled: boolean): Promise<void> {
  enabled = nextEnabled;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("hero-language-camp:audio", nextEnabled ? "on" : "off");
  }
  if (nextEnabled) await unlockAudio();
}

export async function unlockAudio(): Promise<boolean> {
  if (!enabled) return false;
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === "suspended") await context.resume();
    unlocked = context.state === "running";
    return unlocked;
  } catch {
    return false;
  }
}

export function installAudioUnlock(): () => void {
  if (typeof window === "undefined") return () => undefined;

  const handler = () => {
    void unlockAudio();
  };

  window.addEventListener("pointerdown", handler, { passive: true });
  window.addEventListener("keydown", handler);
  return () => {
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
}

export function playSound(name: SoundName): void {
  if (!enabled) return;
  const context = getAudioContext();
  if (!context) return;
  if (context.state === "suspended") {
    void context.resume();
  }

  const patterns: Record<SoundName, Array<[number, number, OscillatorType?]>> = {
    correct: [[660, 0.06], [880, 0.08], [1100, 0.09]],
    wrong: [[260, 0.1, "triangle"], [190, 0.14, "triangle"]],
    hit: [[180, 0.04, "square"], [420, 0.05, "sawtooth"], [760, 0.04]],
    enemyHit: [[140, 0.07, "square"], [100, 0.12, "triangle"]],
    coin: [[900, 0.04], [1200, 0.08], [1500, 0.06]],
    start: [[440, 0.05], [660, 0.05], [880, 0.07]],
    timeout: [[320, 0.12, "triangle"], [260, 0.12, "triangle"], [200, 0.16, "triangle"]],
    levelUp: [[520, 0.06], [700, 0.06], [900, 0.06], [1200, 0.16]],
    shop: [[780, 0.06], [990, 0.08]],
    super: [[260, 0.05, "sawtooth"], [520, 0.06, "sawtooth"], [1040, 0.1, "square"]],
    fart: [[90, 0.18, "sawtooth"], [72, 0.16, "triangle"]],
    step: [[180, 0.025, "square"]],
    parry: [[520, 0.04, "triangle"], [360, 0.04, "triangle"], [720, 0.07]],
    magic: [[440, 0.04], [660, 0.04], [990, 0.12], [1320, 0.08]],
    throw: [[300, 0.035, "sawtooth"], [760, 0.055], [980, 0.035]],
    defeat: [[160, 0.08, "triangle"], [120, 0.1, "triangle"], [90, 0.16, "triangle"]]
  };

  if (name === "fart") {
    playNoise(context, 0.22, 0.18, 0.08);
  }
  if (name === "defeat") {
    playNoise(context, 0.32, 0.12, 0.02);
  }

  let offset = 0;
  for (const [frequency, duration, type] of patterns[name]) {
    scheduleTone(context, frequency, duration, offset, type ?? "sine");
    offset += duration + 0.026;
  }
}

export async function playLearningAudio(audio: AudioReference[] | undefined, text: string | undefined, lang: string): Promise<boolean> {
  if (!enabled) return false;
  await unlockAudio();

  const preferred = chooseBestAudio(audio);
  const language = langFromAudio(preferred, lang);

  // Prefer a genuine Armenian system voice over legacy eSpeak previews. Neural
  // course files and human recordings still take priority when available.
  if (
    learningAudioMode === "human_and_automatic" &&
    preferred &&
    preferred.source_type === "automated" &&
    !isNeuralAudio(preferred) &&
    hasVoiceForLanguage(language)
  ) {
    return speakAndWait(text ?? preferred.text, language);
  }

  if (preferred?.url && !preferred.url.startsWith("browser-tts:")) {
    const played = await playAudioElementAndWait(publicUrl(preferred.url));
    if (played) return true;
    // Browser audio can still fail before a user gesture or if the file is
    // missing. Fall through to an installed Armenian voice when one exists.
  }

  if (!preferred && learningAudioMode === "human_only") {
    if (import.meta.env.DEV) console.warn("No playable human learning audio was available.");
    return false;
  }

  return speakAndWait(text ?? preferred?.text, language);
}

/** Fire-and-forget speech helper retained for callers that do not need completion. */
export function speak(text: string | undefined, lang: string): boolean {
  if (!canSpeak(text, lang)) return false;
  void speakAndWait(text, lang);
  return true;
}

async function playAudioElementAndWait(url: string): Promise<boolean> {
  stopCurrentLearningAudio();
  const element = new Audio(url);
  currentLearningAudio = element;
  element.volume = 0.9;

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      element.removeEventListener("ended", onEnded);
      element.removeEventListener("error", onError);
      if (currentLearningAudio === element) currentLearningAudio = null;
      if (currentLearningAudioFinish === finish) currentLearningAudioFinish = null;
      resolve(completed);
    };
    const onEnded = () => finish(true);
    const onError = () => finish(false);
    currentLearningAudioFinish = finish;
    element.addEventListener("ended", onEnded, { once: true });
    element.addEventListener("error", onError, { once: true });
    void element.play().catch(() => finish(false));
  });
}

function speakAndWait(text: string | undefined, lang: string): Promise<boolean> {
  if (!canSpeak(text, lang) || typeof window === "undefined") return Promise.resolve(false);
  const matchingVoice = findVoiceForLanguage(lang);
  if (!matchingVoice) return Promise.resolve(false);

  stopCurrentLearningAudio();
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      if (currentSpeechFinish === finish) currentSpeechFinish = null;
      resolve(completed);
    };
    const utterance = new SpeechSynthesisUtterance(text ?? "");
    utterance.lang = lang;
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.voice = matchingVoice;
    utterance.onend = () => finish(true);
    utterance.onerror = () => {
      if (import.meta.env.DEV) console.warn("Browser speech synthesis failed for", lang, text);
      finish(false);
    };
    currentSpeechFinish = finish;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

function canSpeak(text: string | undefined, lang: string): boolean {
  return Boolean(enabled && text && typeof window !== "undefined" && "speechSynthesis" in window && findVoiceForLanguage(lang));
}

function findVoiceForLanguage(lang: string): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const normalized = lang.toLowerCase();
  const prefix = normalized.slice(0, 2);
  return voices.find((voice) => voice.lang.toLowerCase() === normalized)
    ?? voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
}

function chooseBestAudio(audio: AudioReference[] | undefined): AudioReference | undefined {
  if (!audio?.length) return undefined;
  const playable = audio.filter((entry) => Boolean(entry.url) && entry.review_status !== "draft");
  const pool = playable.length > 0 ? playable : audio.filter((entry) => Boolean(entry.url));
  const humanApproved = pool.filter((entry) => entry.source_type === "human" && entry.review_status === "approved");
  if (humanApproved.length > 0) return randomChoice(humanApproved);
  const humanAny = pool.filter((entry) => entry.source_type === "human");
  if (humanAny.length > 0) return randomChoice(humanAny);

  if (learningAudioMode === "human_only") return undefined;

  const automated = pool.filter((entry) => entry.source_type === "automated");
  const neural = automated.filter(isNeuralAudio);
  if (neural.length > 0) return randomChoice(neural);

  const browserTts = pool.filter((entry) => entry.source_type === "browser_tts" || entry.url.startsWith("browser-tts:"));
  const browserWithMatchingVoice = browserTts.find((entry) => hasVoiceForLanguage(langFromAudio(entry, "hy-AM")));
  if (browserWithMatchingVoice) return browserWithMatchingVoice;

  if (automated.length > 0) return randomChoice(automated);

  return browserTts[0] ?? pool[0];
}

function isNeuralAudio(audio: AudioReference): boolean {
  const description = `${audio.provider ?? ""} ${audio.engine ?? ""} ${audio.voice ?? ""}`.toLowerCase();
  return description.includes("azure") || description.includes("neural");
}

function langFromAudio(audio: AudioReference | undefined, fallback: string): string {
  if (audio?.url?.startsWith("browser-tts:")) {
    return audio.url.replace("browser-tts:", "") || fallback;
  }
  return fallback;
}

function randomChoice<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)] ?? values[0];
}

function stopCurrentLearningAudio(): void {
  if (currentLearningAudio) {
    currentLearningAudio.pause();
    currentLearningAudio.currentTime = 0;
    currentLearningAudio = null;
  }
  currentLearningAudioFinish?.(false);
  currentLearningAudioFinish = null;
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  currentSpeechFinish?.(false);
  currentSpeechFinish = null;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  return audioContext;
}

function scheduleTone(context: AudioContext, frequency: number, duration: number, offset: number, type: OscillatorType): void {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + offset;
  const end = start + duration;

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.15, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playNoise(context: AudioContext, duration: number, volume: number, offset: number): void {
  const bufferSize = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const start = context.currentTime + offset;

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(start + duration);
}


function readAudioPreference(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem("hero-language-camp:audio") !== "off";
}

function readLearningAudioMode(): "human_only" | "human_and_automatic" {
  if (typeof window === "undefined") return "human_only";
  return window.localStorage.getItem("hero-language-camp:learning-audio-mode") === "human_and_automatic" ? "human_and_automatic" : "human_only";
}

function hasVoiceForLanguage(lang: string): boolean {
  return Boolean(findVoiceForLanguage(lang));
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
