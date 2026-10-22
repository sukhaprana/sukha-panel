/* ════════════════════════════════════════════════════════════════════════
   ФОНОВЫЙ ПОМОЩНИК (service worker)
   Что делает:   1) принимает пуш-уведомления Firebase, даже когда панель закрыта;
                 2) хранит копию оболочки панели, чтобы она открывалась при плохом интернете.
                 Данные (задачи, отчёты) всегда берутся с сервера — офлайн их не подменяем.
   Можно менять: VERSION — увеличьте, если хотите, чтобы телефоны сразу забыли старую копию.
   ════════════════════════════════════════════════════════════════════════ */
const VERSION = 'sp-v1';
const SHELL = ['./', 'index.html', 'panel.css', 'panel.js', 'config.js', 'manifest.webmanifest', 'icons/icon-192.png'];

/* 1. Пуш (Firebase) */
try {
  importScripts('config.js');
  if (self.SP_CONFIG && self.SP_CONFIG.FIREBASE){
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
    firebase.initializeApp(self.SP_CONFIG.FIREBASE);
    firebase.messaging();   // показ уведомлений и переход по нажатию Firebase делает сам
  }
} catch (e) { /* нет сети при установке — пуш подключится при следующем открытии */ }

/* 2. Оболочка панели: сначала сеть, при её отсутствии — сохранённая копия */
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // сервер Google не трогаем
  e.respondWith(fetch(e.request).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)).catch(() => {}); return res; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
