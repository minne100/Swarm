import { expect, test } from "bun:test"
import { dispatchApiRequestBee } from "./bee.1.0.0.js"

test("dispatch-api-request bee contract", async () => {
  const started = []
  const context = {
    projectConfig: {
      api: {
        dances: {
          optionsRequest: "OptionsApiRequestDance",
          healthRequest: "HealthApiRequestDance",
          listProjectsRequest: "ListProjectsApiRequestDance",
          createProjectRequest: "CreateProjectHttpRequestDance",
          ensureSessionRequest: "EnsureSessionHttpRequestDance",
          submitPromptAsyncRequest: "SubmitPromptAsyncHttpRequestDance",
          listMessagesRequest: "ListMessagesApiRequestDance",
          notFoundRequest: "NotFoundApiRequestDance",
        },
        honeyTypes: {
          dispatchRequest: "DispatchApiRequestHoney",
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
  const bee = dispatchApiRequestBee(context)
  const runtimeContext = {
    startDance(name, options) {
      started.push({ name, options })
      return {
        done: Promise.resolve({
          type: "HttpApiResponseHoney",
          payload: {
            status: 200,
            kind: "json",
            headers: {},
            body: { ok: true, dance: name, method: options.inputHoney.payload.method },
          },
        }),
      }
    },
  }
  const nonApi = await bee.execute(
    {
      type: "DispatchApiRequestHoney",
      payload: {
        method: "GET",
        url: "http://127.0.0.1:3000/",
      },
    },
    runtimeContext,
  )
  expect(nonApi.resultHoney.type).toBe("ApiNotHandledHoney")
  const health = await bee.execute(
    {
      type: "DispatchApiRequestHoney",
      payload: {
        method: "GET",
        url: "http://127.0.0.1:3000/health",
      },
    },
    runtimeContext,
  )
  expect(health.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(health.resultHoney.payload.status).toBe(200)
  expect(health.resultHoney.payload.body.dance).toBe("HealthApiRequestDance")
  const created = await bee.execute(
    {
      type: "DispatchApiRequestHoney",
      payload: {
        method: "POST",
        url: "http://127.0.0.1:3000/api/projects",
        bodyText: JSON.stringify({ name: "demo" }),
      },
    },
    runtimeContext,
  )
  expect(created.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(created.resultHoney.payload.status).toBe(200)
  expect(created.resultHoney.payload.body.dance).toBe("CreateProjectHttpRequestDance")
  expect(started.length).toBe(2)
})
