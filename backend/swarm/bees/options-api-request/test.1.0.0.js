import { expect, test } from "bun:test"
import { optionsApiRequestBee } from "./bee.1.0.0.js"

test("options-api-request bee contract", async () => {
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = optionsApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: {
      method: "OPTIONS",
      url: "http://127.0.0.1:3000/health",
    },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(204)
  expect(output.resultHoney.payload.kind).toBe("empty")
})
