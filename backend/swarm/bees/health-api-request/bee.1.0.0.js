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

export class HealthApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute() {
    const outputHoney = responseHoney(200, { ok: true, ts: Date.now() }, "json", corsHeaders())
    return this.context.resolveWithReport("HealthApiRequestBee", "health handled", outputHoney, {
      operation: "handle health request",
      status: 200,
    })
  }

  destroy() {}
}

export function healthApiRequestBee(context) {
  return new HealthApiRequestBee(context)
}
