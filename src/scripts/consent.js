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
// That description is not in this file: it is the Microsoft Clarity section of
// `src/pages/privacy.astro`, and the paragraph there about this entry promises
// the visitor that the number ties their decision to it. The promise runs both
// ways, and the board approved it in that form:
//
//   - Bump this whenever what Clarity collects, or where it is transmitted,
//     changes. Every record written under an older number stops counting as an
//     answer, so the banner asks again against the new description. Leaving the
//     number alone across such a change puts a commitment in the privacy policy
//     that this code does not keep.
//   - Bump it for nothing else. Not for a refactor, not for a fix in here. The
//     sentence in the policy names collection and transmission as the reason,
//     so a bump for any other reason makes that sentence inaccurate — and it
//     throws away every visitor's answer for no change they could notice.
//
// The trigger above is deliberately narrower than the description it binds to.
// That section also carries the Clarity project id, the `ad_Storage` setting,
// the cookie and lifetime list, the basis for the US transfer and the storage
// period — and a change to the storage period or the transfer basis moves the
// description without changing collection or transmission. Such a change is a
// question for the board, not automatically a bump: the rule above says to
// leave the number alone, and whether the old answers still cover the new
// description is not a call to make in here.
//
// Two consequences of a bump that the banner does not show, both of them a
// result of `applyStoredDecision` reconciling storage with the decision. Note
// for whoever edits this block next: Tailwind scans this file's comment prose
// for class candidates, so a bare utility word in here emits a dead rule into
// every page's CSS — write around it rather than letting the word stand alone:
//
//   - Every stored record stops counting at the same moment, so the first page
//     view of every visitor who had consented clears their Clarity cookies and
//     session token — not just the ones whose record had lapsed on its own. See
//     `applyStoredDecision`.
//   - Every document still open from the previous build reloads once, as soon as
//     a visitor answers the new question in another tab. That document's
//     `readDecision` runs the old number, so it reads the new record as no
//     decision, and `enforceDecision` tears it down — including the `_clck` the
//     answering tab has just written. The outcome is right and self-healing (new
//     purpose version, new identifier), but it is a reload in every open tab and
//     a short-lived identifier change in the answering one, which is not a thing
//     to meet by surprise during a deploy (PRI-233, S&O-R2-3).
//
// It is a plain integer and the only thing that has to be edited for a bump —
// the comparison below is an equality check, so there is no ordering to get
// wrong.
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
//
// The number itself is promised to the visitor in three places in
// `src/pages/privacy.astro`: the paragraph about this entry ("at most 365
// days") and the two byte-identical status-line copies for "no decision"
// ("more than 365 days old"), in the markup and in that page's own script.
// Shortening or lengthening it breaks all three, needs its own rule-7 board
// approval for the changed wording, and has to keep the two status-line copies
// byte-equal. Nothing in the build checks any of that.
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
 * there. That is one rule, not four — the only accepted input is a record in
 * the shape this module writes, recently, for this version — and it is what
 * makes the privacy-friendly outcome the default for every unforeseen value as
 * well. Shape is all it can check: localStorage has no integrity, so any
 * script on this origin and anyone with the console can write an accepted
 * record. That is not a weakness of the gate — a client-side check cannot do
 * better, and such a script could load the tracker directly anyway.
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

