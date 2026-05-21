// Service Worker - SI Terintegrasi
const CACHE_NAME = 'si-terintegrasi-v1'
const OFFLINE_URL = '/login'

const PRECACHE_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/logo-192.png',
  '/logo-512.png',
  '/favicon.ico',
]

// Install: cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match(OFFLINE_URL))
          .then((response) => response || new Response('Tidak dapat terhubung ke jaringan', { status: 503, statusText: 'Service Unavailable' }))
      )
  )
})
