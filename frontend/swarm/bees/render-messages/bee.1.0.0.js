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

export class RenderMessagesBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    this.context.renderMessages()
    const outputHoney = {
      type: "RenderedHoney",
      payload: honey?.payload || {},
    }
    return this.context.resolveWithReport(
      "RenderMessagesBee",
      "messages rendered",
      outputHoney,
      buildReportDetail(
        "render message list",
        honey,
        outputHoney,
        "Reads current active project messages and updates the messages container.",
      ),
    )
  }

  destroy() {}
}

export function renderMessagesBee(context) {
  return new RenderMessagesBee(context)
}
