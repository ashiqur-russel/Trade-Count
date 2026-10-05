import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage } from './api-error-message';

describe('apiErrorMessage', () => {
  const response = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('passes through the message the API wrote for the user', () => {
    expect(
      apiErrorMessage(
        response(409, {
          message: "You only hold 3 Acme share(s) on 2026-10-02, so you can't sell 4.",
        }),
      ),
    ).toBe("You only hold 3 Acme share(s) on 2026-10-02, so you can't sell 4.");
  });

  it('uses the first validation message when the API returns a list', () => {
    expect(
      apiErrorMessage(
        response(400, { message: ['name must be longer than or equal to 1 characters'] }),
      ),
    ).toBe('name must be longer than or equal to 1 characters');
  });

  it('explains a network failure', () => {
    expect(apiErrorMessage(response(0, null))).toBe(
      "Can't reach the server. Check your connection and try again.",
    );
  });

  it('falls back to a generic sentence for server errors without a message', () => {
    expect(apiErrorMessage(response(502, 'Bad Gateway'))).toBe(
      'The server had a problem. Try again in a moment.',
    );
  });
});
