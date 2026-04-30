import { expect, test } from "bun:test"
import { listProjectsApiRequestBee } from "./bee.1.0.0.js"

test("list-projects-api-request bee contract", async () => {
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
    listProjects() {
      return [{ id: "p1", name: "demo" }]
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
  expect(output.resultHoney.payload.body.projects.length).toBe(1)
})
