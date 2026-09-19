# SchuhTracker

Kilometerzähler für Laufschuhe. Installierbare PWA, vollständig offline nutzbar,
ohne Konto, ohne Server, ohne Tracker.

Oberfläche, Inhalte und Quelltext-Kommentare sind deutsch. Neuer Code bleibt bei
diesem Mischstil: englische Bezeichner, deutsche Kommentare und Nutzertexte.

## Funktionsumfang

- Schuhe anlegen: Name, Marke, Emoji, Kaufdatum, Startkilometer, Verschleißgrenze
  (Voreinstellung 800 km).
- Läufe eintragen: Schuh, Distanz, Datum, Notiz.
- Verschleißampel je Schuh: unter 75 % „Gut“, ab 75 % „Demnächst fällig“,
  ab 100 % „Verschlissen“.
- Schuhliste sortieren (Ziehen per Pointer Events, alternativ Pfeiltasten auf dem
  Griff), archivieren, löschen. Archivierte Schuhe behalten ihre Läufe.
- Statistik: Gesamtkilometer, Anzahl Läufe, Ø-Distanz, aktive Schuhe,
  Verschleißverteilung.
- CSV-Export, JSON-Backup mit Wiederherstellung, vollständiges Löschen aller
  Daten dieses Geräts.
- Heller/dunkler Modus, Installationsdialog, Offline-Betrieb, Update-Hinweis.

## Aufbau

```
index.html                App-Shell: Markup der App, Icon-Sprite, JSON-LD
faq.html                  Inhaltsseite: Fragen & Antworten (+ FAQPage-JSON-LD)
datenschutz.html          Inhaltsseite: Datenschutzerklärung
assets/css/app.css        Design-Tokens + Komponenten (~800 Zeilen)
assets/js/boot.js         Theme, Onboarding-Flag, beforeinstallprompt (blockierend)
assets/js/app.js          Anwendungslogik (IIFE, keine Abhängigkeiten, ~1250 Zeilen)
assets/icons/             App-Icons (SVG-Quelle + PNGs)
assets/og/og-image.png    Vorschaubild für geteilte Links (1200×630)
tools/og-image.html       Vorlage, aus der das Vorschaubild gerendert wird
manifest.webmanifest      PWA-Metadaten
sw.js                     Service Worker (App-Shell-Cache)
sitemap.xml / robots.txt  Crawler-Wegweiser
llms.txt                  Kurzbeschreibung für KI-Crawler
_headers                  Security-Header (nur Netlify / Cloudflare Pages)
.nojekyll                 GitHub Pages: Dateien unverändert ausliefern
```

Keine Build-Schritte, keine Abhängigkeiten, kein Paketmanager, kein Framework,
keine Tests. Die Dateien werden genau so ausgeliefert, wie sie im Repo liegen.

Der Codestil ist ES5-nah (`var`, `function`, IIFE) und nutzt punktuell moderne
Browser-APIs ohne Polyfill: `Map`, `Set`, `Intl`, `<dialog>`, Pointer Events,
`File.text()`, `CSS.escape`. Es gibt keinen Transpiler – erlaubt ist nur, was
aktuelle Browser direkt verstehen.

## Lokal starten

Ein Service Worker braucht `http(s)://` – per `file://` läuft die App zwar,
aber ohne Offline-Cache und ohne Installierbarkeit.

```bash
python -m http.server 8000
# http://127.0.0.1:8000/
```

## Datenmodell

Der gesamte Zustand sind zwei Arrays. Andere Felder existieren nicht, alles
Weitere wird berechnet.

```js
state = {
  shoes: [{
    id:           'shoe-...',   // eindeutig, max. 64 Zeichen
    name:         'Pegasus 40', // Pflicht, max. 60 Zeichen
    brand:        'Nike',       // optional, max. 40
    maxKm:        800,          // 1 … 5000, Verschleißgrenze
    initialKm:    0,            // 0 … 5000, Bestand beim Anlegen
    purchaseDate: '2025-04-01', // '' oder ISO-Datum
    icon:         '👟',         // genau ein Graphem
    archived:     false
  }],
  runs: [{
    id:       'run-...',
    shoeId:   'shoe-...',       // kann auf einen gelöschten Schuh zeigen
    distance: 12.4,             // > 0, max. 999, auf 0,1 gerundet
    date:     '2025-04-12',     // ISO, Voreinstellung heute
    notes:    ''                // optional, max. 280 Zeichen
  }]
};
```

