import { fetchWithTimeout, jsonError, protectObserverRequest, qwenConfig } from "../qwen";

type DecisionPayload = {
  participation?: "quiet" | "balanced" | "active";
  score?: number;
  currentScene?: { scene?: unknown; context?: unknown };
  event?: Record<string, unknown>;
  recentEvents?: Array<Record<string, unknown>>;
  recentCueIds?: string[];
};

type QwenChatResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>;
};

function extractText(choice: { message?: { content?: string | Array<{ text?: string }> } } | undefined) {
  const value = choice?.message?.content;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((part) => part.text ?? "").join("");
  return "";
}

function parseDecision(raw: string, fallbackId: string) {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const parsed = JSON.parse(match[0]) as { action?: unknown; cue_id?: unknown; text?: unknown; reason?: unknown; priority?: unknown };
  const action = parsed.action === "speak" ? "speak" : "silent";
  const text = typeof parsed.text === "string" ? parsed.text.replace(/\s+/g, " ").trim().slice(0, 42) : "";
  return {
    action: action === "speak" && text ? "speak" : "silent",
    cueId: typeof parsed.cue_id === "string" ? parsed.cue_id.slice(0, 80) : fallbackId,
    text,
    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "",
    priority: typeof parsed.priority === "number" ? Math.max(0, Math.min(1, parsed.priority)) : .5,
  };
}

export async function POST(request: Request) {
  const denied = protectObserverRequest(request, "decide", 24);
  if (denied) return denied;
  const config = qwenConfig();
  if (!config.apiKey) return jsonError("Qwen observer is not configured", 503);

  const payload = await request.json().catch(() => null) as DecisionPayload | null;
  if (!payload?.event || typeof payload.event !== "object") return jsonError("Invalid observer event", 400);

  const event = JSON.parse(JSON.stringify(payload.event).slice(0, 2600)) as Record<string, unknown>;
  const recentEvents = Array.isArray(payload.recentEvents) ? payload.recentEvents.slice(-10) : [];
  const recentCueIds = Array.isArray(payload.recentCueIds) ? payload.recentCueIds.slice(-12) : [];
  const currentScene = payload.currentScene && typeof payload.currentScene === "object"
    ? JSON.parse(JSON.stringify(payload.currentScene).slice(0, 1200)) as Record<string, unknown>
    : { scene: event.scene };
  const eventId = typeof event.id === "string" ? event.id : "observer-cue";
  const system = [
    "你是儿童数学美学馆的数学观察员“小观”。你的首要能力是克制：用户正在顺利探索时保持安静，只在关键发现、连续受挫、明确空闲或安全问题时开口。",
    "你只能依据给出的事件判断，不得虚构用户行为或数学结论。可以沿用 suggestedCue 中的事实，但要让表达自然、口语化。",
    "若开口，只说一句中文，8到28个汉字；只提出一个问题或一个下一步；不直接泄露挑战答案；避免空泛夸奖、播音腔和连续打扰。",
    "recentCueIds 中出现过的主题不得重复。参与度 quiet 应非常少说，balanced 适度，active 可更主动但仍不打断操作。",
    "只返回JSON：{\"action\":\"silent|speak\",\"cue_id\":\"短标识\",\"text\":\"\",\"reason\":\"短原因\",\"priority\":0到1}。",
  ].join("\n");
  const user = JSON.stringify({
    participation: payload.participation ?? "balanced",
    localScore: Math.max(0, Math.min(1, Number(payload.score) || 0)),
    currentScene,
    event,
    recentEvents,
    recentCueIds,
  });

  try {
    const response = await fetchWithTimeout(`${config.baseUrl}/compatible-mode/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.observerModel,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: .2,
        max_tokens: 160,
      }),
    });
    if (!response.ok) return jsonError("Qwen observer request failed", 502);
    const result = await response.json() as QwenChatResponse;
    const decision = parseDecision(extractText(result.choices?.[0]), eventId);
    if (!decision) return jsonError("Qwen observer returned an invalid decision", 502);
    return Response.json(decision, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return jsonError("Qwen observer is temporarily unavailable", 502);
  }
}
