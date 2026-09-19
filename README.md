# SchuhTracker

Kilometerzähler für Laufschuhe. Installierbare PWA, vollständig offline nutzbar,
ohne Konto, ohne Server, ohne Tracker.

## Aufbau

```
shoetracker.html          App-Shell (semantisches Markup, keine Logik)
assets/css/app.css        Design-Tokens + Komponenten
assets/js/theme.js        Winziger Bootstrap gegen Theme-Flackern (blockierend)
assets/js/app.js          Anwendungslogik (IIFE, keine Abhängigkeiten)
manifest.webmanifest      PWA-Metadaten
sw.js                     Service Worker (App-Shell-Cache)
_headers                  Security-Header für Netlify / Cloudflare Pages
```

Keine Build-Schritte, keine Abhängigkeiten, kein Paketmanager.

## Lokal starten

Ein Service Worker braucht `http(s)://` – per `file://` läuft die App zwar,
aber ohne Offline-Cache und ohne Installierbarkeit.

```bash
python -m http.server 8000
# http://127.0.0.1:8000/shoetracker.html
```

## Datenhaltung

Alles liegt im `localStorage` des Browsers unter zwei Schlüsseln:

- `schuh_tracker_data` – Schuhe und Läufe
- `schuh_tracker_theme` – gewähltes Design

Es gibt keinen Server und keine Synchronisierung. Daten verschwinden, wenn die
Website-Daten des Browsers gelöscht werden – deshalb enthält der Statistik-Tab
ein JSON-Backup zum Exportieren und Wiederherstellen.

Jeder gelesene Wert durchläuft `normalize()` in `app.js`. Was von dort kommt,
ist garantiert typkorrekt und in gültigen Grenzen; der Rest der App prüft
deshalb nicht erneut. Beschädigte Einträge werden repariert oder verworfen,
statt die App scheitern zu lassen.

## Sicherheit

- Strikte CSP (`default-src 'none'`) – kein Inline-Script, kein `eval`,
  keine externen Quellen. Darum liegen auch Theme-Bootstrap und Logik in
  eigenen Dateien statt in `<script>`-Blöcken.
- Nutzerdaten werden ausschließlich über `textContent` in den DOM geschrieben.
  `innerHTML` kommt im Projekt nicht vor.
- `_headers` ergänzt `frame-ancestors`, HSTS und `Permissions-Policy`.
  Als `<meta>` ist `frame-ancestors` wirkungslos, daher zusätzlich
  `X-Frame-Options: DENY`.

## Privatsphäre

Die App lädt nichts nach. Keine Google Fonts, kein CDN, keine Analytics –
die einzigen Requests gehen an die eigenen Dateien. Als Schrift dient der
System-Font-Stack, als Icons ein Inline-SVG-Sprite in `shoetracker.html`.

## Service Worker aktualisieren

Nach Änderungen an CSS, JS oder Markup die Konstante `VERSION` in `sw.js`
erhöhen. Sonst behalten installierte Clients die alte Version im Cache.
Ein laufender Client zeigt dann einen Hinweis-Toast und lädt nach dem Antippen
mit der neuen Version neu.

Neue Dateien zusätzlich in die `SHELL`-Liste in `sw.js` eintragen, sonst sind
sie offline nicht verfügbar.

## Hosting-Hinweis

Einstiegspunkt ist `shoetracker.html`. Wer die App auf einer eigenen Domain
unter `/` erreichbar machen will, legt entweder eine `index.html` an, die
dorthin weiterleitet, oder benennt die Datei um – dann müssen `start_url` und
`shortcuts` in `manifest.webmanifest`, die `SHELL`-Liste und der
Navigations-Fallback in `sw.js` sowie `rel="canonical"` mitgezogen werden.

## Icons neu erzeugen

Die PNGs stammen aus denselben Pfaddaten wie `#i-shoe` in `shoetracker.html`.
Werden sie geändert, müssen `assets/icons/icon.svg` und die PNGs zusammen
angepasst werden.
