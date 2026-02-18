const CACHE_NAME = "habit-tracker-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
];

// 1. Installation: Dateien in den Cache laden
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching assets...");
      return cache.addAll(ASSETS);
    })
  );
});

// 2. Aktivierung: Alte Caches löschen (falls wir Updates machen)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. Fetch: Wenn offline, nimm die Dateien aus dem Cache!
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Wenn im Cache, dann nimm das (Offline-Support!)
      if (cachedResponse) {
        return cachedResponse;
      }
      // Wenn nicht, versuche es aus dem Internet zu laden
      return fetch(event.request);
    })
  );
});
