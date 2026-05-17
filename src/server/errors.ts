export function toClientErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ValidationError) {
    return error.message;
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    return error.message;
  }

  return fallback;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
