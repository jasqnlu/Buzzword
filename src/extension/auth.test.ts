import { describe, expect, it } from 'vitest';
import { SCOPE, buildAuthUrl, isFresh, parseRedirect } from './auth';

const REDIRECT = 'https://djdagkcdbdfonpfhhabflpdedgemkdnp.chromiumapp.org/';

describe('buildAuthUrl', () => {
  it('asks for an access token with the Docs scope', () => {
    const url = new URL(buildAuthUrl('abc.apps.googleusercontent.com', REDIRECT, false));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('abc.apps.googleusercontent.com');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('response_type')).toBe('token');
    expect(url.searchParams.get('scope')).toBe(SCOPE);
    expect(url.searchParams.has('prompt')).toBe(false);
  });

  it('uses prompt=none for silent sign-in', () => {
    const url = new URL(buildAuthUrl('abc', REDIRECT, true));
    expect(url.searchParams.get('prompt')).toBe('none');
  });
});

describe('parseRedirect', () => {
  it('reads the token and expiry from the fragment', () => {
    const t = parseRedirect(`${REDIRECT}#access_token=ya29.x&token_type=Bearer&expires_in=3599&scope=${encodeURIComponent(SCOPE)}`, 1_000);
    expect(t).toEqual({ token: 'ya29.x', expiresAt: 1_000 + 3_599_000 });
  });

  it('throws Google’s error code', () => {
    expect(() => parseRedirect(`${REDIRECT}#error=access_denied`, 0)).toThrow('access_denied');
    expect(() => parseRedirect(`${REDIRECT}?error=interaction_required`, 0)).toThrow('interaction_required');
  });

  it('notices when the Docs permission box was left unticked', () => {
    const url = `${REDIRECT}#access_token=t&expires_in=3600&scope=${encodeURIComponent('openid email')}`;
    expect(() => parseRedirect(url, 0)).toThrow('documents_scope_not_granted');
  });

  it('throws when there is no token', () => {
    expect(() => parseRedirect(REDIRECT, 0)).toThrow();
  });
});

describe('isFresh', () => {
  it('treats a token as stale two minutes before it expires', () => {
    expect(isFresh({ token: 't', expiresAt: 10 * 60_000 }, 0)).toBe(true);
    expect(isFresh({ token: 't', expiresAt: 60_000 }, 0)).toBe(false);
    expect(isFresh(undefined, 0)).toBe(false);
  });
});
