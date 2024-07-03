export class AppError extends Error {
  isTrustedError = true

  constructor(message: string, isTrustedError: boolean) {
    super(message);

    this.isTrustedError = isTrustedError;
  }
}

