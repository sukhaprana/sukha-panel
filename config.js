/* ════════════════════════════════════════════════════════════════════════
   НАСТРОЙКИ ПАНЕЛИ — единственный файл, который нужно заполнить.
   Его читают и приложение (app.sukhaprana.ru), и блок на Тильде.
   После правки загрузите файл на хостинг заново — панель подхватит его сама.
   ════════════════════════════════════════════════════════════════════════ */
self.SP_CONFIG = {
  MODE: 'gas',            // рабочий режим: данные в Google Таблице. 'demo' — прототип с примерами

  /* 1. Адрес веб-приложения Apps Script (Развернуть → Управление развертываниями → URL, заканчивается на /exec) */
  API_URL: 'https://script.google.com/macros/s/AKfycby1csEWfkQ8NVmL8SJK0ZuY_7G_QEUAP5Jnvf7GNaayq4YNeummWrrLcZlREB7s42ZvFw/exec',

  /* 2. Telegram-бот: имя без @ (его покажет меню таблицы после подключения токена) */
  TG_BOT: '',

  /* 3. Пуш на телефон: Firebase → Настройки проекта → Общие → Ваши приложения → Конфигурация (SDK setup) */
  FIREBASE: null,
  /* пример заполнения:
  FIREBASE: {
    apiKey: 'AIza…',
    authDomain: 'sukha-prana.firebaseapp.com',
    projectId: 'sukha-prana',
    messagingSenderId: '1234567890',
    appId: '1:1234567890:web:abc123'
  }, */
  VAPID_KEY: '',          // Firebase → Cloud Messaging → Web Push certificates → «Пара ключей»

  REFRESH_SEC: 60         // как часто подтягивать изменения коллег (секунд)
};
