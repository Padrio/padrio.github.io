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

export { GRANTED };

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

/**
 * Records consent and starts Clarity.
 *
 * Order matters, and it is the same rule as in `denyConsent`: `storeDecision`
 * announces the new state to every listener, so nothing may be announced
 * before it is true. `loadClarity()` sets `clarityLoad` synchronously, so
 * doing it first is what makes `isClarityLoaded()` already answer "yes" when
 * the listeners run — which is the only thing that keeps the status line on
 * /privacy/ honest when `setItem` throws and the decision cannot be stored.
 */
export function grantConsent() {
  const loaded = loadClarity();
  storeDecision(GRANTED);
  return loaded;
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
 *
 * The cleanup runs first and before anything is awaited. It does not depend on
 * the import and must not be hostage to it — a Clarity chunk whose request
 * stalls never settles the promise, and `storeDecision` has by then already
 * told the status line that the cookies are gone. It runs a second time after
 * `consentv2 … denied`, because Clarity writes once more while shutting down.
 */
export function denyConsent() {
  clearClarityStorage();
  storeDecision(DENIED);
  if (!clarityLoad) return Promise.resolve();
  return clarityLoad.then((Clarity) => {
    try {
      Clarity?.consentV2({ analytics_Storage: DENIED, ad_Storage: DENIED });
    } catch {
      // Teardown is best effort; the storage cleanup already ran.
    }
    clearClarityStorage();
  });
}

/**
 * Propagates a decision made in another tab into this one.
 *
 * `onDecisionChange` listens for a `document` event, which never crosses a tab
 * boundary, so without this a visitor who withdraws consent in one tab keeps
 * uploading from every other tab that still has the page open — the cookies
 * are gone, but the running tracker in the other document keeps sending.
 *
 * A withdrawal therefore reloads the other tab: the injected script tag cannot
 * be unloaded, so a fresh document is the only thing that reliably stops it.
 * Every other change just re-broadcasts, which also hides a still-visible
 * banner once the question has been answered elsewhere.
 */
export function watchOtherTabs() {
  window.addEventListener('storage', (event) => {
    // A null key is `localStorage.clear()` in the other tab, which clears the
    // decision too.
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    if (readDecision() !== GRANTED && isClarityLoaded()) {
      clearClarityStorage();
      window.location.reload();
      return;
    }
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  });
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
