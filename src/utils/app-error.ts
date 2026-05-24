export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors: any;

  constructor(statusCode: number, message: string, errors: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}