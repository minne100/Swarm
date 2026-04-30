import { expect, test } from "bun:test"
import { queuePromptErrorBee } from "./bee.1.0.0.js"

test("queue-prompt-error bee contract", async () => {
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
    state: { activeProjectId: "p1" },
    pushed: [],
    pushMessage(projectId, role, content) {
      this.pushed.push({ projectId, role, content })
    },
  }
  const bee = queuePromptErrorBee(context)
  const output = await bee.execute({
    type: "PromptFlowErrorHoney",
    payload: { projectId: "p1", detail: "x" },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.pushed[0].role).toBe("ai")
})
