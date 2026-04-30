import { expect, test } from "bun:test"
import { createProjectHttpRequestBee } from "./bee.1.0.0.js"

test("create-project-http-request bee contract", async () => {
  const started = []
  const context = {
    projectConfig: {
      api: {
        dances: {
          createProject: "CreateProjectApiDance",
        },
        honeyTypes: {
          createProject: "CreateProjectRequestHoney",
        },
      },
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
  const bee = createProjectHttpRequestBee(context)
  const output = await bee.execute(
    {
      type: "DispatchApiRequestHoney",
      payload: {
        method: "POST",
        url: "http://127.0.0.1:3000/api/projects",
        bodyText: JSON.stringify({ name: "demo", projectId: "p1" }),
      },
    },
    {
      startDance(name, options) {
        started.push({ name, options })
        return {
          done: Promise.resolve({
            type: "ProjectCreatedHoney",
            payload: {
              project: {
                id: "p1",
                name: "demo",
              },
            },
          }),
        }
      },
    },
  )
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(201)
  expect(started.length).toBe(1)
})
