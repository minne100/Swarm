function toDetail(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

function corsHeaders(extraHeaders = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extraHeaders,
  }
}

function responseHoney(status, body, kind = "json", headers = {}) {
  return {
    type: "HttpApiResponseHoney",
    payload: { status, kind, headers, body },
  }
}

function parseRequestBody(bodyText) {
  if (!bodyText) return {}
  try {
    return JSON.parse(bodyText)
  } catch {
    throw new Error("invalid JSON body")
  }
}

export class SetActiveLlmProviderApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const body = parseRequestBody(payload.bodyText)
      if (typeof body?.providerId !== "string" || !body.providerId.trim()) throw new Error("provider id is required")
      const providerId = body.providerId.trim()
      const exists = this.context.runtime.llmProviders.some((item) => item.id === providerId)
      if (!exists) throw new Error(`unknown llm provider: ${providerId}`)
      this.context.runtime.activeProviderId = providerId
      const outputHoney = responseHoney(
        200,
        {
          activeProviderId: providerId,
          providers: this.context.runtime.llmProviders.map((provider) => ({
            id: provider.id,
            name: provider.name || provider.id,
            type: provider.type || "openai-compatible",
            model: provider.model || "",
            baseUrl: provider.baseUrl || "",
            chatPath: provider.chatPath || "/v1/chat/completions",
            stream: provider.stream || "true",
            multimodal: provider.multimodal || "",
            multimodalImage: provider.multimodalImage || "",
            multimodalAudio: provider.multimodalAudio || "",
          })),
        },
        "json",
        corsHeaders(),
      )
      return this.context.resolveWithReport("SetActiveLlmProviderApiRequestBee", "set active llm provider handled", outputHoney, {
        operation: "handle set active llm provider request",
        status: 200,
      })
    } catch (error) {
      const detail = toDetail(error)
      if (detail === "invalid JSON body" || detail.startsWith("provider id is required")) {
        const outputHoney = responseHoney(400, { error: detail }, "json", corsHeaders())
        return this.context.resolveWithReport("SetActiveLlmProviderApiRequestBee", "set active llm provider failed", outputHoney, {
          operation: "handle set active llm provider request",
          status: 400,
        })
      }
      if (detail.startsWith("unknown llm provider")) {
        const outputHoney = responseHoney(400, { error: detail }, "json", corsHeaders())
        return this.context.resolveWithReport("SetActiveLlmProviderApiRequestBee", "set active llm provider failed", outputHoney, {
          operation: "handle set active llm provider request",
          status: 400,
        })
      }
      return this.context.rejectWithReport(
        "SetActiveLlmProviderApiRequestBee",
        "set active llm provider request failed",
        { type: "ApiErrorHoney", payload: { detail } },
        { operation: "handle set active llm provider request", status: 500, detail },
      )
    }
  }

  destroy() {}
}

export function setActiveLlmProviderApiRequestBee(context) {
  return new SetActiveLlmProviderApiRequestBee(context)
}
