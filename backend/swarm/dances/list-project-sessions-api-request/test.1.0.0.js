import { expect, test } from "bun:test"

test("list-project-sessions-api-request dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("ListProjectSessionsApiRequestDance")
  expect(dance.input).toBe("DispatchApiRequestHoney")
  expect(Array.isArray(dance.steps)).toBe(true)
  expect(dance.steps.length > 0).toBe(true)
})
