/* ════════════════════════════════════════════════════════════════════════
   ФОНОВЫЙ ПОМОЩНИК (service worker)
   Что делает:   1) принимает пуш-уведомления Firebase, даже когда панель закрыта;
                 2) хранит копию оболочки панели, чтобы она открывалась при плохом интернете.
                 Данные (задачи, отчёты) всегда берутся с сервера — офлайн их не подменяем.
   Можно менять: VERSION — увеличьте, если хотите, чтобы телефоны сразу забыли старую копию.
   ════════════════════════════════════════════════════════════════════════ */
const VERSION = 'sp-v7';   // увеличьте при следующей публикации — телефоны забудут старую копию панели
/* Список файлов должен совпадать с адресами в index.html (включая ?v=…), иначе офлайн-копия не сработает */
const SHELL = ['./', 'index.html', 'panel.css?v=7', 'panel.js?v=7', 'config.js?v=7', 'manifest.webmanifest', 'icons/icon-192.png'];

/* 1. Пуш (Firebase) */
try {
  importScripts('config.js');
  if (self.SP_CONFIG && self.SP_CONFIG.FIREBASE){
    importScripts('https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js');
    firebase.initializeApp(self.SP_CONFIG.FIREBASE);
    firebase.messaging();   // показ уведомлений и переход по нажатию Firebase делает сам
  }
} catch (e) { /* нет сети при установке — пуш подключится при следующем открытии */ }

/* 2. Оболочка панели: сначала сеть, при её отсутствии — сохранённая копия */
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('sp-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;   // сервер Google не трогаем
  // Кэшируем только оболочку: никакие произвольные ответы и пользовательские файлы.
  const shellPaths = new Set(SHELL.map(p => new URL(p, self.location.href).href));
  if (!shellPaths.has(url.href) && e.request.mode!=='navigate') return;
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok && res.type==='basic' && shellPaths.has(url.href)) {
      const copy=res.clone(); e.waitUntil(caches.open(VERSION).then(c=>c.put(e.request,copy)).catch(()=>{}));
    }
    return res;
  }).catch(async()=>{
    const cached=await caches.match(e.request);
    if (cached) return cached;
    if (e.request.mode==='navigate') return await caches.match('index.html') || Response.error();
    return Response.error();
  }));
});
