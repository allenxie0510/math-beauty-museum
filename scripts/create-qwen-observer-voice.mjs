import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const apiKey = process.env.DASHSCOPE_API_KEY;
const baseUrl = (process.env.QWEN_DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com").replace(/\/$/, "");
const mode = process.argv[2] || "design";
const preferredName = (process.argv[4] || process.env.QWEN_VOICE_NAME || "xiaoguan").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 16);
const previewText = "先别急着找答案，轻轻动一下，再看看哪里发生了变化。";

if (!apiKey) throw new Error("请先设置 DASHSCOPE_API_KEY。不要把真实密钥提交到代码仓库。");

const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
let targetModel;
let payload;

if (mode === "design") {
  targetModel = "qwen3-tts-vd-2026-01-26";
  const voicePrompt = process.env.QWEN_VOICE_PROMPT || "清亮温暖的青少年男声，普通话标准，自然口语，有好奇心和耐心，不要播音腔，不要刻意卖萌。";
  payload = {
    model: "qwen-voice-design",
    input: {
      action: "create",
      target_model: targetModel,
      preferred_name: preferredName,
      voice_prompt: voicePrompt,
      preview_text: previewText,
      language: "zh",
    },
    parameters: { sample_rate: 24000, response_format: "wav" },
  };
} else if (mode === "clone") {
  const audioPath = process.argv[3];
  if (!audioPath) throw new Error("复刻模式需要录音文件：node scripts/create-qwen-observer-voice.mjs clone /path/to/voice.wav");
  targetModel = "qwen3-tts-vc-2026-01-22";
  const extension = extname(audioPath).toLowerCase();
  const mime = extension === ".mp3" ? "audio/mpeg" : extension === ".m4a" ? "audio/mp4" : "audio/wav";
  const audio = await readFile(resolve(audioPath));
  if (audio.byteLength > 10 * 1024 * 1024) throw new Error("录音文件需小于或等于 10 MB。");
  payload = {
    model: "qwen-voice-enrollment",
    input: {
      action: "create",
      target_model: targetModel,
      preferred_name: preferredName,
      audio: { data: `data:${mime};base64,${audio.toString("base64")}` },
    },
  };
} else {
  throw new Error("模式只能是 design 或 clone。");
}

const response = await fetch(`${baseUrl}/api/v1/services/audio/tts/customization`, {
  method: "POST",
  headers,
  body: JSON.stringify(payload),
});
const result = await response.json();
if (!response.ok) throw new Error(`创建音色失败（${response.status}）：${JSON.stringify(result)}`);
const voice = result?.output?.voice;
if (!voice) throw new Error(`返回结果中没有 voice：${JSON.stringify(result)}`);

if (result.output.preview_audio?.data) {
  await mkdir(resolve("outputs"), { recursive: true });
  const format = result.output.preview_audio.response_format || "wav";
  const outputPath = resolve("outputs", `qwen-observer-preview.${format}`);
  await writeFile(outputPath, Buffer.from(result.output.preview_audio.data, "base64"));
  process.stdout.write(`预览音频：${outputPath}\n`);
}

process.stdout.write(`\n将以下两项加入本地和托管环境：\nQWEN_TTS_MODEL=${targetModel}\nQWEN_TTS_VOICE=${voice}\n`);
