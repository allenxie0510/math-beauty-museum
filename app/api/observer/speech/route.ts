import { fetchWithTimeout, jsonError, protectObserverRequest, qwenConfig } from "../qwen";

type TtsResponse = {
  output?: { audio?: { url?: string; data?: string } };
};

function trustedAudioUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const trustedHost = host === "aliyuncs.com" || host.endsWith(".aliyuncs.com") || host.endsWith(".alicdn.com");
    if (!trustedHost || (url.protocol !== "https:" && url.protocol !== "http:")) return null;
    url.protocol = "https:";
    return url;
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
    const cosyVoiceModel = config.ttsModel.startsWith("cosyvoice-") || config.ttsModel.startsWith("qwen-audio-");
    const endpoint = cosyVoiceModel
      ? `${config.baseUrl}/api/v1/services/audio/tts/SpeechSynthesizer`
      : `${config.baseUrl}/api/v1/services/aigc/multimodal-generation/generation`;
    const input = cosyVoiceModel
      ? { text, voice: config.ttsVoice, format: "wav", sample_rate: 24000 }
      : { text, voice: config.ttsVoice };
    const response = await fetchWithTimeout(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: config.ttsModel, input }),
    }, 20000);
    if (!response.ok) {
      const failure = await response.json().catch(() => null) as { code?: unknown } | null;
      const code = typeof failure?.code === "string" ? failure.code.slice(0, 60) : "upstream_error";
      return Response.json({ error: "Qwen TTS request failed", upstreamCode: code }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
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
