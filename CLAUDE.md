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
| Framework | Astro 4.16, rein statisch (kein SSR, kein Adapter) |
| Versionen | Alle Versionen hier sind der Ist-Stand aus `package-lock.json`; maßgeblich ist der Lockfile, `npm ci` installiert deterministisch daraus. `package.json` führt weitere Ranges (z. B. `astro: ^4.0.0`). |
| Styling | Tailwind CSS 3.4 via `@astrojs/tailwind`, plus `@tailwindcss/typography` |
| Icons | `astro-icon` 1.1 mit `@iconify-json/simple-icons` |
| SEO | `@astrojs/sitemap` |
| Fonts | `@fontsource/inter` und `@fontsource/jetbrains-mono` — selbst gehostet, keine externen Requests |
| Analytics | Microsoft Clarity (`@microsoft/clarity`), Projekt-ID in `src/layouts/Layout.astro` |

### Befehle

```bash
npm ci        # Dependencies installieren (reproduzierbar, nutzt package-lock.json)
npm run dev   # Dev-Server auf http://localhost:4321
npm run build # Statischer Build nach dist/ — das einzige Qualitätsgate
npm run preview # Build lokal ausliefern
```

Es gibt **keine Tests und keinen Linter**. `npm run build` ist das einzige automatische Gate.

---

## Struktur

