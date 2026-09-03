import { fetchWithTimeout, jsonError, protectObserverRequest, qwenConfig } from "../qwen";

type AskPayload = {
  question?: unknown;
  currentScene?: { scene?: unknown; context?: unknown };
  recentEvents?: Array<Record<string, unknown>>;
};

type QwenChatResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
};

const CONTEXT_SCOPE_KEYS = ["item", "exhibit", "shape", "demo", "hall"] as const;

function belongsToCurrentScene(currentScene: Record<string, unknown>, event: Record<string, unknown>) {
  const sceneName = typeof currentScene.scene === "string" ? currentScene.scene : "";
  const eventScene = typeof event.scene === "string" ? event.scene : "";
  if (sceneName && eventScene && sceneName !== eventScene) return false;
  const currentContext = currentScene.context && typeof currentScene.context === "object"
    ? currentScene.context as Record<string, unknown>
    : {};
  const eventContext = event.context && typeof event.context === "object"
    ? event.context as Record<string, unknown>
    : {};
  return CONTEXT_SCOPE_KEYS.every((key) => {
    const currentValue = currentContext[key];
    const eventValue = eventContext[key];
    return currentValue == null || eventValue == null || String(currentValue) === String(eventValue);
  });
}

function extractText(result: QwenChatResponse) {
  const content = result.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((part) => part.text ?? "").join("");
  return "";
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const denied = protectObserverRequest(request, "ask", 20);
  if (denied) {
    console.warn("[observer/ask] request rejected", { requestId, stage: "rate-limit", status: denied.status, durationMs: Date.now() - startedAt });
    return denied;
  }
  const config = qwenConfig();
  if (!config.apiKey) {
    console.warn("[observer/ask] unavailable", { requestId, stage: "configuration", status: 503, durationMs: Date.now() - startedAt });
    return jsonError("Qwen observer is not configured", 503);
  }

  const payload = await request.json().catch(() => null) as AskPayload | null;
  const question = typeof payload?.question === "string" ? payload.question.replace(/\s+/g, " ").trim().slice(0, 240) : "";
  if (!question) return jsonError("Question is required", 400);
  const currentScene = payload?.currentScene && typeof payload.currentScene === "object"
    ? JSON.parse(JSON.stringify(payload.currentScene).slice(0, 1800)) as Record<string, unknown>
    : { scene: "unknown" };
  const recentEvents = Array.isArray(payload?.recentEvents)
    ? JSON.parse(JSON.stringify(payload.recentEvents.slice(-8).filter((event) => belongsToCurrentScene(currentScene, event)).slice(-5)).slice(0, 1600)) as Array<Record<string, unknown>>
    : [];

  const system = [
    "你是儿童数学美学馆的数学观察员“小π”，读作“小派”。",
    "currentScene 是当前唯一有效的主题锚点。回答与引导只能围绕其中的展馆、展品、公式、参数和刚才的操作，绝不引用其他场景。",
    "如果问题与当前场景的数学、科学或艺术概念无关，不要展开回答该问题；用一句友好的短句把孩子引导回 currentScene.context.name 所表示的当前展品，并提出一个相关观察方向。",
    "不能把上下文中没有出现的用户行为当成事实，也不能根据模型记忆补出其他展品。",
    "数学与科学准确性是第一位。概念存在不同口径时，使用“通常认为”“主要”等必要限定；不确定时坦白说明，不编造。",
    "默认只说一句自然中文，8到28个汉字，最多40个汉字；直接给答案，不复述问题，不说“作为AI”，不加列表、标题或表情。",
    "语言适合儿童，温暖但不卖萌。",
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
    if (!response.ok) {
      console.warn("[observer/ask] upstream failure", { requestId, stage: "upstream", status: 502, upstreamStatus: response.status, durationMs: Date.now() - startedAt });
      return jsonError("Qwen answer request failed", 502);
    }
    const answer = extractText(await response.json() as QwenChatResponse)
      .replace(/^[“"']|[”"']$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);
    if (!answer) {
      console.warn("[observer/ask] empty answer", { requestId, stage: "empty-answer", status: 502, durationMs: Date.now() - startedAt });
      return jsonError("Qwen returned an empty answer", 502);
    }
    return Response.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn("[observer/ask] exception", { requestId, stage: "exception", status: 502, errorName: (error as Error).name, durationMs: Date.now() - startedAt });
    return jsonError("Qwen answer is temporarily unavailable", 502);
  }
}
