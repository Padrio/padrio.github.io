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
astro.config.mjs              site, Integrationen (tailwind, icon, sitemap), 301-Redirects, Shiki-Config
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

1. **Niemals direkt auf `main` pushen.** Ein Push auf `main` ist ein Production-Deploy (`.github/workflows/deploy.yml` deployt bei jedem Push auf `main` live). Jede Änderung: eigener Branch → Pull Request → Review durch den Code Auditor → **das Board merged**.
2. **Git-Identität:** Commits laufen als „Pascal Krason <p.krason@icloud.com>" (global in `~/.gitconfig`, nicht überschreiben). **Keine `Co-Authored-By`-Zeilen** in Commits oder PR-Beschreibungen — weder Claude noch Paperclip. Claude Code fügt sie standardmäßig hinzu; prüfe jede Commit-Message und jeden PR-Body, bevor du ihn abschickst.
   *Der erste Satz ist im Agent-Workspace nicht erfüllbar — siehe **Runtime-Realität**, „Die Commit-Identität liegt nicht beim Agent". Nicht dagegen anarbeiten. Das `Co-Authored-By`-Verbot gilt uneingeschränkt.*
3. **Vor jedem PR muss `npm run build` fehlerfrei durchlaufen.** Das Ergebnis wird im zugehörigen Issue dokumentiert. Es gibt weder Tests noch Linter — der Build ist das einzige Qualitätsgate.
4. **Design-System „Warm Minimalist"** (siehe `.cursorrules`): kein Dark Mode, keine Tech-/Cyberpunk-Ästhetik, kein Glassmorphism/`backdrop-blur`. Basis `stone-50`, weiße Karten mit dezenten Schatten, Akzent orange/rose. Mobile first, Touch-Targets ≥ 44 px. Bewusste A11y-Entscheidungen beibehalten: kleine Texte mindestens `stone-500` (nicht `stone-400`), Nav-CTA `orange-700`.
5. **Icons nur über `astro-icon`** (`<Icon name="simple-icons:…" />`). Niemals SVG-Pfade von Hand schreiben.
6. **Bilder nur als WebP** unter `public/images/projects/` (`cwebp -q 80`). Keine PNG-/JPG-Duplikate committen.
7. **Rechtliches:** `src/pages/legal.astro` und `src/pages/privacy.astro` nur mit ausdrücklicher Board-Freigabe ändern. Neue Third-Party-Skripte, Tracker, externe CDN-Fonts oder Embeds brauchen eine Board-Freigabe **und** eine passende Anpassung der Datenschutzerklärung (DSGVO).
8. **Keine neuen Dependencies und keine Major-Upgrades** ohne Board-Freigabe.
9. **Cross-Pfad-Konsistenz:** wo dieselben Daten an mehreren Stellen gerendert werden (ProjectCard auf der Startseite vs. Detailseite, Frontmatter vs. JSON-LD vs. OG-Tags), alle Pfade Feld für Feld vergleichen. Jede Abweichung muss begründet sein.
10. **Bestehende URLs und Redirects nicht brechen** — insbesondere die beiden 301-Redirects in `astro.config.mjs`: `/projects/vendbridge-panel` → `/projects/konteo-panel` und `/projects/vendprovision` → `/projects/konteo-provision`.
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

## Arbeitsablauf für ein Issue

1. Eigenen Worktree anlegen, Branch nach obigem Schema.
2. `npm ci`, implementieren, `npm run build` — Ausgabe ins Issue.
3. Commit ohne `Co-Authored-By`-Trailer (Regel 2), Branch pushen.
4. PR über `create-pull-request` öffnen, Link ins Issue.
5. **Review-Child-Issue anlegen** und dem Code Auditor zuweisen, dann das eigene Issue per `blockedByIssueIds` darauf blocken. Das Implementierungs-Issue bleibt beim Implementer; die Blocker-Kante ist es, die den `issue_blockers_resolved`-Wake für den Fix-Loop auslöst. Das Review-Issue muss **self-contained** sein — Ziel, Akzeptanzkriterien, Branch/Commit/PR, Scope-Grenzen —, weil der Auditor das Parent-Issue womöglich nicht lesen kann. Nicht selbst mergen, das macht das Board.
   *Nicht `in_review` + Zuweisung an den Auditor: die Plattform lehnt das mit `invalid_issue_disposition` ab, weil eine Agent-Zuweisung nicht als Review-Pfad zählt (nur ein menschlicher Reviewer, eine Interaction oder ein Monitor).*
6. Blocker: Frage als Kommentar, Status `blocked`, Chief of Staff @-erwähnen (Regel 12).