Wichtig für Änderungen:

- **Kilometerstände werden nie gespeichert.** `kilometresByShoe()` berechnet sie
  aus `initialKm` plus allen Läufen des Schuhs.
- **Die Reihenfolge von `state.shoes` ist die Anzeigereihenfolge.** Es gibt kein
  `order`-Feld. `applyOrder()` schreibt eine neue Reihenfolge der *sichtbaren*
  Schuhe zurück, ohne die Positionen der ausgeblendeten zu verändern.
- **Läufe werden unsortiert gespeichert.** `runsSorted()` sortiert nach Datum
  absteigend; bei gleichem Datum bleibt die Eingabereihenfolge erhalten.
- Beim Löschen eines Schuhs werden seine Läufe mitgelöscht. Verwaiste Läufe aus
  einem Backup bleiben bestehen und zählen nirgends mit.

Das JSON-Backup ist dasselbe Modell mit Kopfdaten:

```json
{ "app": "SchuhTracker", "version": 1, "exportedAt": "…ISO…", "shoes": [], "runs": [] }
```

Beim Import werden nur `shoes` und `runs` gelesen und durch `normalize()`
geschickt; `app` und `version` sind Dokumentation, keine Bedingung. Dateien über
5 MB werden abgelehnt. Der CSV-Export schreibt eine Zeile je Lauf mit Semikolon,
Dezimalkomma und BOM – so öffnet deutsches Excel ihn ohne Nachfrage.

## Datenhaltung

Alles liegt im `localStorage` des Browsers unter drei Schlüsseln:

- `schuh_tracker_data` – Schuhe und Läufe (JSON, das obige Modell)
- `schuh_tracker_theme` – `'light'` oder `'dark'`
- `schuh_tracker_onboarded` – `'1'`, wenn die Einführung gesehen wurde

Jeder Zugriff läuft über das gekapselte `storage`-Objekt, das Ausnahmen
schluckt: In privaten Fenstern oder bei vollem Speicher läuft die App ohne
Persistenz weiter, sichtbar nur als Toast.

„Alle Daten von diesem Gerät löschen“ im Statistik-Tab entfernt alle drei
Schlüssel. Danach startet die App wie beim allerersten Aufruf.

Es gibt keinen Server und keine Synchronisierung. Daten verschwinden, wenn die
Website-Daten des Browsers gelöscht werden – deshalb enthält der Statistik-Tab
ein JSON-Backup zum Exportieren und Wiederherstellen.

Jeder gelesene Wert durchläuft `normalize()` in `app.js`. Was von dort kommt,
ist garantiert typkorrekt und in gültigen Grenzen; der Rest der App prüft
deshalb nicht erneut. Beschädigte Einträge werden repariert oder verworfen,
statt die App scheitern zu lassen.

## Codeüberblick: `assets/js/app.js`

Eine einzige IIFE, gegliedert durch Banner-Kommentare (`// ----- Abschnitt`).
Keine Klassen, keine Module, kein Export.

