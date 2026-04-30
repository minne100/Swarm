import { expect, test } from "bun:test"
import { healthApiRequestBee } from "./bee.1.0.0.js"

test("health-api-request bee contract", async () => {
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = healthApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: {
      method: "GET",
      url: "http://127.0.0.1:3000/health",
    },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(output.resultHoney.payload.body.ok).toBe(true)
})
