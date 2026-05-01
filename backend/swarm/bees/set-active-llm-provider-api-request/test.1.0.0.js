import { expect, test } from "bun:test"
import { setActiveLlmProviderApiRequestBee } from "./bee.1.0.0.js"

test("set-active-llm-provider-api-request bee contract", async () => {
  const context = {
    runtime: { activeProviderId: "1", llmProviders: [{ id: "1", name: "A" }, { id: "2", name: "B" }] },
    resolveWithReport(_beeName, _summary, resultHoney) {
      return Promise.resolve({ resultHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
    rejectWithReport(_beeName, _summary, errorHoney) {
      return Promise.reject({ errorHoney, reportHoney: { type: "BeeReportHoney", payload: {} } })
    },
  }
  const bee = setActiveLlmProviderApiRequestBee(context)
  const output = await bee.execute({
    type: "DispatchApiRequestHoney",
    payload: { bodyText: JSON.stringify({ providerId: "2" }) },
  })
  expect(output.resultHoney.type).toBe("HttpApiResponseHoney")
  expect(output.resultHoney.payload.status).toBe(200)
  expect(output.resultHoney.payload.body.activeProviderId).toBe("2")
})
