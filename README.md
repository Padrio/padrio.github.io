# Portfolio Website

Ein minimalistisches Portfolio mit Astro und Tailwind CSS.

Das Design-System heißt „Warm Minimalist“: heller Grund (`stone-50`), weiße Karten mit dezenten Schatten, Akzent in Orange/Rose. Es gibt bewusst keinen Dark Mode. Details stehen in [`.cursorrules`](.cursorrules); verbindliche Projektregeln und Arbeitsabläufe in [`CLAUDE.md`](CLAUDE.md).

## Features

- 🎨 „Warm Minimalist“-Design (helles Theme, kein Dark Mode)
- 📱 Responsive Layout
- ⚡ Statische Seiten-Generierung
- 📝 Markdown-basierte Projekte
- 🎯 Content Collections für einfache Verwaltung

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

Die Website ist dann unter `http://localhost:4321` erreichbar.

## Build

```bash
npm run build
```

## Projekte hinzufügen

Neue Projekte können einfach als Markdown-Dateien im Ordner `src/content/projects/` hinzugefügt werden.

Beispiel (alle Felder aus `src/content/config.ts`):

```markdown
---
title: "Mein Projekt"
description: "Eine kurze Beschreibung"
date: "2024-01-01"
image: "/images/projects/mein-projekt.webp"
tags: ["React", "TypeScript"]
github: "https://github.com/user/mein-projekt"
demo: "https://example.com"
featured: true
flagship: false
---

Hier kommt der Inhalt des Projekts...
```

| Feld | Pflicht | Beschreibung |
|---|---|---|
| `title` | ja | Titel des Projekts |
| `description` | ja | Kurzbeschreibung |
| `date` | ja | Datum als String, z. B. `"2024-01-01"` |
| `image` | nein | Pfad zu einem WebP-Bild unter `public/images/projects/` |
| `tags` | nein | Liste von Tags |
| `github` | nein | Vollständige URL zum Repository |
| `demo` | nein | Vollständige URL zur Live-Demo |
| `featured` | nein | Default `true`. Steuert, ob das Projekt im „Selected Works“-Grid der Startseite erscheint. Die Detailseite wird immer erzeugt. |
| `flagship` | nein | Default `false`. Zeigt das FLAGSHIP-Badge auf der Karte. |

## Bilder in WebP umwandeln (macOS)

Projektbilder werden ausschließlich im WebP-Format unter `public/images/projects/` gespeichert (keine PNG-/JPG-Duplikate committen), da es deutlich kleinere Dateigrößen bei vergleichbarer Qualität bietet.

### cwebp installieren

```bash
brew install webp
```

### Einzelnes Bild umwandeln

```bash
cwebp -q 80 input.png -o output.webp
```

`-q 80` setzt die Qualität auf 80% (empfohlen für Projektbilder).

### Alle PNGs in einem Ordner umwandeln

```bash
for file in public/images/projects/*.png; do
  cwebp -q 80 "$file" -o "${file%.png}.webp"
done
```

## Projektstruktur

```
src/
├── content/
│   └── projects/          # Markdown-Dateien für Projekte
├── components/             # Astro-Komponenten
├── layouts/               # Layout-Komponenten
├── pages/                 # Seiten
└── styles/                # Globale Styles
```
