import path from "node:path"
import { existsSync, readdirSync, readFileSync } from "node:fs"

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

function parseRequestUrl(url) {
  if (typeof url !== "string" || !url) throw new Error("invalid request url")
  return new URL(url)
}

function projectIdFromSessionsPath(pathname) {
  const match = pathname.match(/^\/api\/projects\/([^/]+)\/sessions$/)
  if (!match) return ""
  return decodeURIComponent(match[1])
}

export class ListProjectSessionsApiRequestBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const requestUrl = parseRequestUrl(payload.url)
      const projectId = projectIdFromSessionsPath(requestUrl.pathname)
      if (!projectId) {
        const outputHoney = responseHoney(404, { error: "not found" }, "json", corsHeaders())
        return this.context.resolveWithReport("ListProjectSessionsApiRequestBee", "sessions route not found", outputHoney)
      }
      const limitRaw = Number(requestUrl.searchParams.get("limit") || "5")
      const offsetRaw = Number(requestUrl.searchParams.get("offset") || "0")
      const limit = Number.isInteger(limitRaw) ? limitRaw : 5
      const offset = Number.isInteger(offsetRaw) ? offsetRaw : 0
      const root = path.resolve(this.context.runtime.projectsRoot, projectId, "sessions")
      if (!existsSync(root)) {
        const outputHoney = responseHoney(200, { sessions: [], nextOffset: offset, hasMore: false }, "json", corsHeaders())
        return this.context.resolveWithReport("ListProjectSessionsApiRequestBee", "list project sessions handled", outputHoney)
      }
      const files = readdirSync(root).filter((name) => name.endsWith(".json")).sort((a, b) => b.localeCompare(a, "en"))
      const safeOffset = Number.isInteger(offset) && offset >= 0 ? offset : 0
      const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 5
      const selected = files
        .slice(safeOffset, safeOffset + safeLimit)
        .map((name) => JSON.parse(readFileSync(path.resolve(root, name), "utf8")))
      const nextOffset = safeOffset + selected.length
      const result = { sessions: selected, nextOffset, hasMore: nextOffset < files.length }
      const outputHoney = responseHoney(200, result, "json", corsHeaders())
      return this.context.resolveWithReport("ListProjectSessionsApiRequestBee", "list project sessions handled", outputHoney)
    } catch (error) {
      const detail = toDetail(error)
      return this.context.rejectWithReport(
        "ListProjectSessionsApiRequestBee",
        "list project sessions failed",
        { type: "ApiErrorHoney", payload: { detail } },
      )
    }
  }

  destroy() {}
}

export function listProjectSessionsApiRequestBee(context) {
  return new ListProjectSessionsApiRequestBee(context)
}