/**
 * Brings this document in line with `decision`: a tracker that is running
 * without a `granted` decision gets its storage cleared and the document
 * reloaded, because the injected script tag cannot be unloaded.
 *
 * Takes the decision rather than reading it, so a caller that has already read
 * it keeps deciding on a single read — see the `storage` handler below.
 *
 * Returns whether a reload was requested. Every caller that has work after the
 * call has to treat `true` as "stop here": a reload is asynchronous, so the
 * document is still live and fully scriptable afterwards, and anything that
 * runs on would be acting on a state that is about to be thrown away. What that
 * costs concretely, on the one path that has work left: the `storage` handler
 * below would run on into the broadcast, and on /privacy/ the status line flips
 * to "switched off" and the withdraw button disappears while the reload is still
 * pending — a document reporting a decision it has not yet been rebuilt under.
 *
 * Anything that is not an accepted `granted` stops the tracker, whether it is a
 * decision or the absence of one. The states that reach here with Clarity
 * running and no accepted decision are all deliberately reloaded. The list is
 * open — it is the complement of one narrow condition, not an enumeration that
 * can be completed — and these are the ones known to be reachable:
 *
 *   - A grant that could not be stored, because `setItem` threw — the same state
 *     `storeDecision`'s catch and `grantConsent`'s ordering rationale are about.
 *     The visitor did answer, and Back nevertheless becomes a full reload with
 *     the banner back up. Honouring that grant would need a second source of
 *     truth for the decision beside the store, and fail-closed is the better
 *     trade for a tracker. Measured and accepted, not missed (PRI-231, S1).
 *   - A consent that lapsed while the document stayed open: `readDecision`
 *     enforces a version and a maximum age, so a document can outlive its own
 *     record. Reloading is exactly right there, and it is also the only thing
 *     that re-asks.
 *   - A record dated in the future, which `readDecision` rejects as well. The
 *     clock moved backwards after the decision was stored; nothing lapsed.
 *   - A `CONSENT_VERSION` bump that landed while this document was open, which
 *     makes an answer given in another tab arrive here as no decision. See the
 *     bump block at the top of this file.
 *   - An emptied store: another tab ran `localStorage.clear()` or removed the
 *     key. That is not an answer, and ConsentBanner deliberately keeps the
 *     banner up for it rather than reading it as a refusal — but with Clarity
 *     already running in this document, "no accepted decision" is the only safe
 *     reading, so it reloads like any other withdrawal (PRI-230, B1).
 */
function enforceDecision(decision) {
  if (decision === GRANTED || !isClarityLoaded()) return false;
  clearClarityStorage();
  window.location.reload();
  return true;
}

let watching = false;

