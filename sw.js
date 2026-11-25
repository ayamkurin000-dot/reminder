/* Service worker Pengingat Agenda
   - Berkas situs sendiri -> jaringan dulu, cadangan dari cache saat offline.
   - Pustaka Supabase (jsdelivr) -> cache dulu, supaya halaman tetap terbuka tanpa internet.
   - Permintaan ke server Supabase tidak dicegat.
   Naikkan VERSI setiap ada perubahan agar cache lama dibuang. */
var VERSI = 'agenda-v13';
var INTI = ['./', 'index.html', 'manifest.webmanifest', 'logo/ikon-192.png', 'logo/ikon-512.png'];
var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) {
    return Promise.all(INTI.map(function (u) {
      return fetch(new Request(u, { cache: 'no-cache' })).then(function (res) {
        if (res && res.ok) return c.put(u, res);
      }).catch(function () {});
    }).concat([
      fetch(LIB, { mode: 'no-cors' }).then(function (res) { return c.put(LIB, res); }).catch(function () {})
    ]));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);

  if (r.url === LIB) {
    e.respondWith(caches.open(VERSI).then(function (c) {
      return c.match(LIB).then(function (hit) {
        return hit || fetch(r).then(function (res) { c.put(LIB, res.clone()); return res; });
      });
    }));
    return;
  }

  if (u.origin !== location.origin) return;

  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) {
      var salin = res.clone();
      caches.open(VERSI).then(function (c) { c.put(r, salin); });
    }
    return res;
  }).catch(function () {
    return caches.match(r, { ignoreSearch: true }).then(function (hit) {
      return hit || (r.mode === 'navigate' ? caches.match('index.html') : undefined);
    });
  }));
});
