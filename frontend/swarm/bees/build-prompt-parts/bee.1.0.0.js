function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, parts) {
  return {
    operation: "build prompt parts",
    note: "Builds text part and transforms uploaded files into data-url parts.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.sentAt",
        before: normalizeValue(inputHoney?.payload?.sentAt),
        after: normalizeValue(outputHoney.payload.sentAt),
      },
      {
        path: "$.payload.parts",
        before: normalizeValue(inputHoney?.payload?.parts),
        after: normalizeValue(parts),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "build prompt parts",
    note: "File to data-url conversion failed.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.detail",
        before: normalizeValue(inputHoney?.payload?.detail),
        after: detail,
      },
    ],
  }
}

export class BuildPromptPartsBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    const projectId = payload.projectId
    const parts = [{ type: "text", text: payload.userText || "(empty message)" }]
    const files = Array.isArray(payload.files) ? payload.files : []
    try {
      const fileParts = await Promise.all(
        files.map((file) =>
          this.context.fileToDataUrl(file).then((dataUrl) => ({
            type: "file",
            mime: file.type || "application/octet-stream",
            filename: file.name,
            url: dataUrl,
          })),
        ),
      )
      parts.push(...fileParts)
      const outputHoney = {
        type: "PromptFlowHoney",
        payload: {
          ...payload,
          sentAt: Date.now(),
          parts,
        },
      }
      return this.context.resolveWithReport(
        "BuildPromptPartsBee",
        "parts built",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, parts),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "PromptFlowErrorHoney",
        payload: { projectId, detail },
      }
      return this.context.rejectWithReport(
        "BuildPromptPartsBee",
        "build parts failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function buildPromptPartsBee(context) {
  return new BuildPromptPartsBee(context)
}