| Abschnitt | Inhalt |
| --- | --- |
| Konstanten | Speicherschlüssel, `LIMIT` (alle Längen- und Wertgrenzen an einer Stelle), `WEAR`, `TABS`, `TAB_HASH` |
| Formate | `formatKm`, `formatDate` (`Intl`, `de-DE`), `todayIso` (lokal, nicht UTC), `round1` |
| Helfer | `byId`, `el`, `icon` (Sprite-Referenz), `uid`, `firstGrapheme` |
| Speicher | `storage.read/write/remove` – der einzige `localStorage`-Zugriff in `app.js` |
| Validierung | `toText`, `toNumber`, `toIsoDate`, `toIcon`, **`normalize()`** |
| Zustand | `state` (Daten), `ui` (`tab`, `filter`, `detailId`), `drag`, `installPrompt`, `load()`, `save()` |
| Berechnungen | `kilometresByShoe()` (O(n) über eine `Map`), `wearOf()`, `shoeById`, `visibleShoes`, `runsSorted` |
| Meter | `buildMeter()` – Verschleißbalken, geteilt von Karte und Detaildialog |
| Onboarding | `onboardingDone`, `syncOnboarding`, `finishOnboarding`, `openAddShoeDialog` |
| Rendering | `renderShoes` / `buildShoeCard`, `buildRunRow` / `renderRecentRuns`, `populateShoeSelect`, `renderStats` |
| Navigation | `switchTab()` (Tab-Wechsel + Hash), `tabFromHash()` |
| Dialoge/Toast | `openDialog`, `closeDialog`, `askConfirm()` (Promise), `showToast(text, action?)` |
| Aktionen | `addShoe`, `logRun`, `deleteRun` (mit Rückgängig-Toast), `toggleArchive`, `deleteShoe`, `deleteAllData` |
| Detaildialog | `openShoeDetail()` – füllt den Dialog neu, merkt sich `ui.detailId` |
| Sortierung | `applyOrder`, `moveShoeByKeyboard`, `startDrag`/`moveDrag`/`endDrag` (Pointer Events, damit Touch funktioniert) |
| Export | `download`, `exportCsv`, `exportJson`, `importJson` |
| Theme | `currentTheme`, `applyTheme`, `syncThemeButton` |
| PWA | `isStandalone`, `isIos`, `installHint`, `setupInstall`, `setupServiceWorker` |
| Bindings | `syncFilterChips`, `bindEvents()` – *alle* Listener der App |
| Start | `init()`: laden, synchronisieren, binden, Tab aus dem Hash setzen |

### Renderfluss

Es gibt kein reaktives System. Der Ablauf ist überall derselbe:

```
Aktion → state ändern → save() → betroffenes render*() → showToast()
```

`switchTab()` ist der Verteiler: Es rendert genau den sichtbaren Tab
(`renderShoes` / `populateShoeSelect` + `renderRecentRuns` / `renderStats`). Wer
den Zustand global verändert (etwa beim Import), ruft deshalb `switchTab(ui.tab)`
statt einzelner Renderer. Renderfunktionen leeren ihren Container und bauen ihn
neu auf; Teil-Updates gibt es nicht.

### Vertrag zwischen `index.html` und `app.js`

Das statische Markup steht vollständig in `index.html`; JavaScript erzeugt nur
Listeneinträge und Karten. Verknüpft sind beide über:

- **IDs** – `byId(...)` erwartet sie ohne Fallback. Wer ein Element umbenennt
  oder entfernt, bricht die App an dieser Stelle.
- **`data`-Attribute für Ereignisse**, alle per Delegation in `bindEvents()`:
  `data-tab` (Tab-Buttons), `data-filter` (Aktiv/Archiv-Chips), `data-open`
  (Schuhkarte → Detaildialog), `data-handle` (Sortiergriff), `data-delete-run`,
  `data-close-dialog`, `data-id` (auf `.shoe`, liefert die Reihenfolge beim
  Sortieren).
- **Icons**: ein Inline-SVG-Sprite am Anfang von `index.html` (`#i-shoe`,
  `#i-plus`, `#i-trash`, …). `icon('i-plus')` baut daraus ein
  `<svg><use href="#i-plus">`. Neue Icons gehören ins Sprite, nicht in eine
  eigene Datei.
- **Tabs und Panels** heißen paarweise `tab-<name>` / `panel-<name>` mit
  `<name>` aus `TABS`.
- Formularfelder folgen dem Schema `shoe-*` (Dialog „Schuh anlegen“) und `run-*`
  (Lauf-Tab), Detaildialog-Felder `detail-*`.

### `boot.js` (blockierend im `<head>`)

Winzig und absichtlich vor allem anderen: Theme aus dem Speicher anwenden, das
Onboarding-Flag als `data-onboarded` setzen (verhindert Aufblitzen) und
`beforeinstallprompt` in `window.__installPrompt` auffangen. Chrome feuert das
Event bei Wiederbesuchen früher, als ein `defer`-Script laufen kann – `app.js`
übernimmt das zwischengespeicherte Event in `setupInstall()`.

### `app.css`

Design-Tokens (Material-3-nah) auf `:root`, dunkle Variante zweimal notiert:
`:root[data-theme="dark"]` für die ausdrückliche Wahl und
`@media (prefers-color-scheme: dark)` ohne Gegenwahl. Kein `light-dark()`, damit
ältere WebViews mitkommen. Danach Abschnitte für Reset, App-Bar, Layout,
Buttons, Chips, Karten, Progress, Formulare, Statistik, Listen, Leerzustand,
Bottom-Navigation, Dialoge, Toast, Onboarding, Fussbereich, Unterseiten
(`.page__*`) und Motion. Farben
gehören als Token nach oben, nicht in die Komponenten.

