import { fetchWithTimeout, jsonError, protectObserverRequest, qwenConfig } from "../qwen";

type AskPayload = {
  question?: unknown;
  currentScene?: { scene?: unknown; context?: unknown };
  recentEvents?: Array<Record<string, unknown>>;
};

type QwenChatResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
};

function extractText(result: QwenChatResponse) {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

export async function POST(request: Request) {
  const denied = protectObserverRequest(request, "ask", 20);
  if (denied) return denied;
  const config = qwenConfig();
  if (!config.apiKey) return jsonError("Qwen observer is not configured", 503);

  const payload = await request.json().catch(() => null) as AskPayload | null;
  const question = typeof payload?.question === "string" ? payload.question.replace(/\s+/g, " ").trim().slice(0, 240) : "";
  if (!question) return jsonError("Question is required", 400);
  const currentScene = payload?.currentScene && typeof payload.currentScene === "object"
    ? JSON.parse(JSON.stringify(payload.currentScene).slice(0, 1800)) as Record<string, unknown>
    : { scene: "unknown" };
  const recentEvents = Array.isArray(payload?.recentEvents)
    ? JSON.parse(JSON.stringify(payload.recentEvents.slice(-5)).slice(0, 1600)) as Array<Record<string, unknown>>
    : [];

  const system = [
    "你是儿童数学美学馆的数学观察员“小π”，读作“小派”。",
    "回答孩子的当前问题，并优先结合提供的展馆、展品、公式、参数和刚才的操作。不能把上下文中没有出现的用户行为当成事实。",
    "数学与科学准确性是第一位。概念存在不同口径时，使用“通常认为”“主要”等必要限定；不确定时坦白说明，不编造。",
    "默认只说一句自然中文，8到28个汉字，最多40个汉字；直接给答案，不复述问题，不说“作为AI”，不加列表、标题或表情。",
    "语言适合儿童，温暖但不卖萌。问题明显偏离数学、科学、艺术或当前展览时，用一句话简短回答或引导回当前探索。",
  ].join("\n");

  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/compatible-mode/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.observerModel,
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify({ currentScene, recentEvents, question }) },
        ],
        enable_thinking: false,
        temperature: .18,
        max_tokens: 64,
      }),
    });
    if (!response.ok) return jsonError("Qwen answer request failed", 502);
    const answer = extractText(await response.json() as QwenChatResponse)
      .replace(/^[“"']|[”"']$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);
    if (!answer) return jsonError("Qwen returned an empty answer", 502);
    return Response.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Qwen answer is temporarily unavailable", 502);
  }
}
