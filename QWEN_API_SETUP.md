# 数学观察员“小观”接入 Qwen

项目已预留两个仅在服务端使用的接口：

- `/api/observer/decide`：把语义化操作事件交给千问，由模型决定保持安静或说一句引导语。
- `/api/observer/speech`：用 Qwen3-TTS 或 CosyVoice 合成语音；未配置时自动降级为浏览器语音。

真实 API Key 不应写入源码、提交到 Git，或放在任何 `NEXT_PUBLIC_` 变量中。

## 1. 创建阿里云百炼 API Key

1. 打开[阿里云百炼 API Key 页面](https://bailian.console.aliyun.com/?apiKey=1)。
2. 选择华北 2（北京）地域并创建 API Key。
3. 在项目根目录新建被 Git 忽略的 `.env.local`，填写：

```dotenv
DASHSCOPE_API_KEY=你的真实APIKey
QWEN_DASHSCOPE_BASE_URL=https://dashscope.aliyuncs.com
QWEN_OBSERVER_MODEL=qwen-plus
```

## 2. 使用百炼内置音色

从百炼体验中心选中的系统音色，必须使用音色表中与它匹配的模型。例如“龙杰力豆”应配置为：

```dotenv
QWEN_TTS_MODEL=cosyvoice-v3-flash
QWEN_TTS_VOICE=longjielidou_v3
```

不要将 `longjielidou_v3` 与 `qwen3-tts-flash` 混用。项目会根据模型自动选择 Qwen3-TTS 或 CosyVoice 的 HTTP 接口。

## 3. 创建声音设计音色

声音设计不需要录音。建议连续创建 2～3 个版本，试听后选择最自然的一个：

```dotenv
QWEN_VOICE_PROMPT=清亮温暖的青少年男声，普通话标准，自然口语，有好奇心和耐心，不要播音腔，不要刻意卖萌。
```

在项目根目录运行：

```bash
node --env-file=.env.local scripts/create-qwen-observer-voice.mjs design
```

脚本会在 `outputs/` 中保存预览音频，并输出两项配置：

```dotenv
QWEN_TTS_MODEL=qwen3-tts-vd-2026-01-26
QWEN_TTS_VOICE=创建后返回的voice值
```

把这两项复制进 `.env.local`。声音设计和实际语音合成必须使用相同的模型。

## 4. 如果仍有 AI 感，改用授权真人复刻

准备一段 10～20 秒、24kHz 或更高、单声道、无背景音乐和混响的 WAV/MP3/M4A。建议由成年配音演员自然表演少年感，并确认声音复刻授权。

```bash
node --env-file=.env.local scripts/create-qwen-observer-voice.mjs clone /绝对路径/小观录音.wav
```

脚本会输出：

```dotenv
QWEN_TTS_MODEL=qwen3-tts-vc-2026-01-22
QWEN_TTS_VOICE=复刻后返回的voice值
```

用这两项替换声音设计配置即可；站点代码不需要改变。

## 5. 本地检查与线上配置

本地重启站点后，小观会优先使用 Qwen；请求失败时仍会降级，不会阻断互动实验。

发布到 Sites 时，需要把以下五项设置为托管环境变量或 Secret：

```text
DASHSCOPE_API_KEY
QWEN_DASHSCOPE_BASE_URL
QWEN_OBSERVER_MODEL
QWEN_TTS_MODEL
QWEN_TTS_VOICE
```

其中只有 `DASHSCOPE_API_KEY` 必须作为 Secret 保存。不要在浏览器开发者工具或网络请求中直接调用阿里云接口。

官方参考：[CosyVoice 音色列表](https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list)、[声音设计](https://help.aliyun.com/zh/model-studio/voice-design-user-guide)、[声音复刻](https://help.aliyun.com/zh/model-studio/voice-cloning-user-guide)、[非实时语音合成](https://help.aliyun.com/zh/model-studio/non-realtime-tts-user-guide)。
