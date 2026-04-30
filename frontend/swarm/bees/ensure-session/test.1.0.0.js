import { expect, test } from "bun:test"
import { ensureSessionBee } from "./bee.1.0.0.js"

test("ensure-session bee success contract", async () => {
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
    state: {
      projects: [{ id: "p1", name: "A" }],
    },
    async ensureSession() {
      return "s1"
    },
  }
  const bee = ensureSessionBee(context)
  const output = await bee.execute({
    type: "PromptFlowHoney",
    payload: { projectId: "p1" },
  })
  expect(output.resultHoney.type).toBe("PromptFlowHoney")
  expect(output.resultHoney.payload.sessionID).toBe("s1")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})

test("ensure-session bee reject contract", async () => {
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
    state: {
      projects: [],
    },
    async ensureSession() {
      return "x"
    },
  }
  const bee = ensureSessionBee(context)
  const error = await bee
    .execute({
      type: "PromptFlowHoney",
      payload: { projectId: "p404" },
    })
    .catch((err) => err)
  expect(error.errorHoney.type).toBe("PromptFlowErrorHoney")
  expect(error.reportHoney.type).toBe("BeeReportHoney")
})
