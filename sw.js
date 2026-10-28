const CACHE_NAME = "yellow-presentation-v14";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css?v=14",
  "./mobile-fix.css?v=14",
  "./app.js?v=14",
  "./assets/slides-webp/slide-01.webp",
  "./assets/slides-mobile/slide-01.webp",
  "./assets/thumbs-webp/slide-01.webp",
  "./assets/thumbs-webp/slide-02.webp",
  "./assets/thumbs-webp/slide-03.webp",
  "./assets/thumbs-webp/slide-04.webp",
  "./assets/thumbs-webp/slide-05.webp",
  "./assets/thumbs-webp/slide-06.webp",
  "./assets/thumbs-webp/slide-07.webp",
  "./assets/thumbs-webp/slide-08.webp",
  "./assets/thumbs-webp/slide-09.webp",
  "./assets/thumbs-webp/slide-insert-05.webp",
  "./assets/thumbs-webp/slide-insert-06.webp",
  "./assets/evidence/thumbs/confrontation-thumb.webp",
  "./assets/evidence/thumbs/judgment-cover-thumb.webp",
  "./assets/evidence/thumbs/judgment-page-01-thumb.webp",
  "./assets/evidence/thumbs/judgment-page-02-thumb.webp",
  "./assets/content/image-thumbs/image-01-thumb.webp",
  "./assets/content/image-thumbs/image-02-thumb.webp",
  "./assets/content/image-thumbs/image-03-thumb.webp",
  "./assets/content/image-thumbs/image-04-thumb.webp",
  "./assets/content/image-thumbs/image-05-thumb.webp",
  "./assets/content/video-posters/video-01-poster.webp",
  "./assets/content/video-posters/video-02-poster.webp",
  "./assets/content/video-posters/video-03-poster.webp",
  "./assets/content/video-posters/video-04-poster.webp",
  "./assets/content/video-posters/video-05-poster.webp",
  "./assets/content/video-posters/video-06-poster.webp",
  "./assets/content/video-posters/video-07-poster.webp",
  "./assets/content/video-posters/video-08-poster.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => (
            key !== CACHE_NAME
            && !key.startsWith("yellow-content-videos-")
          ))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match("./index.html")) || caches.match("./");
        }),
    );
    return;
  }

  const isCode = request.destination === "style" || request.destination === "script";
  if (isCode) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  const isStaticAsset = /\.(?:webp|png|css|js|woff2?|svg)$/.test(url.pathname);
  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
