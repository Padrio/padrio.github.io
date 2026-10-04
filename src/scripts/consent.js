// Consent gate for Microsoft Clarity.
//
// Default is no tracking. The tracker is reached exclusively through a dynamic
// import, so before an explicit opt-in not a single byte of it is requested —
// `@microsoft/clarity` lands in its own chunk that is never fetched. Every
// failure path in here resolves to "no tracking": an unreadable localStorage,
// an unknown stored value and a failed import all leave Clarity unloaded.
//
// A stored consent is also bound to a version of the purpose and has a
// lifetime; both are enforced in one place, in `readDecision` — see there.

const STORAGE_KEY = 'pk-consent-analytics';
const GRANTED = 'granted';
const DENIED = 'denied';
const CHANGE_EVENT = 'pk-consent-change';

// A consent is only ever consent to one particular description of the purpose.
// Bump this whenever what Clarity collects, or where it is transmitted,
// changes: every record written under an older number stops counting as an
// answer, so the banner asks again against the new description. It is a plain
// integer and the only thing that has to be edited for that — the comparison
// below is an equality check, so there is no ordering to get wrong.
const CONSENT_VERSION = 1;
// 365 days. A consent that never lapses is not informed consent about the
// current state of the site, so a record older than this stops counting as an
// answer in exactly the same way an older version does. It applies to a
// refusal too, deliberately: the recorded answer is an answer to one version
// of one question, and that is as true of "no" as of "yes". The alternative —
// a refusal that is remembered forever — reads as more respectful but silently
// means the question can never be put again, not even when the purpose
// changes under a new version. Re-asking once a year is the same cadence in
// both directions.
const CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

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
 * The stored decision, or null when there is none that still counts.
 *
 * The stored record is `<decision>:<version>:<millisecond timestamp>` and is
 * accepted only in exactly that shape, with the current version and inside the
 * maximum age. Everything else is "no decision", which leaves the gate closed
 * and brings the banner back: an unreadable store (localStorage access throws
 * in some private-browsing configurations), a record from an older version of
 * the purpose, an expired one, and any value a visitor or another script put
 * there. That is one rule, not four — the only accepted input is a record this
 * module wrote, recently, for this version — and it is what makes the
 * privacy-friendly outcome the default for every unforeseen value as well.
 *
 * `split` with a length check rather than a prefix test: `startsWith(GRANTED)`
 * would accept `granted:2:…`, and a bare `granted` left over from the
 * unversioned format has one part, not three, so it is rejected without a
 * special case.
 */
export function readDecision() {
  let stored;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (typeof stored !== 'string') return null;
  const parts = stored.split(':');
  if (parts.length !== 3) return null;
  const [decision, version, recordedAt] = parts;
  if (decision !== GRANTED && decision !== DENIED) return null;
  if (version !== String(CONSENT_VERSION)) return null;
  // Digits only, and the whole string. `Number()` is far too generous to gate
  // an expiry on: it reads '' as 0, ' 12 ' as 12, '1e99' as 1e99 and '0x10' as
  // 16, so a value that is not a timestamp at all would get an age computed
  // for it — and `1e99` would be an age that never expires.
  if (!/^\d+$/.test(recordedAt)) return null;
  const age = Date.now() - Number(recordedAt);
  // A record dated in the future is not accepted either. It cannot have been
  // written by this module on this clock, so it is either corrupted or the
  // clock moved backwards; both are "ask again" rather than "trust a stamp
  // that will not expire for as long as it is ahead".
  if (age < 0 || age > CONSENT_MAX_AGE_MS) return null;
  return decision;
}

function storeDecision(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, `${value}:${CONSENT_VERSION}:${Date.now()}`);
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

let watching = false;

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
 *
 * No reload loop: nothing in here writes the decision key. `clearClarityStorage`
 * does write `sessionStorage`, which is a real `storage`-event source as well —
 * but those events only reach documents that share the same `sessionStorage`
 * (same tab, so iframes; this site has none), and the `_cltk` key would be
 * rejected by the key guard below anyway. No load path writes `localStorage`
 * either: `applyStoredDecision` only reads.
 *
 * The spec excludes the writing tab from delivery, so the tab the visitor
 * clicked in does not run any of this a second time. A browser that delivers to
 * the writer regardless (old WebKit) would get a harmless second reload on the
 * revoke path. The banner path is not affected: the reload branch also requires
 * `isClarityLoaded()`, and a "Decline" taken straight from the banner never
 * loaded Clarity — every path that does load it hides the banner first.
 */
export function watchOtherTabs() {
  // Registration is guaranteed once per document by ConsentBanner rendering
  // once, but a second listener would mean two reloads, so it does not hang on
  // that alone.
  if (watching) return;
  watching = true;
  window.addEventListener('storage', (event) => {
    // A null key is `localStorage.clear()` in the other tab, which clears the
    // decision too.
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      return;
    }
    // One read for all three branches below: they run in the same task and have
    // to agree on what the other tab left behind.
    const decision = readDecision();
    if (decision !== GRANTED && isClarityLoaded()) {
      clearClarityStorage();
      window.location.reload();
      return;
    }
    // A grant has to take effect here before it is announced, or the status
    // line on /privacy/ reports a tracker this document never loaded. Same
    // rule as `grantConsent`: nothing is announced before it is true. The
    // decision is the same person's explicit action and is already stored, so
    // this only brings the document forward to what its next navigation would
    // do anyway.
    if (decision === GRANTED) loadClarity();
    // Announced unconditionally, an emptied store included. What a null
    // decision means is the consumer's call, not this broadcast's: the banner
    // stays up because there is still nothing to go on (see ConsentBanner), and
    // the status line on /privacy/ returns to its "not asked yet" wording —
    // which it cannot do if the event never arrives.
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  });
}

/**
 * Honours a decision made in an earlier page view. Only a stored `granted`
 * that `readDecision` still accepts loads Clarity — no decision, a refusal, an
 * unreadable store, a corrupted value, a consent for an older version of the
 * purpose and an expired one all do nothing.
 *
 * What it does not do is delete what an earlier, now lapsed, consent already
 * let Clarity store. Nothing reads or sends those entries while there is no
 * accepted decision, and `_clck`'s own 365-day lifetime is the same as the
 * consent lifetime above, so it expires on roughly the same schedule. Deleting
 * them here would be a second promise about storage that the privacy policy
 * does not currently make; it is a question for that text, not for this file.
 */
export function applyStoredDecision() {
  if (readDecision() === GRANTED) {
    loadClarity();
  }
}
