function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildReportDetail(inputHoney, outputHoney, inputFiles, syncedFiles) {
  return {
    operation: "sync attachment files into runtime state",
    note: "Reads files from input honey payload and writes them into context state.files.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.files",
        before: normalizeValue(inputFiles),
        after: normalizeValue(syncedFiles),
      },
    ],
  }
}

export class SyncAttachmentsBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const inputFiles = honey?.payload?.files || []
    const syncedFiles = Array.from(inputFiles)
    this.context.syncFiles(syncedFiles)
    const outputHoney = {
      type: "AttachmentsChangedHoney",
      payload: {},
    }
    return this.context.resolveWithReport(
      "SyncAttachmentsBee",
      "attachments synchronized",
      outputHoney,
      buildReportDetail(honey, outputHoney, inputFiles, syncedFiles),
    )
  }

  destroy() {}
}

export function syncAttachmentsBee(context) {
  return new SyncAttachmentsBee(context)
}
