import { expect, test } from "bun:test"
import { createProjectApiBee } from "./bee.1.0.0.js"

test("create-project-api bee contract", async () => {
  const context = {
    state: { projects: [] },
    runtime: { projectsRoot: "/tmp/swarm-test-create-project" },
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
  const bee = createProjectApiBee(context)
  const output = await bee.execute({
    type: "CreateProjectRequestHoney",
    payload: { name: "Backend Project" },
  })
  expect(output.resultHoney.type).toBe("ProjectCreatedHoney")
  expect(output.resultHoney.payload.project.name).toBe("Backend Project")
  expect(output.reportHoney.type).toBe("BeeReportHoney")
})
