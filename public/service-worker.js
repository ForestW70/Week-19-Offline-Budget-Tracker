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
  'https://cdnjs.cloudflare.com/ajax/libs/normalize/8.0.1/normalize.min.css',
];

// variables for pre-cached items and client side cache
const PRECACHE = 'precache-v1';
const RUNTIME = 'runtime-cache';


// install event
// open up our pre-cache from caches, then in that cache, add all the files in the FILES_TO_CACHE array.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(RUNTIME).then(cache => {
      cache.addAll(['/api/transaction']);
    }),
    caches.open(PRECACHE).then(cache => {
      cache.addAll(FILES_TO_CACHE);
    })
  );

  // forces the waiting service worker to replace the active service worker if there is already an installed one. 
  self.skipWaiting();
});


// activate event
// after install, get names of all caches, then return a promise that maps through cache names, 
// checks if the name is not one of our active cache names, then deletes it.
self.addEventListener('activate', async (event) => {
  event.waitUntil(clients.claim());

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== PRECACHE && name !== RUNTIME) {
            return caches.delete(name);
          }
        })
      );
    })

  );

  // await self.clients.claim().then(console.log("hi"))
  
  // window.location.reload();
});


// navigator.serviceWorker.ready.then(registration => {
//   console.log("hi")
// });

// console.log(window)

// if (navigator.serviceWorker.ready) {




// fetch event
// if request url includes "...", then intercept that, and respond with
// open runtime cache, then fetch request. if that responce is 200, then put a clone of that responce into cache with asociated url. return responce.
// if responce is not 200, then look through cache and return what was cached for that route, or empty responce.
self.addEventListener('fetch', (event) => {
  event.waitUntil(clients.claim());

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
            // console.log(err);
            return cache.match(event.request) || {};
          });
      }).catch(err => console.log(err))
    );
  } else {

    // if request doenst include "...", then fetch request, which will err, and catch.
    // return the matched request from cache, and return responce.
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request).then(res => {
          if (res) {
            return res;
          }
        })
      })
    )
  }
});


