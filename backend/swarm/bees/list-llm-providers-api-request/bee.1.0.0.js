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

export class ListLlmProvidersApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute() {
    const outputHoney = responseHoney(
      200,
      {
        activeProviderId: this.context.runtime.activeProviderId,
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
    return this.context.resolveWithReport("ListLlmProvidersApiRequestBee", "list llm providers handled", outputHoney, {
      operation: "handle list llm providers request",
      status: 200,
    })
  }

  destroy() {}
}

export function listLlmProvidersApiRequestBee(context) {
  return new ListLlmProvidersApiRequestBee(context)
}
