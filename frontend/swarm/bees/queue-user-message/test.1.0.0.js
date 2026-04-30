import { expect, test } from "bun:test"
import { queueUserMessageBee } from "./bee.1.0.0.js"

test("queue-user-message bee contract", async () => {
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
  const bee = queueUserMessageBee(context)
  const output = await bee.execute({
    type: "SubmitPromptHoney",
    payload: { projectId: "p1", text: "hello", files: [] },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.pushed.length).toBe(1)
  expect(context.pushed[0].role).toBe("user")
})
