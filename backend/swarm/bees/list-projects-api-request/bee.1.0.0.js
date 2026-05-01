import { readdirSync } from "node:fs"

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
    const entries = readdirSync(this.context.runtime.projectsRoot, { withFileTypes: true })
    const projects = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ id: entry.name, name: entry.name, createdAt: 0 }))
      .sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"))
    this.context.state.projects = projects
    const outputHoney = responseHoney(200, { projects }, "json", corsHeaders())
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
