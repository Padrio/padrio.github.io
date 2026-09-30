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

## Runtime-Realität

Im Agent-Workspace verifiziert. Diese Punkte kosten sonst jeden Agent einen Fehlversuch.

- **`gh` ist nicht installiert.** Es liegt als Paperclip-Shim auf dem `PATH`, antwortet aber auf jeden Aufruf mit „Paperclip: requested GitHub command is not installed". Verwende die **GitHub-MCP-Tools**: `create-pull-request` (PR öffnen), `pull-request-read` (Status, Checks, Kommentare), `list-pull-requests`, `list-branches`, `get-file-contents`. **Nicht selbst mergen** — der PR bleibt offen und geht ans Board.
- **`git` funktioniert normal**, inklusive `push` (Paperclip injiziert das Token).
- **Der Checkout hat kein `node_modules`.** Der Worktree-Provision-Command ist beim Board noch nicht gesetzt. Führe deshalb **zuerst `npm ci`** aus, dann `npm run build` — sonst schlägt der Build mit einem irreführenden Fehler fehl.
- **Deploy-Check ohne `gh`:** `git fetch origin main && git log --oneline origin/main -3`, dann https://pkrason.de prüfen. Workflow-Reruns kann kein Agent auslösen; hängt der Deploy, informiere das Board.
- **Branch-Schema:** `agent/<issue-kennung>-<kurzer-slug>`, z. B. `agent/pri-9-claude-md`.
- **Die Commit-Identität liegt nicht beim Agent.** `git` auf dem `PATH` ist ein Paperclip-Wrapper, der bei jedem Aufruf `-c user.name` und `-c user.email` auf der Kommandozeile injiziert; `GIT_CONFIG_GLOBAL` und `GIT_CONFIG_SYSTEM` zeigen auf `/dev/null`, `~/.gitconfig` wird also nie gelesen. Kommandozeilen-Config schlägt Repo-Config, `git config --local user.email …` hat deshalb keine Wirkung. Ein Agent-Commit landet unter der GitHub-Identität des Repo-Owners (`Padrio <…@users.noreply.github.com>`), nicht unter der in Regel 2 genannten Adresse. Nicht dagegen anarbeiten — die Abweichung liegt beim Board.
- **Der Workspace kann parallel von mehreren Runs gehalten werden.** Nicht im gemeinsamen Checkout den Branch wechseln — mit `git worktree add` in einem eigenen Verzeichnis arbeiten und dort `npm ci` ausführen. `git rev-parse --abbrev-ref HEAD` darf nie `main` sein, während du arbeitest.

---

## Arbeitsablauf für ein Issue

1. Eigenen Worktree anlegen, Branch nach obigem Schema.
2. `npm ci`, implementieren, `npm run build` — Ausgabe ins Issue.
3. Commit ohne `Co-Authored-By`-Trailer (Regel 2), Branch pushen.
4. PR über `create-pull-request` öffnen, Link ins Issue.
5. Issue auf `in_review`, dem Code Auditor zuweisen. Nicht selbst mergen.
6. Blocker: Frage als Kommentar, Status `blocked`, Chief of Staff @-erwähnen (Regel 12).
