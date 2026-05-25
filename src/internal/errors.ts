export class OnaiSdkError extends Error {
  readonly status: number | undefined;
  readonly details: unknown | undefined;

  constructor(message: string, options: { status?: number; details?: unknown } = {}) {
    super(message);
    this.name = new.target.name;
    this.status = options.status;
    this.details = options.details;
  }
}

export class OnaiValidationError extends OnaiSdkError {}

export class OnaiAuthError extends OnaiSdkError {}

export class OnaiApiError extends OnaiSdkError {}
