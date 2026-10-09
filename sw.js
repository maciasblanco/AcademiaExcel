/* =========================================================
   Service Worker · Academia Excel
   Cachea los recursos para que la app funcione 100% offline.
   ========================================================= */

   const CACHE_NAME = 'academia-excel-v1';

   /* Lista de archivos que se guardarán en el teléfono */
   const ASSETS = [
     './',
     './index.html',
     './curso-excel-basico.html',
     './manifest.json',
     './icon.svg'
   ];
   
   /* =========================================================
      1) INSTALACIÓN
      Se ejecuta la primera vez que se abre la app.
      Descarga y guarda todos los assets en la caché.
      ========================================================= */
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
   
   /* =========================================================
      2) ACTIVACIÓN
      Limpia versiones antiguas de la caché cuando hay una nueva.
      ========================================================= */
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
   
   /* =========================================================
      3) FETCH
      Estrategia: Cache First, con actualización en segundo plano.
      - Si el recurso está en la caché → se sirve al instante (rápido, offline).
      - Si no → se busca en la red y se guarda para la próxima vez.
      - Si no hay red ni caché → se muestra el index.html (fallback).
      ========================================================= */
   self.addEventListener('fetch', (event) => {
     const { request } = event;
   
     // Ignorar métodos que no sean GET
     if (request.method !== 'GET') return;
   
     // Ignorar URLs externas (Unsplash, etc.)
     const url = new URL(request.url);
     if (url.origin !== self.location.origin) return;
   
     event.respondWith(
       caches.match(request).then((cached) => {
         // Cache hit → devolver al instante
         if (cached) {
           // Actualizar en segundo plano (stale-while-revalidate)
           fetch(request)
             .then((response) => {
               if (response && response.ok) {
                 caches.open(CACHE_NAME).then((cache) => {
                   cache.put(request, response.clone());
                 });
               }
             })
             .catch(() => { /* sin red: ignorar */ });
   
           return cached;
         }
   
         // Cache miss → buscar en la red
         return fetch(request)
           .then((response) => {
             // Guardar copia si es una respuesta válida
             if (response && response.ok) {
               const clone = response.clone();
               caches.open(CACHE_NAME).then((cache) => {
                 cache.put(request, clone);
               });
             }
             return response;
           })
           .catch(() => {
             // Sin red y sin caché:
             // Si es una navegación → mostrar la home
             if (request.mode === 'navigate') {
               return caches.match('./index.html');
             }
             // Si es otro recurso → devolver vacío
             return new Response('', { status: 408, statusText: 'Offline' });
           });
       })
     );
   });
   
   /* =========================================================
      4) MENSAJES
      Permite forzar la actualización desde la app si es necesario.
      ========================================================= */
   self.addEventListener('message', (event) => {
     if (event.data === 'SKIP_WAITING') {
       self.skipWaiting();
     }
   });