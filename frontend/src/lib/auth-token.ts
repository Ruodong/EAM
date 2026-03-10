/**
 * Auth token management.
 *
 * In dev mode (AUTH_DISABLED=true on backend), no token is needed — the
 * backend always returns the fixed dev user.
 *
 * In production (Keycloak SSO), the token is set by the Keycloak adapter
 * after login and stored here for inclusion in API requests.
 */

let _token: string | null = null;

/** Store the access token (called by Keycloak adapter after login). */
export function setAuthToken(token: string | null): void {
  _token = token;
}

/** Retrieve the current access token (may be null in dev mode). */
export function getAuthToken(): string | null {
  return _token;
}

/**
 * Build the Authorization header object.
 * Returns an empty object when no token is available (dev mode),
 * so it can be spread into a headers object safely.
 */
export function authHeaders(): Record<string, string> {
  if (!_token) return {};
  return { Authorization: `Bearer ${_token}` };
}
