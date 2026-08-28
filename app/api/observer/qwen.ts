export function qwenConfig() {
  const baseUrl = (process.env.QWEN_DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com").replace(/\/$/, "");
  const asrBaseUrl = (process.env.QWEN_ASR_BASE_URL || `${baseUrl}/compatible-mode/v1`).replace(/\/$/, "");
  return {
    apiKey: process.env.DASHSCOPE_API_KEY?.trim() || "",
    baseUrl,
    asrBaseUrl,
    asrModel: process.env.QWEN_ASR_MODEL?.trim() || "qwen3-asr-flash",
    observerModel: process.env.QWEN_OBSERVER_MODEL?.trim() || "qwen-plus",
    ttsModel: process.env.QWEN_TTS_MODEL?.trim() || "qwen3-tts-vd-2026-01-26",
    ttsVoice: process.env.QWEN_TTS_VOICE?.trim() || "",
  };
}

export async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

const requestBuckets = new Map<string, { count: number; resetAt: number }>();

export function protectObserverRequest(request: Request, scope: string, limit: number) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== requestUrl.host) return jsonError("Cross-origin request denied", 403);
    } catch {
      return jsonError("Invalid request origin", 403);
    }
  }

  const now = Date.now();
  const client = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
  const key = `${scope}:${client}`;
  const current = requestBuckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : current;
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (requestBuckets.size > 500) {
    for (const [bucketKey, value] of requestBuckets) if (value.resetAt <= now) requestBuckets.delete(bucketKey);
  }
  return bucket.count > limit ? jsonError("Too many observer requests", 429) : null;
}
