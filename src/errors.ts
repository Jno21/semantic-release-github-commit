export class SemanticReleaseError extends Error {
  code: string;
  details?: string;

  constructor(message: string, code: string, details?: string) {
    super(message);
    this.name = 'SemanticReleaseError';
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ERROR_CODES = {
  EGHNOAUTH: 'EGHNOAUTH',
  ENOFILES: 'ENOFILES',
  EGHAPI: 'EGHAPI',
  ENOREPO: 'ENOREPO',
  ENOBRANCH: 'ENOBRANCH',
  EINVALIDCONFIG: 'EINVALIDCONFIG',
} as const;

export function createError(code: keyof typeof ERROR_CODES, message: string, details?: string): SemanticReleaseError {
  return new SemanticReleaseError(message, code, details);
}
