import { expect, test } from "bun:test"

test("bootstrap-runtime dance definition contract", async () => {
  const dance = await Bun.file(`${import.meta.dir}/dance.1.0.0.json`).json()
  expect(dance.name).toBe("BootstrapRuntimeDance")
  expect(dance.input).toBe("RuntimeBootstrapHoney")
  expect(dance.output).toBe("RuntimeReadyHoney")
  expect(dance.steps[0].alias).toBe("bootstrap-runtime")
})
