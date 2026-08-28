import { fetchWithTimeout, jsonError, protectObserverRequest, qwenConfig } from "../qwen";

type QwenAsrResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
};

function extractText(result: QwenAsrResponse) {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

export async function POST(request: Request) {
  const denied = protectObserverRequest(request, "listen", 18);
  if (denied) return denied;
  const config = qwenConfig();
  if (!config.apiKey) return jsonError("Qwen ASR is not configured", 503);

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || !audio.type.startsWith("audio/")) return jsonError("Audio is required", 400);
  if (!audio.size || audio.size > 10 * 1024 * 1024) return jsonError("Audio is empty or too large", 413);

  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const dataUri = `data:${audio.type || "audio/webm"};base64,${bytesToBase64(bytes)}`;
    const response = await fetchWithTimeout(`${config.asrBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.asrModel,
        messages: [{
          role: "user",
          content: [{ type: "input_audio", input_audio: { data: dataUri } }],
        }],
        stream: false,
        asr_options: { language: "zh", enable_itn: true },
      }),
    }, 30000);
    if (!response.ok) return jsonError("Qwen ASR request failed", 502);
    const transcript = extractText(await response.json() as QwenAsrResponse).replace(/\s+/g, " ").trim().slice(0, 240);
    if (!transcript) return jsonError("No speech was recognized", 422);
    return Response.json({ transcript }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Qwen ASR is temporarily unavailable", 502);
  }
}