## Konventionen

1. **Kein `innerHTML`.** Nutzertext geht ausschließlich über `textContent` in den
   DOM, Elemente entstehen über `el(tag, className, text)`.
2. **Kein Inline-Script, kein `eval`, keine externen Quellen.** Die CSP verbietet
   beides; deshalb liegen selbst drei Zeilen Theme-Logik in `boot.js`.
3. **Validierung findet nur in `normalize()` statt.** Neue Felder brauchen dort
   eine Zeile und eine Grenze in `LIMIT`; danach darf der Rest blind vertrauen.
4. **Speicherzugriffe nur über `storage`.** Ein direkter `localStorage`-Aufruf
   außerhalb ist ein Absturz im privaten Modus.
5. **Alle Listener in `bindEvents()`, per Delegation auf den Container.** Karten
   und Zeilen bekommen keine eigenen Listener.
6. **Rückmeldung über `showToast()`**, nicht `alert()`. Destruktive Aktionen
   fragen vorher mit `askConfirm()` oder bieten ein Rückgängig im Toast an, wie
   `deleteRun()`.
7. **Barrierefreiheit mitführen**: `aria-selected` auf Tabs, `aria-pressed` auf
   Filter-Chips, `aria-live` am Toast, Tastaturpfade für alles, was per Zeigen
   und Ziehen geht.

## Sicherheit

- Strikte CSP (`default-src 'none'`) – kein Inline-Script, kein `eval`,
  keine externen Quellen. Darum liegen auch Theme-Bootstrap und Logik in
  eigenen Dateien statt in `<script>`-Blöcken.
- Nutzerdaten werden ausschließlich über `textContent` in den DOM geschrieben.
  `innerHTML` kommt im Projekt nicht vor.
- `_headers` ergänzt `frame-ancestors`, HSTS und `Permissions-Policy`.
  Als `<meta>` ist `frame-ancestors` wirkungslos, daher zusätzlich
  `X-Frame-Options: DENY`.
- Importierte Backups sind Fremdeingabe: Größe begrenzt, `JSON.parse` in
  `try`/`catch`, danach `normalize()`.

## Privatsphäre

Die App lädt nichts nach. Keine Google Fonts, kein CDN, keine Analytics –
die einzigen Requests gehen an die eigenen Dateien. Als Schrift dient der
System-Font-Stack, als Icons ein Inline-SVG-Sprite in `index.html`.

Die Datenschutzerklärung steht als eigene Seite in `datenschutz.html` und
nennt die Speicherschlüssel im Klartext. Sie sagt auch, was die App *nicht*
verhindern kann: Der Hoster sieht wie bei jedem Website-Aufruf IP-Adresse und
Browsertyp. Verlinkt ist sie aus dem Fussbereich jeder Seite und zusätzlich
über `<link rel="privacy-policy">` im `<head>` der App.

## Onboarding

Der Willkommensblock (`#onboarding`) steht als fertiges Markup in
`index.html`, nicht im JavaScript. Zwei Gründe:

- Crawler und langsame Verbindungen sehen sofort, was die App tut.
- `boot.js` blendet ihn für Wiederkehrer vor dem ersten Frame aus
  (`:root[data-onboarded]` im CSS) – kein Aufblitzen.

Er verschwindet mit dem ersten angelegten Schuh – und nur dadurch. Einen
„Später“-Knopf gab es kurzzeitig; er tauschte die Willkommenskarte gegen den
leeren Zustand und brachte dem Nutzer nichts, deshalb ist er wieder raus.
Bestandsnutzer ohne Flag sehen den Block nie, weil `onboardingDone()` auch
dann wahr ist, wenn bereits Schuhe existieren.

## Teilen & SEO

Die kanonische Adresse steht absolut im Code: `rel="canonical"` und `og:url`
in `index.html`, `faq.html` und `datenschutz.html`, die drei `<loc>` in
`sitemap.xml` und die `Sitemap:`-Zeile in `robots.txt`. Bei einem Umzug auf eine eigene
Domain müssen alle vier mitgezogen werden – ebenso `og:image` und
`twitter:image`, denn relative Pfade lösen die meisten Social-Scraper nicht auf.
`llms.txt` nennt dieselbe Adresse und gehört ebenfalls dazu.

