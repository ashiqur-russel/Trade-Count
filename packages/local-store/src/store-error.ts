export type StoreErrorCode = 'NOT_FOUND' | 'CONFLICT' | 'INVALID';

/** A rejected write, worded for the user. Plain data so it survives postMessage. */
export interface StoreFailure {
  code: StoreErrorCode;
  message: string;
}

export class StoreError extends Error implements StoreFailure {
  constructor(
    readonly code: StoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StoreError';
  }

  toFailure(): StoreFailure {
    return { code: this.code, message: this.message };
  }
}

export function isStoreFailure(value: unknown): value is StoreFailure {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StoreFailure).code === 'string' &&
    typeof (value as StoreFailure).message === 'string'
  );
}
