import { expect, test } from "bun:test"
import path from "node:path"
import { mkdirSync, writeFileSync } from "node:fs"
import { listProjectSessionsApiRequestBee } from "./bee.1.0.0.js"

test("list-project-sessions-api-request bee contract", async () => {
  const root = path.resolve("/tmp", "swarm-test-list-project-sessions", "p1", "sessions")
  mkdirSync(root, { recursive: true })
  writeFileSync(path.resolve(root, "1.json"), JSON.stringify({ id: "x" }))
  const context = {
    runtime: { projectsRoot: path.resolve("/tmp", "swarm-test-list-project-sessions") },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = listProjectSessionsApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: { method: "GET", url: "http://127.0.0.1:3000/api/projects/p1/sessions?limit=5&offset=0" },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(output.resultHoney.payload.body.sessions.length).toBe(1)
})
