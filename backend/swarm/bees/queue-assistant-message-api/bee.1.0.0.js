import path from "node:path"
import { mkdirSync, writeFileSync } from "node:fs"

function normalizeValue(value) {
  return value === undefined ? null : value
}

function textPart(text) {
  return [{ type: "text", text: typeof text === "string" ? text : "" }]
}

function textFromParts(parts) {
  if (!Array.isArray(parts)) return ""
  return parts
    .map((part) => (part?.type === "text" && typeof part?.text === "string" ? part.text : ""))
    .join("\n")
}

function getSession(state, sessionID) {
  return state?.sessions?.[sessionID] || null
}

function getSessionMessage(state, sessionID, messageID) {
  const session = getSession(state, sessionID)
  if (!session) return null
  return session.messages.find((item) => item.id === messageID) || null
}

function appendAssistantMessage(state, runtime, sessionID, replyText) {
  const session = getSession(state, sessionID)
  if (!session) throw new Error(`session not found: ${sessionID}`)
  const message = {
    id: `m-${Date.now()}-${Math.floor(Math.random() * 10_000_000)}`,
    parts: textPart(replyText),
    info: { role: "assistant", time: { created: Date.now() }, stream: { done: true } },
  }
  session.messages.push(message)
  const root = path.resolve(runtime.projectsRoot, session.projectId, "sessions")
  mkdirSync(root, { recursive: true })
  const createdAt = Date.now()
  const recordId = `${createdAt}-${Math.floor(Math.random() * 10_000_000)}`
  const userMessage = [...session.messages].reverse().find((item) => item?.info?.role === "user")
  writeFileSync(
    path.resolve(root, `${recordId}.json`),
    JSON.stringify({
      id: recordId,
      sessionID,
      projectId: session.projectId,
      createdAt,
      messages: [
        { role: "user", content: textFromParts(userMessage?.parts) },
        { role: "assistant", content: typeof replyText === "string" ? replyText : "" },
      ],
    }),
  )
  return message
}

function buildSuccessDetail(inputHoney, outputHoney, messageID) {
  return {
    operation: "append assistant reply to backend session history",
    note: "Persists assistant text and returns message id for traceability.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.messageID",
        before: normalizeValue(inputHoney?.payload?.messageID),
        after: normalizeValue(messageID),
      },
      {
        path: "$.payload.reply",
        before: normalizeValue(inputHoney?.payload?.reply),
        after: normalizeValue(outputHoney.payload.reply),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "append assistant reply to backend session history",
    note: "Failed to persist assistant message due to session/state issue.",
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

export class QueueAssistantMessageApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const existingMessage = payload.messageID ? getSessionMessage(this.context.state, payload.sessionID, payload.messageID) : null
      const message = existingMessage || appendAssistantMessage(this.context.state, this.context.runtime, payload.sessionID, payload.reply)
      const outputHoney = {
        type: "PromptResultHoney",
        payload: {
          sessionID: payload.sessionID,
          reply: payload.reply,
          messageID: message.id,
        },
      }
      return this.context.resolveWithReport(
        "QueueAssistantMessageApiBee",
        "assistant message queued",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, message.id),
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
        "QueueAssistantMessageApiBee",
        "queue assistant message failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function queueAssistantMessageApiBee(context) {
  return new QueueAssistantMessageApiBee(context)
}