```
astro.config.mjs              site, Integrationen (tailwind, icon, sitemap), Redirects (Meta-Refresh, s. Regel 10), Shiki-Config
tailwind.config.mjs           Tailwind-Theme (u. a. max-w-content)
.cursorrules                  Design-System „Warm Minimalist" im Detail (Quelle für Regel 4)
.github/workflows/deploy.yml  GitHub-Pages-Deploy (Push auf main + workflow_dispatch)
public/CNAME                  Custom Domain pkrason.de
public/favicon.svg
public/images/profile.jpg     Default-OG-Bild
public/images/projects/*.webp Projekt-Screenshots — ausschließlich WebP

src/content/config.ts         Schema der Content Collection "projects" (Zod)
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

### Content-Collection-Schema (`src/content/config.ts`)

`title`, `description`, `date` (Strings, Pflicht) · `image`, `tags[]`, `github` (URL), `demo` (URL) optional ·
`featured` (Default `true`, steuert die Anzeige im "Selected Works"-Grid) ·
`flagship` (Default `false`, setzt das FLAGSHIP-Badge auf der Karte).
Die Detailseite wird für **jedes** Projekt erzeugt, unabhängig von `featured`.

---

## Die 13 harten Regeln für pkrason.de — gelten ohne Ausnahme

1. **Niemals direkt auf `main` pushen.** Ein Push auf `main` ist ein Production-Deploy (`.github/workflows/deploy.yml` deployt bei jedem Push auf `main` live). Jede Änderung: eigener Branch → Pull Request → Review durch den Code Auditor (Pflicht bei jedem PR; QA Auditor und Security & Ops Auditor zusätzlich nach der Review-Matrix unten) → **das Board merged**.
2. **Git-Identität:** Commits laufen als „Pascal Krason <p.krason@icloud.com>" (global in `~/.gitconfig`, nicht überschreiben). **Keine `Co-Authored-By`-Zeilen** in Commits oder PR-Beschreibungen — weder Claude noch Paperclip. Claude Code fügt sie standardmäßig hinzu; prüfe jede Commit-Message und jeden PR-Body, bevor du ihn abschickst.
   *Der erste Satz ist im Agent-Workspace nicht erfüllbar — siehe **Runtime-Realität**, „Die Commit-Identität liegt nicht beim Agent". Nicht dagegen anarbeiten. Das `Co-Authored-By`-Verbot gilt uneingeschränkt.*
3. **Vor jedem PR muss `npm run build` fehlerfrei durchlaufen.** Das Ergebnis wird im zugehörigen Issue dokumentiert. Es gibt weder Tests noch Linter — der Build ist das einzige Qualitätsgate.
4. **Design-System „Warm Minimalist"** (siehe `.cursorrules`): kein Dark Mode, keine Tech-/Cyberpunk-Ästhetik, kein Glassmorphism/`backdrop-blur`. Basis `stone-50`, weiße Karten mit dezenten Schatten, Akzent orange/rose. Mobile first, Touch-Targets ≥ 44 px. Bewusste A11y-Entscheidungen beibehalten: kleine Texte mindestens `stone-500` (nicht `stone-400`), Nav-CTA `orange-700`.
5. **Icons nur über `astro-icon`** (`<Icon name="simple-icons:…" />`). Niemals SVG-Pfade von Hand schreiben.
6. **Bilder nur als WebP** unter `public/images/projects/` (`cwebp -q 80`). Keine PNG-/JPG-Duplikate committen.
7. **Rechtliches:** `src/pages/legal.astro` und `src/pages/privacy.astro` nur mit ausdrücklicher Board-Freigabe ändern. Neue Third-Party-Skripte, Tracker, externe CDN-Fonts oder Embeds brauchen eine Board-Freigabe **und** eine passende Anpassung der Datenschutzerklärung (DSGVO).
8. **Keine neuen Dependencies und keine Major-Upgrades** ohne Board-Freigabe.
9. **Cross-Pfad-Konsistenz:** wo dieselben Daten an mehreren Stellen gerendert werden (ProjectCard auf der Startseite vs. Detailseite, Frontmatter vs. JSON-LD vs. OG-Tags), alle Pfade Feld für Feld vergleichen. Jede Abweichung muss begründet sein.
10. **Bestehende URLs und Redirects nicht brechen** — insbesondere die beiden Redirects in `astro.config.mjs`: `/projects/vendbridge-panel` → `/projects/konteo-panel` und `/projects/vendprovision` → `/projects/konteo-provision`. Beide sind dort als `status: 301` deklariert, im statischen Build erzeugt Astro daraus aber eine **Meta-Refresh-Seite** (`<meta http-equiv="refresh" content="0;url=…">` plus `<link rel="canonical">` und `robots: noindex`) — GitHub Pages kann keine echten HTTP-301 ausliefern. Ein `200` auf der alten URL ist deshalb korrekt und kein Defekt: geprüft wird der Seiteninhalt (`curl -s <alte URL> | grep http-equiv`), nicht der Statuscode — `curl -I` täuscht hier.
11. **Keine Secrets ins Repo** (`.env` ist gitignored).
12. **Bei Unklarheit nicht raten:** Frage als Kommentar in das zugehörige Issue, Status `blocked`, Chief of Staff @-erwähnen.
13. **Keine Fakten erfinden** — keine Projektdetails, Kunden, Zahlen, Zeiträume oder Rollen. Fehlende Fakten beim Board erfragen.

---

## Bekannte Abweichungen zwischen Regel 4 / `.cursorrules` und dem Code auf `main`

Diese vier Stellen widersprechen Regel 4 bzw. `.cursorrules`, liegen aber bereits ausgeliefert auf `main`.
**Sie sind offen und nicht entschieden.** Fasse sie nicht nebenbei an: eine Änderung wäre entweder das
Entfernen einer bewussten Design-Entscheidung oder ein Bugfix ohne Auftrag — beides braucht nach Regel 12
eine Board-Entscheidung. Steht in einem Issue ausdrücklich, dass eine dieser Stellen geändert werden soll,
gilt das Issue.

| Stelle | Regel | Ist-Stand |
|---|---|---|
| `src/components/Navigation.astro:9` | Regel 4 / `.cursorrules` §2: kein Glassmorphism, kein `backdrop-blur` | Sticky-Nav nutzt `backdrop-blur-md backdrop-saturate-150` |
| `src/pages/index.astro:56` | Regel 4: kleine Texte mindestens `stone-500` | `text-[17px] text-stone-400` — steht aber auf `bg-stone-900`, wo `stone-400` der kontraststärkere Wert ist. Die Regel ist erkennbar für hellen Grund gedacht, sagt das aber nicht. |
| `src/pages/index.astro:51` (Kontakt-Strip), `src/styles/global.css:39` (Skip-Link) | Regel 4 / `.cursorrules` „Design Philosophy", Zeile 7 (`STRICT RULE: NO DARK MODE`) | Beide sind `bg-stone-900`. Lesart „kein umschaltbares Dark-Theme" vs. „keine dunkle Sektion" ist ungeklärt. |
| `src/components/Navigation.astro:33` | Regel 4 / `.cursorrules` §4: Touch-Targets ≥ 44 px | Kontakt-CTA hat `min-h-[40px]`; die Nav-Links darüber (`:14`, `:21`, `:27`) haben korrekt `min-h-[44px]`. Sieht nach Absicht aus, ist aber nirgends festgehalten. |

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

- **`gh` ist nicht installiert.** Es liegt als Paperclip-Shim auf dem `PATH`, antwortet aber auf jeden Aufruf mit „Paperclip: requested GitHub command is not installed". Verwende die **GitHub-MCP-Tools**: `create-pull-request` (PR öffnen), `pull-request-read` (Status, Checks, Kommentare), `list-pull-requests`, `list-branches`, `get-file-contents`. **Nicht selbst mergen** — der PR bleibt offen und geht ans Board.
- **`git` funktioniert normal**, inklusive `push` (Paperclip injiziert das Token).
- **Ein frischer Worktree hat kein `node_modules`.** Der Worktree-Provision-Command ist beim Board nicht gesetzt, und `git worktree add` kopiert `node_modules` nicht mit. Führe in jedem neuen Worktree **zuerst `npm ci`** aus, dann `npm run build` — sonst schlägt der Build mit einem irreführenden Fehler fehl. (Im gemeinsamen Checkout kann `node_modules` von einem früheren Run vorhanden sein; das sagt nichts über deinen Worktree.)
- **Deploy-Check ohne `gh`:** `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Workflow-Reruns kann kein Agent auslösen — informiere das Board, wenn der Deploy hängt; `deploy.yml` hat `workflow_dispatch`, das Board kann den Lauf im Actions-Tab manuell neu starten.
- **Branch-Schema:** `agent/<issue-kennung>-<kurzer-slug>`, z. B. `agent/pri-9-claude-md`.
- **Die Commit-Identität liegt nicht beim Agent.** `git` auf dem `PATH` ist ein Paperclip-Wrapper, der bei jedem Aufruf `-c user.name` und `-c user.email` auf der Kommandozeile injiziert; `GIT_CONFIG_GLOBAL` und `GIT_CONFIG_SYSTEM` zeigen auf `/dev/null`, `~/.gitconfig` wird also nie gelesen. Kommandozeilen-Config schlägt Repo-Config, `git config --local user.email …` hat deshalb keine Wirkung. Ein Agent-Commit landet unter der GitHub-Identität des Repo-Owners (`Padrio <…@users.noreply.github.com>`), nicht unter der in Regel 2 genannten Adresse. Nicht dagegen anarbeiten — die Abweichung liegt beim Board.
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
3. Commit ohne `Co-Authored-By`-Trailer (Regel 2), Branch pushen.
4. PR über `create-pull-request` öffnen, Link ins Issue.
5. Review anfordern: für **jeden im Issue genannten Auditor** ein eigenes Review-Child-Issue anlegen und das eigene Issue per `blockedByIssueIds` an diese Child-Issues hängen. Das Review-Issue muss selbsterklärend sein — Ziel, Definition of Done, Branch und PR-Link, relevante Regeln, und was ausdrücklich nicht in Scope ist. Der Auditor kann das Elternissue möglicherweise nicht lesen. **Das Issue bleibt bei dir**; weise es keinem Auditor zu.
6. Findings abarbeiten. Ändert ein Fix den Diff wesentlich, eine neue Review-Runde als neue Child-Issues aufsetzen — keine geschlossenen Reviews wiederbeleben.
7. Sind alle Reviews `done` und die Findings behandelt: Issue auf `in_review` mit Verweis auf PR und Review-Verdikte. **`in_review` allein genügt nicht** — solange das Issue bei einem Agent liegt, lehnt die Plattform den Statuswechsel mit `invalid_issue_disposition` ab, denn eine Zuweisung an einen Agent zählt nicht als Review-Pfad. Lege deshalb vorher eine `request_confirmation`-Interaction auf dem Issue an (`resolverPolicy: human_only`, `continuationPolicy: wake_assignee`) und binde sie im Statuswechsel per `reviewInteractionId` an das Review: damit ist der Reviewer ein Mensch, die Merge-Entscheidung erscheint dem Board als Karte, und du wachst nach der Entscheidung automatisch auf. Der PR liegt jetzt beim Board. **Nicht selbst mergen.**
8. Nach dem Merge Deploy-Check: `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Danach das Issue auf `done`.
9. Blocker: Frage als Kommentar, Status `blocked`, Chief of Staff @-erwähnen (Regel 12).
