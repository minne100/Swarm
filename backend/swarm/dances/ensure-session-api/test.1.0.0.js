import { expect, test } from "bun:test"

test("ensure-session-api dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("EnsureSessionApiDance")
  expect(dance.input).toBe("EnsureSessionRequestHoney")
  expect(Array.isArray(dance.bees)).toBe(true)
  expect(Array.isArray(dance.steps)).toBe(true)
  expect(dance.bees.length > 0).toBe(true)
  expect(dance.steps.length > 0).toBe(true)
})
