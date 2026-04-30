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
    payload: {
      status,
      kind,
      headers,
      body,
    },
  }
}

export class NotFoundApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute() {
    const outputHoney = responseHoney(404, { error: "not found" }, "json", corsHeaders())
    return this.context.resolveWithReport("NotFoundApiRequestBee", "not found handled", outputHoney, {
      operation: "handle unknown api route",
      status: 404,
    })
  }

  destroy() {}
}

export function notFoundApiRequestBee(context) {
  return new NotFoundApiRequestBee(context)
}
