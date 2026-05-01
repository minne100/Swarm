import { expect, test } from "bun:test"
import { ensureSessionHttpRequestBee } from "./bee.1.0.0.js"

test("ensure-session-http-request bee contract", async () => {
  const started = []
  const context = {
    projectConfig: {
      api: {
        dances: {
          ensureSession: "EnsureSessionApiDance",
        },
        honeyTypes: {
          ensureSession: "EnsureSessionRequestHoney",
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
  const bee = ensureSessionHttpRequestBee(context)
  const output = await bee.execute(
    {
      type: "DispatchApiRequestHoney",
      payload: {
        method: "POST",
        url: "http://127.0.0.1:3000/session",
        bodyText: JSON.stringify({ projectId: "p1", title: "demo" }),
      },
    },
    {
      startDance(name, options) {
        started.push({ name, options })
        return {
          done: Promise.resolve({
            type: "SessionReadyHoney",
            payload: {
              sessionID: "s1",
              projectId: "p1",
            },
          }),
        }
      },
    },
  )
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(started.length).toBe(1)
  expect(started[0].name).toBe("EnsureSessionApiDance")
  expect(started[0].options.inputHoney.type).toBe("EnsureSessionRequestHoney")
  expect(started[0].options.inputHoney.payload.projectId).toBe("p1")
  expect(started[0].options.inputHoney.payload.title).toBe("demo")
})
