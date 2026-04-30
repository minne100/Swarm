import { expect, test } from "bun:test"

test("dispatch-api-request dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("DispatchApiRequestDance")
  expect(dance.input).toBe("DispatchApiRequestHoney")
  expect(dance.output).toBe("HttpApiResponseHoney")
  expect(Array.isArray(dance.bees)).toBe(true)
  expect(Array.isArray(dance.steps)).toBe(true)
  expect(dance.bees.length > 0).toBe(true)
  expect(dance.steps.length > 0).toBe(true)
  dance.steps.forEach((step) => {
    expect(typeof step.id).toBe("string")
    expect(typeof step.alias).toBe("string")
    expect(typeof step.description).toBe("string")
  })
})
