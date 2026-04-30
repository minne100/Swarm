import { expect, test } from "bun:test"
import { notFoundApiRequestBee } from "./bee.1.0.0.js"

test("not-found-api-request bee contract", async () => {
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = notFoundApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: {
      method: "GET",
      url: "http://127.0.0.1:3000/unknown",
    },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(404)
})
