function normalizeValue(value) {
  return value === undefined ? null : value
}

function textPart(text) {
  return [{ type: "text", text: typeof text === "string" ? text : "" }]
}

function getSession(state, sessionID) {
  return state?.sessions?.[sessionID] || null
}

function getSessionMessage(state, sessionID, messageID) {
  const session = getSession(state, sessionID)
  if (!session) return null
  return session.messages.find((item) => item.id === messageID) || null
}

function ensureAssistantTextMessage(message, createdAt = Date.now()) {
  if (!message.info || typeof message.info !== "object") message.info = {}
  message.info.role = "assistant"
  if (!message.info.time || typeof message.info.time !== "object") message.info.time = { created: createdAt }
  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    message.parts = textPart("")
    return message
  }
  const first = message.parts[0]
  if (!first || first.type !== "text" || typeof first.text !== "string") message.parts = textPart("")
  return message
}

function beginAssistantStream(state, sessionID) {
  const session = getSession(state, sessionID)
  if (!session) throw new Error(`session not found: ${sessionID}`)
  const message = {
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`,
    parts: textPart(""),
    info: { role: "assistant", time: { created: Date.now() }, stream: { done: false } },
  }
  session.messages.push(message)
  return message
}

function updateAssistantStream(state, sessionID, messageID, replyText) {
  const message = getSessionMessage(state, sessionID, messageID)
  if (!message) throw new Error(`assistant stream message not found: ${messageID}`)
  ensureAssistantTextMessage(message)
  message.parts[0].text = typeof replyText === "string" ? replyText : ""
  return message
}

function finishAssistantStream(state, sessionID, messageID, replyText) {
  const message = updateAssistantStream(state, sessionID, messageID, replyText)
  message.info.stream = { done: true }
  return message
}

function failAssistantStream(state, sessionID, messageID) {
  const message = getSessionMessage(state, sessionID, messageID)
  if (!message) return null
  ensureAssistantTextMessage(message)
  message.info.stream = { done: true, failed: true }
  return message
}

function activeLlmConfig(context) {
  const runtime = context?.runtime || {}
  const providers = Array.isArray(runtime.llmProviders) && runtime.llmProviders.length > 0 ? runtime.llmProviders : []
  if (providers.length === 0) return context.llmConfig || {}
  const active = providers.find((item) => item.id === runtime.activeProviderId)
  return active || providers[0]
}

function normalizeParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return [{ type: "text", text: "" }]
  const normalized = parts
    .map((part) => {
      if (!part || typeof part !== "object") return null
      if (part.type === "text" && typeof part.text === "string") return { type: "text", text: part.text }
      if (part.type === "file") {
        const filename = typeof part.filename === "string" ? part.filename : "file"
        const mime = typeof part.mime === "string" ? part.mime : "application/octet-stream"
        const url = typeof part.url === "string" ? part.url : ""
        return { type: "file", filename, mime, url }
      }
      return null
    })
    .filter(Boolean)
  if (normalized.length > 0) return normalized
  return [{ type: "text", text: "" }]
}

function isTextMime(mime) {
  if (!mime) return false
  if (mime.startsWith("text/")) return true
  if (mime === "application/json") return true
  if (mime.endsWith("+json")) return true
  if (mime.endsWith("+xml")) return true
  if (mime === "application/xml") return true
  if (mime === "application/javascript") return true
  if (mime === "application/x-javascript") return true
  if (mime === "application/typescript") return true
  if (mime === "application/x-yaml") return true
  if (mime === "application/yaml") return true
  if (mime === "application/csv") return true
  return false
}

function isTextExtension(filename) {
  if (typeof filename !== "string" || !filename.includes(".")) return false
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return (
    ext === ".txt" ||
    ext === ".md" ||
    ext === ".json" ||
    ext === ".jsonl" ||
    ext === ".yaml" ||
    ext === ".yml" ||
    ext === ".xml" ||
    ext === ".csv" ||
    ext === ".ts" ||
    ext === ".tsx" ||
    ext === ".js" ||
    ext === ".jsx" ||
    ext === ".mjs" ||
    ext === ".cjs" ||
    ext === ".py" ||
    ext === ".java" ||
    ext === ".go" ||
    ext === ".rs" ||
    ext === ".c" ||
    ext === ".cpp" ||
    ext === ".h" ||
    ext === ".hpp" ||
    ext === ".sql" ||
    ext === ".log"
  )
}

function fileExtension(filename) {
  if (typeof filename !== "string" || !filename.includes(".")) return ""
  return filename.slice(filename.lastIndexOf(".")).toLowerCase()
}

function isTextFilePart(part) {
  const filename = part?.filename || ""
  const mime = part?.mime || ""
  return isTextMime(mime) || isTextExtension(filename)
}

function parseBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback
  if (typeof value === "boolean") return value
  if (typeof value !== "string") return fallback
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  if (normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on") return true
  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") return false
  return fallback
}

function multimodalCapability(llmConfig) {
  const enabled = parseBool(llmConfig.multimodal, false)
  if (!enabled) return { enabled: false, image: false, audio: false }
  return {
    enabled,
    image: parseBool(llmConfig.multimodalImage, true),
    audio: parseBool(llmConfig.multimodalAudio, true),
  }
}

function parseDataUrl(url) {
  if (typeof url !== "string" || !url.startsWith("data:")) return null
  const commaIndex = url.indexOf(",")
  if (commaIndex < 0) return null
  const metadata = url.slice(5, commaIndex)
  const payload = url.slice(commaIndex + 1)
  const segments = metadata.split(";").filter(Boolean)
  if (segments.length === 0) return { mime: "application/octet-stream", payload, isBase64: false }
  const mime = segments[0].includes("=") ? "application/octet-stream" : segments[0]
  const isBase64 = segments.includes("base64")
  return { mime: mime || "application/octet-stream", payload, isBase64 }
}

function dataUrlBase64(url) {
  const parsed = parseDataUrl(url)
  if (!parsed) return null
  if (parsed.isBase64) return { mime: parsed.mime, base64: parsed.payload }
  try {
    return {
      mime: parsed.mime,
      base64: Buffer.from(decodeURIComponent(parsed.payload), "utf8").toString("base64"),
    }
  } catch {
    return null
  }
}

function audioFormat(part, mime) {
  const ext = fileExtension(part?.filename || "")
  if (ext === ".wav" || mime === "audio/wav" || mime === "audio/x-wav") return "wav"
  if (ext === ".mp3" || ext === ".mpeg" || mime === "audio/mpeg" || mime === "audio/mp3") return "mp3"
  if (ext === ".flac" || mime === "audio/flac") return "flac"
  return ""
}

function decodeDataUrlText(url) {
  const parsed = parseDataUrl(url)
  if (!parsed) return ""
  if (parsed.isBase64) {
    return Buffer.from(parsed.payload, "base64").toString("utf8")
  }
  return decodeURIComponent(parsed.payload)
}

function textFromFilePart(part) {
  const filename = part.filename || "file"
  const mime = part.mime || "application/octet-stream"
  if (!isTextFilePart(part)) {
    return `[attachment] ${filename} (${mime})`
  }
  const rawText = decodeDataUrlText(part.url).replace(/\0/g, "")
  if (!rawText.trim()) {
    return `[attachment:text] ${filename} (${mime})\n(empty text attachment)`
  }
  const maxChars = 20_000
  if (rawText.length <= maxChars) {
    return `[attachment:text] ${filename} (${mime})\n${rawText}`
  }
  return `[attachment:text] ${filename} (${mime})\n${rawText.slice(0, maxChars)}\n...[truncated ${rawText.length - maxChars} chars]`
}

function multimodalFileParts(part, capability) {
  const filename = part.filename || "file"
  const mime = part.mime || "application/octet-stream"
  if (isTextFilePart(part)) {
    const text = textFromFilePart(part).trim()
    return text ? [{ type: "text", text }] : []
  }
  if (capability.image && mime.startsWith("image/") && part.url.startsWith("data:")) {
    return [
      { type: "text", text: `[attachment:image] ${filename} (${mime})` },
      { type: "image_url", image_url: { url: part.url } },
    ]
  }
  if (capability.audio && mime.startsWith("audio/")) {
    const encoded = dataUrlBase64(part.url)
    const format = audioFormat(part, encoded?.mime || mime)
    if (encoded?.base64 && format) {
      return [
        { type: "text", text: `[attachment:audio] ${filename} (${mime})` },
        { type: "input_audio", input_audio: { data: encoded.base64, format } },
      ]
    }
  }
  const text = textFromFilePart(part).trim()
  return text ? [{ type: "text", text }] : []
}

function textFromParts(parts) {
  return normalizeParts(parts)
    .map((part) => {
      if (part.type === "text") return part.text.trim()
      if (part.type === "file") return textFromFilePart(part).trim()
      return ""
    })
    .filter(Boolean)
    .join("\n\n")
}

function messageContentFromParts(parts, capability) {
  if (!capability.enabled) return textFromParts(parts)
  const content = normalizeParts(parts).flatMap((part) => {
    if (part.type === "text") {
      const text = part.text.trim()
      return text ? [{ type: "text", text }] : []
    }
    if (part.type === "file") return multimodalFileParts(part, capability)
    return []
  })
  if (content.length > 0) return content
  return textFromParts(parts)
}

function hasMessageContent(content) {
  if (typeof content === "string") return Boolean(content.trim())
  if (!Array.isArray(content)) return false
  return content.length > 0
}

function buildRequestUrl(baseUrl, chatPath) {
  return `${String(baseUrl).replace(/\/$/, "")}${String(chatPath).startsWith("/") ? chatPath : `/${chatPath}`}`
}

function normalizeProviderType(llmConfig) {
  return String(llmConfig?.type || "openai-compatible").trim().toLowerCase()
}

function requestUrlForProvider(llmConfig) {
  const type = normalizeProviderType(llmConfig)
  if (type !== "google-native") {
    const chatPath = llmConfig.chatPath || "/v1/chat/completions"
    return buildRequestUrl(llmConfig.baseUrl, chatPath)
  }
  const defaultPath = `/v1beta/models/${encodeURIComponent(llmConfig.model || "")}:generateContent`
  const chatPathTemplate = llmConfig.chatPath || defaultPath
  const chatPath = String(chatPathTemplate).replaceAll("{model}", encodeURIComponent(llmConfig.model || ""))
  return buildRequestUrl(llmConfig.baseUrl, chatPath)
}

function providerHeaders(llmConfig, providerType) {
  return providerType === "google-native"
    ? { "Content-Type": "application/json", "X-goog-api-key": llmConfig.apiKey }
    : { "Content-Type": "application/json", Authorization: `Bearer ${llmConfig.apiKey}` }
}

function providerBody(llmConfig, providerType, messages, shouldStream) {
  if (providerType === "google-native") return toGoogleNativePayload(messages)
  return { model: llmConfig.model, messages, stream: shouldStream }
}

function parseResponseJson(rawText, requestUrl) {
  if (!rawText) return {}
  try {
    return JSON.parse(rawText)
  } catch {
    const preview = rawText.slice(0, 160).replace(/\s+/g, " ").trim()
    throw new Error(
      `llm returned non-JSON response url=${requestUrl}, check llm.baseUrl/chatPath (got: ${preview || "empty"})`,
    )
  }
}

function extractReply(json) {
  const choices = Array.isArray(json.choices) ? json.choices : []
  const first = choices[0]
  if (typeof first?.message?.content === "string" && first.message.content.trim()) return first.message.content
  if (Array.isArray(first?.message?.content)) {
    const joined = first.message.content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .filter(Boolean)
      .join("\n")
    if (joined.trim()) return joined
  }
  if (typeof json.output_text === "string" && json.output_text.trim()) return json.output_text
  return ""
}

function extractGoogleReply(json) {
  const candidates = Array.isArray(json?.candidates) ? json.candidates : []
  const first = candidates[0]
  const parts = Array.isArray(first?.content?.parts) ? first.content.parts : []
  const text = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
  return text.trim()
}

function textFromMessageContent(content) {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
}

function toGoogleNativePayload(messages) {
  const systemText = messages
    .filter((item) => item?.role === "system")
    .map((item) => textFromMessageContent(item.content).trim())
    .filter(Boolean)
    .join("\n\n")
  const contents = messages
    .filter((item) => item?.role === "user" || item?.role === "assistant")
    .map((item) => {
      const text = textFromMessageContent(item.content).trim()
      if (!text) return null
      return {
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text }],
      }
    })
    .filter(Boolean)
  if (systemText) {
    return {
      systemInstruction: { parts: [{ text: systemText }] },
      contents,
    }
  }
  return { contents }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function textFromContentArray(parts) {
  if (!Array.isArray(parts)) return ""
  return parts
    .map((part) => {
      if (typeof part?.text === "string") return part.text
      if (part?.type === "text" && typeof part?.text === "string") return part.text
      return ""
    })
    .filter(Boolean)
    .join("")
}

function deltaTextFromStreamChunk(json) {
  const first = Array.isArray(json?.choices) ? json.choices[0] : null
  if (typeof first?.delta?.content === "string") return first.delta.content
  const deltaFromArray = textFromContentArray(first?.delta?.content)
  if (deltaFromArray) return deltaFromArray
  if (typeof first?.message?.content === "string") return first.message.content
  const contentFromArray = textFromContentArray(first?.message?.content)
  if (contentFromArray) return contentFromArray
  if (typeof json?.output_text === "string") return json.output_text
  return ""
}

function consumeSseBuffer(buffer, onData) {
  let lineBreakIndex = buffer.indexOf("\n")
  while (lineBreakIndex >= 0) {
    const line = buffer.slice(0, lineBreakIndex).trim()
    buffer = buffer.slice(lineBreakIndex + 1)
    if (line.startsWith("data:")) {
      const data = line.slice(5).trim()
      if (data && data !== "[DONE]") onData(data)
    }
    lineBreakIndex = buffer.indexOf("\n")
  }
  return buffer
}

async function streamReply(response, requestUrl, onReply) {
  if (!response.body) return ""
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let lastJson = null
  let reply = ""
  while (true) {
    const chunk = await reader.read()
    if (chunk.done) break
    buffer = consumeSseBuffer(buffer + decoder.decode(chunk.value, { stream: true }), (data) => {
      const json = safeJsonParse(data)
      if (!json) return
      lastJson = json
      const delta = deltaTextFromStreamChunk(json)
      if (!delta) return
      reply += delta
      onReply(reply)
    })
  }
  buffer = consumeSseBuffer(buffer + decoder.decode(), (data) => {
    const json = safeJsonParse(data)
    if (!json) return
    lastJson = json
    const delta = deltaTextFromStreamChunk(json)
    if (!delta) return
    reply += delta
    onReply(reply)
  })
  if (reply.trim()) return reply
  if (lastJson) {
    const fallback = extractReply(lastJson)
    if (fallback) return fallback
  }
  const raw = buffer.trim()
  if (!raw) return ""
  return extractReply(parseResponseJson(raw, requestUrl))
}

function buildSuccessDetail(inputHoney, outputHoney, reply, llmConfig = {}) {
  return {
    operation: "call upstream llm endpoint",
    note: "Sends session conversation to configured LLM and writes returned assistant text into payload.reply.",
    provider: {
      id: llmConfig.id || null,
      name: llmConfig.name || null,
      model: llmConfig.model || null,
      type: llmConfig.type || "openai-compatible",
    },
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.payload.reply",
        before: normalizeValue(inputHoney?.payload?.reply),
        after: normalizeValue(reply),
      },
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "call upstream llm endpoint",
    note: "Upstream call failed due to HTTP/auth/model/config/network issue.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: detail,
      },
    ],
  }
}

export class CallLlmApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    let streamedMessageID = ""
    try {
      const session = getSession(this.context.state, payload.sessionID)
      if (!session) throw new Error(`session not found: ${payload.sessionID}`)
      if (payload.triggerGoalDecomposition) {
        const project = (this.context.state?.projects || []).find((item) => item.id === session.projectId)
        const projectName = project?.name || session.projectId || ""
        const userMessage = [...session.messages].reverse().find((item) => item?.info?.role === "user")
        const userText = (Array.isArray(userMessage?.parts) ? userMessage.parts : [])
          .map((part) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
          .join("\n")
        const llmConfig = activeLlmConfig(this.context)
        const providerType = normalizeProviderType(llmConfig)
        const requestUrl = requestUrlForProvider(llmConfig)
        const response = await fetch(requestUrl, {
          method: "POST",
          headers: providerHeaders(llmConfig, providerType),
          body: JSON.stringify(
            providerBody(
              llmConfig,
              providerType,
              [
                {
                  role: "system",
                  content: "你是 Swarm 的 goal-decomposition 执行助手。请先进行需求澄清并输出已确认事项、待确认事项和关键问题。",
                },
                {
                  role: "user",
                  content: `项目标题：${projectName}\n用户第一句话：${userText}`,
                },
              ],
              false,
            ),
          ),
        })
        if (!response.ok) {
          const rawText = await response.text()
          throw new Error(`llm request failed (${response.status}) url=${requestUrl}: ${rawText || response.statusText}`)
        }
        const json = parseResponseJson(await response.text(), requestUrl)
        const reply = providerType === "google-native" ? extractGoogleReply(json) : extractReply(json)
        const outputHoney = {
          type: "PromptTaskHoney",
          payload: {
            ...payload,
            reply,
          },
        }
        return this.context.resolveWithReport(
          "CallLlmApiBee",
          "goal decomposition first round replied",
          outputHoney,
          buildSuccessDetail(honey, outputHoney, reply, llmConfig),
        )
      }
      const llmConfig = activeLlmConfig(this.context)
      if (!llmConfig.baseUrl || !llmConfig.apiKey) {
        throw new Error("missing llm.baseUrl or llm.apiKey in backend/project.js (or SWARM_LLM_* env)")
      }
      if (!llmConfig.model) {
        throw new Error("missing llm.model in backend/project.js (or SWARM_LLM_MODEL env)")
      }
      const providerType = normalizeProviderType(llmConfig)
      const capability = multimodalCapability(llmConfig)
      const shouldStream = providerType === "google-native" ? false : parseBool(llmConfig.stream, true)
      const requestUrl = requestUrlForProvider(llmConfig)
      const messages = session.messages
        .map((msg) => {
          const role = msg?.info?.role || msg?.role
          if (role !== "user" && role !== "assistant" && role !== "system") return null
          const content = role === "user" ? messageContentFromParts(msg.parts, capability) : textFromParts(msg.parts)
          if (!hasMessageContent(content)) return null
          return {
            role,
            content,
          }
        })
        .filter(Boolean)
      if (shouldStream) streamedMessageID = beginAssistantStream(this.context.state, payload.sessionID).id
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: providerHeaders(llmConfig, providerType),
        body: JSON.stringify(providerBody(llmConfig, providerType, messages, shouldStream)),
      })
      if (!response.ok) {
        const rawText = await response.text()
        throw new Error(`llm request failed (${response.status}) url=${requestUrl}: ${rawText || response.statusText}`)
      }
      let reply = ""
      if (shouldStream) {
        reply = await streamReply(response, requestUrl, (text) => {
          if (!streamedMessageID) return
          updateAssistantStream(this.context.state, payload.sessionID, streamedMessageID, text)
        })
      } else {
        const json = parseResponseJson(await response.text(), requestUrl)
        reply = providerType === "google-native" ? extractGoogleReply(json) : extractReply(json)
      }
      if (streamedMessageID) finishAssistantStream(this.context.state, payload.sessionID, streamedMessageID, reply)
      if (!reply) throw new Error("llm response missing assistant text")
      const outputHoney = {
        type: "PromptTaskHoney",
        payload: {
          ...payload,
          reply,
          messageID: streamedMessageID || undefined,
        },
      }
      return this.context.resolveWithReport(
        "CallLlmApiBee",
        "llm replied",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, reply, llmConfig),
      )
    } catch (error) {
      if (streamedMessageID) failAssistantStream(this.context.state, payload.sessionID, streamedMessageID)
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          sessionID: payload.sessionID,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "CallLlmApiBee",
        "llm call failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function callLlmApiBee(context) {
  return new CallLlmApiBee(context)
}