/**
 * Propagates a decision this document did not see being made into it. Two ways
 * it can miss one, and they are not covered to the same depth — the second
 * bullet says where it stops.
 *
 * **Another tab.** `onDecisionChange` listens for a `document` event, which
 * never crosses a tab boundary, so without this a visitor who withdraws consent
 * in one tab keeps uploading from every other tab that still has the page open
 * — the cookies are gone, but the running tracker in the other document keeps
 * sending.
 *
 * **The back/forward cache.** A frozen document receives no `storage` event at
 * all, and it is restored with its JavaScript state untouched: script tag still
 * in the DOM, `clarityLoad` still set. Clarity itself is bfcache-compatible — as
 * of `scripts.clarity.ms/0.8.70/clarity.js`, the engine script Clarity serves at
 * runtime and not the `@microsoft/clarity` wrapper package that `package.json`
 * pins: it registers `pagehide`/`visibilitychange` and neither `unload` nor
 * `beforeunload`. That was read off that script in PRI-198 and is not measured
 * here, because the engine is never fetched in this workspace — so a page with
 * Clarity running really does get frozen rather than discarded, and on `pageshow`
 * it has to re-read the decision instead of trusting the one it loaded with.
 *
 * This second path is narrower than the first, deliberately: it re-reads the
 * decision and enforces it, which only acts in the withdrawal direction and
 * only while Clarity is running. A restored document that missed a decision in
 * the *other* direction — a grant — stays exactly as it was and gets no
 * `CHANGE_EVENT`, so its banner or status line is stale until the next
 * navigation, and a click in that stale banner overwrites the decision from the
 * other tab. Measured. An emptied store is not a second example of that
 * direction, even though it leaves no decision behind: in a document with
 * Clarity running it reloads like any other withdrawal, and only a document that
 * never loaded Clarity stays as it was. See `enforceDecision`. Nothing
 * regresses: before this handler existed
 * a restored document was stale in every direction. Closing the mirror
 * direction is a separate question — the `denied` → `granted` route on
 * /privacy/ is with QA in PRI-204 — and widening this handler into it would be
 * a scope change, not a fix.
 *
 * A withdrawal therefore reloads the other tab: the injected script tag cannot
 * be unloaded, so a fresh document is the only thing that reliably stops it.
 *
 * No reload loop: nothing in here writes the decision key. `clearClarityStorage`
 * does write `sessionStorage`, which is a real `storage`-event source as well —
 * but those events only reach documents that share the same `sessionStorage`
 * (same tab, so iframes; this site has none), and the `_cltk` key would be
 * rejected by the key guard below anyway. No load path writes `localStorage`
 * either: `applyStoredDecision` reads it and writes only cookies and
 * `sessionStorage`, which the same two guards discard.
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
    // One read for everything below — the enforce call, the grant branch and
    // the broadcast. They run in the same task and have to agree on what the
    // other tab left behind.
    const decision = readDecision();
    if (enforceDecision(decision)) return;
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

  window.addEventListener('pageshow', (event) => {
    // Only a restore. The stored decision and `isClarityLoaded()` agree at
    // module evaluation, because `applyStoredDecision()` has just run — but
    // `pageshow` fires after `load`, and in between the document is interactive
    // and may be waiting seconds on images and fonts. A grant taken in that
    // window whose `setItem` throws leaves `clarityLoad` set with no accepted
    // decision, and without this guard the *initial* `pageshow` would then
    // reload and throw that grant away. That window is what the guard carries;
    // it is not merely a fallback for an agreement that holds (PRI-232, B3).
    //
    // What keeps ordinary navigation from reloading is the
    // `decision === GRANTED` short-circuit in `enforceDecision`, not this guard
    // — measured: removing the guard costs zero extra loads across three
    // navigations in each of the three decision states. That is the opposite of
    // the claim that was in here before. It does not extend to the window above,
    // which is a fourth state those three runs did not cover.
    //
    // The return value is ignored because nothing follows it; see
    // `enforceDecision` on why any caller with work left must not.
    if (event.persisted) enforceDecision(readDecision());
  });
}

/**
 * Honours a decision made in an earlier page view. Only a stored `granted`
 * that `readDecision` still accepts loads Clarity — no decision, a refusal, an
 * unreadable store, a corrupted value, a consent for an older version of the
 * purpose and an expired one all do nothing.
 *
 * Everything that is not an accepted `granted` also reconciles storage with the
 * decision, on every single page view. That is deliberately broader than "undo
 * the last revoke": it collects any Clarity cookie that outlived a cleanup
 * which failed, raced a navigation or never ran, whatever left it behind. Cost
 * is a handful of `document.cookie` assignments per page view, all no-ops once
 * the jar is empty.
 *
 * Two consequences of that breadth, both of which were open questions in their
 * own right before this branch:
 *
 *   - It is what makes the promise on /privacy/ — that a withdrawal deletes any
 *     existing copy — true for longer than the moment of the click.
 *   - It also deletes what an earlier, now lapsed, consent let Clarity store.
 *     Those lifetimes do not run with the consent: `_clck` is rewritten with a
 *     fresh 365 days on the first visit of each new day (measured — a second
 *     visit on the same day leaves it alone), while the record above is stamped
 *     once at the decision and never moves. A visitor who consents on day 0 and
 *     keeps visiting until day 300 used to carry an identifier to day 665 while
 *     their consent stopped counting on day 365; the first page view after the
 *     record lapses now clears it.
 *
 * What this file cannot settle is the wording that goes with the second one.
 * The privacy policy ties the deletion to declining or withdrawing and does not
 * describe the "never asked, or lapsed" state that is also cleared here, so the
 * text is narrower than the code. Widening it is a rule-7 board question and
 * belongs to PRI-236, which carries it as a board card; the deletion itself does
 * not wait on it, because the policy promises less than happens, not more.
 */
export function applyStoredDecision() {
  if (readDecision() === GRANTED) {
    loadClarity();
  } else {
    clearClarityStorage();
  }
}