`assets/og/og-image.png` ist das Vorschaubild für geteilte Links und wird aus
`tools/og-image.html` gerendert (Headless Chrome, 1200×630). Es liegt bewusst
*nicht* in der `SHELL`-Liste von `sw.js`: Die App zeigt es nie an, nur fremde
Crawler laden es – offline zwischenzuspeichern wäre verschenkter Platz.

Der sichtbare FAQ-Text in `faq.html` und das `FAQPage`-JSON-LD im `<head>`
derselben Datei müssen wortgleich bleiben. Sichtbarer Text und Markup dürfen laut Google-Richtlinie nicht
auseinanderlaufen; wer eine Antwort ändert, ändert beide Stellen. Dasselbe gilt
für die `featureList` im `WebApplication`-JSON-LD, wenn Funktionen wegfallen.

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

Strategie: Navigationen zuerst aus dem Netz (damit Updates ankommen), sonst die
gecachte Shell; statische Dateien sofort aus dem Cache und im Hintergrund
auffrischen. Fremde Origins und alles außer `GET` bleiben unberührt.
`controllerchange` löst beim allerersten Besuch bewusst keinen Reload aus –
dort übernimmt der Worker nur via `clients.claim()`.

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

Die App lag kurzzeitig unter `shoetracker.html`. Diese Adresse war rund
20 Minuten öffentlich erreichbar – zu kurz, um gecrawlt oder geteilt worden zu
sein – und wurde deshalb ersatzlos entfernt statt eine Weiterleitung mitzu-
schleppen. Sollte wider Erwarten doch ein Link darauf auftauchen, liefert
GitHub Pages dort seine 404-Seite.

Inhalte gehören nicht in die App-Shell: `index.html` trägt nur die Anwendung,
FAQ und Datenschutz stehen auf eigenen URLs. Das hält die App schlank, gibt
beiden Themen eine eigene indexierbare Seite und erspart dem täglichen Nutzer
eine Textwand unter seiner Schuhliste.

## Typische Änderungen

**Neues Feld an Schuh oder Lauf**

1. Grenze in `LIMIT` ergänzen, Feld in `normalize()` lesen und begrenzen.
2. Eingabefeld in den passenden `<form>` in `index.html`, im Handler `addShoe()`
   bzw. `logRun()` auslesen.
3. Anzeige in `buildShoeCard()`, `buildRunRow()` oder `openShoeDetail()`.
4. Spalte in `exportCsv()` – Kopfzeile und Zeilenaufbau zusammen ändern.
5. `VERSION` in `sw.js` erhöhen.

Bestehende Backups kennen das Feld nicht: Der Fallback in `normalize()` muss für
sich allein ein gültiges Ergebnis liefern. Einen Migrationsschritt gibt es nicht,
`BACKUP_VERSION` bleibt bei `1`, solange alte Backups sich durch `normalize()`
sinnvoll lesen lassen.

**Neuer Tab** – Eintrag in `TABS` und `TAB_HASH`, `#tab-<name>` in die `<nav>`,
`#panel-<name>` in `<main>`, Renderaufruf in `switchTab()`.

**Neue Icons** – `<symbol id="i-...">` in das Sprite in `index.html`, Nutzung
über `icon('i-...')`. Die App-Icons in `assets/icons/` stammen aus denselben
Pfaddaten wie `#i-shoe`; wer die ändert, passt `icon.svg` und die PNGs gemeinsam
an.

**Texte ändern** – Nutzersichtbare Zeichenketten stehen im Markup oder direkt an
der Aufrufstelle im JS, eine Übersetzungsschicht gibt es nicht. Wer FAQ-Text
in `faq.html` ändert, ändert dort zusätzlich das `FAQPage`-JSON-LD.

**Nach jeder Änderung** – `VERSION` in `sw.js` erhöhen, neue Dateien in `SHELL`
eintragen, über `http://` gegenprüfen (nicht `file://`), Konsole auf
CSP-Verstöße ansehen und den Ablauf einmal im privaten Fenster durchspielen:
dort ist `localStorage` gesperrt und die Fehlerpfade werden sichtbar.
