const TOOL_BLOCK_RE = /```tool_calls\s*([\s\S]*?)```/g
const XML_TOOL_RE = /<tool_call>([\s\S]*?)<\/tool_call>/g

function normalizeValue(value) {
  return value === undefined ? null : value
}

function getSession(state, sessionID) {
  return state?.sessions?.[sessionID] || null
}

function activeLlmConfig(context) {
  const runtime = context?.runtime || {}
  const providers = Array.isArray(runtime.llmProviders) && runtime.llmProviders.length > 0 ? runtime.llmProviders : []
  if (providers.length === 0) return context.llmConfig || {}
  const active = providers.find((item) => item.id === runtime.activeProviderId)
  return active || providers[0]
}

function safeParseJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function parseToolCalls(reply) {
  if (typeof reply !== "string" || !reply.trim()) return []
  const callsFromFences = [...reply.matchAll(TOOL_BLOCK_RE)]
    .flatMap((match) => {
      const parsed = safeParseJson((match[1] || "").trim())
      if (Array.isArray(parsed)) return parsed
      if (Array.isArray(parsed?.tool_calls)) return parsed.tool_calls
      if (parsed && typeof parsed === "object") return [parsed]
      return []
    })
    .filter((item) => item && typeof item.name === "string")
  if (callsFromFences.length > 0) return callsFromFences
  return [...reply.matchAll(XML_TOOL_RE)]
    .map((match) => safeParseJson((match[1] || "").trim()))
    .filter((item) => item && typeof item.name === "string")
}

function toolResultText(results) {
  return results
    .map((result) => {
      const status = result.ok ? "ok" : "error"
      const body = result.ok ? result.output : result.error
      const text = typeof body === "string" ? body : JSON.stringify(body)
      return `[tool:${result.name}] ${status}\n${text}`
    })
    .join("\n\n")
}

function buildSuccessDetail(inputHoney, outputHoney, count, llmConfig = {}) {
  return {
    operation: "run local tool calls",
    note: "Parses model tool-call blocks and executes local bees for each call.",
    provider: {
      id: llmConfig.id || null,
      name: llmConfig.name || null,
      model: llmConfig.model || null,
      type: llmConfig.type || "openai-compatible",
    },
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      { path: "$.payload.toolCalls", before: 0, after: count },
      { path: "$.payload.reply", before: normalizeValue(inputHoney?.payload?.reply), after: normalizeValue(outputHoney.payload.reply) },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "run local tool calls",
    note: "Tool call execution failed due to invalid call payload or downstream tool dance error.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      { path: "$.type", before: normalizeValue(inputHoney?.type), after: outputHoney.type },
      { path: "$.payload.detail", before: null, after: detail },
    ],
  }
}

async function runDance(beeRuntimeContext, danceName, payload) {
  const run = beeRuntimeContext.startDance(danceName, {
    inputHoney: {
      type: "ToolCallRequestHoney",
      payload,
    },
  })
  if (!run) throw new Error(`failed to start dance: ${danceName}`)
  return run.done
}

function resolveDanceName(toolConfig, name) {
  if (name === "local.list_files") return toolConfig.dances.listFiles
  if (name === "local.read_file") return toolConfig.dances.readFile
  if (name === "local.search_text") return toolConfig.dances.searchText
  if (name === "local.write_file") return toolConfig.dances.writeFile
  if (name === "skills.read") return toolConfig.dances.readSkill
  if (name === "skills.goal_decomposition.run") return toolConfig.dances.runGoalDecompositionSkill
  if (name === "browser.navigate") return toolConfig.dances.browserNavigate
  if (name === "browser.click") return toolConfig.dances.browserClick
  if (name === "browser.screenshot") return toolConfig.dances.browserScreenshot
  return ""
}

function sessionMessagesForLlm(session) {
  const list = Array.isArray(session?.messages) ? session.messages : []
  return list
    .map((msg) => {
      const role = msg?.info?.role || msg?.role
      if (role !== "user" && role !== "assistant" && role !== "system") return null
      const parts = Array.isArray(msg?.parts) ? msg.parts : []
      const content = parts
        .filter((part) => part?.type === "text" && typeof part?.text === "string")
        .map((part) => part.text.trim())
        .filter(Boolean)
        .join("\n\n")
      if (!content) return null
      return { role, content }
    })
    .filter(Boolean)
}

function requestUrlFromConfig(llmConfig) {
  const type = String(llmConfig?.type || "openai-compatible").trim().toLowerCase()
  if (type === "google-native") {
    const defaultPath = `/v1beta/models/${encodeURIComponent(llmConfig.model || "")}:generateContent`
    const template = llmConfig.chatPath || defaultPath
    const chatPath = String(template).replaceAll("{model}", encodeURIComponent(llmConfig.model || ""))
    return `${String(llmConfig.baseUrl).replace(/\/$/, "")}${String(chatPath).startsWith("/") ? chatPath : `/${chatPath}`}`
  }
  const chatPath = llmConfig.chatPath || "/v1/chat/completions"
  return `${String(llmConfig.baseUrl).replace(/\/$/, "")}${String(chatPath).startsWith("/") ? chatPath : `/${chatPath}`}`
}

function parseResponseJson(rawText, requestUrl) {
  if (!rawText) return {}
  try {
    return JSON.parse(rawText)
  } catch {
    throw new Error(`llm returned non-JSON response url=${requestUrl}`)
  }
}

