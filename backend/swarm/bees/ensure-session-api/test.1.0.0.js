import { expect, test } from "bun:test"
import { ensureSessionApiBee } from "./bee.1.0.0.js"

test("ensure-session-api bee contract", async () => {
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
    ensureSession(projectId, title) {
      return { id: "s1", projectId, title }
    },
  }
  const bee = ensureSessionApiBee(context)
  const output = await bee.execute({
    type: "EnsureSessionRequestHoney",
    payload: { projectId: "p1", title: "demo" },
  })
  expect(output.resultHoney.type).toBe("SessionReadyHoney")
  expect(output.resultHoney.payload.sessionID).toBe("s1")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
