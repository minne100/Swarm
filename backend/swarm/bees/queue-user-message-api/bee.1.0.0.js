import path from "node:path"
import { existsSync, readdirSync } from "node:fs"

function normalizeValue(value) {
  return value === undefined ? null : value
}

function normalizeParts(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return [{ type: "text", text: "" }]
  const normalized = parts
    .map((part) => {
      if (!part || typeof part !== "object") return null
      if (part.type === "text" && typeof part.text === "string") return { type: "text", text: part.text }
      if (part.type === "file") {
        const filename = typeof part.filename === "string" ? part.filename : "file"
        const mime = typeof part.mime === "string" ? part.mime : "application/octet-stream"
        const url = typeof part.url === "string" ? part.url : ""
        return { type: "file", filename, mime, url }
      }
      return null
    })
    .filter(Boolean)
  if (normalized.length > 0) return normalized
  return [{ type: "text", text: "" }]
}

function appendUserMessage(state, sessionID, parts) {
  const session = state?.sessions?.[sessionID]
  if (!session) throw new Error(`session not found: ${sessionID}`)
  const message = {
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`,
    parts: normalizeParts(parts),
    info: { role: "user", time: { created: Date.now() } },
  }
  session.messages.push(message)
  return message
}

function shouldTriggerGoalDecomposition(state, runtime, sessionID) {
  const session = state?.sessions?.[sessionID]
  if (!session) return false
  const persistedRoot = path.resolve(runtime.projectsRoot, session.projectId, "sessions")
  if (existsSync(persistedRoot) && readdirSync(persistedRoot).some((name) => name.endsWith(".json"))) return false
  const userCount = session.messages.filter((item) => item?.info?.role === "user").length
  const assistantCount = session.messages.filter((item) => item?.info?.role === "assistant").length
  return userCount === 1 && assistantCount === 0
}

function buildSuccessDetail(inputHoney, outputHoney, sentAt) {
  return {
    operation: "append user message to backend session history",
    note: "Writes user message into session.messages and timestamps prompt task payload.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.sentAt",
        before: normalizeValue(inputHoney?.payload?.sentAt),
        after: normalizeValue(sentAt),
      },
      {
        path: "$.payload.parts",
        before: normalizeValue(inputHoney?.payload?.parts),
        after: normalizeValue(outputHoney.payload.parts),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "append user message to backend session history",
    note: "Failed to append user message because session is invalid or state write failed.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: detail,
      },
    ],
  }
}

export class QueueUserMessageApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const message = appendUserMessage(this.context.state, payload.sessionID, payload.parts)
      const triggerGoalDecomposition = shouldTriggerGoalDecomposition(this.context.state, this.context.runtime, payload.sessionID)
      const outputHoney = {
        type: "PromptTaskHoney",
        payload: {
          sessionID: payload.sessionID,
          parts: payload.parts,
          sentAt: message.info.time.created,
          triggerGoalDecomposition,
        },
      }
      return this.context.resolveWithReport(
        "QueueUserMessageApiBee",
        "user message queued",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, message.info.time.created),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          sessionID: payload.sessionID,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "QueueUserMessageApiBee",
        "queue user message failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function queueUserMessageApiBee(context) {
  return new QueueUserMessageApiBee(context)
}
