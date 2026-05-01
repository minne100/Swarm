import { expect, test } from "bun:test"
import { listLlmProvidersApiRequestBee } from "./bee.1.0.0.js"

test("list-llm-providers-api-request bee contract", async () => {
  const context = {
    runtime: { activeProviderId: "1", llmProviders: [{ id: "1", name: "A", model: "m1" }] },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = listLlmProvidersApiRequestBee(context)
  const output = await bee.execute({ type: "DispatchApiRequestHoney", payload: {} })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(output.resultHoney.payload.body.providers.length).toBe(1)
})
