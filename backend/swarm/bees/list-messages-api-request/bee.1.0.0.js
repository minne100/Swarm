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

function sessionIDFromMessagePath(pathname) {
  const match = pathname.match(/^\/session\/([^/]+)\/message$/)
  if (!match) return ""
  return decodeURIComponent(match[1])
}

export class ListMessagesApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const requestUrl = parseRequestUrl(payload.url)
      const sessionID = sessionIDFromMessagePath(requestUrl.pathname)
      if (!sessionID) {
        const outputHoney = responseHoney(404, { error: "not found" }, "json", corsHeaders())
        return this.context.resolveWithReport("ListMessagesApiRequestBee", "message route not found", outputHoney, {
          operation: "handle list messages request",
          status: 404,
        })
      }
      const session = this.context.state?.sessions?.[sessionID]
      if (!session) {
        const outputHoney = responseHoney(404, { error: `session not found: ${sessionID}` }, "json", corsHeaders())
        return this.context.resolveWithReport("ListMessagesApiRequestBee", "message session not found", outputHoney, {
          operation: "handle list messages request",
          status: 404,
        })
      }
      const limitRaw = requestUrl.searchParams.get("limit")
      const limitValue = limitRaw ? Number(limitRaw) : 80
      const count = Number.isInteger(limitValue) ? limitValue : 80
      const messages = session.messages.length <= count ? [...session.messages] : session.messages.slice(session.messages.length - count)
      const outputHoney = responseHoney(
        200,
        {
          messages,
        },
        "json",
        corsHeaders(),
      )
      return this.context.resolveWithReport("ListMessagesApiRequestBee", "list messages handled", outputHoney, {
        operation: "handle list messages request",
        status: 200,
      })
    } catch (error) {
      const detail = toDetail(error)
      return this.context.rejectWithReport(
        "ListMessagesApiRequestBee",
        "list messages request failed",
        {
          type: "ApiErrorHoney",
          payload: { detail },
        },
        {
          operation: "handle list messages request",
          detail,
        },
      )
    }
  }

  destroy() {}
}

export function listMessagesApiRequestBee(context) {
  return new ListMessagesApiRequestBee(context)
}
