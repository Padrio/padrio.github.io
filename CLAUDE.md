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
| Merge-Gate `main` | Repository Ruleset `main: pr-build required` (id `24245581`) auf dem Default-Branch, `enforcement: active`, `bypass_actors: []`. Keine klassische Branch Protection — im UI unter *Settings → Rules*. Details und Konsequenz in **Runtime-Realität**. |
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
Grund für das zweite Gate ist PRI-80: eine Klasse, die unter Tailwind 4 nur noch semantisch falsch
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
   *Trotzdem bleibt der lokale Build Pflicht, und grünes `pr-build` ist kein Korrektheitsbeweis: der Build kompiliert nur, was tatsächlich erreicht wird. Toter Code kommt grün durch — ein Import auf eine nicht existierende Datei fällt nicht auf, solange das importierende Modul nirgends gerendert wird. Lies aus dem Gate also nie „CI prüft das schon"; was der Build nicht abdeckt, musst du selbst prüfen.*
4. **Design-System „Warm Minimalist"** (siehe `.cursorrules`): kein Dark Mode, keine Tech-/Cyberpunk-Ästhetik, kein Glassmorphism/`backdrop-blur`. Basis `stone-50`, weiße Karten mit dezenten Schatten, Akzent orange/rose. Mobile first. Bewusste A11y-Entscheidungen beibehalten: kleine Texte mindestens `stone-500` (nicht `stone-400`), Nav-CTA `orange-700`.
   **Touch-Targets:** Eigenständige Steuerelemente — Buttons, CTAs, Navigations- und Footer-Links, Karten- und Sidebar-Links — haben mindestens 44 px effektive Trefffläche in beiden Achsen. Ausgenommen sind Links im Fließtext (`.prose`, `.prose-project`), Einträge dichter Listen-Navigationen (Scroll-Spy-TOC) und der Skip-Link als reines Tastaturziel. Für **jedes** interaktive Element gilt ein Unterboden von 24 px (WCAG 2.2 AA, 2.5.8) — mit derselben Inline-Ausnahme, die 2.5.8 selbst für Links im Satzfluss kennt.
   *Herkunft, damit niemand die Ausnahmen für eine Verwässerung hält: 44 px ist WCAG 2.5.5 **AAA** — die strengere Stufe, die diese Site freiwillig hält. Der Unterboden von 24 px ist der verbindliche AA-Wert aus WCAG 2.2, 2.5.8, und die Ausnahme für Inline-Links steht so in 2.5.8. Die Ausnahmeliste markiert also die Grenze zwischen dem freiwilligen AAA-Ziel und dem Pflicht-AA-Wert, nicht eine Absenkung des Anspruchs. Entschieden vom Board am 2026-10-01 auf [PRI-85](/PRI/issues/PRI-85), im Code umgesetzt mit [PRI-110](/PRI/issues/PRI-110).*
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

