import { expect, test } from "bun:test"

test("tool-browser-click-api dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("ToolBrowserClickApiDance")
  expect(dance.input).toBe("ToolCallRequestHoney")
  expect(dance.output).toBe("ToolCallResultHoney")
})
