import { expect, test } from "bun:test"
import { loadProjectSessionsBee } from "./bee.1.0.0.js"

test("load-project-sessions bee contract", async () => {
  const context = {
    async loadProjectSessions(projectId) {
      expect(projectId).toBe("p1")
    },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
    rejectWithReport(_beeName, _summary, errorHoney) {
      return Promise.reject({ errorHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = loadProjectSessionsBee(context)
  const output = await bee.execute({ type: "ProjectChangedHoney", payload: { projectId: "p1" } })
  expect(output.resultHoney.type).toBe("ProjectChangedHoney")
})
