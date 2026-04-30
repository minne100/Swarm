import { expect, test } from "bun:test"
import { createProjectBee } from "./bee.1.0.0.js"

test("create-project bee contract", async () => {
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
    async request() {
      return { id: "p2", name: "Backend Project" }
    },
    state: {
      projects: [{ id: "p1", name: "A" }],
      activeProjectId: "p1",
      messages: { p1: [] },
    },
  }
  const bee = createProjectBee(context)
  const output = await bee.execute({
    type: "AddProjectHoney",
    payload: { name: "B" },
  })
  expect(output.resultHoney.type).toBe("ProjectChangedHoney")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
  expect(context.state.projects[0].name).toBe("Backend Project")
  expect(typeof bee.destroy).toBe("function")
})
