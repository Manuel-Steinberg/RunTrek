# SchuhTracker

Kilometerzähler für Laufschuhe. Installierbare PWA, vollständig offline nutzbar,
ohne Konto, ohne Server, ohne Tracker.

## Aufbau

```
index.html                App-Shell (semantisches Markup, keine Logik)
shoetracker.html          Weiterleitung von der alten Adresse auf ./
assets/css/app.css        Design-Tokens + Komponenten
assets/js/boot.js         Theme, Onboarding-Flag, beforeinstallprompt (blockierend)
assets/js/app.js          Anwendungslogik (IIFE, keine Abhängigkeiten)
assets/og/og-image.png    Vorschaubild für geteilte Links (1200×630)
tools/og-image.html       Vorlage, aus der das Vorschaubild gerendert wird
manifest.webmanifest      PWA-Metadaten
sw.js                     Service Worker (App-Shell-Cache)
sitemap.xml / robots.txt  Crawler-Wegweiser
_headers                  Security-Header (nur Netlify / Cloudflare Pages)
.nojekyll                 GitHub Pages: Dateien unverändert ausliefern
```

Keine Build-Schritte, keine Abhängigkeiten, kein Paketmanager.

## Lokal starten

Ein Service Worker braucht `http(s)://` – per `file://` läuft die App zwar,
aber ohne Offline-Cache und ohne Installierbarkeit.

```bash
python -m http.server 8000
# http://127.0.0.1:8000/
```

## Datenhaltung

Alles liegt im `localStorage` des Browsers unter drei Schlüsseln:

- `schuh_tracker_data` – Schuhe und Läufe
- `schuh_tracker_theme` – gewähltes Design
- `schuh_tracker_onboarded` – Einführung wurde gesehen

„Alle Daten von diesem Gerät löschen“ im Statistik-Tab entfernt alle drei
Schlüssel. Danach startet die App wie beim allerersten Aufruf.

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
System-Font-Stack, als Icons ein Inline-SVG-Sprite in `index.html`.

Der `<footer class="about">` in `index.html` ist zugleich die
Datenschutzerklärung und nennt die Speicherschlüssel im Klartext. Er sagt
auch, was die App *nicht* verhindern kann: Der Hoster sieht wie bei jedem
Website-Aufruf IP-Adresse und Browsertyp.

## Onboarding

Der Willkommensblock (`#onboarding`) steht als fertiges Markup in
`index.html`, nicht im JavaScript. Zwei Gründe:

- Crawler und langsame Verbindungen sehen sofort, was die App tut.
- `boot.js` blendet ihn für Wiederkehrer vor dem ersten Frame aus
  (`:root[data-onboarded]` im CSS) – kein Aufblitzen.

Er verschwindet mit dem ersten angelegten Schuh oder über „Später“.
Bestandsnutzer ohne Flag sehen ihn nie, weil `onboardingDone()` auch dann
wahr ist, wenn bereits Schuhe existieren.

## Teilen & SEO

Die kanonische Adresse steht an vier Stellen absolut im Code:
`rel="canonical"` und `og:url` in `index.html`, `<loc>` in `sitemap.xml`
und die `Sitemap:`-Zeile in `robots.txt`. Bei einem Umzug auf eine eigene
Domain müssen alle vier mitgezogen werden – ebenso `og:image` und
`twitter:image`, denn relative Pfade lösen die meisten Social-Scraper nicht auf.

`assets/og/og-image.png` ist das Vorschaubild für geteilte Links und wird aus
`tools/og-image.html` gerendert (Headless Chrome, 1200×630). Es liegt bewusst
*nicht* in der `SHELL`-Liste von `sw.js`: Die App zeigt es nie an, nur fremde
Crawler laden es – offline zwischenzuspeichern wäre verschenkter Platz.

Die FAQ im `<footer>` und das `FAQPage`-JSON-LD im `<head>` müssen wortgleich
bleiben. Sichtbarer Text und Markup dürfen laut Google-Richtlinie nicht
auseinanderlaufen; wer eine Antwort ändert, ändert beide Stellen.

`robots.txt` und `sitemap.xml` greifen auf einer GitHub-Projektseite nur
eingeschränkt: Crawler lesen `robots.txt` ausschließlich im Domain-Root
(`manuel-steinberg.github.io/robots.txt`), nicht im Unterverzeichnis. Die
Sitemap lässt sich dafür in der Google Search Console direkt einreichen.
Mit eigener Domain funktionieren beide Dateien ohne Einschränkung.

## Service Worker aktualisieren

Nach Änderungen an CSS, JS oder Markup die Konstante `VERSION` in `sw.js`
erhöhen. Sonst behalten installierte Clients die alte Version im Cache.
Ein laufender Client zeigt dann einen Hinweis-Toast und lädt nach dem Antippen
mit der neuen Version neu.

Neue Dateien zusätzlich in die `SHELL`-Liste in `sw.js` eintragen, sonst sind
sie offline nicht verfügbar.

## GitHub Pages

Läuft ohne Anpassungen: alle Pfade sind relativ, funktionieren also auch im
Unterverzeichnis eines Projekt-Sites. `.nojekyll` verhindert, dass Jekyll
Dateien mit führendem Unterstrich (`_headers`) verschluckt.

Die App ist die `index.html` und liegt damit direkt unter
`https://<user>.github.io/RunTrek/` – das ist die Adresse zum Teilen.

Zwei Einschränkungen:

- **`_headers` ist dort wirkungslos** – die Datei versteht nur Netlify und
  Cloudflare Pages. GitHub Pages erlaubt keine eigenen HTTP-Header, damit
  entfallen `frame-ancestors`, HSTS und `Permissions-Policy`. Die `<meta>`-CSP
  in `index.html` greift weiterhin und ist dort die Obergrenze;
  gegen Framing bleibt nichts übrig, weil `frame-ancestors` als `<meta>`
  laut Spezifikation ignoriert wird.
- HTTPS liefert GitHub Pages von sich aus – die Voraussetzung für Service
  Worker und Installierbarkeit ist also erfüllt.

Wird die App je umbenannt oder verschoben, müssen `start_url`, `id` und
`shortcuts` in `manifest.webmanifest`, die `SHELL`-Liste und der
Navigations-Fallback in `sw.js` sowie die vier absoluten Adressen aus
„Teilen & SEO“ mitgezogen werden.

`shoetracker.html` ist die frühere Adresse der App und nur noch eine
Weiterleitung auf `./`. GitHub Pages kann keine 301 ausliefern, deshalb
`meta refresh` plus `canonical`. Die Datei steht bewusst **nicht** in
`sitemap.xml` und ist in `robots.txt` **nicht** gesperrt: Eine gesperrte URL
wird nicht gecrawlt, damit sähe Google weder `noindex` noch `canonical` und
die alte Adresse bliebe im Index stehen.

## Icons neu erzeugen

Die PNGs stammen aus denselben Pfaddaten wie `#i-shoe` in `index.html`.
Werden sie geändert, müssen `assets/icons/icon.svg` und die PNGs zusammen
angepasst werden.
