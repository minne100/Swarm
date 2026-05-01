import { expect, test } from "bun:test"
import { queueAssistantMessageBee } from "./bee.1.0.0.js"

test("queue-assistant-message bee contract", async () => {
  const context = {
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
    pushed: [],
    pushMessage(projectId, role, content) {
      this.pushed.push({ projectId, role, content })
    },
  }
  const bee = queueAssistantMessageBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1", reply: "done" },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.pushed[0].role).toBe("ai")
})

test("queue-assistant-message bee consumes streaming placeholder when available", async () => {
  const context = {
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
    pushed: [],
    consumeAssistantStream() {
      return true
    },
    pushMessage(projectId, role, content) {
      this.pushed.push({ projectId, role, content })
    },
  }
  const bee = queueAssistantMessageBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1", reply: "done" },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.pushed.length).toBe(0)
})

test("queue-assistant-message bee does not append fallback text when reply is empty", async () => {
  const context = {
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
    pushed: [],
    consumeAssistantStream() {
      return false
    },
    pushMessage(projectId, role, content) {
      this.pushed.push({ projectId, role, content })
    },
  }
  const bee = queueAssistantMessageBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1", reply: "" },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.pushed.length).toBe(0)
})
