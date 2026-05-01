import { expect, test } from "bun:test"
import { fetchProjectsBee } from "./bee.1.0.0.js"

test("fetch-projects bee contract", async () => {
  const context = {
    state: {
      projects: [{ id: "old", name: "Old" }],
      activeProjectId: "old",
    },
    async request() {
      return {
        projects: [
          { id: "p1", name: "A" },
          { id: "p2", name: "B" },
        ],
      }
    },
    async loadProjectSessions(projectId) {
      expect(projectId).toBe("p1")
    },
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
  const bee = fetchProjectsBee(context)
  const output = await bee.execute({ type: "RenderedHoney", payload: {} })
  expect(output.resultHoney.type).toBe("ProjectChangedHoney")
  expect(context.state.projects.length).toBe(2)
  expect(context.state.activeProjectId).toBe("p1")
})
