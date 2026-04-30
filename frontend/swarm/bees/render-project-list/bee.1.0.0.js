function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildReportDetail(operation, inputHoney, outputHoney, note) {
  return {
    operation,
    note,
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
    ],
  }
}

export class RenderProjectListBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    this.context.renderProjectList()
    const outputHoney = {
      type: "RenderedHoney",
      payload: honey?.payload || {},
    }
    return this.context.resolveWithReport(
      "RenderProjectListBee",
      "project list rendered",
      outputHoney,
      buildReportDetail(
        "render project list",
        honey,
        outputHoney,
        "Reads project state and updates the project sidebar list.",
      ),
    )
  }

  destroy() {}
}

export function renderProjectListBee(context) {
  return new RenderProjectListBee(context)
}
