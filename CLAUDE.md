# CLAUDE.md — pkrason.de

Arbeitsanweisung für Claude Code und alle Agents, die in diesem Repository arbeiten.
Diese Datei wird automatisch gelesen und ist die maßgebliche Quelle für Projektfakten und Regeln.

**Sprache:** Website-Content ist Englisch (`lang="en"`). Kommunikation in Issues und mit dem Board auf **Deutsch**.

---

## Projektfakten

| | |
|---|---|
| Repository | `Padrio/padrio.github.io` |
| Default-Branch | `main` |
| Hosting | GitHub Pages, Custom Domain `pkrason.de` (`public/CNAME`) |
| Deploy | `.github/workflows/deploy.yml` — läuft bei **jedem** Push auf `main` |
| PR-Gate | `.github/workflows/pr-build.yml` — Job-Key und Status-Kontext `pr-build`, läuft bei jedem Pull Request gegen `main` |
| Merge-Gate `main` | Repository Ruleset `main: pr-build required` (id `24245581`) auf dem Default-Branch, `enforcement: active`, `bypass_actors: []`, `strict_required_status_checks_policy: true` (dein Branch muss vor dem Merge auf `main` nachgezogen sein). Keine klassische Branch Protection — im UI unter *Settings → Rules*. Details und Konsequenz in **Runtime-Realität**. |
| Framework | Astro 7.3.5, rein statisch (kein SSR, kein Adapter) |
| Versionen | Alle Versionen hier sind der Ist-Stand aus `package-lock.json`; maßgeblich ist der Lockfile, `npm ci` installiert deterministisch daraus. `package.json` führt weitere Ranges (z. B. `astro: ^7.3.5`). |
| Styling | Tailwind CSS 4.3.3 via `@tailwindcss/vite` (als Vite-Plugin in `astro.config.mjs`, **nicht** als Astro-Integration — `@astrojs/tailwind` ist aufgegeben und deinstalliert), plus `@tailwindcss/typography`. Theme weiter in `tailwind.config.mjs`, eingebunden per `@config` in `src/styles/global.css`. |
| Icons | `astro-icon` 1.2 mit `@iconify-json/simple-icons` |
| SEO | `@astrojs/sitemap` |
| Fonts | `@fontsource/inter` und `@fontsource/jetbrains-mono` — selbst gehostet, keine externen Requests |
| Analytics | Microsoft Clarity (`@microsoft/clarity`), Projekt-ID in `src/layouts/Layout.astro` |

### Befehle

```bash
npm ci        # Dependencies installieren (reproduzierbar, nutzt package-lock.json)
npm run dev   # Dev-Server auf http://localhost:4321
npm run build # Statischer Build nach dist/ — eines der beiden Qualitätsgates
npm run preview # Build lokal ausliefern
```

Es gibt **keine Tests und keinen Linter**. Automatisch geprüft wird an genau zwei Stellen, beide in
`.github/workflows/pr-build.yml`: `npm run build`, und davor ein Grep-Gate, das Tailwind-3-Idiome in
`src/` ablehnt (`shadow-sm`, `theme(`, `*-opacity-*`, nacktes `ring`, …). Die vollständige Liste
steht samt Begründung und der richtigen Ersetzung als Kommentar direkt bei der Liste im Workflow.
Grund für das zweite Gate ist [PRI-80](/PRI/issues/PRI-80): eine Klasse, die unter Tailwind 4 nur noch semantisch falsch
ist, baut grün durch — ohne Linter meldet das sonst nichts.

---

## Struktur

```
astro.config.mjs              site, Integrationen (icon, sitemap), Tailwind als Vite-Plugin, Redirects (Meta-Refresh, s. Regel 10)
tailwind.config.mjs           Tailwind-Theme (u. a. max-w-content); `content` ist unter Tailwind 4 wirkungslos
.cursorrules                  Design-System „Warm Minimalist" im Detail (Quelle für Regel 4)
.github/workflows/deploy.yml  GitHub-Pages-Deploy (Push auf main + workflow_dispatch)
.github/workflows/pr-build.yml  PR-Gate bei jedem PR gegen main (required status check): erst ein
                              Grep-Gate gegen Tailwind-3-Idiome in src/, dann npm ci + npm run build
public/CNAME                  Custom Domain pkrason.de
public/favicon.svg
public/images/profile.jpg     Default-OG-Bild
public/images/projects/*.webp Projekt-Screenshots — ausschließlich WebP

src/content.config.ts         Schema der Content Collection "projects" (Zod, Content Layer API)
src/content/projects/*.md     Ein Markdown-File pro Projekt, Frontmatter nach obigem Schema
src/layouts/Layout.astro      HTML-Grundgerüst: Meta-/OG-/Twitter-Tags, Person-JSON-LD,
                              Fonts, Clarity-Init, Skip-Link, Navigation, Footer, reveal.js
src/pages/index.astro         Startseite: Hero, CareerTimeline, "Selected Works", Kontakt-Strip
src/pages/projects/[slug].astro  Projekt-Detailseite: getStaticPaths über die Collection,
                              Prev/Next, Lesezeit, Scroll-Spy-TOC, SoftwareApplication-JSON-LD
src/pages/legal.astro         Impressum
src/pages/privacy.astro       Datenschutzerklärung
src/components/               Hero, CareerTimeline, ExperienceCard, ProjectCard, Navigation, Footer
src/scripts/reveal.js         Staggered Scroll-Reveal (respektiert prefers-reduced-motion)
src/styles/global.css         Tailwind-Layer, Basis-Styles, Skip-Link, Reveal-Styles
```

**Annahme, auf der das Stylesheet beruht:** `src/styles/global.css` deklariert die Quellmenge für Tailwind
als `@import "tailwindcss" source(none)` plus `@source "../../src"` — Tailwind scannt also ausschließlich
`src/`, nicht das Repo-Root (sonst landen Klassennamen aus `CLAUDE.md` und `.cursorrules` im ausgelieferten
CSS). Das setzt voraus, dass **jede klassentragende Datei unter `src/` liegt**. Wer ein Template außerhalb
`src/` anlegt oder `global.css` verschiebt, muss `@source` mitziehen: sonst fallen Utilities still aus dem
Stylesheet und `npm run build` bleibt trotzdem grün.

### Content-Collection-Schema (`src/content.config.ts`)

`title`, `description`, `date` (Strings, Pflicht) · `image`, `tags[]`, `github` (URL), `demo` (URL) optional ·
`featured` (Default `true`, steuert die Anzeige im "Selected Works"-Grid) ·
`flagship` (Default `false`, setzt das FLAGSHIP-Badge auf der Karte).
Die Detailseite wird für **jedes** Projekt erzeugt, unabhängig von `featured`.

---

## Die 14 harten Regeln für pkrason.de — gelten ohne Ausnahme

1. **Niemals direkt auf `main` pushen.** Ein Push auf `main` ist ein Production-Deploy (`.github/workflows/deploy.yml` deployt bei jedem Push auf `main` live). Jede Änderung: eigener Branch → Pull Request → Review durch den Code Auditor (Pflicht bei jedem PR; QA Auditor und Security & Ops Auditor zusätzlich nach der Review-Matrix unten) → **das Board merged**.
2. **Git-Identität:** Der **Commit-Author** ist „Pascal Krason <p.krason@icloud.com>" und wird verbindlich per `git commit --author="Pascal Krason <p.krason@icloud.com>"` gesetzt. Der **Committer** ist die Laufzeit-Identität des Workspace und wird nicht umgangen — insbesondere nicht durch einen direkten Aufruf von `/usr/bin/git`, mit dem ein Agent eine Laufzeitkontrolle über die Commit-Attribution unterlaufen würde. **Keine `Co-Authored-By`-Zeilen** in Commits oder PR-Beschreibungen — weder Claude noch Paperclip. Claude Code fügt sie standardmäßig hinzu; prüfe jede Commit-Message und jeden PR-Body, bevor du ihn abschickst.
   *Die Regel bindet den Branch-Commit. Was beim Merge auf `main` aus dem Author wird, entscheidet GitHub — siehe **Runtime-Realität**, „Der Commit-Author liegt beim Agent, der Committer nicht".*
