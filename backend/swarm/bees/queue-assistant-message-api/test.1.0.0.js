import { expect, test } from "bun:test"
import path from "node:path"
import { mkdirSync } from "node:fs"
import { queueAssistantMessageApiBee } from "./bee.1.0.0.js"

test("queue-assistant-message-api bee contract", async () => {
  const projectsRoot = path.resolve("/tmp", "swarm-test-queue-assistant-message")
  mkdirSync(path.resolve(projectsRoot, "p1"), { recursive: true })
  const context = {
    state: {
      sessions: {
        s1: {
          id: "s1",
          projectId: "p1",
          messages: [{ id: "m-user", parts: [{ type: "text", text: "hello" }], info: { role: "user" } }],
        },
      },
    },
    runtime: { projectsRoot },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    rejectWithReport(_beeName, _summary, errorHoney) {
      return Promise.reject({
        errorHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = queueAssistantMessageApiBee(context)
  const output = await bee.execute({
    type: "PromptTaskHoney",
    payload: {
      sessionID: "s1",
      reply: "done",
    },
  })
  expect(output.resultHoney.type).toBe("PromptResultHoney")
  expect(typeof output.resultHoney.payload.messageID).toBe("string")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})

test("queue-assistant-message-api keeps streamed message when messageID already exists", async () => {
  const context = {
    state: {
      sessions: {
        s1: {
          id: "s1",
          projectId: "p1",
          messages: [{ id: "m-stream", parts: [{ type: "text", text: "streaming" }], info: { role: "assistant" } }],
        },
      },
    },
    runtime: { projectsRoot: path.resolve("/tmp", "swarm-test-queue-assistant-message-2") },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    rejectWithReport(_beeName, _summary, errorHoney) {
      return Promise.reject({
        errorHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = queueAssistantMessageApiBee(context)
  const output = await bee.execute({
    type: "PromptTaskHoney",
    payload: {
      sessionID: "s1",
      reply: "done",
      messageID: "m-stream",
    },
  })
  expect(output.resultHoney.type).toBe("PromptResultHoney")
  expect(output.resultHoney.payload.messageID).toBe("m-stream")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
