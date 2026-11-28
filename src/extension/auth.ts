// Google sign-in for the extension, using chrome.identity.launchWebAuthFlow.
//
// Why not chrome.identity.getAuthToken? Its consent popup can fail to open at all
// (seen on macOS with a normal signed-in Chrome profile), which leaves a check
// hanging. launchWebAuthFlow opens Google's normal sign-in page in a visible
// window and works with any Google account.
//
// Needs a "Web application" OAuth client whose authorized redirect URI is
// https://<extension id>.chromiumapp.org/  (Chrome catches that redirect for us).

export const SCOPE = 'https://www.googleapis.com/auth/documents';
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

/** Refresh a little early so a token never expires in the middle of a check. */
const EARLY_MS = 2 * 60_000;
const INTERACTIVE_TIMEOUT_MS = 5 * 60_000;
const SILENT_TIMEOUT_MS = 20_000;

export interface Token { token: string; expiresAt: number }

export function buildAuthUrl(clientId: string, redirectUri: string, silent: boolean): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: SCOPE,
    include_granted_scopes: 'true',
  });
  if (silent) params.set('prompt', 'none');
  return `${AUTH_URL}?${params}`;
}

/** Reads the token out of the redirect URL's #fragment, or throws Google's error. */
export function parseRedirect(url: string, now: number): Token {
  const hash = new URL(url).hash.replace(/^#/, '');
  const params = new URLSearchParams(hash || new URL(url).search);
  const error = params.get('error');
  if (error) throw new Error(error);
  const token = params.get('access_token');
  if (!token) throw new Error('no access_token in redirect');
  if (params.get('scope') && !params.get('scope')!.split(' ').includes(SCOPE)) {
    throw new Error('documents_scope_not_granted');
  }
  const seconds = Number(params.get('expires_in') ?? '3600');
  return { token, expiresAt: now + seconds * 1000 };
}

export function isFresh(t: Token | undefined, now: number): t is Token {
  return !!t && t.expiresAt - EARLY_MS > now;
}

// ------------------------------------------------------------------ Chrome side

const STORE_KEY = 'googleToken';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), ms); });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

async function runFlow(clientId: string, interactive: boolean): Promise<Token> {
  const redirectUri = chrome.identity.getRedirectURL();
  const url = buildAuthUrl(clientId, redirectUri, !interactive);
  const result = await withTimeout(
    chrome.identity.launchWebAuthFlow({ url, interactive, abortOnLoadForNonInteractive: true, timeoutMsForNonInteractive: SILENT_TIMEOUT_MS }),
    interactive ? INTERACTIVE_TIMEOUT_MS : SILENT_TIMEOUT_MS + 5_000,
  );
  if (!result) throw new Error('no redirect');
  return parseRedirect(result, Date.now());
}

/** A valid access token: cached, then silent sign-in, then the sign-in window. */
export async function getToken(clientId: string): Promise<string> {
  if (!clientId) throw new Error('Buzzword isn’t set up for Google sign-in yet (no OAuth client ID in this build).');
  const cached = (await chrome.storage.session.get(STORE_KEY))[STORE_KEY] as Token | undefined;
  if (isFresh(cached, Date.now())) return cached.token;

  let fresh: Token | undefined;
  try {
    console.log('Buzzword: trying silent sign-in…');
    fresh = await runFlow(clientId, false);
  } catch (err) {
    console.log('Buzzword: silent sign-in did not work, opening the sign-in window:', err instanceof Error ? err.message : err);
  }
  if (!fresh) {
    try {
      fresh = await runFlow(clientId, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Buzzword: sign-in failed:', message);
      if (message === 'timeout') throw new Error('Google sign-in didn’t finish. Click Check again and complete the sign-in window.');
      if (/did not approve|access_denied|closed/i.test(message)) throw new Error('Buzzword needs permission to edit your doc. Click Check again and choose Allow.');
      if (message === 'documents_scope_not_granted') throw new Error('Buzzword needs the “See, edit, create and delete your Google Docs documents” permission. Click Check again and tick that box.');
      throw new Error(`Google sign-in didn’t work (${message}). Click Check again.`);
    }
  }
  console.log('Buzzword: signed in.');
  await chrome.storage.session.set({ [STORE_KEY]: fresh });
  return fresh.token;
}

/** Forget the cached token, for example after the Docs API says it's no longer valid. */
export async function clearToken(): Promise<void> {
  await chrome.storage.session.remove(STORE_KEY);
}
