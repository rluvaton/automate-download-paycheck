class AppError extends Error {
  isTrustedError = true

  constructor(message, isTrustedError) {
    super(message);

    this.isTrustedError = isTrustedError;
  }
}

module.exports = {
  AppError,
};
