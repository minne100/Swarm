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

export class EnsureSessionHttpRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeRuntimeContext) {
    const payload = honey?.payload || {}
    try {
      const body = parseRequestBody(payload.bodyText)
      const finalHoney = await runDance(
        beeRuntimeContext,
        this.context.projectConfig.api.dances.ensureSession,
        this.context.projectConfig.api.honeyTypes.ensureSession,
        {
          projectId: body.projectId,
          title: body.title,
        },
      )
      if (finalHoney?.type === "SessionReadyHoney") {
        const outputHoney = responseHoney(
          200,
          {
            id: finalHoney.payload.sessionID,
            projectId: finalHoney.payload.projectId,
          },
          "json",
          corsHeaders(),
        )
        return this.context.resolveWithReport("EnsureSessionHttpRequestBee", "ensure session handled", outputHoney, {
          operation: "handle ensure session request",
          status: 200,
        })
      }
      if (finalHoney?.type === "ApiErrorHoney") {
        const outputHoney = responseHoney(
          400,
          { error: finalHoney.payload?.detail || "ensure session failed" },
          "json",
          corsHeaders(),
        )
        return this.context.resolveWithReport("EnsureSessionHttpRequestBee", "ensure session failed", outputHoney, {
          operation: "handle ensure session request",
          status: 400,
        })
      }
      const outputHoney = responseHoney(500, { error: "unexpected dance output" }, "json", corsHeaders())
      return this.context.resolveWithReport("EnsureSessionHttpRequestBee", "ensure session unexpected output", outputHoney, {
        operation: "handle ensure session request",
        status: 500,
      })
    } catch (error) {
      const detail = toDetail(error)
      return this.context.rejectWithReport(
        "EnsureSessionHttpRequestBee",
        "ensure session request failed",
        {
          type: "ApiErrorHoney",
          payload: { detail },
        },
        {
          operation: "handle ensure session request",
          detail,
        },
      )
    }
  }

  destroy() {}
}

export function ensureSessionHttpRequestBee(context) {
  return new EnsureSessionHttpRequestBee(context)
}
