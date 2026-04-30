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

export class RenderAttachmentsBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    this.context.renderAttachments()
    const outputHoney = {
      type: "RenderedHoney",
      payload: honey?.payload || {},
    }
    return this.context.resolveWithReport(
      "RenderAttachmentsBee",
      "attachments rendered",
      outputHoney,
      buildReportDetail(
        "render attachment tags",
        honey,
        outputHoney,
        "Reads current attachment state and updates attachment chips.",
      ),
    )
  }

  destroy() {}
}

export function renderAttachmentsBee(context) {
  return new RenderAttachmentsBee(context)
}
