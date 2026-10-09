/* =========================================================
   Service Worker · Academia Excel
   Cachea los recursos para que la app funcione 100% offline.
   ========================================================= */

   const CACHE_NAME = 'academia-excel-v3';

   const ASSETS = [
     './',
     './index.html',
     './curso-excel-basico.html',
     './manifest.json',
     './icon.svg',
     './icons/icon-48x48.png',
     './icons/icon-72x72.png',
     './icons/icon-96x96.png',
     './icons/icon-144x144.png',
     './icons/icon-192x192.png',
     './icons/icon-512x512.png'
   ];
   
   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open(CACHE_NAME).then((cache) => {
         console.log('[SW] Precargando recursos en caché…');
         return cache.addAll(ASSETS).catch(err => {
           console.warn('[SW] Algunos recursos no se pudieron cachear:', err);
         });
       }).then(() => self.skipWaiting())
     );
   });
   
   self.addEventListener('activate', (event) => {
     event.waitUntil(
       caches.keys().then((keys) => {
         return Promise.all(
           keys
             .filter((key) => key !== CACHE_NAME)
             .map((key) => {
               console.log('[SW] Eliminando caché antigua:', key);
               return caches.delete(key);
             })
         );
       }).then(() => self.clients.claim())
     );
   });
   
   self.addEventListener('fetch', (event) => {
     const { request } = event;
   
     if (request.method !== 'GET') return;
   
     const url = new URL(request.url);
     if (url.origin !== self.location.origin) return;
   
     event.respondWith(
       caches.match(request).then((cached) => {
         if (cached) {
           fetch(request)
             .then((response) => {
               if (response && response.ok) {
                 caches.open(CACHE_NAME).then((cache) => {
                   cache.put(request, response.clone());
                 });
               }
             })
             .catch(() => {});
   
           return cached;
         }
   
         return fetch(request)
           .then((response) => {
             if (response && response.ok) {
               const clone = response.clone();
               caches.open(CACHE_NAME).then((cache) => {
                 cache.put(request, clone);
               });
             }
             return response;
           })
           .catch(() => {
             if (request.mode === 'navigate') {
               return caches.match('./index.html');
             }
             return new Response('', { status: 408, statusText: 'Offline' });
           });
       })
     );
   });
   
   self.addEventListener('message', (event) => {
     if (event.data === 'SKIP_WAITING') {
       self.skipWaiting();
     }
   });