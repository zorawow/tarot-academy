// Tarot Academy — 离线缓存 Service Worker
// 缓存应用外壳与静态资源，使网站可“添加到主屏幕”并在离线时仍可学习。
const CACHE = 'tarot-academy-v1'
const PRECACHE = [
  '/tarot-academy/',
  '/tarot-academy/index.html',
  '/tarot-academy/manifest.webmanifest',
  '/tarot-academy/icon-192.png',
  '/tarot-academy/icon-512.png',
  '/tarot-academy/icon-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // 跨域资源（字体等）直接放行，不做离线缓存
  if (url.origin !== self.location.origin) return

  // 页面导航：优先网络，离线时回退到已缓存的 index.html（SPA 壳）
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/tarot-academy/index.html').then((r) => r || caches.match('/tarot-academy/')))
    )
    return
  }

  // 静态资源与卡面图片：缓存优先，后台静默刷新
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        const refresh = fetch(req)
          .then((resp) => {
            if (resp && resp.status === 200 && resp.type === 'basic') {
              caches.open(CACHE).then((c) => c.put(req, resp.clone()))
            }
          })
          .catch(() => {})
        return cached
      }
      return fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const copy = resp.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return resp
        })
        .catch(() => caches.match('/tarot-academy/index.html'))
    })
  )
})
