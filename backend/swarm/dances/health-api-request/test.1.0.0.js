import { expect, test } from "bun:test"

test("health-api-request dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("HealthApiRequestDance")
  expect(dance.input).toBe("DispatchApiRequestHoney")
  expect(dance.output).toBe("HttpApiResponseHoney")
})
