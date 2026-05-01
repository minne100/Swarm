function toDetail(error) {
  if (error instanceof Error) return error.message
  return String(error)
}

function parseRequestUrl(url) {
  if (typeof url !== "string" || !url) throw new Error("invalid request url")
  return new URL(url)
}

function isApiRoute(pathname) {
  return pathname.startsWith("/api/") || pathname.startsWith("/session/") || pathname === "/session" || pathname === "/health"
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

function buildSuccessDetail(inputHoney, outputHoney, route, status, targetDance = "") {
  return {
    operation: "dispatch api request",
    note: "Routes request to endpoint-specific dances and returns their normalized response honey.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: inputHoney?.type || null,
        after: outputHoney.type,
      },
      {
        path: "$.payload.route",
        before: inputHoney?.payload?.pathname || null,
        after: route || null,
      },
      {
        path: "$.payload.status",
        before: null,
        after: status === undefined ? null : status,
      },
      {
        path: "$.payload.targetDance",
        before: null,
        after: targetDance || null,
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "dispatch api request",
    note: "Failed to dispatch request due to invalid payload or downstream dance failure.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: inputHoney?.type || null,
        after: outputHoney.type,
      },
      {
        path: "$.payload.detail",
        before: inputHoney?.payload?.detail || null,
        after: detail,
      },
    ],
  }
}

function resolveDanceName(config, method, pathname) {
  if (method === "OPTIONS") return config.api.dances.optionsRequest
  if (method === "GET" && pathname === "/health") return config.api.dances.healthRequest
  if (method === "GET" && pathname === "/api/projects") return config.api.dances.listProjectsRequest
  if (method === "POST" && pathname === "/api/projects") return config.api.dances.createProjectRequest
  if (method === "POST" && pathname === "/session") return config.api.dances.ensureSessionRequest
  if (method === "POST" && /^\/session\/([^/]+)\/prompt_async$/.test(pathname)) return config.api.dances.submitPromptAsyncRequest
  if (method === "GET" && /^\/session\/([^/]+)\/message$/.test(pathname)) return config.api.dances.listMessagesRequest
  if (method === "GET" && /^\/api\/projects\/([^/]+)\/sessions$/.test(pathname)) return config.api.dances.listProjectSessionsRequest
  return config.api.dances.notFoundRequest
}

export class DispatchApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey, beeRuntimeContext) {
    const payload = honey?.payload || {}
    try {
      const method = typeof payload.method === "string" ? payload.method.toUpperCase() : "GET"
      const requestUrl = parseRequestUrl(payload.url)
      const pathname = requestUrl.pathname
      if (!isApiRoute(pathname)) {
        const outputHoney = {
          type: "ApiNotHandledHoney",
          payload: {
            pathname,
          },
        }
        return this.context.resolveWithReport(
          "DispatchApiRequestBee",
          "non-api request passthrough",
          outputHoney,
          buildSuccessDetail(honey, outputHoney, pathname, null),
        )
      }
      const targetDance = resolveDanceName(this.context.projectConfig, method, pathname)
      const finalHoney = await runDance(
        beeRuntimeContext,
        targetDance,
        this.context.projectConfig.api.honeyTypes.dispatchRequest,
        payload,
      )
      if (finalHoney?.type === "HttpApiResponseHoney") {
        const outputHoney = finalHoney
        return this.context.resolveWithReport(
          "DispatchApiRequestBee",
          "request dispatched",
          outputHoney,
          buildSuccessDetail(honey, outputHoney, pathname, outputHoney.payload.status, targetDance),
        )
      }
      const outputHoney = {
        type: "HttpApiResponseHoney",
        payload: {
          status: 500,
          kind: "json",
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: {
            error: "unexpected endpoint dance output",
          },
        },
      }
      return this.context.resolveWithReport(
        "DispatchApiRequestBee",
        "endpoint dance returned unexpected output",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, pathname, 500, targetDance),
      )
    } catch (error) {
      const detail = toDetail(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          detail,
        },
      }
      return this.context.rejectWithReport(
        "DispatchApiRequestBee",
        "dispatch failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function dispatchApiRequestBee(context) {
  return new DispatchApiRequestBee(context)
}
