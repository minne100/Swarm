import { expect, test } from "bun:test"
import { clearComposerBee } from "./bee.1.0.0.js"

test("clear-composer bee contract", async () => {
  let cleared = 0
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
    clearComposer() {
      cleared += 1
    },
  }
  const bee = clearComposerBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1" },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(cleared).toBe(1)
})
