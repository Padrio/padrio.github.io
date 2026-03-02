# Portfolio Website

Ein minimalistisches Portfolio mit Astro und Tailwind CSS.

## Features

- 🎨 Dark Mode Design
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

Beispiel:

```markdown
---
title: "Mein Projekt"
description: "Eine kurze Beschreibung"
date: "2024-01-01"
image: "/images/projekt.jpg"
tags: ["React", "TypeScript"]
---

Hier kommt der Inhalt des Projekts...
```

## Bilder in WebP umwandeln (macOS)

Projektbilder sollten im WebP-Format gespeichert werden, da es deutlich kleinere Dateigrößen bei vergleichbarer Qualität bietet.

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
