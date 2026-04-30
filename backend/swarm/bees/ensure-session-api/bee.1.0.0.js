function normalizeValue(value) {
  return value === undefined ? null : value
}

function buildSuccessDetail(inputHoney, outputHoney, session) {
  return {
    operation: "ensure backend session",
    note: "Finds or creates project-linked session and injects session id into output payload.",
    inputHoneyType: inputHoney?.type || null,
    outputHoneyType: outputHoney?.type || null,
    changes: [
      {
        path: "$.type",
        before: normalizeValue(inputHoney?.type),
        after: outputHoney.type,
      },
      {
        path: "$.payload.sessionID",
        before: normalizeValue(inputHoney?.payload?.sessionID),
        after: normalizeValue(session.id),
      },
      {
        path: "$.payload.projectId",
        before: normalizeValue(inputHoney?.payload?.projectId),
        after: normalizeValue(session.projectId),
      },
    ],
  }
}

function buildFailureDetail(inputHoney, outputHoney, detail) {
  return {
    operation: "ensure backend session",
    note: "Session ensure failed due to invalid request or state error.",
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

export class EnsureSessionApiBee {
  constructor(context) {
    this.context = context
  }

  async execute(honey) {
    const payload = honey?.payload || {}
    try {
      const session = this.context.ensureSession(payload.projectId, payload.title)
      const outputHoney = {
        type: "SessionReadyHoney",
        payload: {
          sessionID: session.id,
          projectId: session.projectId,
        },
      }
      return this.context.resolveWithReport(
        "EnsureSessionApiBee",
        "session ensured",
        outputHoney,
        buildSuccessDetail(honey, outputHoney, session),
      )
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      const errorHoney = {
        type: "ApiErrorHoney",
        payload: {
          projectId: payload.projectId,
          detail,
        },
      }
      return this.context.rejectWithReport(
        "EnsureSessionApiBee",
        "ensure session failed",
        errorHoney,
        buildFailureDetail(honey, errorHoney, detail),
      )
    }
  }

  destroy() {}
}

export function ensureSessionApiBee(context) {
  return new EnsureSessionApiBee(context)
}
