/* Läuft blockierend im <head>. Zwei Dinge müssen vor allem anderen passieren:

   1. Gespeichertes Theme anwenden, bevor der erste Frame gezeichnet wird.
   2. beforeinstallprompt abfangen. Chrome feuert das Event, sobald die
      Installierbarkeit feststeht – bei wiederholten Besuchen (Service Worker
      liegt schon bereit) kann das vor einem defer-Script geschehen. Wer erst
      dort zuhört, verpasst das Event und kann nie installieren. */
(function () {
  try {
    var theme = localStorage.getItem('schuh_tracker_theme');
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.dataset.theme = theme;
    }
  } catch (e) {
    /* Privater Modus o.ae.: Systemeinstellung bleibt aktiv. */
  }

  window.__installPrompt = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    window.__installPrompt = event;
  });
})();
