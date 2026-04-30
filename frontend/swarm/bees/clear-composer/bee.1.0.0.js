function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildReportDetail(operation, inputHoney, outputHoney, changes, note) {
  return {
    operation,
    note,
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes,
  }
}

export class ClearComposerBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    this.context.clearComposer()
    const outputHoney = {
      type: "PromptFlowHoney",
      payload: { ...(honey?.payload || {}) },
    }
    return this.context.resolveWithReport(
      "ClearComposerBee",
      "composer cleared",
      outputHoney,
      buildReportDetail(
        "clear composer input",
        honey,
        outputHoney,
        [
          {
            path: "$.type",
            before: normalizeValue(honey?.type),
            after: outputHoney.type,
          },
        ],
        "Clears prompt and attachments in UI context, then forwards payload.",
      ),
    )
  }

  destroy() {}
}

export function clearComposerBee(context) {
  return new ClearComposerBee(context)
}
