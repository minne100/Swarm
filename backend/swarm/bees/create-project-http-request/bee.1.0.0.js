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

export class CreateProjectHttpRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeRuntimeContext) {
    const payload = honey?.payload || {}
    try {
      const body = parseRequestBody(payload.bodyText)
      const finalHoney = await runDance(
        beeRuntimeContext,
        this.context.projectConfig.api.dances.createProject,
        this.context.projectConfig.api.honeyTypes.createProject,
        {
          name: body.name,
          projectId: body.projectId,
        },
      )
      if (finalHoney?.type === "ProjectCreatedHoney") {
        const outputHoney = responseHoney(201, finalHoney.payload.project, "json", corsHeaders())
        return this.context.resolveWithReport("CreateProjectHttpRequestBee", "create project handled", outputHoney, {
          operation: "handle create project request",
          status: 201,
        })
      }
      if (finalHoney?.type === "ApiErrorHoney") {
        const outputHoney = responseHoney(
          400,
          { error: finalHoney.payload?.detail || "create project failed" },
          "json",
          corsHeaders(),
        )
        return this.context.resolveWithReport("CreateProjectHttpRequestBee", "create project failed", outputHoney, {
          operation: "handle create project request",
          status: 400,
        })
      }
      const outputHoney = responseHoney(500, { error: "unexpected dance output" }, "json", corsHeaders())
      return this.context.resolveWithReport("CreateProjectHttpRequestBee", "create project unexpected output", outputHoney, {
        operation: "handle create project request",
        status: 500,
      })
    } catch (error) {
      const detail = toDetail(error)
      return this.context.rejectWithReport(
        "CreateProjectHttpRequestBee",
        "create project request failed",
        {
          type: "ApiErrorHoney",
          payload: { detail },
        },
        {
          operation: "handle create project request",
          detail,
        },
      )
    }
  }

  destroy() {}
}

export function createProjectHttpRequestBee(context) {
  return new CreateProjectHttpRequestBee(context)
}
