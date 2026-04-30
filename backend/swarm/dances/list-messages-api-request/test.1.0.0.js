import { expect, test } from "bun:test"

test("list-messages-api-request dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("ListMessagesApiRequestDance")
  expect(dance.input).toBe("DispatchApiRequestHoney")
  expect(dance.output).toBe("HttpApiResponseHoney")
})
