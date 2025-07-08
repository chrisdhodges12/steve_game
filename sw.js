const CACHE_NAME = 'steve-game-v5';

// Files to cache
const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js',
  '/assets/background.jpg',
  '/assets/player.png',
  '/assets/truck.png',
  '/assets/shannon.png',
  '/assets/coin.png',
  '/assets/money.png',
  '/assets/vacuum.png',
  '/assets/bg.mp3',
  '/assets/sniff.mp3',
  '/assets/yell1.mp3',
  '/assets/moneySound.mp3',
  '/assets/womanScream.mp3',
  '/assets/truck.mp3'
];

// Install: cache all files
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching assets');
      return cache.addAll(ASSETS);
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activate');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch: serve from cache if available
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});