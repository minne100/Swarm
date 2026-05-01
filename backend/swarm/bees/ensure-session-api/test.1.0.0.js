import { expect, test } from "bun:test"
import { ensureSessionApiBee } from "./bee.1.0.0.js"

test("ensure-session-api bee contract", async () => {
  const context = {
    state: { projects: [{ id: "p1", name: "demo", createdAt: 1 }], sessions: {}, sessionByProject: {} },
    runtime: { projectsRoot: "/tmp/swarm-test-ensure-session" },
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
  const bee = ensureSessionApiBee(context)
  const output = await bee.execute({
    type: "EnsureSessionRequestHoney",
    payload: { projectId: "p1", title: "demo" },
  })
  expect(output.resultHoney.type).toBe("SessionReadyHoney")
  expect(typeof output.resultHoney.payload.sessionID).toBe("string")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
