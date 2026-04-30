import { expect, test } from "bun:test"
import { passThroughErrorApiBee } from "./bee.1.0.0.js"

test("pass-through-error-api bee contract", async () => {
  const context = {
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({
        resultHoney,
        reportHoney: { type: "BeeReportHoney", payload: {} },
      })
    },
  }
  const bee = passThroughErrorApiBee(context)
  const output = await bee.execute({
    type: "ApiErrorHoney",
    payload: { detail: "failed" },
  })
  expect(output.resultHoney.type).toBe("ApiErrorHoney")
  expect(output.resultHoney.payload.detail).toBe("failed")
})
