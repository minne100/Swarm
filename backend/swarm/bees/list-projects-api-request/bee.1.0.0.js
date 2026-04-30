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

export class ListProjectsApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute() {
    const outputHoney = responseHoney(200, { projects: this.context.listProjects() }, "json", corsHeaders())
    return this.context.resolveWithReport("ListProjectsApiRequestBee", "list projects handled", outputHoney, {
      operation: "handle list projects request",
      status: 200,
    })
  }

  destroy() {}
}

export function listProjectsApiRequestBee(context) {
  return new ListProjectsApiRequestBee(context)
}
