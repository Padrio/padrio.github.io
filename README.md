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