**Kein Widerspruch, aber eine Stolperstelle:** `tailwind.config.mjs:4` setzt `darkMode: 'class'`. Das ist
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
- **`main` ist per Ruleset geschützt.** Seit dem 2026-09-30 trägt das Repository das Ruleset `main: pr-build required` (id `24245581`, `enforcement: active`). Es gilt für `~DEFAULT_BRANCH`, enthält genau eine Regel — `required_status_checks` mit dem Kontext `pr-build` — und hat `bypass_actors: []`; für das Owner-Konto `Padrio` meldet die API `current_user_can_bypass: "never"`. Konsequenz: **ein PR mit rotem oder fehlendem `pr-build` ist nicht mergebar, auch nicht für das Board.** Klassische Branch Protection ist nicht gesetzt (`GET /branches/main/protection` → `404 Branch not protected`) — die Durchsetzung steckt vollständig im Ruleset, im UI also unter *Settings → Rules*, nicht unter *Branches*. `strict_required_status_checks_policy` ist `false`, der Branch muss vor dem Merge also nicht auf `main` rebased sein. Eine eigene „Pull Request erforderlich"-Regel enthält das Ruleset **nicht**. Ob der erzwungene Status-Check einen direkten Push auf `main` faktisch mitblockt, ist nicht geprüft und wird es nicht: der Test wäre ein Regel-1-Verstoß. Regel 1 (Branch → PR, niemals direkt auf `main`) gilt organisatorisch, unabhängig davon, ob GitHub sie zusätzlich durchsetzt.
- **`git` funktioniert normal**, inklusive `push` (Paperclip injiziert das Token).
- **Ein frischer Worktree hat kein `node_modules`.** Der Worktree-Provision-Command ist beim Board nicht gesetzt, und `git worktree add` kopiert `node_modules` nicht mit. Führe in jedem neuen Worktree **zuerst `npm ci`** aus, dann `npm run build` — sonst schlägt der Build mit einem irreführenden Fehler fehl. (Im gemeinsamen Checkout kann `node_modules` von einem früheren Run vorhanden sein; das sagt nichts über deinen Worktree.)
- **Deploy-Check ohne `gh`:** `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Den Zustand des Workflows selbst liest du mit dem Broker-Token über `GET /repos/Padrio/padrio.github.io/actions/runs?per_page=5` (`name`, `event`, `status`, `conclusion`, `head_branch`) — am 2026-09-30 mit `200` verifiziert. **Die Actions-Write-API funktioniert ebenfalls:** ein `POST /repos/Padrio/padrio.github.io/actions/runs/{id}/rerun` auf einen `pr-build`-Lauf antwortet mit `201`, und der Lauf startet tatsächlich neu (am 2026-09-30 an Run `36730071490` verifiziert, `run_attempt: 2`, `conclusion: success`). Das ist harmlos, weil `pr-build.yml` nur das Grep-Gate gegen Tailwind-3-Idiome, `npm ci` und `npm run build` fährt und nichts deployt. **Für `deploy.yml` gilt das Gegenteil:** ein Rerun oder ein `workflow_dispatch` dort veröffentlicht live auf https://pkrason.de. Nicht die API-Grenze ist das Problem, sondern die Wirkung — löse einen Deploy nur aus, wenn ein Issue das ausdrücklich verlangt, und informiere sonst das Board, das den Lauf im Actions-Tab neu starten kann.
- **Branch-Schema:** `agent/<issue-kennung>-<kurzer-slug>`, z. B. `agent/pri-9-claude-md`.
- **Der Commit-Author liegt beim Agent, der Committer nicht.** `git` auf dem `PATH` ist ein Paperclip-Wrapper. Er reicht die Kommandozeile unverändert durch und setzt die Identität ausschließlich über die Umgebung des Kindprozesses: `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`, `GIT_COMMITTER_NAME`/`GIT_COMMITTER_EMAIL` und zusätzlich `user.name`/`user.email` als `GIT_CONFIG_KEY_n`-Paare, die Git als Scope `command` führt. `GIT_CONFIG_GLOBAL` und `GIT_CONFIG_SYSTEM` zeigen auf `/dev/null`, `~/.gitconfig` wird also nie gelesen. `git config --local user.email …` hat keine Wirkung — es ist doppelt überstimmt, von der Config im Scope `command` und von `GIT_AUTHOR_*`/`GIT_COMMITTER_*`. Drei Punkte, alle am 2026-09-30 im Agent-Workspace bzw. gegen `origin/main` verifiziert:
  - **`git commit --author="Pascal Krason <p.krason@icloud.com>"` funktioniert.** `--author` rangiert über `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` und damit über allem, was der Wrapper setzt; es ist der einzige Hebel, weil Umgebung und Config im Scope `command` bereits belegt sind. Nachweis: Branch-Commit `cb3262c` (PR #2) hat Author `Pascal Krason <p.krason@icloud.com>`, Committer `Padrio <3200139+Padrio@users.noreply.github.com>`. Regel 2 ist für den Author also erfüllbar.
  - **Die Committer-Zeile ist nicht setzbar.** Der Wrapper löscht `GIT_COMMITTER_*` aus der Kindprozess-Umgebung und belegt sie selbst. Umgehbar nur durch direkten Aufruf von `/usr/bin/git` — das ist ausdrücklich unerwünscht, weil ein Agent damit eine Laufzeitkontrolle über Commit-Attribution unterlaufen würde.
  - **Auf `main` überlebt der per `--author` gesetzte Author den Merge nicht.** Der Squash-Commit `d910a21` (aus `cb3262c`) und die Merge-Commits `277ad03`/`fd2ef58` tragen alle Author `Pascal Krason <3200139+Padrio@users.noreply.github.com>`: GitHub ersetzt beim Merge über UI/API den gesamten Author durch die Identität des mergenden Kontos — E-Mail ist dessen noreply-Adresse (E-Mail-Privacy), Name dessen Profilname. Dass der Name hier passt, liegt am Profilnamen des Kontos `Padrio` und nicht daran, dass der Branch-Commit ihn durchreicht; Nachweis: `ba92205` ist der Merge von `4950d29` (Author-Name `Padrio`) und trägt selbst den Author-Namen `Pascal Krason`. Regel 2 bindet also den **Branch-Commit**; was auf `main` landet, entscheidet GitHub. Nicht dagegen anarbeiten und die Differenz nicht als Fehler melden.
- **Der Workspace kann parallel von mehreren Runs gehalten werden.** Nicht im gemeinsamen Checkout den Branch wechseln — mit `git worktree add` in einem eigenen Verzeichnis arbeiten und dort `npm ci` ausführen. `git rev-parse --abbrev-ref HEAD` darf nie `main` sein, während du arbeitest.

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

---

## Arbeitsablauf für ein Issue

1. Eigenen Worktree anlegen, Branch nach obigem Schema.
2. `npm ci`, implementieren, `npm run build` — Ausgabe ins Issue.
3. Commit mit `--author="Pascal Krason <p.krason@icloud.com>"` und ohne `Co-Authored-By`-Trailer (Regel 2), Branch pushen.
4. PR über `create-pull-request` öffnen, Link ins Issue.
5. Review anfordern: für **jeden im Issue genannten Auditor** ein eigenes Review-Child-Issue anlegen und das eigene Issue per `blockedByIssueIds` an diese Child-Issues hängen. Das Review-Issue muss selbsterklärend sein — Ziel, Definition of Done, Branch und PR-Link, relevante Regeln, und was ausdrücklich nicht in Scope ist. Der Auditor kann das Elternissue möglicherweise nicht lesen. **Das Issue bleibt bei dir**; weise es keinem Auditor zu.
6. Findings abarbeiten. Ändert ein Fix den Diff wesentlich, eine neue Review-Runde als neue Child-Issues aufsetzen — keine geschlossenen Reviews wiederbeleben.
7. Sind alle Reviews `done` und die Findings behandelt: Issue auf `in_review` mit Verweis auf PR und Review-Verdikte. **`in_review` allein genügt nicht** — ohne realen Review-Pfad lehnt die Plattform den Statuswechsel mit `invalid_issue_disposition` ab; Zuweisung an einen Agent plus „bitte reviewen" ist kein solcher Pfad. Lege deshalb vorher eine `request_confirmation`-Interaction auf dem Issue an (`resolverPolicy: human_only`, weil der Merge nach Regel 1 eine Board-Entscheidung ist; `continuationPolicy: wake_assignee`) und binde sie im Statuswechsel per `reviewInteractionId` an das Review: damit ist der Reviewer ein Mensch, die Merge-Entscheidung erscheint dem Board als Karte, und du wachst nach der Entscheidung automatisch auf. Der PR liegt jetzt beim Board. **Nicht selbst mergen.**
8. Nach dem Merge Deploy-Check: `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Danach das Issue auf `done`.
9. Blocker: Frage als Kommentar, Status `blocked`, Chief of Staff @-erwähnen (Regel 12).