function extractReply(json) {
  const choices = Array.isArray(json.choices) ? json.choices : []
  const first = choices[0]
  if (typeof first?.message?.content === "string" && first.message.content.trim()) return first.message.content
  if (typeof json.output_text === "string" && json.output_text.trim()) return json.output_text
  return ""
}

function extractGoogleReply(json) {
  const candidates = Array.isArray(json?.candidates) ? json.candidates : []
  const first = candidates[0]
  const parts = Array.isArray(first?.content?.parts) ? first.content.parts : []
  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim()
}

function toGooglePayload(messages) {
  const systemText = messages
    .filter((item) => item?.role === "system" && typeof item?.content === "string")
    .map((item) => item.content.trim())
    .filter(Boolean)
    .join("\n\n")
  const contents = messages
    .filter((item) => item?.role === "user" || item?.role === "assistant")
    .map((item) => {
      const content = typeof item?.content === "string" ? item.content.trim() : ""
      if (!content) return null
      return {
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: content }],
      }
    })
    .filter(Boolean)
  if (systemText) return { systemInstruction: { parts: [{ text: systemText }] }, contents }
  return { contents }
}

async function llmFollowup(context, sessionID, assistantReply, results) {
  const llmConfig = activeLlmConfig(context)
  if (!llmConfig.baseUrl || !llmConfig.apiKey || !llmConfig.model) {
    throw new Error("missing llm config for tool followup")
  }
  const session = getSession(context.state, sessionID)
  if (!session) throw new Error(`session not found: ${sessionID}`)
  const requestUrl = requestUrlFromConfig(llmConfig)
  const providerType = String(llmConfig?.type || "openai-compatible").trim().toLowerCase()
  const messages = [
    ...sessionMessagesForLlm(session),
    { role: "assistant", content: assistantReply || "" },
    { role: "user", content: `[local-tool-results]\n${toolResultText(results)}` },
  ]
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(providerType === "google-native"
        ? { "X-goog-api-key": llmConfig.apiKey }
        : { Authorization: `Bearer ${llmConfig.apiKey}` }),
    },
    body: JSON.stringify(
      providerType === "google-native"
        ? toGooglePayload(messages)
        : {
            model: llmConfig.model,
            stream: false,
            messages,
          },
    ),
  })
  if (!response.ok) {
    const raw = await response.text()
    throw new Error(`llm followup failed (${response.status}) url=${requestUrl}: ${raw || response.statusText}`)
  }
  const parsed = parseResponseJson(await response.text(), requestUrl)
  const reply = providerType === "google-native" ? extractGoogleReply(parsed) : extractReply(parsed)
  if (!reply) throw new Error("llm followup missing assistant text")
  return reply
}

export class RunLocalToolCallsApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeRuntimeContext) {
    const payload = honey?.payload || {}
    try {
      const toolConfig = this.context.projectConfig?.localTools
      if (!toolConfig?.enabled) {
        const llmConfig = activeLlmConfig(this.context)
        return this.context.resolveWithReport("RunLocalToolCallsApiBee", "local tools disabled", honey, buildSuccessDetail(honey, honey, 0, llmConfig))
      }
      if (!beeRuntimeContext || typeof beeRuntimeContext.startDance !== "function") {
        throw new Error("bee runtime context missing startDance")
      }
      let reply = typeof payload.reply === "string" ? payload.reply : ""
      let round = 0
      const mergedResults = []
      while (round < 6) {
        round += 1
        const calls = parseToolCalls(reply)
        if (calls.length === 0) break
        const results = []
        for (const call of calls) {
          const danceName = resolveDanceName(toolConfig, call.name)
          if (!danceName) {
            results.push({ name: call.name, ok: false, error: `unsupported tool: ${call.name}` })
            continue
          }
          const finalHoney = await runDance(beeRuntimeContext, danceName, {
            sessionID: payload.sessionID,
            name: call.name,
            input: call.input && typeof call.input === "object" ? call.input : {},
          })
          if (finalHoney?.type === "ToolCallResultHoney") {
            results.push(finalHoney.payload)
            continue
          }
          results.push({ name: call.name, ok: false, error: "tool returned unexpected honey" })
        }
        mergedResults.push(...results)
        reply = await llmFollowup(this.context, payload.sessionID, reply, results)
      }
      if (mergedResults.length === 0) {
        const llmConfig = activeLlmConfig(this.context)
        return this.context.resolveWithReport("RunLocalToolCallsApiBee", "no tool call found", honey, buildSuccessDetail(honey, honey, 0, llmConfig))
      }
      const outputHoney = {
        type: "PromptTaskHoney",
        payload: {
          ...payload,
          reply,
          toolCalls: mergedResults,
        },
      }
      return this.context.resolveWithReport(
        "RunLocalToolCallsApiBee",
        `executed ${mergedResults.length} tool calls`,
        outputHoney,
        buildSuccessDetail(honey, outputHoney, mergedResults.length, activeLlmConfig(this.context)),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = { type: "ApiErrorHoney", payload: { sessionID: payload.sessionID, detail } }
      return this.context.rejectWithReport(
        "RunLocalToolCallsApiBee",
        "run local tools failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function runLocalToolCallsApiBee(context) {
  return new RunLocalToolCallsApiBee(context)
}
