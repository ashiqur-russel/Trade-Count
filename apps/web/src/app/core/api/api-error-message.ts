import { HttpErrorResponse } from '@angular/common/http';

/** Turns an API failure into a sentence the user can act on. */
export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Try again.';
  if (error.status === 0) return "Can't reach the server. Check your connection and try again.";

  const message: unknown = error.error?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return error.status >= 500
    ? 'The server had a problem. Try again in a moment.'
    : 'That request was not accepted.';
}
