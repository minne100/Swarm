import { expect, test } from "bun:test"
import { listMessagesApiRequestBee } from "./bee.1.0.0.js"

test("list-messages-api-request bee contract", async () => {
  const context = {
    state: {
      sessions: {
        s1: {
          id: "s1",
          messages: [{ id: "m1" }],
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
  const bee = listMessagesApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: {
      method: "GET",
      url: "http://127.0.0.1:3000/session/s1/message?limit=10",
    },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(output.resultHoney.payload.body.messages.length).toBe(1)
})
