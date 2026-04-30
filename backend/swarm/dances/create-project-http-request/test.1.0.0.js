import { expect, test } from "bun:test"

test("create-project-http-request dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("CreateProjectHttpRequestDance")
  expect(dance.input).toBe("DispatchApiRequestHoney")
  expect(dance.output).toBe("HttpApiResponseHoney")
})
