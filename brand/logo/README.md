# pkrason.de – Logo „Kompakt“

Bildmarke: großes **PK** (Inter Black) in vier orangen Schnittmarken – ein Sucher, der scharfgestellt hat.
Alle SVGs sind in Pfade umgewandelt und brauchen keine installierten Schriften.

## Farben

| Rolle            | Hex       | Tailwind   |
|------------------|-----------|------------|
| Ecken / Akzent   | `#ea580c` | orange-600 |
| Text hell        | `#1c1917` | stone-900  |
| Text dunkel      | `#fafaf9` | stone-50   |
| Zusatz hell      | `#78716c` | stone-500  |
| Zusatz dunkel    | `#a8a29e` | stone-400  |
| Fläche dunkel    | `#0c0a09` | stone-950  |

Schriften: Inter Black (Name, PK), JetBrains Mono Medium (Zusatz).

## Dateien

| Datei | Wofür |
|---|---|
| `svg/pkrason-mark.svg` / `-dark` | Bildmarke auf hellem / dunklem Grund |
| `svg/pkrason-mark-mono-black.svg` / `-white` | Einfarbig: Stempel, Gravur, Fax, Folie |
| `svg/pkrason-lockup.svg` / `-dark` | Marke + Name + Zusatz, horizontal (Briefkopf, Rechnung, Website) |
| `svg/pkrason-lockup-stacked.svg` / `-dark` | Gestapelt (Visitenkarte, Profil-Banner) |
| `svg/pkrason-wordmark.svg` / `-dark` | Nur Name, für enge Stellen |
| `favicon.svg` | Browser-Favicon, wechselt automatisch hell/dunkel |
| `favicon.ico` | Fallback 16/32/48 px |
| `png/apple-touch-icon.png`, `png/icon-192.png`, `png/icon-512.png` | iOS / Web-Manifest (deckender heller Grund) |
| `png/*-512.png`, `*-1024.png`, `*@4x.png` | Raster für Office, Social, Mail-Signatur |

## Druck & Rechnungen (`druck/`)

Jede Variante liegt als **SVG** (Web, Word 365, Affinity/Figma), **PDF** (Pages, Word Mac, InDesign), **EPS** (Druckerei) und **PNG** (transparent, 2400 px breit ≈ 20 cm bei 300 dpi) vor.

| Variante | Wann |
|---|---|
| `pkrason-briefkopf` | Standard für Rechnung, Angebot, Briefkopf (links oben) |
| `pkrason-briefkopf-domain` | Wie oben, Zusatzzeile `pkrason.de` statt Tätigkeit |
| `pkrason-briefkopf-rechts` | Text rechtsbündig vor der Marke – für Briefköpfe mit Logo rechts oben |
| `pkrason-briefkopf-graustufen` | S/W-Laserdrucker: Ecken in Grau statt Orange, damit sie nicht verblassen |
| `pkrason-briefkopf-schwarz` | Einfarbig schwarz: Stempel, Fax, Gravur, Thermodruck |
| `pkrason-briefkopf-weiss` | Einfarbig weiß auf dunklem Grund / Fotos |
| `pkrason-gestapelt` / `-schwarz` | Zentriert: Visitenkarte, Deckblatt, Rechnungsfuß |
| `pkrason-marke` / `-graustufen` / `-schwarz` | Nur Bildmarke: Seitenzahl-Ecke, Folgeseiten, Stempel |
| `*-weisser-grund.png` | Für Rechnungstools (lexoffice, sevDesk & Co.), die keine Transparenz mögen |
| `mail-signatur.png` | 600 × 141 px, im Mail-Programm auf **300 px Breite** einbinden (Retina-scharf) |

Empfohlene Größe auf A4: Briefkopf-Lockup **50–60 mm breit**, Abstand zum oberen Rand ≥ 15 mm.

## Regeln

- **Schutzzone:** rundum mindestens die Breite eines Eck-Schenkels (≈ ¼ der Markenbreite) freihalten.
- **Mindestgröße:** Bildmarke 16 px digital / 6 mm Druck; Lockup mit Zusatz ab 120 px / 35 mm Breite.
- Ecken immer orange, nur in den Einfarb-Versionen nicht. Kein Verzerren, keine Schatten, keine Verläufe.
- Auf Fotos nur auf ruhigen Flächen; sonst Einfarb-Weiß verwenden.

Generiert von `build.cjs` aus den Inter- und JetBrains-Mono-WOFFs in `node_modules/@fontsource` (opentype.js, Aufruf im Dateikopf); Raster per `rsvg-convert`, ICO per ImageMagick. Das Skript legt auch `public/logo-mark.svg` für die Website ab.
