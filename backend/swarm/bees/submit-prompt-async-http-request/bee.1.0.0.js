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

function parseRequestBody(bodyText) {
  if (!bodyText) return {}
  try {
    return JSON.parse(bodyText)
  } catch {
    throw new Error("invalid JSON body")
  }
}

function parseRequestUrl(url) {
  if (typeof url !== "string" || !url) throw new Error("invalid request url")
  return new URL(url)
}

function responseHoney(status, body, kind = "json", headers = {}) {
  return {
    type: "HttpApiResponseHoney",
    payload: {
      status,
      kind,
      headers,
      body,
    },
  }
}

async function runDance(beeRuntimeContext, danceName, honeyType, payload) {
  const run = beeRuntimeContext.startDance(danceName, {
    inputHoney: {
      type: honeyType,
      payload,
    },
  })
  if (!run) throw new Error(`failed to start dance: ${danceName}`)
  return run.done
}

function sessionIDFromPromptPath(pathname) {
  const match = pathname.match(/^\/session\/([^/]+)\/prompt_async$/)
  if (!match) return ""
  return decodeURIComponent(match[1])
}

export class SubmitPromptAsyncHttpRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeRuntimeContext) {
    const payload = honey?.payload || {}
    try {
      const pathname = parseRequestUrl(payload.url).pathname
      const sessionID = sessionIDFromPromptPath(pathname)
      if (!sessionID) {
        const outputHoney = responseHoney(404, { error: "not found" }, "json", corsHeaders())
        return this.context.resolveWithReport(
          "SubmitPromptAsyncHttpRequestBee",
          "prompt route not found",
          outputHoney,
          {
            operation: "handle prompt async request",
            status: 404,
          },
        )
      }
      if (!this.context.hasSession(sessionID)) {
        const outputHoney = responseHoney(404, { error: `session not found: ${sessionID}` }, "json", corsHeaders())
        return this.context.resolveWithReport(
          "SubmitPromptAsyncHttpRequestBee",
          "prompt session not found",
          outputHoney,
          {
            operation: "handle prompt async request",
            status: 404,
          },
        )
      }
      const body = parseRequestBody(payload.bodyText)
      const finalHoney = await runDance(
        beeRuntimeContext,
        this.context.projectConfig.api.dances.submitPromptAsync,
        this.context.projectConfig.api.honeyTypes.submitPromptAsync,
        {
          sessionID,
          parts: body.parts,
        },
      )
      if (finalHoney?.type === "SubmitPromptQueuedHoney") {
        const outputHoney = responseHoney(202, { accepted: true, sessionID }, "json", corsHeaders())
        return this.context.resolveWithReport("SubmitPromptAsyncHttpRequestBee", "prompt queued", outputHoney, {
          operation: "handle prompt async request",
          status: 202,
        })
      }
      if (finalHoney?.type === "ApiErrorHoney") {
        const outputHoney = responseHoney(
          400,
          { error: finalHoney.payload?.detail || "queue prompt failed" },
          "json",
          corsHeaders(),
        )
        return this.context.resolveWithReport("SubmitPromptAsyncHttpRequestBee", "prompt queue failed", outputHoney, {
          operation: "handle prompt async request",
          status: 400,
        })
      }
      const outputHoney = responseHoney(500, { error: "unexpected dance output" }, "json", corsHeaders())
      return this.context.resolveWithReport("SubmitPromptAsyncHttpRequestBee", "prompt queue unexpected output", outputHoney, {
        operation: "handle prompt async request",
        status: 500,
      })
    } catch (error) {
      const detail = toDetail(error)
      return this.context.rejectWithReport(
        "SubmitPromptAsyncHttpRequestBee",
        "prompt async request failed",
        {
          type: "ApiErrorHoney",
          payload: { detail },
        },
        {
          operation: "handle prompt async request",
          detail,
        },
      )
    }
  }

  destroy() {}
}

export function submitPromptAsyncHttpRequestBee(context) {
  return new SubmitPromptAsyncHttpRequestBee(context)
}
