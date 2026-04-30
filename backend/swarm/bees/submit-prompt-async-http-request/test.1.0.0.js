import { expect, test } from "bun:test"
import { submitPromptAsyncHttpRequestBee } from "./bee.1.0.0.js"

test("submit-prompt-async-http-request bee contract", async () => {
  const started = []
  const context = {
    projectConfig: {
      api: {
        dances: {
          submitPromptAsync: "SubmitPromptAsyncApiDance",
        },
        honeyTypes: {
          submitPromptAsync: "SubmitPromptAsyncRequestHoney",
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
    hasSession(sessionID) {
      return sessionID === "s1"
    },
  }
  const bee = submitPromptAsyncHttpRequestBee(context)
  const output = await bee.execute(
    {
      type: "DispatchApiRequestHoney",
      payload: {
        method: "POST",
        url: "http://127.0.0.1:3000/session/s1/prompt_async",
        bodyText: JSON.stringify({ parts: [{ type: "text", text: "hello" }] }),
      },
    },
    {
      startDance(name, options) {
        started.push({ name, options })
        return {
          done: Promise.resolve({
            type: "SubmitPromptQueuedHoney",
            payload: {
              accepted: true,
              sessionID: "s1",
            },
          }),
        }
      },
    },
  )
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(202)
  expect(started.length).toBe(1)
})
