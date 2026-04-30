import { expect, test } from "bun:test"
import { waitReplyBee } from "./bee.1.0.0.js"

test("wait-reply bee success contract", async () => {
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
    async waitAssistantReply() {
      return "ok"
    },
  }
  const bee = waitReplyBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1", sessionID: "s1", sentAt: Date.now() },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.resultHoney.payload.reply).toBe("ok")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
