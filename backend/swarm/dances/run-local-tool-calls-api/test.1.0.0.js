import { expect, test } from "bun:test"

test("run-local-tool-calls-api dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("RunLocalToolCallsApiDance")
  expect(dance.input).toBe("PromptTaskHoney")
  expect(dance.output).toBe("PromptTaskHoney")
  expect(Array.isArray(dance.steps)).toBe(true)
  expect(dance.steps.length).toBe(1)
})
