// Consent gate for Microsoft Clarity.
//
// Default is no tracking. The tracker is reached exclusively through a dynamic
// import, so before an explicit opt-in not a single byte of it is requested —
// `@microsoft/clarity` lands in its own chunk that is never fetched. Every
// failure path in here resolves to "no tracking": an unreadable localStorage,
// an unknown stored value and a failed import all leave Clarity unloaded.

const STORAGE_KEY = 'pk-consent-analytics';
const GRANTED = 'granted';
const DENIED = 'denied';
const CHANGE_EVENT = 'pk-consent-change';

const CLARITY_PROJECT_ID = 'wu9fh588ka';
// The two cookies Clarity actually writes on this domain. The three names in
// the project config (_uetmsclkid/_uetvid/_clck) are a read list for the
// Microsoft Advertising tag, which this site does not use.
const CLARITY_COOKIES = ['_clck', '_clsk'];
// Clarity keeps its session token in sessionStorage. It survives a revoke
// otherwise, which would leave a Clarity identifier behind after the cookies
// are gone.
const CLARITY_SESSION_KEYS = ['_cltk'];

export { GRANTED, DENIED, STORAGE_KEY };

/**
 * The stored decision, or null when there is none. localStorage access throws
 * in some private-browsing configurations, and the value can be anything a
 * visitor puts there; both cases count as "no decision", which keeps the gate
 * closed rather than guessing.
 */
export function readDecision() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === GRANTED || stored === DENIED ? stored : null;
  } catch {
    return null;
  }
}

function storeDecision(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Nothing to do: without persistence the decision simply is not
    // remembered, so the banner asks again on the next page view. That is the
    // fail-closed outcome.
  }
  document.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/** Calls `handler` with the new decision whenever one is recorded. */
export function onDecisionChange(handler) {
  document.addEventListener(CHANGE_EVENT, () => handler(readDecision()));
}

let clarityLoad = null;

/** Whether the Clarity chunk has been requested in this page view. */
export function isClarityLoaded() {
  return clarityLoad !== null;
}

/**
 * Loads, starts and consents to Clarity, analytics storage only.
 *
 * `ad_Storage` must stay denied. `Clarity.consent(true)` and
 * `Clarity.consentV2()` without an argument both grant it, which makes Clarity
 * run a Bing advertising ID sync (c.clarity.ms/c.gif, c.bing.com/c.gif) and set
 * seven third-party cookies on domains we cannot clear again — a purpose the
 * banner does not ask about and the privacy policy does not describe.
 *
 * `init()` installs a synchronous queue on `window.clarity`, so the
 * `consentV2` call right after it is buffered rather than lost. Repeated calls
 * are harmless: `injectScript` bails out when `#clarity-script` already exists.
 */
function loadClarity() {
  if (!clarityLoad) {
    clarityLoad = import('@microsoft/clarity')
      .then(({ default: Clarity }) => {
        Clarity.init(CLARITY_PROJECT_ID);
        Clarity.consentV2({ analytics_Storage: GRANTED, ad_Storage: DENIED });
        return Clarity;
      })
      .catch(() => null);
  }
  return clarityLoad;
}

/**
 * Removes everything Clarity stored in first-party scope.
 *
 * The cookies are expired in every variant they could have been written with:
 * Clarity sets them on the registrable domain with a leading dot, and a delete
 * whose domain/path attributes do not match is a silent no-op, so each
 * combination is repeated rather than guessed.
 */
function clearClarityStorage() {
  const host = window.location.hostname;
  const domains = new Set(['', host, `.${host}`]);
  const registrable = host.split('.').slice(-2).join('.');
  if (registrable !== host) {
    domains.add(registrable);
    domains.add(`.${registrable}`);
  }
  for (const name of CLARITY_COOKIES) {
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ''}`;
    }
  }
  try {
    for (const key of CLARITY_SESSION_KEYS) window.sessionStorage.removeItem(key);
  } catch {
    // sessionStorage can be unavailable for the same reasons as localStorage.
  }
}

/** Records consent and starts Clarity. */
export function grantConsent() {
  storeDecision(GRANTED);
  return loadClarity();
}

/**
 * Records a refusal and tears down whatever Clarity already stored. The
 * `consentv2 … denied` call is what makes Clarity delete `_clck`/`_clsk`
 * itself; the explicit cleanup covers `_cltk`, which Clarity does not remove,
 * and the case where Clarity was never loaded in this page view but left
 * storage behind from an earlier one.
 *
 * This does not stop Clarity for the current page view — the library restarts
 * itself in lean mode instead of shutting down, and the injected script tag
 * cannot be unloaded. Callers that had Clarity running must reload the page;
 * see the revoke handler in `src/pages/privacy.astro`.
 */
export async function denyConsent() {
  storeDecision(DENIED);
  const Clarity = clarityLoad ? await clarityLoad : null;
  try {
    Clarity?.consentV2({ analytics_Storage: DENIED, ad_Storage: DENIED });
  } catch {
    // Teardown is best effort; the storage cleanup below runs either way.
  }
  clearClarityStorage();
}

/**
 * Honours a decision made in an earlier page view. Only a stored `granted`
 * loads Clarity — no decision, a refusal, an unreadable store and a corrupted
 * value all do nothing.
 */
export function applyStoredDecision() {
  if (readDecision() === GRANTED) {
    loadClarity();
  }
}
