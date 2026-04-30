function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "normalize passthrough error payload",
    note: "Forwards input payload as ApiErrorHoney while ensuring detail field is always populated.",
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
        after: normalizeValue(detail),
      },
    ],
  }
}

export class PassThroughErrorApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const detail = honey?.payload?.detail || "request failed"
    const outputHoney = {
      type: "ApiErrorHoney",
      payload: {
        ...honey?.payload,
        detail,
      },
    }
    return this.context.resolveWithReport(
      "PassThroughErrorApiBee",
      "error forwarded",
      outputHoney,
      buildSuccessDetail(honey, outputHoney, detail),
    )
  }

  destroy() {}
}

export function passThroughErrorApiBee(context) {
  return new PassThroughErrorApiBee(context)
}
