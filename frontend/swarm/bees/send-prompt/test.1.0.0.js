import { expect, test } from "bun:test"
import { sendPromptBee } from "./bee.1.0.0.js"

test("send-prompt bee success contract", async () => {
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
    calls: [],
    async sendPromptAsync(sessionID, parts) {
      this.calls.push({ sessionID, parts })
    },
  }
  const bee = sendPromptBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1", sessionID: "s1", parts: [{ type: "text", text: "x" }] },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.calls.length).toBe(1)
})
