import { expect, test } from "bun:test"

test("submit-prompt-api dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("SubmitPromptApiDance")
  expect(dance.input).toBe("SubmitPromptRequestHoney")
  expect(Array.isArray(dance.bees)).toBe(true)
  expect(Array.isArray(dance.steps)).toBe(true)
  expect(dance.bees.length > 0).toBe(true)
  expect(dance.steps.length > 0).toBe(true)
  dance.steps.forEach((step) => {
    expect(typeof step.id).toBe("string")
    expect(typeof step.alias).toBe("string")
    expect(typeof step.description).toBe("string")
  })
  expect(dance.steps.some((step) => step.id === "run-local-tool-calls")).toBe(true)
  expect(dance.steps.some((step) => step.alias === "run-local-tool-calls-api")).toBe(true)
})
