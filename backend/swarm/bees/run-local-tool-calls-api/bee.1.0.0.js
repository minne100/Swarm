const TOOL_BLOCK_RE = /```tool_calls\s*([\s\S]*?)```/g
const XML_TOOL_RE = /<tool_call>([\s\S]*?)<\/tool_call>/g

function normalizeValue(value) {
  return value === undefined ? null : value
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

function buildSuccessDetail(inputHoney, outputHoney, count) {
  return {
    operation: "run local tool calls",
    note: "Parses model tool-call blocks and executes local bees for each call.",
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
  if (name === "browser.navigate") return toolConfig.dances.browserNavigate
  if (name === "browser.click") return toolConfig.dances.browserClick
  if (name === "browser.screenshot") return toolConfig.dances.browserScreenshot
  return ""
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
        return this.context.resolveWithReport("RunLocalToolCallsApiBee", "local tools disabled", honey, buildSuccessDetail(honey, honey, 0))
      }
      if (!beeRuntimeContext || typeof beeRuntimeContext.startDance !== "function") {
        throw new Error("bee runtime context missing startDance")
      }
      const calls = parseToolCalls(payload.reply)
      if (calls.length === 0) {
        return this.context.resolveWithReport("RunLocalToolCallsApiBee", "no tool call found", honey, buildSuccessDetail(honey, honey, 0))
      }
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
      const outputHoney = {
        type: "PromptTaskHoney",
        payload: {
          ...payload,
          reply: `${payload.reply}\n\n[local-tool-results]\n${toolResultText(results)}`,
          toolCalls: results,
        },
      }
      return this.context.resolveWithReport(
        "RunLocalToolCallsApiBee",
        `executed ${results.length} tool calls`,
        outputHoney,
        buildSuccessDetail(honey, outputHoney, results.length),
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
