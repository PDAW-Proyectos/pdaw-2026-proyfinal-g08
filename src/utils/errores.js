export class AppError extends Error {
  constructor(message, status = 500, code = "internal_error") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export function crearError(status, code, message) {
  return new AppError(message, status, code);
}
