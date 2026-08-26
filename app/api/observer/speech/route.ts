import { fetchWithTimeout, jsonError, protectObserverRequest, qwenConfig } from "../qwen";

type TtsResponse = {
  output?: { audio?: { url?: string; data?: string } };
};

function trustedAudioUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && (host === "aliyuncs.com" || host.endsWith(".aliyuncs.com") || host.endsWith(".alicdn.com")) ? url : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const denied = protectObserverRequest(request, "speech", 36);
  if (denied) return denied;
  const config = qwenConfig();
  if (!config.apiKey || !config.ttsVoice) return jsonError("Qwen TTS is not configured", 503);
  const payload = await request.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof payload?.text === "string" ? payload.text.replace(/\s+/g, " ").trim().slice(0, 120) : "";
  if (!text) return jsonError("Speech text is required", 400);

  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.ttsModel, input: { text, voice: config.ttsVoice } }),
    }, 20000);
    if (!response.ok) return jsonError("Qwen TTS request failed", 502);
    const result = await response.json() as TtsResponse;
    const inlineAudio = result.output?.audio?.data;
    if (inlineAudio) {
      const bytes = Uint8Array.from(atob(inlineAudio), (character) => character.charCodeAt(0));
      return new Response(bytes, { headers: { "Content-Type": "audio/wav", "Cache-Control": "private, max-age=86400" } });
    }
    const audioUrl = trustedAudioUrl(result.output?.audio?.url ?? "");
    if (!audioUrl) return jsonError("Qwen TTS did not return audio", 502);
    const audioResponse = await fetchWithTimeout(audioUrl.toString(), {}, 15000);
    if (!audioResponse.ok || !audioResponse.body) return jsonError("Qwen audio download failed", 502);
    return new Response(audioResponse.body, {
      headers: {
        "Content-Type": audioResponse.headers.get("content-type") || "audio/wav",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return jsonError("Qwen TTS is temporarily unavailable", 502);
  }
}
