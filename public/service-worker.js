// Life cycle -
// * register the service worker - moves to SW thread, looks for install event.
// * install the service worker - ready to cache assets, looks for activate event.
// * waiting - service worker stays at this step if there is aleady an active service worker on the page. skipwaiting() usually handles this, but you can also clear your data in dev tools.
// * becomes active in the global scope - has global access, ability to look at fetch events.


// all files to load into the cache
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/assets/js/index.js',
  '/assets/css/styles.css',
  '/assets/images/icons/icon-192x192.png',
  '/manifest.webmanifest',
  'https://fonts.googleapis.com/css?family=Istok+Web|Montserrat:800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css'
];


// variables for pre-cached items and client side cache
const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime-cache';


// install event
// open up our pre-cache from caches, then in that cache, add all the files in the FILES_TO_CACHE array.
// ** caches api route into runtime. ideally this would be handled by clients.claim, but I could not figure out the timing for that to work. 
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(RUNTIME).then(cache => {
      cache.addAll(["/api/transaction"]);
    }),
    caches.open(PRECACHE).then(cache => {
      cache.addAll(FILES_TO_CACHE)
        .then(() => self.skipWaiting())
    })
  );
});


// activate event
// after install, get names of all caches, then return a promise that maps through cache names, 
// checks if the name is not one of our active cache names, then deletes it.
self.addEventListener('activate', (event) => {
  const currentCaches = [PRECACHE, RUNTIME];

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return cacheNames.filter(
        cacheName => !currentCaches.includes(cacheName)
      );
    }).then(unusedCaches => {
      return Promise.all(
        unusedCaches.map(cacheToDelete => {
          return caches.delete(cacheToDelete);
        })
      );
    }).then(() => {
      self.clients.claim();
      console.log('activated!~');
    })
  );

});


// fetch event
// if request url includes "...", then intercept that, and respond with
// open runtime cache, then fetch request. if that responce is 200, then put a clone of that responce into cache with asociated url. return responce.
// if responce is not 200, then look through cache and return what was cached for that route, or empty responce.
self.addEventListener('fetch', (event) => {

  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.url.includes('/transaction')) {
    event.respondWith(
      caches.open(RUNTIME).then(cache => {
        return fetch(event.request)
          .then(response => {
            cache.put(event.request, response.clone());
            return response;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return caches.open(RUNTIME).then(cache => {
        return fetch(event.request).then(response => {
          return cache.put(event.request, response.clone()).then(() => {
            return response;
          });
        });
      });
    })
  );
});