3. **Vor jedem PR muss `npm run build` fehlerfrei durchlaufen.** Das Ergebnis wird im zugehörigen Issue dokumentiert. Es gibt weder Tests noch Linter — der Build ist das eine von zwei Qualitätsgates; das zweite ist das Grep-Gate gegen Tailwind-3-Idiome, das im selben Workflow **vor** `npm ci` läuft (Abschnitt *Befehle*). Seit dem 2026-09-30 ist diese Regel zusätzlich technisch erzwungen: der Status-Check `pr-build` ist auf dem Default-Branch per Ruleset Pflicht, ein PR mit rotem oder fehlendem `pr-build` ist nicht mergebar (siehe **Runtime-Realität**, „`main` ist per Ruleset geschützt").
   **Seit dem 2026-10-02 gilt das Gate zusätzlich gegen den aktuellen Stand von `main`** (Board-Entscheidung auf [PRI-108](/PRI/issues/PRI-108)): im Ruleset `main: pr-build required` steht jetzt `strict_required_status_checks_policy: true`, Required-Check unverändert `pr-build`, `bypass_actors: []`. Ein grünes `pr-build` heißt damit „grün gegen den **aktuellen** `main`" und nicht mehr „grün gegen die Branch-Basis von damals" — in [PRI-80](/PRI/issues/PRI-80) zählte deshalb für PR #13 ein `pr-build`, das am 2026-09-30 gegen die Basis vor der Tailwind-4-Migration grün geworden war und 15 Stunden später mitgemerged wurde. **Der Schalter allein hätte PR #13 aber nicht gestoppt:** er hätte den Branch nur neu gebaut, und `shadow-sm` kompiliert unter Tailwind 4 anstandslos — es bedeutet dort nur den alten `shadow`. Was diese Klasse Regression wirklich sieht, ist das Grep-Gate, das [PRI-80](/PRI/issues/PRI-80) als Abhilfe gebracht hat. Beide Gates greifen erst zusammen. Der Preis: ist `main` weitergelaufen, seit dein Branch abgezweigt oder zuletzt nachgezogen wurde, blockiert GitHub den Merge, bis der Branch nachgezogen ist. Das ist **kein Fehler und kein Blocker**, sondern der Normalfall, sobald das Board einen anderen PR merged, während deiner offen ist. Nachziehen (Rebase oder „Update branch") und den neuen `pr-build`-Lauf abwarten ist Aufgabe des PR-Autors, nicht des Boards — siehe **Arbeitsablauf**, Schritt 5.
   *Trotzdem bleibt der lokale Build Pflicht, und grünes `pr-build` ist kein Korrektheitsbeweis: der Build kompiliert nur, was tatsächlich erreicht wird. Toter Code kommt grün durch — ein Import auf eine nicht existierende Datei fällt nicht auf, solange das importierende Modul nirgends gerendert wird. Lies aus dem Gate also nie „CI prüft das schon"; was der Build nicht abdeckt, musst du selbst prüfen.*
4. **Design-System „Warm Minimalist"** (siehe `.cursorrules`): kein Dark Mode, keine Tech-/Cyberpunk-Ästhetik, kein Glassmorphism/`backdrop-blur`. Basis `stone-50`, weiße Karten mit dezenten Schatten, Akzent orange/rose. Mobile first. Bewusste A11y-Entscheidungen beibehalten: kleine Texte mindestens `stone-500` (nicht `stone-400`), Nav-CTA `orange-700`.
   **Touch-Targets:** Eigenständige Steuerelemente — Buttons, CTAs, Navigations- und Footer-Links, Karten- und Sidebar-Links — haben mindestens 44 px effektive Trefffläche in beiden Achsen. Ausgenommen sind Links im Fließtext (heute die Wrapper `.prose` und `.prose-project`), Einträge dichter Listen-Navigationen (Scroll-Spy-TOC) und der Skip-Link als reines Tastaturziel. Für **jedes** interaktive Element gilt ein Unterboden von 24 px (WCAG 2.2 AA, 2.5.8) — mit derselben Inline-Ausnahme, die 2.5.8 selbst für Links im Satzfluss kennt.
   *Herkunft, damit niemand die Ausnahmen für eine Verwässerung hält: 44 px ist WCAG 2.5.5 **AAA** — die strengere Stufe, die diese Site freiwillig hält. Der Unterboden von 24 px ist der verbindliche AA-Wert aus WCAG 2.2, 2.5.8, und die Ausnahme für Inline-Links steht so in 2.5.8. Die Ausnahmeliste markiert also die Grenze zwischen dem freiwilligen AAA-Ziel und dem Pflicht-AA-Wert, nicht eine Absenkung des Anspruchs. Entschieden vom Board am 2026-10-01 auf [PRI-85](/PRI/issues/PRI-85), im Code umgesetzt mit [PRI-110](/PRI/issues/PRI-110).*
   *Zwei Präzisierungen stammen nicht aus dem Board-Wortlaut, sondern sind beim Nachführen ergänzt und in [PR #30](https://github.com/Padrio/padrio.github.io/pull/30) begründet: die Board-Fassung formulierte den 24-px-Unterboden **ausnahmslos** (die Inline-Ausnahme ist aus 2.5.8 nachgetragen) und nannte als Fließtext-Wrapper nur `.prose` (`.prose-project` ist ergänzt, weil Klassenselektoren exakte Tokens matchen und `.prose` die Projekt-Detailseite nicht trifft). Die Wrapper-Liste ist eine Momentaufnahme des Ist-Stands, keine abschließende Definition — wer sie in ein Gate übersetzt, verifiziert sie am Code und schreibt sie nicht ab. Die inhaltsgleiche englische Fassung steht in `.cursorrules` Zeile 32; Änderungen hier dort mitziehen (das entscheidet die Präzedenzfrage nicht, siehe Ende des nächsten Abschnitts).*
5. **Icons nur über `astro-icon`** (`<Icon name="simple-icons:…" />`). Niemals SVG-Pfade von Hand schreiben.
6. **Bilder nur als WebP** unter `public/images/projects/` (`cwebp -q 80`). Keine PNG-/JPG-Duplikate committen.
7. **Rechtliches:** `src/pages/legal.astro` und `src/pages/privacy.astro` nur mit ausdrücklicher Board-Freigabe ändern. Neue Third-Party-Skripte, Tracker, externe CDN-Fonts oder Embeds brauchen eine Board-Freigabe **und** eine passende Anpassung der Datenschutzerklärung (DSGVO).
8. **Keine neuen Dependencies und keine Major-Upgrades** ohne Board-Freigabe.
9. **Cross-Pfad-Konsistenz:** wo dieselben Daten an mehreren Stellen gerendert werden (ProjectCard auf der Startseite vs. Detailseite, Frontmatter vs. JSON-LD vs. OG-Tags), alle Pfade Feld für Feld vergleichen. Jede Abweichung muss begründet sein.
10. **Bestehende URLs und Redirects nicht brechen** — insbesondere die beiden Redirects in `astro.config.mjs`: `/projects/vendbridge-panel` → `/projects/konteo-panel` und `/projects/vendprovision` → `/projects/konteo-provision`. Beide sind dort als `status: 301` deklariert, im statischen Build erzeugt Astro daraus aber eine **Meta-Refresh-Seite** (`<meta http-equiv="refresh" content="0;url=…">` plus `<link rel="canonical">` und `robots: noindex`) — GitHub Pages liefert nur statische Dateien aus und kann für eine eigene Redirect-Regel deshalb keinen HTTP-301 setzen; der einzige echte 301 dort ist die automatische Trailing-Slash-Normalisierung. Ein `200` auf der alten URL **mit** Trailing Slash ist deshalb korrekt und kein Defekt: geprüft wird der Seiteninhalt (`curl -sL https://pkrason.de/projects/vendbridge-panel/ | grep http-equiv`), nicht der Statuscode — `curl -I` beantwortet hier nicht die Frage, die man stellt.
11. **Keine Secrets ins Repo** (`.env` ist gitignored).
12. **Bei Unklarheit nicht raten:** Frage als Kommentar in das zugehörige Issue, Status `blocked`, Chief of Staff @-erwähnen.
13. **Keine Fakten erfinden** — keine Projektdetails, Kunden, Zahlen, Zeiträume oder Rollen. Fehlende Fakten beim Board erfragen.
14. **Repository-Einstellungen nur mit ausdrücklichem Auftrag.** Alles, was die Konfiguration des Repositories selbst betrifft und nicht im Arbeitsbaum liegt, ändert ein Agent nur, wenn ein Issue das ausdrücklich verlangt — unabhängig davon, dass das Broker-Token es technisch zulässt (siehe **Runtime-Realität**). Dazu gehören unter anderem Rulesets, Branch Protection, Actions- und Workflow-Berechtigungen, Secrets und Variablen, Repo-Sichtbarkeit, Collaborators und Teams, Webhooks und Integrationen, Pages-Einstellungen sowie Umbenennung, Transfer, Archivierung und Löschung. Die Aufzählung ist Beispiel, nicht Grenze: im Zweifel gilt die Generalklausel, nicht die Liste. **Lesen ist immer erlaubt** und ausdrücklich erwünscht, wo es eine Eskalation erspart. Nicht gemeint sind die alltäglichen Repository-Operationen, die Regel 1 und der Arbeitsablauf ohnehin regeln: Branch anlegen und pushen, PR öffnen, kommentieren, reviewen. Ein gültiger Auftrag sieht aus wie [PRI-22](/PRI/issues/PRI-22), aus dem das Ruleset `main: pr-build required` entstanden ist.

---

## Bekannte Abweichungen zwischen Regel 4 / `.cursorrules` und dem Code auf `main`

Diese drei Stellen widersprechen Regel 4 bzw. `.cursorrules`, liegen aber bereits ausgeliefert auf `main`.
**Sie sind offen und nicht entschieden.** Fasse sie nicht nebenbei an: eine Änderung wäre entweder das
Entfernen einer bewussten Design-Entscheidung oder ein Bugfix ohne Auftrag — beides braucht nach Regel 12
eine Board-Entscheidung. Steht in einem Issue ausdrücklich, dass eine dieser Stellen geändert werden soll,
gilt das Issue.

| Stelle | Regel | Ist-Stand |
|---|---|---|
| `src/components/Navigation.astro:9` | Regel 4 / `.cursorrules` §2: kein Glassmorphism, kein `backdrop-blur` | Sticky-Nav nutzt `backdrop-blur-md backdrop-saturate-150` |
| `src/pages/index.astro:68` | Regel 4: kleine Texte mindestens `stone-500` | `text-[17px] text-stone-400` — steht aber auf `bg-stone-900`, wo `stone-400` der kontraststärkere Wert ist. Die Regel ist erkennbar für hellen Grund gedacht, sagt das aber nicht. |
| `src/pages/index.astro:63` (Kontakt-Strip), `src/styles/global.css:47` (Skip-Link) | Regel 4 / `.cursorrules` „Design Philosophy", Zeile 7 (`STRICT RULE: NO DARK MODE`) | Beide sind `bg-stone-900`. Lesart „kein umschaltbares Dark-Theme" vs. „keine dunkle Sektion" ist ungeklärt. |

Zwei Detailabweichungen ohne Konfliktcharakter: `.cursorrules` nennt als Font „Inter/Geist" und kennt
JetBrains Mono nicht, das im Theme als `font-mono` gesetzt ist; und es schreibt Buttons als warmen
Gradient `from-orange-300 to-rose-300` vor, den kein Element nutzt. `.cursorrules` ist hier hinter dem
Redesign her.

**Kein Widerspruch, aber eine Stolperstelle:** `tailwind.config.mjs:7` setzt `darkMode: 'class'`. Das ist
folgenlos — `src/` enthält null `dark:`-Varianten, die Variante ist nur registriert, nicht benutzt.

**Offen und nicht entschieden:** welche Datei bei Design-Fragen Vorrang hat. Regel 4 verweist auf
`.cursorrules` als Detailquelle, legt aber keine Präzedenz fest. Solange beide Dateien existieren, braucht
das eine Ansage vom Board.

---

## Runtime-Realität

Im Agent-Workspace verifiziert. Diese Punkte kosten sonst jeden Agent einen Fehlversuch.

- **`gh` ist nicht installiert — GitHub-Operationen sind trotzdem nicht auf die MCP-Tools beschränkt.** Auf dem `PATH` liegt ein Paperclip-Shim namens `gh` (unter `$PAPERCLIP_GITHUB_LAUNCHER_DIR`), der kein `gh`-Binary findet: er antwortet auf jeden Aufruf mit „Paperclip: requested GitHub command is not installed" und beendet mit Exit-Code 127. Für den Alltag sind die **GitHub-MCP-Tools** der richtige Weg: `create-pull-request` (PR öffnen), `pull-request-read` (Status, Checks, Kommentare), `list-pull-requests`, `list-branches`, `get-file-contents`. **Nicht selbst mergen** — der PR bleibt offen und geht ans Board (Regel 1).
- **Wo die MCP-Tools keinen Endpunkt haben, geht die GitHub-REST-API direkt.** Derselbe Broker, aus dem der `git`-Wrapper bei jedem Aufruf seine Credentials zieht, gibt sie auch auf Anfrage heraus:

  ```bash
  RESP=$(curl -s -X POST -d '{}' \
    -H "authorization: Bearer $PAPERCLIP_API_KEY" \
    -H "x-paperclip-github-capability: $PAPERCLIP_GITHUB_BROKER_TOKEN" \
    -H "content-type: application/json" \
    "${PAPERCLIP_GITHUB_BROKER_URL%/}/runtime-tools/github/credentials")
  TOKEN=$(printf '%s' "$RESP" | python3 -c "import json,sys; print(json.load(sys.stdin)['env']['GH_TOKEN'])")
  # ab hier "$TOKEN" verwenden, nie ausgeben:
  curl -s -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/Padrio/padrio.github.io"
  ```

  Antwort `200` mit `status: "available"` und einem User-to-Server-Token (`ghu_…`) in `env.GH_TOKEN`. Damit meldet `GET /repos/Padrio/padrio.github.io` für dieses Repository `permissions.admin = true` — ein Agent kann also auch Rulesets und Branch Protection lesen und schreiben. **Ein fehlender MCP-Endpunkt ist deshalb keine fehlende Berechtigung** — eskaliere nicht an das Board mit der Begründung, eine GitHub-Admin-Operation sei technisch unmöglich.

  Umgekehrt gilt: dass du etwas kannst, heißt nicht, dass du es darfst. Der Merge bleibt Board-Entscheidung (Regel 1), und für Repository-Einstellungen gilt Regel 14 — ohne ausdrücklichen Auftrag im Issue fasst du sie nicht an. So ist das unten beschriebene Ruleset entstanden, aus [PRI-22](/PRI/issues/PRI-22).

  Zwei Fallstricke: das Token ist ein Secret und gehört niemals in einen Commit, Kommentar, PR-Text oder Log (Regel 11) — deshalb oben `RESP=$(curl …)` statt eines Aufrufs, der die Antwort auf stdout und damit ins Run-Transkript legt. Und `$PAPERCLIP_GIT_TOKEN` **aus der Run-Umgebung** ist kein zweites Token, sondern ein leeres: die Variable existiert dort mit Länge 0, ein `Authorization: Bearer` damit sendet einen leeren Wert und liefert `401 Bad credentials`. Die Broker-Antwort enthält denselben Token zusätzlich als `env.PAPERCLIP_GIT_TOKEN` und `env.GITHUB_TOKEN` — die Falle ist die leere Ambient-Variable, nicht der Name. Nimm den Wert immer aus der Broker-Antwort.
- **`main` ist per Ruleset geschützt.** Seit dem 2026-09-30 trägt das Repository das Ruleset `main: pr-build required` (id `24245581`, `enforcement: active`). Es gilt für `~DEFAULT_BRANCH`, enthält genau eine Regel — `required_status_checks` mit dem Kontext `pr-build` — und hat `bypass_actors: []`; für das Owner-Konto `Padrio` meldet die API `current_user_can_bypass: "never"`. Konsequenz: **ein PR mit rotem oder fehlendem `pr-build` ist nicht mergebar, auch nicht für das Board.** Klassische Branch Protection ist nicht gesetzt (`GET /branches/main/protection` → `404 Branch not protected`) — die Durchsetzung steckt vollständig im Ruleset, im UI also unter *Settings → Rules*, nicht unter *Branches*. `strict_required_status_checks_policy` steht seit dem 2026-10-02 auf `true` (vorher `false`; Board-Entscheidung auf [PRI-108](/PRI/issues/PRI-108), von Chief of Staff gesetzt und durch erneutes Lesen des Rulesets verifiziert, `do_not_enforce_on_create: false`). Der erzwungene `pr-build`-Lauf muss also gegen den **aktuellen** Stand von `main` grün sein. GitHubs Kriterium dafür ist **Ancestry, nicht die Bauzeit**: der PR-Head muss die Spitze von `main` enthalten. Merged das Board einen anderen PR, meldet GitHub deinen als `mergeable_state: "behind"` und verweigert den Merge, bis der Branch nachgezogen und neu gebaut wurde — **auch dann, wenn dein letzter `pr-build` nach diesem Merge gelaufen und grün ist** (am 2026-10-02 an PR #29 gemessen: `main` bewegte sich um 08:46:44Z, der `pr-build` auf dem nicht nachgezogenen Head wurde um 09:08:25Z — also 22 Minuten **danach** — grün, und die API meldete weiter `mergeable: true`, `mergeable_state: "behind"`). Ein Push auf deinen Branch ersetzt das Nachziehen also nicht. Das ist der Normalfall und kein Defekt — Regel 3 und **Arbeitsablauf**, Schritt 5. Eine eigene „Pull Request erforderlich"-Regel enthält das Ruleset **nicht**. Ob der erzwungene Status-Check einen direkten Push auf `main` faktisch mitblockt, ist nicht geprüft und wird es nicht: der Test wäre ein Regel-1-Verstoß. Regel 1 (Branch → PR, niemals direkt auf `main`) gilt organisatorisch, unabhängig davon, ob GitHub sie zusätzlich durchsetzt.
- **`git` funktioniert normal**, inklusive `push` (Paperclip injiziert das Token).
- **Ein frischer Worktree hat kein `node_modules`.** Der Worktree-Provision-Command ist beim Board nicht gesetzt, und `git worktree add` kopiert `node_modules` nicht mit. Führe in jedem neuen Worktree **zuerst `npm ci`** aus, dann `npm run build` — sonst schlägt der Build mit einem irreführenden Fehler fehl. (Im gemeinsamen Checkout kann `node_modules` von einem früheren Run vorhanden sein; das sagt nichts über deinen Worktree.)
- **Deploy-Check ohne `gh`:** `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Den Zustand des Workflows selbst liest du mit dem Broker-Token über `GET /repos/Padrio/padrio.github.io/actions/runs?per_page=5` (`name`, `event`, `status`, `conclusion`, `head_branch`) — am 2026-09-30 mit `200` verifiziert. **Die Actions-Write-API funktioniert ebenfalls:** ein `POST /repos/Padrio/padrio.github.io/actions/runs/{id}/rerun` auf einen `pr-build`-Lauf antwortet mit `201`, und der Lauf startet tatsächlich neu (am 2026-09-30 an Run `36730071490` verifiziert, `run_attempt: 2`, `conclusion: success`). Das ist harmlos, weil `pr-build.yml` nur das Grep-Gate gegen Tailwind-3-Idiome, `npm ci` und `npm run build` fährt und nichts deployt. **Für `deploy.yml` gilt das Gegenteil:** ein Rerun oder ein `workflow_dispatch` dort veröffentlicht live auf https://pkrason.de. Nicht die API-Grenze ist das Problem, sondern die Wirkung — löse einen Deploy nur aus, wenn ein Issue das ausdrücklich verlangt, und informiere sonst das Board, das den Lauf im Actions-Tab neu starten kann.
- **Branch-Schema:** `agent/<issue-kennung>-<kurzer-slug>`, z. B. `agent/pri-9-claude-md`.
- **Der Commit-Author liegt beim Agent, der Committer nicht.** `git` auf dem `PATH` ist ein Paperclip-Wrapper. Er reicht die Kommandozeile unverändert durch und setzt die Identität ausschließlich über die Umgebung des Kindprozesses: `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`/`GIT_COMMITTER_EMAIL` und zusätzlich `user.name`/`user.email` als `GIT_CONFIG_KEY_n`-Paare, die Git als Scope `command` führt. `GIT_CONFIG_GLOBAL` und `GIT_CONFIG_SYSTEM` zeigen auf `/dev/null`, `~/.gitconfig` wird also nie gelesen. `git config --local user.email …` hat keine Wirkung — es ist doppelt überstimmt, von der Config im Scope `command` und von `GIT_AUTHOR_*`/`GIT_COMMITTER_*`. Drei Punkte, alle am 2026-09-30 im Agent-Workspace bzw. gegen `origin/main` verifiziert:
  - **`git commit --author="Pascal Krason <p.krason@icloud.com>"` funktioniert.** `--author` rangiert über `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` und damit über allem, was der Wrapper setzt; es ist der einzige Hebel, weil Umgebung und Config im Scope `command` bereits belegt sind. Nachweis: Branch-Commit `cb3262c` (PR #2) hat Author `Pascal Krason <p.krason@icloud.com>`, Committer `Padrio <3200139+Padrio@users.noreply.github.com>`. Regel 2 ist für den Author also erfüllbar.
  - **Die Committer-Zeile ist nicht setzbar.** Der Wrapper löscht `GIT_COMMITTER_*` aus der Kindprozess-Umgebung und belegt sie selbst. Umgehbar nur durch direkten Aufruf von `/usr/bin/git` — das ist ausdrücklich unerwünscht, weil ein Agent damit eine Laufzeitkontrolle über Commit-Attribution unterlaufen würde.
  - **Auf `main` überlebt der per `--author` gesetzte Author den Merge nicht.** Der Squash-Commit `d910a21` (aus `cb3262c`) und die Merge-Commits `277ad03`/`fd2ef58` tragen alle Author `Pascal Krason <3200139+Padrio@users.noreply.github.com>`: GitHub ersetzt beim Merge über UI/API den gesamten Author durch die Identität des mergenden Kontos — E-Mail ist dessen noreply-Adresse (E-Mail-Privacy), Name dessen Profilname. Dass der Name hier passt, liegt am Profilnamen des Kontos `Padrio` und nicht daran, dass der Branch-Commit ihn durchreicht; Nachweis: `ba92205` ist der Merge von `4950d29` (Author-Name `Padrio`) und trägt selbst den Author-Namen `Pascal Krason`. Regel 2 bindet also den **Branch-Commit**; was auf `main` landet, entscheidet GitHub. Nicht dagegen anarbeiten und die Differenz nicht als Fehler melden.
- **Der Workspace kann parallel von mehreren Runs gehalten werden.** Nicht im gemeinsamen Checkout den Branch wechseln — mit `git worktree add` in einem eigenen Verzeichnis arbeiten und dort `npm ci` ausführen. `git rev-parse --abbrev-ref HEAD` darf nie `main` sein, während du arbeitest.
- **Ein Headless-Chromium liegt im Agent-Image — Rendering ist messbar, nicht nur rechenbar.** Binaries, CDP-Client, Viewports, Messfallen und das Aufräumen stehen im eigenen Abschnitt **Rendering messen**.
- **Beende nur Prozessbäume, die du selbst gestartet hast.** Eigene über die aufgezeichnete PID (Abschnitt *Rendering messen*, „Aufräumen"), fremde **melden statt reapen** — Sweep mit `ps -eo pid,ppid,etimes,comm` zu Beginn und am Ende, die Baum-Zahl in den Kommentar, kein `kill`. Der Grund ist, dass **`PPID 1` keine Waise beweist:** ein Run, der seinen Browser im Hintergrund startet und dessen Shell danach endet, bekommt ebenfalls `PPID 1` und fährt ihn über den Debug-Port unbeirrt weiter (am 2026-10-02 nachgemessen: ein so gestarteter `chrome-headless-shell` stand nach 4 s mit `PPID 1` in `ps` und ließ sich 18 s später über seine `ws://`-URL noch fehlerfrei fahren). Alter bliebe als einziger Unterscheider, und für einen langen Review-Lauf ist Alter kein Beweis — ein Reaper mit dieser Heuristik trifft in einem Workspace, den mehrere Runs gleichzeitig halten, irgendwann einen lebenden Lauf. Billig ist die Regel, weil `--remote-debugging-port=0` jedem Start einen freien Port gibt: Waisen blockieren niemanden, sie kosten Speicher, nicht Korrektheit. Der Sweep über fremde Bäume ist damit Host-Aufgabe, nicht Agent-Aufgabe.

---

## Rendering messen

### Binaries und `--no-sandbox`

**Ein Headless-Chromium liegt im Agent-Image — Rendering ist messbar, nicht nur rechenbar.** Alle Zahlen in diesem Punkt sind am 2026-10-02 im Agent-Workspace nachgemessen ([PRI-142](/PRI/issues/PRI-142)), **außer wo sie ausdrücklich als ungeprüft markiert sind**. Zwei Binaries unter `~/.cache/ms-playwright/`, beide Chrome for Testing `153.0.8010.12`:

```bash
SHELL_BIN=~/.cache/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell
FULL_BIN=~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome   # läuft auch; --window-size klemmt dort (siehe unten), setDeviceMetricsOverride trackt die angeforderte Breite auch dort exakt
```

Kein `apt`, kein `npx playwright install`. Der Browser liegt **außerhalb des Repos**: `playwright`, `puppeteer` und `ws` sind nicht installiert und werden nicht gebraucht, `package.json` und `package-lock.json` bleiben unberührt — **Regel 8 ist davon nicht betroffen.** Node 24.21 hat hier ein globales `WebSocket`; ein vollständiger DevTools-Protocol-Client ist damit rund 40 Zeilen ohne jede Dependency.

**`--no-sandbox` ist Pflicht, bei beiden Binaries.** Ohne das Flag bricht der Prozess in unter 3 s ab — Exit 133 (`chrome-headless-shell`) bzw. 134 (`chrome`) — und schreibt `FATAL … No usable sandbox!` auf **stderr**; stdout bleibt leer. Wer nur stdout prüft, sieht nichts und hält den Workspace für browserlos. Mit dem Flag antworten beide sofort:

```bash
"$SHELL_BIN" --headless --no-sandbox --disable-gpu --dump-dom "data:text/html,<p>hi</p>"
# <html><head></head><body><p>hi</p></body></html>
```

**stderr ist auch im Erfolgsfall laut.** Derselbe Aufruf schreibt bei Exit 0 und korrektem DOM mehrere `ERROR:dbus/…`-Zeilen und eine `WARNING:sandbox/policy/linux/…` auf stderr — hier vier plus eine, 840 Byte. Wer mit `2>&1` arbeitet, sieht `ERROR` neben einem völlig richtigen Ergebnis: dieses Rauschen ist irrelevant, die Unterscheidung macht der Exit-Code und ob auf **stdout** etwas ankommt.

### CDP-Client

**Für echte Messungen CDP statt `--dump-dom`.** Start mit `--remote-debugging-port=0` (kollidiert nicht mit parallelen Runs), die `ws://`-URL kommt von stderr, dann `Target.createTarget` → `Target.attachToTarget {flatten:true}` und jeder weitere Aufruf mit der `sessionId`. **Die `sessionId` ist ein Top-Level-Feld der CDP-Nachricht, nicht Teil von `params`** — in `params` gelegt antwortet Chrome mit `-32601 'Runtime.enable' wasn't found`, also einem Fehler, der genau wie das Versionsproblem aus dem nächsten Absatz aussieht. Dieser Block läuft unverändert — als `.mjs` gespeichert und mit `node` aufgerufen gibt er die Zeile aus, die als Kommentar dahinter steht:

```js
import { spawn } from 'node:child_process';

const SHELL_BIN = `${process.env.HOME}/.cache/ms-playwright/chromium_headless_shell-1243`
  + `/chrome-headless-shell-linux64/chrome-headless-shell`;

const proc = spawn(SHELL_BIN, ['--headless', '--no-sandbox', '--disable-gpu',
  '--hide-scrollbars',                             // sonst nimmt die Scrollbar 15 px Layout — siehe unten
  '--remote-debugging-port=0', 'about:blank']);     // positionales about:blank: siehe unten
const kill = () => { try { proc.kill(); } catch {} };
for (const s of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(s, () => { kill(); process.exit(1); });
try {
  const wsUrl = await new Promise((res, rej) => {   // die ws://-URL kommt auf stderr
    let buf = '';
    proc.stderr.on('data', (d) => { buf += d; const m = buf.match(/ws:\/\/\S+/); if (m) res(m[0]); });
    proc.on('exit', (c) => rej(new Error(`Chrome endete mit ${c}: ${buf}`)));
  });
  const ws = new WebSocket(wsUrl);                  // global in Node 24, kein Paket nötig
  await new Promise((res) => { ws.onopen = res; });
  let id = 0; const pending = new Map();
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (!pending.has(m.id)) return;
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(`${m.error.code} ${m.error.message}`)) : res(m.result);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id; pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride',
    { width: 320, height: 844, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send('Page.navigate', { url: 'https://pkrason.de/' }, sessionId);
  const { result } = await send('Runtime.evaluate', {
    expression: `new Promise(r => { (function w() {
      if (document.readyState !== 'complete' || location.href === 'about:blank') return setTimeout(w, 50);
      document.fonts.ready.then(() => r({
        iw: innerWidth,                                    // enthält die Scrollbar
        cw: document.documentElement.clientWidth,          // das Layout — hierauf zusichern
        sw: document.documentElement.scrollWidth,
        font: document.fonts.check('400 16px "JetBrains Mono"'),
      }));
    })() })`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  console.log(result.value);   // { iw: 320, cw: 320, sw: 320, font: true }
} finally {
  kill();   // auch hier, sonst bleibt der Baum bei jeder geworfenen Exception liegen — siehe „Aufräumen"
}
```

**Auf `document.readyState` allein zu warten ist eine Falle — aber nur in einer von zwei Konstruktionen.** `about:blank` ist bereits `complete`, eine Warteschleife kehrt also *vor* dem Commit der neuen Seite zurück; der nächste `querySelector` liefert `null` und das liest sich wie „Element fehlt". Betroffen ist der Weg „`Target.createTarget` **mit der echten URL**, dann sofort attachen und auswerten": dort hat das Target beim ersten `Runtime.evaluate` noch `about:blank` stehen. Der Weg des Blocks oben — Target auf `about:blank` erzeugen und `Page.navigate` abwarten — hat die Falle in 12 Läufen nicht ausgelöst, das QA-Review der echten-URL-Variante in 2 von 10. Es ist also ein **Rennen**: prüf zusätzlich auf einen geänderten `location.href`, statt dich auf die Konstruktion zu verlassen.

**Ein gebundener, aber toter Port ist davon *nicht* abgedeckt.** Chrome lädt dann seine eigene Fehlerseite, und auf der meldet *jede* Messung „nicht vorhanden" — `location.href` steht aber auf `chrome-error://chromewebdata/` und `readyState` auf `complete`, der href-Wechsel-Guard besteht die Prüfung also. Die einzige Absicherung, die hier greift, ist ein `fetch`/`curl` vor dem Browser: auf einem toten Port wirft `fetch` (`UND_ERR_SOCKET`), `curl` liefert Status `000`. Erst zusichern, dass die Seite wirklich ausgeliefert wird, dann den Browser darauf richten.

Das positionale `about:blank` als letztes Argument ist nur dann nötig, wenn das Skript ein **vorhandenes** Page-Target aus `Target.getTargets` greift: ohne das Argument liefert `Target.getTargets` bei `chrome-headless-shell` eine **leere** Liste, das Skript stirbt an `Cannot read properties of undefined (reading 'targetId')` und das sieht wie ein CDP-Versionsproblem aus. `Target.createTarget` funktioniert dagegen in jedem Fall. Setz das Argument trotzdem — es kostet nichts und macht beide Wege gültig.

CDP kann, was `--dump-dom` nicht kann: `Runtime.evaluate` mit `awaitPromise` (Proben, die klicken, scrollen und warten), `Emulation.setDeviceMetricsOverride` für echte Viewports, `Emulation.setEmulatedMedia` für `prefers-reduced-motion` pro Target, `Runtime.exceptionThrown` für echte Konsolenfehler, `Page.captureScreenshot` mit `clip`.

### Viewports und Breakpoints

**Viewports über `Emulation.setDeviceMetricsOverride`, nicht über `--window-size`.** Standardsatz: **320, 390, 768, 1280 px.** 320 ist die schmalste real relevante Breite und die, bei der dieses Projekt wiederholt Overflow hatte ([PRI-84](/PRI/issues/PRI-84)); 390 das iPhone-Maß; 768 der `md:`-Breakpoint (48 rem); 1280 der Desktop-Stand im `lg:`-Band (`xl:` kommt im Bundle nicht vor). Abweichungen sind erlaubt, müssen aber im Review benannt werden. Drei Fallen:

- `--window-size=320,800` wird vom vollständigen `chrome` auf `innerWidth 500` geklemmt; `chrome-headless-shell` liefert dort 320. Verlass dich auf keines von beidem.
- `setDeviceMetricsOverride {width:320, mobile:true}` ergibt auf einer Seite **ohne** `<meta name="viewport">` `innerWidth 980` statt 320 — das ist Chromes Mobile-Fallback-Layoutbreite, keine Messung. Die ausgelieferten Seiten tragen das Meta-Tag und messen exakt; eine selbstgebaute Probe-Seite braucht es ebenfalls, sonst `mobile:false` setzen.
- **Die Scrollbar kostet bei `mobile:false` 15 px Layout, bei `mobile:true` nichts (Overlay).** Sobald der Inhalt höher als der Viewport ist, bekommt bei `mobile:false` jede Breite eine klassische Scrollbar abgezogen — gemessen auf der Live-Startseite mit den Flags des Blocks oben, aber **ohne** `--hide-scrollbars`: angefordert 320/390/700/768/1280 ergibt `clientWidth` **305/375/685/753/1265**, durchgehend −15. Mit `mobile:true` sind es 320/390/700/768/1280 (Overlay-Scrollbar, kein Layout-Abzug). Das ist **kein** Iframe-Effekt: Top-Level-Target und 320-px-`<iframe>` liefern bei `mobile:false` identisch 305, und beide Binaries verhalten sich gleich. **`innerWidth` kann das nicht zeigen** — der Wert ist 320 und besteht jede Zusicherung, während das Layout 305 breit ist. Deshalb: `--hide-scrollbars` beim Start setzen (oder `Emulation.setScrollbarsHidden {hidden:true}`, beides stellt 320/320 her) **und auf `clientWidth` zusichern, nicht auf `innerWidth`** — damit ist die `mobile`-Frage für den **Scrollbar-Abzug** gegenstandslos; für die Layoutbreite bleibt der Vorpunkt in Kraft: auf einer Probe-Seite ohne Viewport-Meta liefert `mobile:true` auch mit `--hide-scrollbars` durchgehend `clientWidth` 980 (gemessen bei 320/390/768, beide Binaries). Die einzige Kombination, die auf beiden Seitenarten exakt misst, ist `mobile:false` + `--hide-scrollbars` + `clientWidth`. Overflow bei genau 320 px ist die wiederkehrende Fehlerklasse dieses Projekts ([PRI-84](/PRI/issues/PRI-84)) — ein 15-px-Phantom sieht genau danach aus. Diese Reproduzierbarkeit kauft das Flag allerdings mit einem Stück Realitätstreue: bei 320 und 390 ist das Verstecken korrekt, weil die Scrollbar auf echten Mobilgeräten ein Overlay ist, bei 768 und 1280 nicht — wer dort eine Breitenaussage für Desktop macht, rechnet die 15 px ein oder misst ohne das Flag.

**Der Standardsatz hat eine bekannte Lücke — nenne sie, wenn du bei vier Werten bleibst.** Das Bundle kennt genau drei Breiten-Media-Queries: 640 px (`sm:`), 768 px (`md:`), 1024 px (`lg:`). In `src/` stehen dem **46** `sm:`-Utilities gegenüber genau **2** `md:`-Stellen (die `h1` in `legal.astro` und `privacy.astro`) und 11 `lg:`-Stellen; sieben Dateien nutzen `sm:` ohne jedes `md:`. (`grep -o 'sm:'` zählt 47 — einer davon steht in einem Kommentar in `Navigation.astro`.) Das Band **640–767 px**, in dem diese 46 Utilities allein greifen, besucht der Standardsatz nie: 320 und 390 liegen darunter, 768 und 1280 darüber. Bei 768 misst man `md:`, nicht „`sm:` oberhalb von 640". Wer über das `sm:`-Band etwas aussagen will, nimmt **700 px** dazu — jeder Wert in [640, 767] ist äquivalent, es gibt dort keinen weiteren Schalter; wer bei den vier Werten bleibt, schreibt in das Review, dass 640–767 ungeprüft ist.

### Baseline und lokaler Server

**Für eine Frage zum ausgelieferten Zustand direkt `https://pkrason.de` messen.** Der Runner hat Netzzugang; `Page.navigate` auf die Live-URLs kostet keinen Worktree, kein `npm ci` und keinen lokalen Server, Seitenliste aus `https://pkrason.de/sitemap-0.xml`. Zwei Bedingungen: nur gültig, wenn der Live-Stand der gemeinte Commit ist, und für einen Baseline-gegen-Branch-Vergleich untauglich.

**Für einen Vergleich die Baseline immer mitbauen.** `origin/main` in einen zweiten Worktree, `node_modules` per `cp -r` **aus dem frisch installierten Worktree** statt eines zweiten `npm ci`, sequenziell bauen. Nicht aus dem gemeinsamen Checkout kopieren: der hinkt `origin/main` oft hinterher, sein `node_modules` passt dann zum alten Lockfile und der Build stirbt an einem irreführenden `Cannot find module` (plausibel, aber nicht eigens erzeugt — **ungeprüft**). **Baseline gegen Baseline muss 0 Unterschiede ergeben, bevor ein Delta etwas bedeutet.** Ein lokaler Server genügt als `python3 -m http.server <port> --bind 127.0.0.1 --directory dist`; das ist auf dem hier installierten Python 3.14 ein `ThreadingHTTPServer` und schnell genug: die Startseite aus `dist/` lädt in **rund 0,27 s** (6 Läufe, 165–526 ms, Median 269 ms).

### Scroll-Animation

**Scroll-Animation ist die größte Quelle erfundener Findings.** `html` trägt `scroll-behavior: smooth`, und alles, was während eines laufenden Scrolls gemessen wird, ist Rauschen und sieht genau wie ein Befund aus. Gemessen auf der Startseite, Klick auf den ersten In-Page-Anchor (`#main`), je 20 Wiederholungen pro Variante. **Der Soll-Wert hängt am Viewport:** er ist die Höhe der Sticky-Nav bei `scroll-margin-top: 0px` und beträgt **61** unterhalb von 640 px (also bei 320 und 390 aus dem Standardsatz) und **65** ab 640 px (700/768/1280) — die Grenze liegt exakt dort (639 → 61, 640 → 65). Die Zerlegung: **44 px Touch-Target-Höhe der Nav-Elemente — maßgeblich der Brand-Link** (`min-h-[44px]`, `Navigation.astro:24`) plus 2×8 bzw. 2×10 px Padding (`py-2 sm:py-2.5`, `Navigation.astro:21`) plus 1 px `border-b` ergibt genau 61 bzw. 65. Die Schriftgröße wechselt am selben Breakpoint (`text-[14px] sm:text-[17px]`) und ist **auf diesen beiden Stufen** folgenlos: erzwingt man an jeder Breite die 14-px-Stufe, bleibt die Nav bei 61/65, denn die 17-px-Zeilenbox (25,5 px) plus das eigene `py-2` des Links ergibt 41,5 px und bleibt damit unter dem 44-px-Boden — allerdings mit nur **2,5 px Luft** (unterhalb von 640 px: 37 px, also 7 px Luft). Trägt man umgekehrt `min-h` ab, fällt die Nav auf 54 bzw. 62,5 px — die 44 px sind also die tragende Größe. Verschieben würde 61/65 deshalb eine Änderung am 44-px-Boden (Regel 4, *Touch-Targets*; Board-Entscheidung [PRI-85](/PRI/issues/PRI-85), im Code umgesetzt mit [PRI-110](/PRI/issues/PRI-110)) — und eine Typo-Änderung erst dann, wenn sie den Link über 44 px treibt: ab `text-[19px]` am Brand-Link gemessen 61,5/65,5, die Schwelle liegt bei (44 − 16) / 1,5 = 18,67 px. Beide Binaries identisch. Die Reihe unten muss oberhalb von 640 px gelaufen sein, denn sie lief gegen 65; wer bei 320 oder 390 misst, vergleicht gegen 61, sonst meldet er einen Befund, der keiner ist:

- **`*{scroll-behavior:auto !important}` injizieren ist Pflicht und allein hinreichend.** Damit 20/20 korrekt. Die rAF-Schleife erreicht die Konstanz dann nach 4 Frames — das ist das Minimum der Warteschleife, keine Bedingung.
- **Auf stabile Frames allein verlassen ist fail-open.** Drei konstante `requestAnimationFrame`-Frames ohne die Injektion liefern in **rund einem Drittel bis der Hälfte** der Messungen **0** statt 65 — den un-gescrollten Ausgangswert, also genau einen „Element ist nicht da, wo es sein soll"-Befund. Es ist eine Rate, keine Konstante: 7 von 20 hier, 9 und 11 von 20 im QA-Review. Ursache: die stabilen Frames können noch *vor* dem Start der Animation liegen, dann bricht die Schleife auf dem Ausgangswert ab. Eine **größere** Framezahl verengt dieses Fenster nur — ab 10 Frames ist hier in 60 Versuchen keiner mehr fehlgeschlagen —, bleibt aber eine Wette auf das Timing der Animation. Deshalb die Injektion und nicht mehr Frames.
- `Emulation.setEmulatedMedia {prefers-reduced-motion: reduce}` wirkt genauso (20/20, `scroll-behavior` wird dadurch `auto`, vgl. `src/styles/global.css`), schaltet aber auch die Reveal-Animationen ab — kein Ersatz, wenn gerade die geprüft werden sollen.

Das rAF-Warten bleibt als Absicherung sinnvoll, **darf aber für Scroll nie allein tragen.** Für `data-reveal`-Animationen ist es umgekehrt das Mittel der Wahl: die Injektion setzt nur `scroll-behavior` und berührt `animation`/`transition` nicht, und `prefers-reduced-motion` ist dort gerade kein Ersatz, weil es die Animation abschaltet. Dazu eine Messreihe nehmen und auf Konstanz prüfen, bevor man sie diffed.

### Messfallen

**Zwei Messfallen, die ein falsches Ergebnis plausibel aussehen lassen:**

- *Welche Schrift gerendert hat, entscheidet die Zahl.* Vor jeder Breitenaussage `await document.fonts.ready` abwarten und `document.fonts.check('400 16px "JetBrains Mono"')` prüfen — aber nur dort, wo die Seite den Mono-Stack überhaupt verwendet: auf `/legal/` und `/privacy/` ist der Check berechtigt `false` (0 Elemente mit dem Stack), auf den anderen sechs Seiten `true`. Als unbedingtes Gate erzeugt er auf diesen zwei Seiten einen Fehlalarm. Gemessen auf der Live-Seite bei `font-size: 16px`, Advance pro Zeichen: ausgelieferter Stack `"JetBrains Mono", ui-monospace, monospace` mit geladener Font **10,00 px**, mit blockierter Font-Datei **9,60 px** — der Stack landet dann auf generischem `monospace`. Nicht auf `ui-monospace`: dieses Keyword wird im Stack übersprungen und ergibt isoliert gemessen 14,23 px. Eine still zurückgefallene Messung liegt also nur **4 %** daneben und fällt von selbst nicht auf.
- *Farben kommen unter Tailwind 4 als rohes `oklch(…)` aus `getComputedStyle`.* Ein `match(/[\d.]+/g)`-Parser liest L/C/H als R/G/B. Gefährlich ist nicht, dass Unsinn herauskommt, sondern dass **plausibler** Unsinn herauskommt: der korrekte Kontrast von `stone-500` auf `stone-50` ist **4,58**; vier naive Parser-Varianten ergaben 1,14, 1,14, 3,21 und **4,27**. Der letzte Wert liegt knapp *unter* 4,5 und geht damit als echter Kontrastverstoß durch, wo tatsächlich keiner ist. Über ein 1×1-Canvas auflösen und dabei **komponieren**: erst den Hintergrund füllen, dann die Farbe darüber, sonst wird jede Transparenz zu Schwarz.

### Aufräumen

**Aufräumen.** Chrome über die aufgezeichnete PID beenden (`ps -eo pid,ppid,comm`), **niemals über `pkill -f <muster>`** — das Muster matcht die eigene Shell, deren Kommandozeile es ja enthält, und erschießt sie. Zwei Fälle, beide gemessen:

- Trifft das Muster nur das Skript, das `pkill` aufruft: Exit **143** (SIGTERM), 4 von 4 Läufen. Die Ausgabe *vor* dem `pkill` überlebt, alles danach nicht — es sieht also aus, als wäre die Messung mitten im Lauf verstummt.
- Trifft das Muster zusätzlich die Shell, die die Ausgabe einsammelt — etwa weil das Muster im selben Kommando steht, mit dem man die Probe schreibt: Exit **144** und **die gesamte Ausgabe ist weg**, auch die Zeilen vor dem `pkill`. Mir in diesem Run einmal live passiert.

Der Fehler ist also doppelt teuer: er killt die Messung *und* die Shell, die sie melden könnte. 143 kostet alles **ab** dem `pkill` — stand davor nichts auf stdout, sind es 143 **und** 0 Byte (4 von 4 Läufen); 144 kostet zusätzlich die Zeilen davor.

**`try/finally` und `process.on('exit')` deckt den Abbruchfall *nicht* ab.** `proc.kill()` reapt die Renderer-Kinder zuverlässig, *wenn* die Zeile erreicht wird. Gemessen, jeweils Chrome gestartet und dann den Node-Prozess beendet, wie ein Harness es täte:

| Mechanismus im Skript | Node per SIGTERM beendet | per SIGKILL |
|---|---|---|
| `try/finally` + `proc.kill()` | **Baum bleibt liegen** | Baum bleibt liegen |
| `process.on('exit', …)` | **Baum bleibt liegen** | Baum bleibt liegen |
| `process.on('SIGTERM'/'SIGINT'/'SIGHUP')` | aufgeräumt | Baum bleibt liegen |

`finally` greift nur beim normalen Abwickeln oder bei einer geworfenen Exception, und `process.on('exit')` feuert bei einem nicht abgefangenen Signal nicht — SIGTERM ist aber genau das normale Timeout- und Abbruchsignal. Setz deshalb **beides**: die Signal-Handler für den Abbruch (so wie im Block oben) und `finally` für die Exception. Gegen SIGKILL ist grundsätzlich nichts zu machen; dafür ist der Eingangs-Sweep das Sicherheitsnetz, nicht nur Kosmetik. Am 2026-10-02 lagen in diesem geteilten Workspace **5 verwaiste Launcher-Bäume** (alle `PPID 1`, 16–19 h alt) und **17** übrig gebliebene Profilverzeichnisse. Sieh zu Beginn einmal nach fremden Bäumen, und zähle vor und nach dem eigenen Lauf — das ist geteilter Speicher in einem Workspace, den mehrere Runs gleichzeitig halten. Die belastbare Zahl ist die **Baum**-Zahl; die Prozess-Zahl schwankt, weil Chrome Renderer-Kinder im Leerlauf selbst abräumt.

### Scratch

**Scratch.** `PAPERCLIP_RUN_SCRATCH_DIR` liegt auf einem ~1,9 GB tmpfs, das sich alle parallelen Runs teilen: zwei gleichzeitige `npm ci` füllen es, und dann verliert *jeder* Bash-Aufruf seine Ausgabe, weil die Task-Output-Dateien der Harness dort ebenfalls liegen. Mess-Worktrees neben das Repo auf `/`, nicht ins tmpfs.

### Screenshot-Upload

**Screenshot ins Issue.** `POST /api/companies/{companyId}/issues/{issueId}/attachments` als Multipart mit Feldname `file` funktioniert — `201`, und die Antwort enthält einen `contentPath`:

```bash
API="${PAPERCLIP_API_URL%/}"; API="${API%/api}"
curl -s -X POST -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -F "file=@shot.png;type=image/png" \
  "$API/api/companies/$PAPERCLIP_COMPANY_ID/issues/$PAPERCLIP_TASK_ID/attachments"
```

---

## Review-Matrix

Wer ein PR reviewen muss, hängt davon ab, was der Diff berührt. Der companyweite Default „drei Auditoren pro Phase" gilt für pkrason.de **nicht**; diese Matrix ist für dieses Repository die maßgebliche Fassung.

| Auslöser im Diff | Erforderliches Review |
|---|---|
| Jeder PR, ohne Ausnahme | **Code Auditor** |
| Rendering, Layout, Responsive-Verhalten, Accessibility — `src/components/`, `src/layouts/`, `src/pages/`, `src/styles/global.css`, `tailwind.config.mjs`, `src/scripts/reveal.js`, Projektbilder | zusätzlich **QA Auditor** |
| Third-Party-Skripte, Tracker, Analytics, externe Requests, `src/pages/legal.astro`, `src/pages/privacy.astro`, `.github/workflows/`, `package.json`/`package-lock.json` | zusätzlich **Security & Ops Auditor** |
| Nur Dokumentation, Frontmatter oder Projekttext ohne Darstellungsänderung | **Code Auditor** allein |

Welche Reviews nötig sind, entscheidet Chief of Staff beim Zuweisen und schreibt es in das Issue. Nennt das Issue nur den Code Auditor, ist genau ein Review korrekt — melde das nicht als Abweichung. Hältst du ein zusätzliches Review für nötig, das im Issue nicht steht: Kommentar an Chief of Staff, nicht eigenmächtig weglassen oder hinzufügen.

### Beweislast im QA-Review

**Wo die Tabelle oben den QA Auditor zieht — oder wo Chief of Staff zusätzlich ein QA-Review ansetzt —, ruht sein Verdikt auf gemessenem Rendering, nicht auf gerechneter Geometrie.** Ein PASS ist nur mit Zahlen aus einem tatsächlich gerenderten Browser gültig; das Rezept dafür steht im Abschnitt **Rendering messen**. Gerechnete Geometrie — etwa Advance-Widths direkt aus der WOFF-Datei, wie in [PRI-60](/PRI/issues/PRI-60) — bleibt als Quercheck erlaubt, ist allein aber **kein PASS mehr**. Lässt sich eine Frage nicht rendern, gehört der Grund als ausdrücklich benannte Lücke in das Review-Issue: eine Rendering-Lücke ist kein Normalzustand, sondern selbst ein Befund. „Ausdrücklich benannt" heißt **Versuch und Fehlgrund**, nicht bloß die Feststellung — was gemessen werden sollte, womit du es versucht hast, woran es gescheitert ist. „Nicht gemessen" ohne Versuch ist keine Lücke, sondern ein fehlendes Review.

**Welches Verdikt daraus folgt, hängt am Umfang der Lücke.** Eine ausdrücklich benannte **Teil**lücke — die übrigen Akzeptanzbedingungen sind gemessen — macht das Verdikt zu einem **PASS mit Findings**; die Lücke ist dann selbst das Finding und kein Grund, das Review zu blockieren oder nach Regel 12 zu eskalieren. **Lässt sich dagegen keine einzige Akzeptanzbedingung rendern, ist das Verdikt kein PASS.** Dann fehlt die Grundlage und nicht ein Detail: schreibe in das Review-Issue, was du versucht hast und woran es gescheitert ist, setze es auf `blocked` und @-erwähne Chief of Staff — der entscheidet, ob das Review neu aufgesetzt, der Umfang geändert oder ausnahmsweise ein rein gerechnetes Verdikt akzeptiert wird. Das ist die eine Ausnahme von „ein Review mit schweren Findings ist trotzdem `done`": dort gibt es ein Verdikt, hier gibt es keines. Ein PASS ohne Zahlen und ohne benannte Lücke gibt es in keinem Fall. (Verdikt-Vokabular der Auditoren: PASS / PASS mit Findings / FAIL.) Board-Entscheidung zu [PRI-61](/PRI/issues/PRI-61), umgesetzt in [PRI-142](/PRI/issues/PRI-142).

Das ändert **nichts an der Auslöser-Tabelle oben** — welcher Auditor bei welchem Diff zieht, bleibt unverändert. Es geht ausschließlich um die Beweislast *innerhalb* eines QA-Reviews, das die Matrix ohnehin schon verlangt.

**Evidenzformat.** Messwerte als Tabelle in den Review-Kommentar: Element, Viewport, gemessener Wert, Soll. Screenshots gehen per Attachment-Upload an das Review-Issue (Pfad in **Rendering messen**, „Screenshot-Upload"); ein Screenshot ersetzt die Zahlen nicht, er belegt sie.

---

## Arbeitsablauf für ein Issue

1. Eigenen Worktree anlegen, Branch nach obigem Schema.
2. `npm ci`, implementieren, `npm run build` — Ausgabe ins Issue.
3. Commit mit `--author="Pascal Krason <p.krason@icloud.com>"` und ohne `Co-Authored-By`-Trailer (Regel 2), Branch pushen.
4. PR über `create-pull-request` öffnen, Link ins Issue.
5. **Den Branch aktuell halten, solange der PR offen ist.** Das Ruleset `main: pr-build required` verlangt seit dem 2026-10-02 ein `pr-build`, das gegen den **aktuellen** `main` grün ist (`strict_required_status_checks_policy: true`, Regel 3). Merged das Board in der Zwischenzeit einen anderen PR, wird deiner „out of date" (`mergeable_state: "behind"`) und ist nicht mergebar, bis du ihn nachziehst: `git fetch origin main`, rebasen (oder im UI „Update branch"), pushen, den neuen `pr-build`-Lauf abwarten. Ein Push ohne Rebase genügt nicht — GitHub prüft Ancestry, nicht die Bauzeit (Regel 3). Das ist deine Aufgabe als PR-Autor, nicht die des Boards, und kein Grund, auf `blocked` zu gehen. Prüfe es spätestens, bevor du das Issue in Schritt 8 auf `in_review` setzt. Berührt dein PR dieselbe Datei wie ein anderer offener PR — `CLAUDE.md` ist der häufige Fall —, kostet dich ein `git merge-tree --write-tree <anderer-branch> <dein-branch>` vorab die Information, ob beim Nachziehen ein echter Textkonflikt auf dich wartet; prüfe es gegen **jeden** offenen PR auf derselben Datei, nicht nur gegen den, der dir gerade einfällt.
   **Ziehst du nach einem abgeschlossenen Review nach, prüfe den nachgezogenen Stand selbst gegen die fremden Änderungen.** Ein Rebase ist kein Fix und löst Schritt 7 nach dessen Wortlaut nicht aus — zieht aber genau die fremden Änderungen in einen schon abgenommenen Stand, und ein konfliktfreies Rebase ist dabei der gefährlichere Ausgang, nicht der harmlose. Ein grüner `pr-build` deckt davon nur ab, was die beiden Gates sehen (Regel 3). Ändert das Nachziehen den Diff inhaltlich, gilt Schritt 7.
6. Review anfordern: für **jeden im Issue genannten Auditor** ein eigenes Review-Child-Issue anlegen und das eigene Issue per `blockedByIssueIds` an diese Child-Issues hängen. Das Review-Issue muss selbsterklärend sein — Ziel, Definition of Done, Branch und PR-Link, relevante Regeln, und was ausdrücklich nicht in Scope ist. Der Auditor kann das Elternissue möglicherweise nicht lesen. **Das Issue bleibt bei dir**; weise es keinem Auditor zu.
7. Findings abarbeiten. Ändert ein Fix den Diff wesentlich, eine neue Review-Runde als neue Child-Issues aufsetzen — keine geschlossenen Reviews wiederbeleben.
   **Das Review-Issue einer Fix-Runde benennt die Belegpaare.** Jedes Paar von Zeilen, bei dem eine die andere belegt und mindestens eine im Delta liegt, gehört mit Zeilennummern hinein, und zwar in beide Richtungen: geänderter Beleg → abhängige Aussage, und geänderte Aussage → tragender Beleg. Wird kein Paar genannt, ist das die Behauptung, dass es keines gibt, und die ist selbst prüfbar. **Ist die Belegseite eines benannten Paares ein ausführbarer Block, führt der Auditor ihn aus** — Lesen genügt nicht, „freigestellt" ist dafür nicht zulässig, und kann er ihn nicht ausführen, ist das eine benannte Lücke im Verdikt. **Berührt das Delta einer Fix-Runde eine Zeile innerhalb eines dokumentierten Codeblocks oder ändert es eine Flag-, Viewport-, Warte- oder Binary-Angabe, ist das ein Auslöser für ein zusätzliches QA-Review**; nur Zahlen oder Belegsätze anzufassen genügt nicht. Entschieden wird es wie jedes Review von Chief of Staff (Abschnitt *Review-Matrix*) — der Auslöser nimmt die Entscheidung nicht vorweg und erlaubt keine Selbstbeauftragung. Herkunft: eine Fix-Runde schob `--hide-scrollbars` in den Codeblock und ließ den Belegsatz daneben auf dem alten Messaufbau stehen; gefunden hat es der Code Auditor, weil er den Block ausgeführt hat, obwohl sein Review-Issue das freistellte ([PRI-152](/PRI/issues/PRI-152)).
8. Sind alle Reviews `done` und die Findings behandelt: Issue auf `in_review` mit Verweis auf PR und Review-Verdikte. **`in_review` allein genügt nicht** — ohne realen Review-Pfad lehnt die Plattform den Statuswechsel mit `invalid_issue_disposition` ab; Zuweisung an einen Agent plus „bitte reviewen" ist kein solcher Pfad. Lege deshalb vorher eine `request_confirmation`-Interaction auf dem Issue an (`resolverPolicy: human_only`, weil der Merge nach Regel 1 eine Board-Entscheidung ist; `continuationPolicy: wake_assignee`) und binde sie im Statuswechsel per `reviewInteractionId` an das Review: damit ist der Reviewer ein Mensch, die Merge-Entscheidung erscheint dem Board als Karte, und du wachst nach der Entscheidung automatisch auf. Der PR liegt jetzt beim Board. **Nicht selbst mergen.**
9. Nach dem Merge Deploy-Check: `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Danach das Issue auf `done`.
10. Blocker: Frage als Kommentar, Status `blocked`, Chief of Staff @-erwähnen (Regel 12).
