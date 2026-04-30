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

export class OptionsApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute() {
    const outputHoney = responseHoney(204, null, "empty", corsHeaders())
    return this.context.resolveWithReport("OptionsApiRequestBee", "options handled", outputHoney, {
      operation: "handle options request",
      status: 204,
    })
  }

  destroy() {}
}

export function optionsApiRequestBee(context) {
  return new OptionsApiRequestBee(context)
}
