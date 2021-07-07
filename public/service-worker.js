const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/js/index.js',
  '/assets/css/styles.css',
  '/assets/images/icons/icon-192x192.png',
  '/manifest.webmanifest',
  'https://fonts.googleapis.com/css?family=Istok+Web|Montserrat:800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css',
];

const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then(cache => {
      cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// The activate handler takes care of cleaning up old caches.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(name => {
            if (name !== PRECACHE && name !== RUNTIME) {
              console.log("deciding fate of old data...", name);
              return caches.delete(name);
            }
          })
        );
      })
  );
  self.clients.claim();
});


self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api')) {
    event.respondWith(
      caches.open(RUNTIME).then(cache => {
        return fetch(event.request)
        .then(res => {
          if (res.status === 200) {
            cache.put(event.request.url, res.clone());
          }
          return res;
        })
        .catch(err => {
          console.log(err);
          return cache.match(event.request) || {};
        });
      }).catch(err => console.log(err))
    );
  }

  event.respondWith(
    fetch(event.request).catch( () => {
      return caches.match(event.request).then(res => {
        if (res) {
          return res;
        } 
      })
    })
  )
});


