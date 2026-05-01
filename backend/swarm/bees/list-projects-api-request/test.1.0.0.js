import { expect, test } from "bun:test"
import path from "node:path"
import { mkdirSync } from "node:fs"
import { listProjectsApiRequestBee } from "./bee.1.0.0.js"

test("list-projects-api-request bee contract", async () => {
  const projectsRoot = path.resolve("/tmp", "swarm-test-list-projects")
  mkdirSync(path.resolve(projectsRoot, "demo"), { recursive: true })
  const context = {
    state: { projects: [] },
    runtime: { projectsRoot },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = listProjectsApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: {
      method: "GET",
      url: "http://127.0.0.1:3000/api/projects",
    },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(output.resultHoney.payload.body.projects.some((item) => item.id === "demo")).toBe(true)
})
