/* =====================================================================
   SUKHA PRANA · ПАНЕЛЬ КОМАНДЫ
   Блок для Тильды (вставить целиком в блок T123 «HTML-код»).
   Как устроен код: он разбит на БЛОКИ с подписями «Что делает / Можно менять / Не трогать».
   Ищите по слову «БЛОК» (Ctrl+F).
     БЛОК 1  · НАСТРОЙКИ ......... режим demo / gas, адрес сервера (в рабочей версии — config.js)
     БЛОК 2  · УТИЛИТЫ ........... даты, деньги, экранирование
     БЛОК 3  · РОЛИ И ПРАВА ...... кто что видит (то же проверяет сервер)
     БЛОК 3а · ДОГОВОР АДМИНА .... смены, проценты, KPI, штрафы
     БЛОК 3б · ФИНАНСЫ ........... строки доходов и расходов
     БЛОК 4  · ДАННЫЕ И СЕРВЕР ... действия сервера (общие с Google Apps Script)
     БЛОК 4б · СВЯЗЬ С СЕРВЕРОМ .. демо-хранилище и Api.call
     БЛОК 5  · ВХОД
     БЛОК 6  · ЗАДАЧИ: ВЫБОРКИ
     БЛОК 7  · ЭКРАНЫ ............ вся вёрстка, по экрану на функцию
     БЛОК 8  · CSV И PDF
     БЛОК 9  · КНОПКИ И ФОРМЫ
     БЛОК 10 · ОБНОВЛЕНИЕ, ПУШ, СТАРТ
   ===================================================================== */
(function(){
'use strict';

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 1 · НАСТРОЙКИ (CONFIG)
   Что делает:   режим работы, адрес сервера, сроки по умолчанию, ссылки на карты.
   Можно менять: значения справа от двоеточий. В рабочей версии всё нужное задаётся в config.js — сюда лезть не обязательно.
   Не трогать:   имена слева от двоеточий.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 1. CONFIG ---------- */
const CONFIG = Object.assign({
  MODE: 'demo',            // 'demo' — данные в браузере (прототип); 'gas' — Google Таблица через Apps Script
  API_URL: '',             // URL веб-приложения Apps Script (…/exec), нужен для MODE:'gas'
  DEFAULT_DUE_TIME: '20:00',
  GEN_DAYS_AHEAD: 7,       // на сколько дней вперёд создавать регулярные задачи
  REOPEN_FALLBACK: 90,     // до какого % опускается прогресс, если готовую задачу вернули «в работу»
  HTML2PDF_URL: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  MAMMOTH_URL: 'https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js', // чтение .docx в браузере
  IMG_MAX_SIDE: 1200,      // фото из Word уменьшаются до этого размера по длинной стороне
  GUIDE_MAX_STEPS: 12,
  /* Карточки студии на картах. Отзывы с них подтягивает сервер (Apps Script) по расписанию */
  YANDEX_ORG_ID: '156323077282',
  TWOGIS_FIRM_ID: '70000001102493524',
  /* Рабочая версия (MODE:'gas') */
  TG_BOT: '',              // имя Telegram-бота без @ — для кнопки «Подключить Telegram»
  FIREBASE: null,          // настройки веб-приложения Firebase — для пушей на телефон
  VAPID_KEY: '',           // ключ Web Push из Firebase (Cloud Messaging → Web Push certificates)
  REFRESH_SEC: 60          // как часто подтягивать изменения коллег с сервера
}, (typeof window!=='undefined' && window.SP_CONFIG) || {});  // window.SP_CONFIG — из config.js, перекрывает значения выше

/*@CORE-START — отсюда и до @CORE-END код общий для браузера и Google Apps Script */
/* ════════════════════════════════════════════════════════════════════════
   БЛОК 2 · УТИЛИТЫ
   Что делает:   даты, деньги, экранирование текста — мелкие помощники для всего кода.
   Можно менять: названия месяцев и дней недели.
   Не трогать:   остальное: этим пользуются все блоки и сервер Google.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 2. УТИЛИТЫ ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2,'0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseYmd = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); };
const addDays = (s,n) => { const d = parseYmd(s); d.setDate(d.getDate()+n); return ymd(d); };
const todayStr = () => ymd(new Date());
const nowIso = () => new Date().toISOString();
const MONTHS_GEN = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DOW = ['вс','пн','вт','ср','чт','пт','сб'];
const DOW_FULL = ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'];
const fmtDay = s => { const d = parseYmd(s); return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`; };
const fmtDayShort = s => { const d = parseYmd(s); return `${pad(d.getDate())}.${pad(d.getMonth()+1)}`; };
const fmtDT = iso => { if(!iso) return ''; const d = new Date(iso); return `${pad(d.getDate())}.${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const money = n => (Number(n)||0).toLocaleString('ru-RU') + ' ₽';
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
const weekStart = s => { const d = parseYmd(s); const k = (d.getDay()+6)%7; d.setDate(d.getDate()-k); return ymd(d); };
/* ════════════════════════════════════════════════════════════════════════
   БЛОК 3 · РОЛИ И ПРАВА
   Что делает:   кто что видит и что может менять. Те же правила проверяет сервер, поэтому подмена кода в браузере ничего не даст.
   Можно менять: подписи ролей, статусов, приоритетов; поля отчёта по умолчанию; аватары.
   Не трогать:   функции Rules.* — после правки их нужно обновить и на сервере (файл 01_Core.gs собирается из этого же кода).
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 3. ПРАВИЛА ---------- */
/* Аватары-зверята: выбор в профиле */
const AVATARS = ['🦊','🐼','🐨','🦁','🐯','🐸','🐙','🦉','🦄','🐢','🐬','🐝','🦋','🐧','🐰','🐱','🐶','🦔','🦥','🦦','🐳','🐞','🦩','🐿️','🦘','🐹','🦭','🐻','🐮','🐷'];
const ROLES = { owner:'Владелец', manager:'Управляющий', admin:'Администратор', smm:'СММ' };
const LEVELS = { owners:'Собственники', management:'Управление', team:'Команда', smm:'СММ' };
/* Какие разделы задач видит роль. СММ не видит ничьих задач, кроме своих (он в них ответственный или помощник) */
const ROLE_LEVELS = { owner:['owners','management','team','smm'], manager:['management','team','smm'], admin:['team'], smm:[] };
const STATUS = { todo:'Не начато', work:'В работе', wait:'Ждёт решения', done:'Готово', cancel:'Отменено', over:'Просрочено' };
const PRIO = { urgent:'Срочно', high:'Высокий', mid:'Средний', low:'Низкий' };
const PRIO_W = { urgent:4, high:3, mid:2, low:1 };
const isParticipant = (u,t) => !!u && (t.assignee===u.id || t.helper===u.id);
/* Совмещение должностей: основная роль + дополнительные (например, управляющий, который выходит и администратором) */
const rolesOf = u => !u ? [] : [u.role, ...((u.extraRoles||[]).filter(r => r!==u.role))];
const hasRole = (u, r) => rolesOf(u).includes(r);
const isOwner = u => hasRole(u,'owner'), isManager = u => hasRole(u,'manager'), isAdminRole = u => hasRole(u,'admin');
const isPureAdmin = u => isAdminRole(u) && !isOwner(u) && !isManager(u);
const isPureSmm = u => hasRole(u,'smm') && rolesOf(u).length===1;

const Rules = {
  /* Задачу видит: роль, которой открыт раздел, ИЛИ участник (ответственный / помощник) — даже если раздел выше его роли */
  canSeeTask: (u,t) => Rules.levelsFor(u).includes(t.level) || isParticipant(u,t),
  /* Менять название, срок, людей, раздел, связи — владелец, управляющий (в своих разделах) и автор задачи */
  canEditTask: (u,t) => Rules.canSeeTask(u,t) && (isOwner(u) || (isManager(u) && ROLE_LEVELS.manager.includes(t.level)) || t.createdBy===u.id),
  canDeleteTask: (u,t) => (isOwner(u) || isManager(u)) && Rules.canSeeTask(u,t),
  /* разделы, где человек может создавать задачи: свои + «СММ» для роли СММ (только себе) */
  createLevels: u => [...new Set([...Rules.levelsFor(u), ...(hasRole(u,'smm') ? ['smm'] : [])])],
  levelsFor: u => ['owners','management','team','smm'].filter(l => rolesOf(u).some(r => (ROLE_LEVELS[r]||[]).includes(l))),
  /* Снять «Готово» с закрытой задачи может только: тот, кто закрыл, автор задачи или владелец. Остальные — только «вернуть в работу» */
  canLowerDone: (u,t) => isOwner(u) || u.id===t.createdBy || u.id===t.doneBy,
  isLockedFor: (u,t) => t.status==='done' && !Rules.canLowerDone(u,t),
  seeAmounts: u => isOwner(u),
  canCreatePayout: u => isOwner(u),
  canIssuePayout: u => isOwner(u) || isManager(u) || isAdminRole(u),
  canConfirmReview: u => isOwner(u) || isManager(u),
  canEditGuide: u => isOwner(u) || isManager(u),
  canManageTeam: u => isOwner(u),
  canEditTemplates: u => isOwner(u) || isManager(u),
  canEditSchedule: u => isOwner(u) || isManager(u),
  canSyncReviews: u => isOwner(u) || isManager(u),
  canSeePayroll: u => isOwner(u) || isManager(u),   // продажи и зарплата админов
  canSeeFinance: u => isOwner(u),                             // доходы и расходы студии
  /* Статистика «вниз по иерархии»: админ видит только админов, управляющий — себя и админов, владелец — всех */
  statsRoles: u => isOwner(u) ? ['owner','manager','admin','smm'] : isManager(u) ? ['manager','admin','smm'] : isAdminRole(u) ? ['admin'] : hasRole(u,'smm') ? ['smm'] : [],
  canDeleteComment: (u,c) => isOwner(u) || c.by===u.id
};

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 3а · ДОГОВОР АДМИНИСТРАТОРА (Приложения 1 и 2)
   Что делает:   ставки за смены, проценты с продаж, KPI и штрафы — по договору.
   Можно менять: суммы и проценты, если договор поменяется.
   Не трогать:   ключи (k, code) — по ним хранятся уже введённые данные.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 3а. СПРАВОЧНИКИ ДОГОВОРА АДМИНИСТРАТОРА (Приложения 1 и 2) ---------- */
const SHIFT_TYPES = [
  { k:'std',     name:'Стандартный',            time:'08:30–21:30', pay:2000 },
  { k:'morning', name:'Расширенный утренний',   time:'07:45–21:30', pay:2300 },
  { k:'evening', name:'Расширенный вечерний',   time:'08:30–22:30', pay:2350 },
  { k:'full',    name:'Полный расширенный',     time:'07:45–22:30', pay:2650 }
];
const SHIFT_KEYS = ['std','morning','evening','full'];
const DEFAULT_RATES = { std:2000, morning:2300, evening:2350, full:2650, halfFactor:0.5 };
const SHIFT_DEFAULT = { start:'09:00', end:'21:00' };
const toMin = t => { const [h,m] = String(t||'0:0').split(':').map(Number); return h*60+m; };
/* Тип смены по времени: раньше 08:30 — расширенное утро, позже 21:30 — расширенный вечер, оба — полный период. Можно задать тип вручную. */
function shiftKind(sh){ if (SHIFT_KEYS.includes(sh.type)) return sh.type; const early = sh.start < '08:30', late = sh.end > '21:30'; return early&&late ? 'full' : early ? 'morning' : late ? 'evening' : 'std'; }
function shiftPay(sh, rates){
  const r = { ...DEFAULT_RATES, ...(rates||{}) }; const kind = shiftKind(sh);
  return { kind, pay: Math.round(r[kind] * (sh.half ? r.halfFactor : 1)), hours: Math.max(0, (toMin(sh.end)-toMin(sh.start))/60), units: sh.half ? r.halfFactor : 1 };
}
function periodLabel(from, to){
  const a = parseYmd(from), b = parseYmd(to); const last = new Date(b.getFullYear(), b.getMonth()+1, 0).getDate();
  if (a.getDate()===1 && b.getDate()===last) return `${MONTHS[a.getMonth()]} ${a.getFullYear()}`;
  return `${a.getDate()}–${b.getDate()} ${MONTHS_GEN[a.getMonth()]} ${a.getFullYear()}`;
}
/* Поля отчёта смены — владелец может переименовать, добавить, удалить и поменять порядок */
const DEFAULT_REPORT_FIELDS = [
  { k:'card', label:'Карта', emoji:'💳', type:'money', inTotal:true },
  { k:'cash', label:'Наличными', emoji:'💴', type:'money', inTotal:true },
  { k:'online', label:'Онлайн', emoji:'💸', type:'money', inTotal:true },
  { k:'renewals', label:'Количество продлений после Знакомства/СУПЕР', emoji:'1️⃣', type:'count' },
  { k:'nonRenewals', label:'Количество не продлений после Знакомства/СУПЕР', emoji:'2️⃣', type:'count' },
  { k:'goods', label:'Проданные товары', emoji:'3️⃣', type:'count' },
  { k:'cashInRegister', label:'В кассе наличными', emoji:'', type:'money' },
  { k:'cashNote', label:'Пояснение к кассе', emoji:'', type:'text', attachTo:'cashInRegister' }
];
const REPORT_TYPES = { money:'Сумма, ₽', count:'Количество', text:'Текст' };
/* Ставки: тренеры — за занятие или фикс в месяц; управляющий — фикс; админ — фикс в месяц или по договору (смены + % + KPI) */
const RATE_MODES_TRAINER = { perClass:'за занятие', fixed:'фикс в месяц' };
const RATE_MODES_MANAGER = { fixed:'фикс в месяц', params:'оклад + % от выручки' };
const RATE_MODES_SMM = { fixed:'фикс в месяц', perPost:'за публикацию' };
/* Ключ начисления: тренер tr:<id>, управляющий mgr:<id>, СММ smm:<id>. Администраторы считаются по договору (payroll). */
const PAY_KINDS = { tr:{ title:'Тренеры', unit:'занятий', rates:'trainers', modes:RATE_MODES_TRAINER }, mgr:{ title:'Управляющий', unit:'', rates:'manager', modes:RATE_MODES_MANAGER }, smm:{ title:'СММ', unit:'публикаций', rates:'smm', modes:RATE_MODES_SMM } };
const RATE_MODES_ADMIN = { contract:'по договору: смены + % + KPI', shift:'только фикс за смену', fixed:'фикс в месяц' };
const payoutMonth = p => (p.periodFrom || p.plannedDate || p.createdAt || '').slice(0,7);
/* Настройки уведомлений по умолчанию — у каждого свои */
function defaultNotify(role){
  return { push:true, telegram:false, tgChat:'', remindMin:60, quietFrom:'22:00', quietTo:'08:00', offDays:[], offDates:[], onlyShifts: role==='admin',
    types:{ assigned:true, deadline:true, overdue:true, comments:true, schedule:true, report:true, signup: role==='owner', payout:true } };
}
const RECEIPT_PLACEHOLDER = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="360" viewBox="0 0 240 360"><rect width="240" height="360" fill="#fffdf6"/><g fill="#9a9a9a" font-family="monospace" font-size="13"><text x="24" y="40">SUKHA PRANA</text><text x="24" y="64">КАССОВЫЙ ЧЕК</text><text x="24" y="100">Отчёт о закрытии смены</text><text x="24" y="130">Безнал ......... 25960</text><text x="24" y="152">Наличные ........... 0</text><text x="24" y="190">ИТОГ ........... 25960</text><text x="24" y="320">(пример фото чека)</text></g><path d="M24 210h192M24 220h150M24 230h170M24 240h120" stroke="#ccc" stroke-width="4"/></svg>');

/* Товары и услуги студии. line — строка доходов в финансах; group — правило процента для админа */
const PRODUCTS = [
  { k:'trial_super', name:'Пробное «СУПЕР Знакомство»', price:2400,  group:'trial',      line:'trial_super' },
  { k:'trial',       name:'Пробное «Знакомство»',       price:900,   group:'trial',      line:'trial' },
  { k:'single',      name:'Разовое посещение',          price:1800,  group:'single',     line:'single' },
  { k:'ab4',         name:'Абонемент на 4 занятия',     price:6400,  group:'ab',         line:'ab4' },
  { k:'ab6',         name:'Абонемент на 6 занятий',     price:9000,  group:'ab',         line:'ab6' },
  { k:'ab8',         name:'Абонемент на 8 занятий',     price:11600, group:'ab',         line:'ab8' },
  { k:'ab16',        name:'Абонемент на 16 занятий',    price:21600, group:'ab',         line:'ab16' },
  { k:'unlim',       name:'Месячный безлимит',          price:30000, group:'ab',         line:'unlim' },
  { k:'dayunlim',    name:'Дневной безлимит',           price:14000, group:'ab',         line:'dayunlim' },
  { k:'morning8',    name:'Абонемент «8 утренний»',     price:0,     group:'ab',         line:'morning8' },
  { k:'personal',    name:'Персональное занятие / сплит', price:0,   group:'personal',   line:'personal' },
  { k:'pregnant',    name:'Занятие для беременных',     price:0,     group:'special',    line:'pregnant' },
  { k:'sound',       name:'Звуковая медитация',         price:0,     group:'special',    line:'sound' },
  { k:'commercial',  name:'Коммерческий класс (мастер-класс, интенсив)', price:0, group:'commercial', line:'commercial' },
  { k:'freeze',      name:'Заморозка',                  price:0,     group:'other',      line:'freeze' },
  { k:'goods',       name:'Товары (одежда, аксессуары, питание)', price:0, group:'goods', line:'rentgoods' },
  { k:'rent',        name:'Аренда зала',                price:0,     group:'other',      line:'rentgoods' },
  { k:'fitmost',     name:'Фитмост',                    price:0,     group:'other',      line:'fitmost' }
];
const PRODUCT = Object.fromEntries(PRODUCTS.map(p => [p.k, p]));
const CLIENT_TYPES = { new:'Новый клиент (первая покупка)', return:'Возврат (не был 30+ дней)', current:'Действующий клиент' };
/* Процент администратору с продажи — Приложение 1, раздел 2 */
function commission(s){
  const p = PRODUCT[s.product] || { group:'other' }; const price = Number(s.price)||0; const disc = Number(s.discount)||0;
  const r = (rate, note) => ({ rate, sum: Math.round(price*rate/100), note: note||'' });
  switch (p.group){
    case 'ab':
      if (s.clientType==='new') return r(10);
      if (s.clientType==='return'){
        if (!s.crmTouch) return r(0, 'нет касания в CRM за 24 ч до покупки — возврат не засчитан');
        return r(8, disc>22 ? 'скидка больше 22% — проверьте' : '');
      }
      return r(0, 'продажа действующему клиенту — 0%');
    case 'single': return r(5);
    case 'trial': return r(0);
    case 'personal': return s.clientType==='current' ? r(0) : r(5, disc>25 ? 'скидка больше 25% — проверьте' : '');
    case 'commercial': return s.clientType==='current' ? r(0, 'клиент уже был на коммерческом классе') : r(5);
    case 'goods': return r(10);
    default: return r(0);
  }
}
/* KPI — Приложение 1, раздел 3. auto — значение считается из данных панели, но его можно поправить вручную */
const KPIS = [
  { k:'conversion', name:'Конверсия «пробное → абонемент»', unit:'%',         target:'70% и выше — 4 000 ₽', calc:v => v>=70 ? 4000 : 0 },
  { k:'renewals',   name:'Доля продлений абонементов',     unit:'%',         target:'60–69% — 2 000 · 70–79% — 3 000 · 80%+ — 4 000 ₽', calc:v => v>=80 ? 4000 : v>=70 ? 3000 : v>=60 ? 2000 : 0 },
  { k:'sleeping',   name:'Работа со спящей базой',         unit:'контактов', target:'150+ — 2 000 ₽', calc:v => v>=150 ? 2000 : 0 },
  { k:'reviews',    name:'Отзывы о студии',                unit:'шт.',       target:'5 и более — 1 000 ₽', calc:v => v>=5 ? 1000 : 0, auto:true },
  { k:'returns',    name:'Возврат ушедших клиентов',       unit:'клиентов',  target:'8 и более — 4 000 ₽', calc:v => v>=8 ? 4000 : 0, auto:true },
  { k:'clean',      name:'Поддержание чистоты',            unit:'замечаний', target:'0 — 5 000 · 1–2 — 2 500 ₽', calc:v => v===0 ? 5000 : v<=2 ? 2500 : 0 },
  { k:'commercial', name:'Продажи «Коммерческий класс»',   unit:'продаж',    target:'30 и более — 2 000 ₽', calc:v => v>=30 ? 2000 : 0, auto:true },
  { k:'personal',   name:'Продажи «Персональное занятие»', unit:'продаж',    target:'20 и более — 2 000 ₽', calc:v => v>=20 ? 2000 : 0, auto:true }
];
const KPI_PLAN_BONUS = 3000, KPI_MIN_SHIFTS = 13, KPI_MAX = 27000;
/* Неустойки — Приложение 2. [код, текст, первичная, повторная]; null — «расторжение договора»; extra — к сумме добавляется величина ущерба */
const PEN_CATS = { 1:'Критические', 2:'Работа с клиентами', 3:'Операционные', 4:'Коммуникация', 5:'Дисциплина', 6:'Клиентская база' };
const PENALTIES = [
  ['1.1','Грубое или неуважительное обращение с клиентом',1000,1750],
  ['1.2','Недостача денежных средств в кассе (+ сумма недостачи)',500,1000,'extra'],
  ['1.3','Незакрытие кассовой смены',500,1000],
  ['1.4','Ошибка при проведении операции через ККТ',300,700],
  ['1.5','Оставлен включённым обогреватель',1000,1750],
  ['1.6','Оставлено включённым освещение',300,700],
  ['1.7','Утрата ключей / карты доступа (повторно — стоимость замены)',1500,0,'extra'],
  ['1.8','Разглашение конфиденциальной информации',1750,null],
  ['1.9','Обсуждение данных или поведения клиентов при других клиентах',1000,1750],
  ['1.10','Конфликт с тренером при клиентах',1000,1750],
  ['1.11','Помещение не поставлено на охрану / не снято с охраны',500,1000],
  ['2.1','Не подтверждена запись клиента в системе бронирования',200,400],
  ['2.2','Не отмечен визит клиента в системе',200,400],
  ['2.3','Ошибка при записи клиента (время / направление)',300,600],
  ['2.4','Не подтверждена запись на утренние занятия (08:00)',300,600],
  ['2.5','Клиенту не предложено записаться на следующее занятие',200,400],
  ['2.6','Клиент не проинформирован о правилах абонемента',300,600],
  ['2.7','Клиент не проинформирован о правилах отмены записи',300,600],
  ['2.8','Зона ожидания без напитков / угощения',100,200],
  ['2.9','Не проведена беседа после пробного занятия',500,1000],
  ['2.10','Не проведён вводный инструктаж новому клиенту',300,600],
  ['2.11','Занятие не отменено в одной из систем',1000,2000],
  ['2.12','Неверная информация клиенту о правилах, акциях, расписании',1000,1000],
  ['3.1','Не заполнено расписание в системе бронирования',300,600],
  ['3.2','Не отменено утреннее занятие без записей (п. 3.3 договора)',500,1000],
  ['3.3','Тренер не вовремя уведомлён об отмене занятия',500,1000],
  ['3.4','Тренер приехал на отменённое занятие по вине исполнителя (+ 50% ставки тренеру)',700,1400,'extra'],
  ['3.5','Не поставлена задача в CRM по клиенту',200,400],
  ['3.6','Задача в CRM не выполнена в срок',300,600],
  ['3.7','Не сообщено о закупке расходников (остаток меньше 3 шт.)',300,600],
  ['3.8','Ошибки в ежедневном отчёте',200,400],
  ['3.9','Клиент не подтверждён на утренний класс и не дошёл',300,600],
  ['4.1','Ответ в мессенджере дольше 40 минут (09:00–21:00)',200,400],
  ['4.2','Ответ в мессенджере дольше 1 часа (09:00–21:00)',300,500],
  ['4.3','Нет перезвона по пропущенному вызову в течение 40 минут',300,500],
  ['4.4','Ежедневный отчёт не отправлен до 23:00',500,1000],
  ['4.5','Ежедневный отчёт не по формату',500,1000],
  ['5.1','Опоздание до 15 минут',200,400],
  ['5.2','Опоздание 15–30 минут',400,800],
  ['5.3','Опоздание более 30 минут',700,700],
  ['5.4','Не поддерживается чистота и порядок',200,400],
  ['5.5','Студия не подготовлена к следующему дню',400,400],
  ['5.6','Нет расходников / заявка на закупку не вовремя',200,400],
  ['5.7','Внешний вид не по стандарту',200,400],
  ['5.8','Нет бейджа',100,200],
  ['5.9','Личный телефон при клиентах (не по работе)',300,600],
  ['5.10','Приём пищи при клиентах',200,400],
  ['5.11','Неявка без предупреждения за 24 часа',1750,null],
  ['5.12','Связь с клиентом с личного номера',200,400],
  ['6.1','Нет связи с записавшимся клиентом, который не пришёл',300,600],
  ['6.2','Не зафиксирована причина отказа клиента в CRM',200,400],
  ['6.3','Не связались с новым зарегистрированным клиентом за 3 дня',200,400],
  ['6.4','Не заключён договор с клиентом при продаже',500,1000],
  ['6.5','В карточку клиента не внесена информация о договоре',200,400],
  ['6.6','Не зафиксирована причина непродления',200,400],
  ['6.7','Не поставлена задача, когда клиент не отвечает больше 24 часов',200,400]
].map(([code,text,first,repeat,flag]) => ({ code, text, first, repeat, extra: flag==='extra', cat: Number(code.split('.')[0]) }));
const PEN = Object.fromEntries(PENALTIES.map(p => [p.code, p]));
/* Сумма неустойки с учётом повторности за 90 дней.
   Категория 1 — с первого раза. Категории 2–6 — первый раз устное замечание (0 ₽), со второго раза — первичная сумма, дальше — повторная. */
function penaltyAmount(p, all){
  const item = PEN[p.code]; if (!item) return { sum:0, label:'' };
  const from = addDays(p.date, -90);
  const prev = all.filter(x => x.id!==p.id && x.adminId===p.adminId && x.code===p.code && x.date>=from && (x.date<p.date || (x.date===p.date && x.id<p.id))).length;
  const extra = item.extra ? (Number(p.extra)||0) : 0;
  let step = item.cat===1 ? prev : prev-1; // −1 = замечание
  if (step < 0) return { sum:0, label:'замечание (первый раз)', step };
  if (step===0) return { sum:item.first + extra, label:'первичное', step };
  if (item.repeat===null) return { sum:item.first + extra, label:'повторное — основание для расторжения', step, terminate:true };
  return { sum:(item.repeat||0) + extra, label:'повторное', step };
}

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 3б · ФИНАНСЫ: СТРУКТУРА
   Что делает:   строки доходов и расходов по умолчанию (как в вашей таблице).
   Можно менять: названия и суммы по умолчанию. Строки удобнее добавлять прямо в панели (вкладка «Финансы»).
   Не трогать:   ключи k.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 3б. ФИНАНСЫ (по структуре вашей таблицы) ---------- */
const INCOME_LINES = [
  { k:'trial_super', name:'Супер знакомство', group:'Пробные и разовые визиты' },
  { k:'trial', name:'Знакомство', group:'Пробные и разовые визиты' },
  { k:'single', name:'Разовые посещения', group:'Пробные и разовые визиты' },
  { k:'ab4', name:'Абонемент на 4 занятия', group:'Абонементы' },
  { k:'ab6', name:'Абонемент на 6 занятий', group:'Абонементы' },
  { k:'ab8', name:'Абонемент на 8 занятий', group:'Абонементы' },
  { k:'ab16', name:'Абонемент на 16 занятий', group:'Абонементы' },
  { k:'unlim', name:'Месячный безлимит', group:'Абонементы' },
  { k:'dayunlim', name:'Дневной безлимит', group:'Абонементы' },
  { k:'morning8', name:'8 утренний', group:'Абонементы' },
  { k:'personal', name:'Индивидуальные занятия', group:'Индивидуалки' },
  { k:'pregnant', name:'Занятие для беременных', group:'Спец. классы и прочее' },
  { k:'sound', name:'Звуковая медитация', group:'Спец. классы и прочее' },
  { k:'commercial', name:'Мастер-классы и интенсивы', group:'Спец. классы и прочее' },
  { k:'freeze', name:'Заморозка', group:'Спец. классы и прочее' },
  { k:'rentgoods', name:'Аренда зала / продажа товаров', group:'Спец. классы и прочее' },
  { k:'fitmost', name:'Фитмост', group:'Спец. классы и прочее' },
  { k:'diff', name:'Расхождение', group:'Спец. классы и прочее', manualOnly:true }
];
const FIXED_EXPENSES = [
  { k:'rent', name:'Аренда помещения', def:235400 },
  { k:'marketing', name:'Маркетинг и реклама', def:0 },
  { k:'manager', name:'Управляющий', def:0 },
  { k:'internet', name:'Интернет услуги', def:3000 },
  { k:'security', name:'Охрана', def:4000 },
  { k:'accountant', name:'Бухгалтер', def:5000 }
];
const PAYERS = { studio:'Студия', u1:'Влад (личные)', u2:'Катя (личные)' };

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 4 · ДАННЫЕ И ЛОГИКА СЕРВЕРА
   Что делает:   начальные данные и все действия сервера (сохранить задачу, отчёт, выплату…). Работает и в браузере (демо), и в Google Apps Script.
   Можно менять: списки тренеров, гайд по умолчанию, регулярные задачи в buildSeed (влияет только на демо и первый запуск).
   Не трогать:   createServer — это сердце системы; после правок пересоберите 01_Core.gs (см. README).
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 4. ДАННЫЕ ----------
   Все обращения идут через Api.call(action, payload).
   В режиме 'demo' их обрабатывает DemoServer (ниже) — это эмуляция того же
   Apps Script, что будет стоять за Google Таблицей. Проверки прав
   дублируются на сервере, поэтому подмена кода в браузере ничего не даст. */
const SEED_TASKS = [{"id": "o1", "level": "owners", "block": "До 1 ноября", "title": "Вычет 13%: узнать, принимают ли ещё заявку на 2027 год", "desc": "Позвонить в Департамент спорта Москвы (справочная +7 495 777-77-77; ул. Лужники, 24, стр. 38). В Москве документы в прошлые годы принимали до 1 октября, а регионы передают списки в Минспорт до 1 ноября — на 2027 год, скорее всего, опоздали, но спросить. Если нет — готовимся к подаче осенью 2027.", "assignee": "u2", "helper": "u1", "start": "2026-10-21", "due": "2026-10-23", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "Нужны: основной ОКВЭД спорт, хотя бы 1 сотрудник по трудовому договору с дипломом по физкультуре (СПО+ или переподготовка), штатное расписание.", "createdBy": "u1"}, {"id": "o2", "level": "owners", "block": "До 1 ноября", "title": "Сменить основной ОКВЭД ИП на 93.13 «Деятельность фитнес-центров»", "desc": "Сначала спросить бухгалтера, не изменятся ли налог и взносы. Потом заявление Р24001 в ФНС (сайт ФНС / Госуслуги с ЭП или МФЦ), бесплатно, около 5 рабочих дней. Основной ОКВЭД ИП может поменять сам.", "assignee": "u2", "helper": "", "start": "2026-10-22", "due": "2026-11-06", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o3", "level": "owners", "block": "До 1 ноября", "title": "Подписать договоры со всеми администраторами (2 экз.)", "desc": "Один экземпляр у нас, второй — на ресепшене.", "assignee": "u1", "helper": "u2", "start": "2026-10-22", "due": "2026-10-31", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o4", "level": "owners", "block": "До 1 ноября", "title": "Сменить пароль платёжного кабинета, поставить пароли на MAX и Telegram", "desc": "Пароль лежал в «Избранном» рабочего MAX. Если уже сделано — отметить «Готово».", "assignee": "u1", "helper": "", "start": "2026-10-21", "due": "2026-10-22", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o5", "level": "owners", "block": "Решения: продажи", "title": "Марафон «12 занятий за 30 дней» — утвердить правила и призы", "desc": "Анонс 26.10, старт 9.11. Правила — в «Плане роста». После утверждения Катя готовит посты и картинку.", "assignee": "u1", "helper": "u2", "start": "2026-10-21", "due": "2026-10-25", "dueTime": "20:00", "priority": "urgent", "status": "wait", "progress": 0, "comment": "Подготовься к Новому году → в январе «Приди в себя после праздников».", "createdBy": "u1"}, {"id": "o6", "level": "owners", "block": "Решения: продажи", "title": "Акция октября — не делаем массовую", "desc": "Админы выгружают тех, у кого абонемент кончается до 15.11 → им продление по регламенту (скидка 10% до окончания). Тем, кто сомневается, — точечно 15%.", "assignee": "u1", "helper": "u3", "start": "2026-10-22", "due": "2026-10-24", "dueTime": "20:00", "priority": "high", "status": "wait", "progress": 0, "comment": "Согласен с Катей: пусть просто продлевают.", "createdBy": "u2"}, {"id": "o7", "level": "owners", "block": "Решения: продажи", "title": "Чёрная пятница (27–29 ноября) — механика", "desc": "Предлагаю: только сертификаты и абонемент на 16 со скидкой 20% (по лестнице 20% — только ЧП и ДР студии), для новых и тех, у кого нет действующего абонемента. Продления не трогаем.", "assignee": "u1", "helper": "u2", "start": "2026-10-23", "due": "2026-11-06", "dueTime": "20:00", "priority": "high", "status": "wait", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o8", "level": "owners", "block": "Решения: продажи", "title": "Счастливые часы — формат", "desc": "Решить: какие слоты (утро 9–10, вс вечер), цена разового, только для слабых занятий.", "assignee": "u1", "helper": "u2", "start": "2026-10-28", "due": "2026-11-06", "dueTime": "20:00", "priority": "mid", "status": "wait", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o9", "level": "owners", "block": "Решения: продажи", "title": "Корпоративные клиенты", "desc": "Владислав: написать Alina Lebedeva (скрипт 12), утвердить цены, вести первые встречи в БЦ. Олег готовит список и письма.", "assignee": "u1", "helper": "u3", "start": "2026-10-22", "due": "2026-11-30", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "Цены: группа от 8 000 ₽ или 1 000 ₽/чел (мин. 8), выезд 6–8 тыс., пакет 50 занятий 55 000 ₽.", "createdBy": "u1"}, {"id": "o10", "level": "owners", "block": "Решения: продажи", "title": "Реклама на Ozon — что это даёт", "desc": "Уточнить формат (реклама студии или продажа сертификатов на Ozon), получить предложение: цена, гео, аудитория. Сравнить: пробное должно стоить не дороже 1 500–2 000 ₽.", "assignee": "u1", "helper": "", "start": "2026-10-28", "due": "2026-11-13", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o11", "level": "owners", "block": "Деньги и персонал", "title": "Оплата администраторов с января", "desc": "Ноябрь–декабрь платим по-старому, но считаем «как было бы» по новой схеме и показываем админам. Тогда гарантия 55 тыс. не нужна. Утвердить до 15.12.", "assignee": "u1", "helper": "u2", "start": "2026-11-01", "due": "2026-12-15", "dueTime": "20:00", "priority": "high", "status": "wait", "progress": 0, "comment": "Расходы на админов при любой выручке 15–17%: меньше продаж — меньше выплата.", "createdBy": "u1"}, {"id": "o12", "level": "owners", "block": "Деньги и персонал", "title": "Взять в штат Пелагею", "desc": "Трудовой договор, штатное расписание, копия диплома по физкультуре. Посчитать: НДФЛ 13% + взносы ~30% сверх зарплаты.", "assignee": "u2", "helper": "u1", "start": "2026-10-22", "due": "2026-11-30", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "Это же нужно для перечня Минспорта.", "createdBy": "u2"}, {"id": "o13", "level": "owners", "block": "Деньги и персонал", "title": "Решить, кого из администраторов в штат", "desc": "После расчёта взносов; удобно с января вместе с новой оплатой.", "assignee": "u2", "helper": "u1", "start": "2026-11-01", "due": "2026-12-15", "dueTime": "20:00", "priority": "mid", "status": "wait", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o14", "level": "owners", "block": "Деньги и персонал", "title": "Договор с тренерами — разработать", "desc": "Взять имеющийся шаблон, добавить: ставки, отмены, запрет личных продаж на занятии, конфиденциальность базы клиентов. Показать юристу.", "assignee": "u1", "helper": "", "start": "2026-10-23", "due": "2026-11-06", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o15", "level": "owners", "block": "Деньги и персонал", "title": "Подписать договоры со всеми тренерами (2 экз.)", "desc": "После утверждения шаблона.", "assignee": "u2", "helper": "u1", "start": "2026-11-09", "due": "2026-11-20", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o16", "level": "owners", "block": "Деньги и персонал", "title": "Документы для мам и беременных", "desc": "Черновики правил посещения, анкеты здоровья и согласий → юрист → утвердить. Черновики может подготовить Claude.", "assignee": "u2", "helper": "u1", "start": "2026-10-23", "due": "2026-11-10", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o17", "level": "owners", "block": "Команда", "title": "День тренера (боулинг)", "desc": "Предложить тренерам 2 даты (например, вс 22.11 или вс 29.11 после 19:00), опрос до 5.11. Кто не может — подарок (шоколад, носки, открытка, ~500–700 ₽). От клиентов: открытки-благодарности на стойке за неделю до.", "assignee": "u2", "helper": "u1", "start": "2026-10-28", "due": "2026-11-29", "dueTime": "20:00", "priority": "mid", "status": "wait", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o18", "level": "owners", "block": "Команда", "title": "Обучение тренеров — формат", "desc": "Обсудить, что важнее: работа с новичком, удержание, безопасность (беременные, спина). Вариант: встреча раз в месяц по 1,5 часа.", "assignee": "u1", "helper": "u2", "start": "2026-12-01", "due": "2026-12-20", "dueTime": "20:00", "priority": "low", "status": "wait", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o19", "level": "owners", "block": "Идеи — позже", "title": "Выезд в Подмосковье", "desc": "Не раньше весны. Сначала опрос в Telegram: интерес, бюджет, даты. Запускать при 10–12 предоплатах.", "assignee": "u2", "helper": "", "start": "2027-01-11", "due": "2027-01-31", "dueTime": "20:00", "priority": "low", "status": "wait", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o20", "level": "owners", "block": "Идеи — позже", "title": "Проектор", "desc": "Сначала — зачем (кино-вечер, лекции). Простыня не подойдёт: портативный экран на треноге 80–100″ или ровная белая стена.", "assignee": "u1", "helper": "", "start": "2027-01-11", "due": "2027-01-31", "dueTime": "20:00", "priority": "low", "status": "wait", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "o21", "level": "owners", "block": "Идеи — позже", "title": "Мастер-классы: столы и стулья", "desc": "Варианты: низкие складные столики прямо на ковриках (рисование, свечи, гипс) или проводить в кофейне-партнёре. Сначала один пилотный класс.", "assignee": "u2", "helper": "", "start": "2026-11-02", "due": "2026-11-20", "dueTime": "20:00", "priority": "low", "status": "wait", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "o22", "level": "owners", "block": "Идеи — позже", "title": "Благодарность клиентам (вместо «подарка за отзыв»)", "desc": "Дарить за отзыв нельзя — карты удаляют такие отзывы. Вместо этого: мелочь всем на 10-м занятии или при продлении, а отзыв просим отдельно.", "assignee": "u2", "helper": "", "start": "2026-10-28", "due": "2026-11-15", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m1", "level": "management", "block": "Срочно", "title": "Карточка 2ГИС — ИЗМЕНИТЬ до 1 ноября", "desc": "Цены по прайсу от 11.10 (сейчас там «абонемент от 2 400 ₽»), фото залов, утренний и льготные абонементы.", "assignee": "u3", "helper": "u2", "start": "2026-10-21", "due": "2026-10-30", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m2", "level": "management", "block": "Срочно", "title": "Расписание на ноябрь", "desc": "Подготовить по правилам (утро 9:00+10:00, четверг 4→2, пятница 21:00 — одно занятие) и отдать на утверждение.", "assignee": "u3", "helper": "", "start": "2026-10-21", "due": "2026-10-25", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m3", "level": "management", "block": "Срочно", "title": "Ремонт — доделать", "desc": "", "assignee": "u2", "helper": "", "start": "2026-10-26", "due": "2026-10-27", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m4", "level": "management", "block": "Срочно", "title": "Марафон — подготовка", "desc": "После утверждения правил: пост и картинка, памятка админам, пометка «ЧЕЛЛЕНДЖ» в CRM, подарок от партнёра.", "assignee": "u2", "helper": "u3", "start": "2026-10-25", "due": "2026-11-08", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m5", "level": "management", "block": "CRM и админы", "title": "Письмо в поддержку Mobifitness", "desc": "6 вопросов из документа управляющего: триггеры, автозадачи, теги, модуль чатов, цена тарифа.", "assignee": "u3", "helper": "", "start": "2026-10-22", "due": "2026-10-24", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m6", "level": "management", "block": "CRM и админы", "title": "CRM: поля, справочники, теги", "desc": "Источник клиента, причина отказа, ответственный; теги НЕ БЕСПОКОИТЬ / ИСКЛ / ЧЕЛЛЕНДЖ / СОТРУДНИК.", "assignee": "u3", "helper": "", "start": "2026-10-23", "due": "2026-10-31", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m7", "level": "management", "block": "CRM и админы", "title": "CRM: новые задачи и временные диапазоны", "desc": "Напоминание о записи за 12 ч, «осталось 2 занятия / 5 дней», «14 дней без визита», «31 день без абонемента». Запуск по неделям: новички → продления → возврат.", "assignee": "u3", "helper": "", "start": "2026-10-28", "due": "2026-11-20", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m8", "level": "management", "block": "CRM и админы", "title": "Админы: отчёт смены, шаблоны, задачи", "desc": "Ввести шаблон отчёта смены, загрузить тексты Н1–У6 в шаблоны, раздать регламент.", "assignee": "u3", "helper": "", "start": "2026-10-22", "due": "2026-10-31", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m9", "level": "management", "block": "CRM и админы", "title": "Документы: обновить и заполнить", "desc": "Приложение 1 договора админов (цены от 11.10), оферта и правила студии под новый прайс. Катя — проверить и подписать.", "assignee": "u2", "helper": "u3", "start": "2026-10-23", "due": "2026-11-06", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m10", "level": "management", "block": "CRM и админы", "title": "Еженедельный отчёт собственникам", "desc": "Каждый понедельник до 12:00 по шаблону из документа управляющего.", "assignee": "u3", "helper": "", "start": "2026-10-26", "due": "2027-01-25", "dueTime": "20:00", "priority": "mid", "status": "work", "progress": 30, "comment": "", "createdBy": "u1"}, {"id": "m11", "level": "management", "block": "Партнёры и печать", "title": "«Счастье тут» — стаканчики", "desc": "Сразу идём в стаканчики: наклейка с QR на «Знакомство» по промокоду, напиток «йога-латте»; им — занятие в подарок для сотрудников. Визитки отложить.", "assignee": "u1", "helper": "u2", "start": "2026-10-23", "due": "2026-11-15", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "Назначить, кто из нас договаривается.", "createdBy": "u3"}, {"id": "m12", "level": "management", "block": "Партнёры и печать", "title": "Пекарня («хлеб»)", "desc": "Та же универсальная листовка с их промокодом; им — пробное занятие для клиентов, от них — подарок участникам марафона.", "assignee": "u2", "helper": "", "start": "2026-10-28", "due": "2026-11-20", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m13", "level": "management", "block": "Партнёры и печать", "title": "Универсальные листовки и новые визитки", "desc": "Один макет: QR, «Знакомство», адрес, промокод партнёра. Заказать одной партией.", "assignee": "u2", "helper": "u1", "start": "2026-10-28", "due": "2026-11-10", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m14", "level": "management", "block": "Новый год", "title": "Ревизия старых боксов", "desc": "Посмотреть, что осталось, и включить в новогодние наборы.", "assignee": "u2", "helper": "", "start": "2026-10-26", "due": "2026-10-31", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m15", "level": "management", "block": "Новый год", "title": "Конверты для сертификатов", "desc": "Найти недорогие красивые, заказать до 10.11.", "assignee": "u2", "helper": "", "start": "2026-10-26", "due": "2026-11-10", "dueTime": "20:00", "priority": "high", "status": "work", "progress": 30, "comment": "", "createdBy": "u2"}, {"id": "m16", "level": "management", "block": "Новый год", "title": "Новогодние боксы — состав и цена", "desc": "", "assignee": "u2", "helper": "", "start": "2026-11-02", "due": "2026-11-15", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m17", "level": "management", "block": "Новый год", "title": "Старт продаж сертификатов 20.11", "desc": "Витрина на стойке, пост в канале, push в приложении, корпоративным клиентам.", "assignee": "u3", "helper": "u2", "start": "2026-11-16", "due": "2026-11-20", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m18", "level": "management", "block": "Новый год", "title": "Мастер-класс свечи / гипс", "desc": "Анонс до 15.11, провести в середине декабря.", "assignee": "u2", "helper": "", "start": "2026-11-02", "due": "2026-12-13", "dueTime": "20:00", "priority": "mid", "status": "work", "progress": 30, "comment": "", "createdBy": "u2"}, {"id": "m19", "level": "management", "block": "Новый год", "title": "Мастер-класс по духам — опрос", "desc": "Опрос в Telegram, решить по результату.", "assignee": "u2", "helper": "", "start": "2026-11-02", "due": "2026-11-15", "dueTime": "20:00", "priority": "low", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m20", "level": "management", "block": "Новый год", "title": "Ёлка и украшения", "desc": "", "assignee": "u2", "helper": "", "start": "2026-11-23", "due": "2026-12-01", "dueTime": "20:00", "priority": "low", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m21", "level": "management", "block": "Новый год", "title": "Новогоднее событие для клиентов", "desc": "Чай, подарки партнёров, клиенты с друзьями.", "assignee": "u2", "helper": "u3", "start": "2026-12-01", "due": "2026-12-20", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m22", "level": "management", "block": "Привлечение", "title": "«Мама + малыш» с Натальей", "desc": "Формат, возраст детей, дата старта; админы собирают лист ожидания.", "assignee": "u2", "helper": "", "start": "2026-10-22", "due": "2026-10-31", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "m23", "level": "management", "block": "Привлечение", "title": "Корпоративные: список компаний и письма", "desc": "20–30 компаний («Ривер Плаза», «Полином», «Навигатор» и др.), письмо — скрипт 10, напоминание через 3 дня.", "assignee": "u3", "helper": "u1", "start": "2026-11-02", "due": "2026-11-20", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m24", "level": "management", "block": "Привлечение", "title": "Открытое занятие для ушедших", "desc": "Предлагаю сб 21.11 (до Чёрной пятницы); приглашения — текст У3.", "assignee": "u3", "helper": "u2", "start": "2026-11-09", "due": "2026-11-21", "dueTime": "20:00", "priority": "mid", "status": "wait", "progress": 0, "comment": "Дату согласовать.", "createdBy": "u2"}, {"id": "m25", "level": "management", "block": "Привлечение", "title": "День открытых дверей для ЖК", "desc": "Январь — старт сезона, например сб 17.01.", "assignee": "u2", "helper": "u3", "start": "2026-12-15", "due": "2027-01-17", "dueTime": "20:00", "priority": "mid", "status": "wait", "progress": 0, "comment": "Дату согласовать.", "createdBy": "u1"}, {"id": "m26", "level": "management", "block": "Привлечение", "title": "Розыгрыш с кофейней для канала", "desc": "Условие — подписка на оба канала.", "assignee": "u2", "helper": "", "start": "2026-11-09", "due": "2026-11-22", "dueTime": "20:00", "priority": "low", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "m27", "level": "management", "block": "Привлечение", "title": "Счастливые часы — настроить", "desc": "После решения собственников.", "assignee": "u3", "helper": "", "start": "2026-11-09", "due": "2026-11-15", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u2"}, {"id": "m28", "level": "management", "block": "Привлечение", "title": "Чёрная пятница — подготовка", "desc": "Пост, push, памятка админам, сертификаты на стойке.", "assignee": "u3", "helper": "u2", "start": "2026-11-16", "due": "2026-11-27", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u1"}, {"id": "t1", "level": "team", "block": "Старт", "title": "Прочитать «Регламент администратора»", "desc": "Задать вопросы Олегу.", "assignee": "u4", "helper": "u5", "start": "2026-10-22", "due": "2026-10-25", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "t2", "level": "team", "block": "Старт", "title": "Подписать договор (2 экз.)", "desc": "", "assignee": "u4", "helper": "u5", "start": "2026-10-22", "due": "2026-10-31", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u4"}, {"id": "t3", "level": "team", "block": "Старт", "title": "Список: у кого абонемент кончается до 15.11", "desc": "Каждому — продление по тексту П1 (скидка 10% до окончания). Массовой акции в октябре нет.", "assignee": "u4", "helper": "u5", "start": "2026-10-22", "due": "2026-10-25", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u5"}, {"id": "t4", "level": "team", "block": "Клиенты", "title": "Обзвон 79 ценных ушедших клиентов", "desc": "10 контактов за смену, файл обзвона. Результат — в карточку CRM.", "assignee": "u4", "helper": "u5", "start": "2026-10-22", "due": "2026-11-15", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "t5", "level": "team", "block": "Клиенты", "title": "Лист ожидания «Мама + малыш» и беременные", "desc": "18 клиенток из переписки + Гаврилова, Гаряева, Дорофеева, Гузева.", "assignee": "u5", "helper": "", "start": "2026-10-22", "due": "2026-10-31", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "t6", "level": "team", "block": "Марафон", "title": "Приглашать в марафон", "desc": "Каждому клиенту у стойки + текст ЧЕЛ тем, у кого заканчивается абонемент.", "assignee": "u4", "helper": "u5", "start": "2026-10-27", "due": "2026-11-08", "dueTime": "20:00", "priority": "urgent", "status": "todo", "progress": 0, "comment": "", "createdBy": "u4"}, {"id": "t7", "level": "team", "block": "Марафон", "title": "Понедельничный счёт и сообщения отстающим", "desc": "Каждый понедельник 9.11–7.12.", "assignee": "u3", "helper": "u4", "start": "2026-11-09", "due": "2026-12-08", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u5"}, {"id": "t8", "level": "team", "block": "Марафон", "title": "Итоги и подарки", "desc": "9–10 декабря; продление на 16 со скидкой до 15.12.", "assignee": "u3", "helper": "u5", "start": "2026-12-09", "due": "2026-12-15", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "t9", "level": "team", "block": "Продажи", "title": "Пригласить ушедших на открытое занятие", "desc": "Текст У3, после того как дата утверждена.", "assignee": "u5", "helper": "u4", "start": "2026-11-09", "due": "2026-11-20", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}, {"id": "t10", "level": "team", "block": "Продажи", "title": "Чёрная пятница — сообщения и продажи", "desc": "", "assignee": "u4", "helper": "u5", "start": "2026-11-23", "due": "2026-11-29", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u4"}, {"id": "t11", "level": "team", "block": "Продажи", "title": "Продажа новогодних сертификатов у стойки", "desc": "Предлагать каждому при продлении.", "assignee": "u4", "helper": "u5", "start": "2026-11-20", "due": "2026-12-31", "dueTime": "20:00", "priority": "high", "status": "todo", "progress": 0, "comment": "", "createdBy": "u5"}, {"id": "t12", "level": "team", "block": "Продажи", "title": "Корпоративные: найти контакты HR / офис-менеджеров", "desc": "В «Ривер Плазе», «Полиноме», «Навигаторе».", "assignee": "u5", "helper": "u3", "start": "2026-11-02", "due": "2026-11-13", "dueTime": "20:00", "priority": "mid", "status": "todo", "progress": 0, "comment": "", "createdBy": "u3"}];
const TRAINER_NAMES = ['Лущай Екатерина','Коршунова Алена','Николаева Анна','Пономарева Юлия','Рубцова Кира','Гуменная Мария','Яценко Регина','Федорова Мария',
  'Томилина Альбина','Нестерова Пелагея','Солдаткина Евгения','Игнатьев Алексей','Никитина Наталья','Гуреев Евгений','Рудаковская Наталья','Кириллова Регина','Качалова Елизавета','Моисеева Алена'];
const shortName = full => { const w = String(full||'').trim().split(/\s+/); return w.length>=2 ? w[1] : (w[0]||''); };

function buildSeed(){
  const T = todayStr(); const M = T.slice(0,7); const dayN = parseYmd(T).getDate();
  const U = (id,name,fullName,login,role,color,phone,email) => ({ id, name, fullName, login, pass:'1234', role, extraRoles:[], color, phone, email, active:true, status:'active', createdAt:'2026-09-01T10:00:00', notify:defaultNotify(role) });
  const users = [
    U('u1','Владислав','Владислав','vlad','owner','#CCC1FF','',''),
    U('u2','Катя','Лущай Екатерина Евгеньевна','katya','owner','#E8B4C4','',''),
    U('u3','Олег','Парамонов Олег','oleg','manager','#9FC3BE','',''),
    U('u4','Варвара','Зуева Варвара','varvara','admin','#899C84','',''),
    U('u5','Милана','Гурова Милана','milana','admin','#EBCB8B','',''),
    U('u7','Дарья','Белова Дарья (пример)','smm','smm','#B9C7A6','',''),
    // заявка на регистрацию — ждёт подтверждения владельцем (пример)
    { id:'u6', name:'Анастасия', fullName:'Смирнова Анастасия Игоревна', login:'nastya@example.ru', pass:'1234', role:'admin', color:'#B9C7A6',
      phone:'+7 900 000-00-00', email:'nastya@example.ru', active:false, status:'pending', createdAt:addDays(T,-1)+'T18:20:00' }
  ];
  const trainers = TRAINER_NAMES.map((n,i) => ({ id:'tr'+(i+1), fullName:n, name:n, phone:'', note: i===0 ? 'также собственник' : '', active:true }));
  const notifications = [{ id:'n1', type:'signup', userId:'u6', at:addDays(T,-1)+'T18:20:00', read:false }];
  const tasks = SEED_TASKS.map(t => ({ ...t, comment:'', progress: t.status==='done'?100:0, parentId:'', createdAt: t.start+'T09:00:00', doneBy:'', doneAt:'', late:false, recurringId:'', history:[],
    comments: t.comment ? [{ id:'c-'+t.id, at:t.start+'T09:00:00', by:t.createdBy, text:t.comment }] : [] }));
  // Пример связки: «Новогодние продажи» — общая задача, к ней привязаны задачи из таблиц
  tasks.push({ id:'link-ny', level:'management', block:'Новый год', title:'Новогодние продажи — подготовка', desc:'Общая задача: сертификаты, боксы, конверты. Прогресс считается по связанным задачам.',
    assignee:'u2', helper:'u3', start:T, due:'2026-11-20', dueTime:'20:00', priority:'high', status:'work', progress:0, parentId:'', comment:'', createdBy:'u1', createdAt:T+'T09:00:00',
    doneBy:'', doneAt:'', late:false, recurringId:'', history:[], comments:[] });
  ['m14','m15','m16','m17'].forEach(id => { const t = tasks.find(x => x.id===id); if (t) t.parentId = 'link-ny'; });
  const D = [0,1,2,3,4,5,6];
  const templates = [
    { id:'r1',  title:'Открыть смену', desc:'По гайду «Открытие смены»: свет, касса, расписание, новички.', days:D, level:'team', assignee:'', dueTime:'10:00', priority:'high', active:true },
    { id:'r2',  title:'Утром — сообщение тренеру о новичках', desc:'Имя, был ли опыт, ограничения по здоровью.', days:D, level:'team', assignee:'', dueTime:'11:00', priority:'mid', active:true },
    { id:'r3',  title:'Ответить на все сообщения за 30 минут', desc:'В конце смены — ноль «хвостов» в MAX, Telegram и Mobifitness.', days:D, level:'team', assignee:'', dueTime:'21:30', priority:'high', active:true },
    { id:'r4',  title:'«Как узнали о нас» — у каждого нового в CRM', desc:'', days:D, level:'team', assignee:'', dueTime:'21:30', priority:'mid', active:true },
    { id:'r5',  title:'Задачи CRM на сегодня закрыты', desc:'', days:D, level:'team', assignee:'', dueTime:'21:30', priority:'mid', active:true },
    { id:'r6',  title:'10 контактов возврата за смену', desc:'Файл обзвона, результат — в карточку CRM.', days:D, level:'team', assignee:'', dueTime:'21:00', priority:'high', active:true },
    { id:'r7',  title:'Попросить 2–3 отзыва', desc:'Без подарков за отзыв — карты такие удаляют.', days:D, level:'team', assignee:'', dueTime:'21:00', priority:'low', active:true },
    { id:'r8',  title:'Отчёт смены в чат', desc:'По шаблону отчёта смены.', days:D, level:'team', assignee:'', dueTime:'22:00', priority:'high', active:true },
    { id:'r9',  title:'Закрыть смену', desc:'По гайду «Закрытие смены»: касса, инкассация, залы.', days:D, level:'team', assignee:'', dueTime:'22:30', priority:'high', active:true },
    { id:'r10', title:'Список возврата на неделю + задачи в CRM', desc:'', days:[1], level:'team', assignee:'u3', dueTime:'12:00', priority:'high', active:true },
    { id:'r11', title:'Разбор цифр с админами (15 мин)', desc:'', days:[1], level:'team', assignee:'u3', dueTime:'15:00', priority:'mid', active:true },
    { id:'r12', title:'Отчёт собственникам', desc:'До 12:00 по шаблону из документа управляющего.', days:[1], level:'management', assignee:'u3', dueTime:'12:00', priority:'high', active:true },
    { id:'r13', title:'Тренировка разговора с админами (30 мин)', desc:'', days:[3], level:'team', assignee:'u3', dueTime:'16:00', priority:'mid', active:true },
    { id:'r14', title:'Пост в канале', desc:'Пн / ср / пт.', days:[1,3,5], level:'management', assignee:'u3', dueTime:'13:00', priority:'mid', active:true }
  ];
  // История за 6 недель: регулярные задачи, чтобы графики были не пустыми (демо)
  const hist = ['r1','r3','r6','r8','r9','r10','r12','r14'];
  for (let i = 42; i >= 1; i--){
    const day = addDays(T, -i); const dow = parseYmd(day).getDay();
    const shiftAdmin = (parseYmd(day).getDate() % 2) ? 'u4' : 'u5';
    for (const tid of hist){
      const tp = templates.find(x => x.id===tid);
      if (!tp.days.includes(dow)) continue;
      const r = hash(tid+day); const assignee = tp.assignee || shiftAdmin;
      const t = instFromTemplate(tp, day, 'auto'); t.assignee = assignee;
      const forceOpen = i===1 && (tid==='r6' || tid==='r3');
      const due = new Date(`${day}T${tp.dueTime}:00`);
      if (forceOpen){ t.status='work'; }
      else if (r < 0.86){ const late = hash(day+tid+'L') < 0.07; t.status='done'; t.progress=100; t.doneBy=assignee; t.late=late; t.doneAt = new Date(due.getTime() + (late ? 50 : -40)*60000).toISOString(); }
      else if (r < 0.96){ t.status='cancel'; }
      else { t.status='done'; t.progress=100; t.doneBy=assignee; t.late=true; t.doneAt = new Date(due.getTime() + 18*3600000).toISOString(); }
      tasks.push(t);
    }
  }
  const prevM = ymd(new Date(parseYmd(T).getFullYear(), parseYmd(T).getMonth()-1, 1)).slice(0,7);
  const payouts = [
    { id:'p1', recipient:'u4', periodFrom:M+'-01', periodTo:M+'-15', period:'1–15 '+MONTHS_GEN[parseYmd(T).getMonth()], amount:21500, comment:'Аванс', plannedDate:addDays(T,-5), createdBy:'u1', createdAt:addDays(T,-6)+'T12:00:00', issuedBy:'u3', issuedAt:addDays(T,-5)+'T19:10:00' },
    { id:'p2', recipient:'u5', periodFrom:M+'-01', periodTo:M+'-15', period:'1–15 '+MONTHS_GEN[parseYmd(T).getMonth()], amount:18200, comment:'Аванс', plannedDate:addDays(T,-5), createdBy:'u1', createdAt:addDays(T,-6)+'T12:05:00', issuedBy:'u4', issuedAt:addDays(T,-4)+'T10:20:00' },
    { id:'p3', recipient:'tr10', periodFrom:M+'-01', periodTo:M+'-15', period:'1–15 '+MONTHS_GEN[parseYmd(T).getMonth()], amount:24000, comment:'12 занятий', plannedDate:addDays(T,-3), createdBy:'u2', createdAt:addDays(T,-4)+'T15:00:00', issuedBy:'', issuedAt:'' },
    { id:'p4', recipient:'u3', periodFrom:prevM+'-01', periodTo:prevM+'-28', period:'Сентябрь', amount:55000, comment:'Управляющий', plannedDate:prevM+'-28', createdBy:'u1', createdAt:prevM+'-27T10:00:00', issuedBy:'u1', issuedAt:prevM+'-28T18:00:00' }
  ];
  const reviews = [
    { id:'v1', client:'Анна С. (пример)', date:addDays(T,-2), source:'oral', rating:5, text:'Очень спокойная атмосфера, тренер внимательно поправляет. Хожу на утренние занятия.', createdBy:'u4', confirmed:true, confirmedBy:'u3', origin:'manual' },
    { id:'v2', client:'Ирина (пример)', date:addDays(T,-1), source:'site', rating:4, text:'Хорошие залы, но хотелось бы больше вечерних слотов в пятницу.', createdBy:'u5', confirmed:false, confirmedBy:'', origin:'manual' },
    { id:'v3', client:'Мария К. (пример)', date:T, source:'oral', rating:5, text:'Сказала на стойке: после месяца занятий прошла спина.', createdBy:'u4', confirmed:false, confirmedBy:'', origin:'manual' }
  ];
  // Продажи текущего месяца (примеры, чтобы зарплата и доходы считались)
  const S0 = [[1,'ab8',11600,'new','u4',0],[2,'single',1800,'current','u5',0],[3,'unlim',30000,'new','u5',0],[4,'trial_super',2400,'new','u4',0],[5,'ab4',6400,'return','u4',1],
    [6,'ab16',21600,'current','u5',0],[7,'personal',4500,'new','u4',0],[8,'ab8',11600,'return','u5',1],[9,'goods',1500,'current','u4',0],[10,'trial',900,'new','u5',0],
    [11,'dayunlim',14000,'new','u4',0],[12,'ab6',9000,'return','u4',0],[13,'commercial',3500,'new','u5',0],[14,'ab8',11600,'new','u5',0],[15,'single',1800,'current','u4',0],
    [16,'ab4',6400,'new','u4',0],[17,'fitmost',7200,'current','u3',0],[18,'ab16',21600,'return','u5',1],[19,'freeze',1000,'current','u4',0],[20,'ab8',11600,'new','u4',0]];
  const sales = S0.filter(x => x[0] <= dayN).map(([d,product,price,clientType,sellerId,crm],i) => ({ id:'s'+(i+1), date:`${M}-${pad(d)}`, client:`Клиент ${i+1} (пример)`, product, price, discount:0,
    clientType, crmTouch:!!crm, sellerId, note:'', createdBy:'u3', createdAt:`${M}-${pad(d)}T20:00:00` }));
  const payroll = { [M]: {
    u4:{ shifts:{ std:7, morning:2, evening:1, full:0 }, kpi:{ conversion:65, renewals:72, sleeping:120, clean:0 }, bonus:0, note:'' },
    u5:{ shifts:{ std:6, morning:1, evening:2, full:1 }, kpi:{ conversion:72, renewals:58, sleeping:160, clean:1 }, bonus:0, note:'' } } };
  const plans = { [M]: 120000 };
  const penalties = [
    { id:'pn1', date:`${M}-${pad(Math.min(3,dayN))}`, adminId:'u5', code:'4.1', extra:0, note:'Ответ клиенту через 55 минут', createdBy:'u3' },
    { id:'pn2', date:`${M}-${pad(Math.min(12,dayN))}`, adminId:'u5', code:'4.1', extra:0, note:'Повторно: ответ через 47 минут', createdBy:'u3' },
    { id:'pn3', date:`${M}-${pad(Math.min(9,dayN))}`, adminId:'u4', code:'2.2', extra:0, note:'Не отмечен визит', createdBy:'u3' }
  ];
  const finance = { [M]: { income:{}, fixed:Object.fromEntries(FIXED_EXPENSES.map(f => [f.k, f.def])), taxRate:1, trainers:{}, adminsManual:{},
    purchases:[], utilities:[{ id:'ut1', name:'Mobifitness — сервис', amount:26000, payer:'studio' }, { id:'ut2', name:'Mobifitness — приложение', amount:34440, payer:'studio' }],
    custom:[], ownerOps:[] } };
  // Долг студии перед собственниками — из вашей таблицы (даты ориентировочные, поправьте)
  const debt = [
    { id:'d1', date:'2025-12-15', owner:'u1', type:'loan',  amount:206242, note:'Вложил в декабре' },
    { id:'d2', date:'2026-04-30', owner:'u1', type:'repay', amount:81000,  note:'Выплата долга' },
    { id:'d3', date:'2026-06-30', owner:'u1', type:'repay', amount:50000,  note:'Май и июнь' },
    { id:'d4', date:'2026-07-31', owner:'u1', type:'repay', amount:5000,   note:'Июль' }
  ];
  const guide = defaultGuide();
  const settings = { yandexOrgId:CONFIG.YANDEX_ORG_ID, twogisFirmId:CONFIG.TWOGIS_FIRM_ID, twogisCity:'moscow',
    mapStats:{ yandex:{ rating:5.0, ratings:71, reviews:57 }, twogis:{ rating:5.0, reviews:10 }, at:addDays(T,-1)+'T06:00:00' }, lastSync:'' };
  settings.shiftRates = { ...DEFAULT_RATES };
  // График администраторов на текущий месяц: 2/2, обычно 09:00–21:00 (пример)
  const schedule = []; const [yy, mo] = M.split('-').map(Number); const daysInM = new Date(yy, mo, 0).getDate();
  for (let d = 1; d <= daysInM; d++){
    const date = `${M}-${pad(d)}`; const who = (Math.floor((d-1)/2) % 2) ? 'u5' : 'u4';
    let start = '09:00', end = '21:00', half = false;
    if (d % 7 === 3){ start = '07:45'; }            // запись на 08:00 — расширенное утро
    if (d % 6 === 5){ end = '22:30'; }              // запись на 21:00 — расширенный вечер
    schedule.push({ id:'sh'+d, date, adminId:who, start, end, half, type:'auto', note:'' });
    if (d === 12){ const last = schedule[schedule.length-1]; last.end = '15:00'; last.half = true; last.note = 'До обеда'; schedule.push({ id:'sh'+d+'b', date, adminId: who==='u4'?'u5':'u4', start:'15:00', end:'21:00', half:true, type:'auto', note:'Подмена на вечер' }); }
  }
  // Отчёты смен за последние дни (пример; фото чека — заглушка)
  const reports = [];
  for (let k = 2; k < dayN; k++){ const date = addDays(T,-k); const sh = schedule.find(x => x.date===date); if (!sh) continue; const h = hash('rep'+date);
    const card = 14000 + Math.round(h*22000/10)*10, cash = h > .6 ? Math.round(h*3000/100)*100 : 0, online = h < .2 ? 1800 : 0;
    reports.push({ id:'rep'+k, date, adminId:sh.adminId, values:{ card, cash, online, renewals:Math.floor(h*3), nonRenewals: h>.7?1:0, goods: h>.5?1:0, cashInRegister:14000 + Math.round(h*4000/10)*10, cashNote: k===2 ? '10000 забрал Владислав' : '' },
      tasksDone: 10 + Math.floor(h*3.9), tasksTotal:13, comment:'', photo:RECEIPT_PLACEHOLDER,
      createdBy:sh.adminId, updatedAt:date+'T21:40:00' }); }
  settings.reportFields = DEFAULT_REPORT_FIELDS.map(f => ({ ...f }));
  const finConfig = { income: INCOME_LINES.map(l => ({ ...l })), expenses: FIXED_EXPENSES.filter(e => e.k!=='manager').map(e => ({ ...e })) };
  // Ставки (пример — поправьте во вкладке «Ставки»)
  const rates = { trainers: Object.fromEntries(trainers.map((t,i) => [t.id, { mode:'perClass', amount: i===0 ? 0 : 2000 }])),
    staff: { u4:{ mode:'contract', amount:0 }, u5:{ mode:'contract', amount:0 } },
    manager: { u3:{ mode:'params', amount:45000, pct:3 } }, smm: { u7:{ mode:'perPost', amount:1500 } } };
  // Начисления за месяц для тренеров, управляющего и СММ (занятия, публикации, премии, ручная сумма)
  const pay = { [M]: { 'tr:tr2':{ units:12 }, 'tr:tr3':{ units:8 }, 'tr:tr10':{ units:12 }, 'tr:tr13':{ units:10 }, 'smm:u7':{ units:9 } } };
  // Пример задач СММ
  tasks.push({ id:'smm1', level:'smm', block:'Контент', title:'Пост: анонс марафона «12 занятий за 30 дней»', desc:'Текст + картинка, согласовать с Катей до публикации.', assignee:'u7', helper:'', start:T, due:addDays(T,3), dueTime:'18:00', priority:'high', status:'work', progress:0, parentId:'', comment:'', createdBy:'u3', createdAt:T+'T10:00:00', doneBy:'', doneAt:'', late:false, recurringId:'', history:[], comments:[], moves:[], checklist:[] },
    { id:'smm2', level:'smm', block:'Контент', title:'Сторис с открытого занятия', desc:'3–5 сторис в день занятия.', assignee:'u7', helper:'', start:T, due:addDays(T,1), dueTime:'21:00', priority:'mid', status:'todo', progress:0, parentId:'', comment:'', createdBy:'u7', createdAt:T+'T11:00:00', doneBy:'', doneAt:'', late:false, recurringId:'', history:[], comments:[], moves:[], checklist:[] });
  // Пример задачи с пунктами: уборка каждый день
  templates.push({ id:'r15', title:'Уборка — проверка', desc:'Пройтись по чек-листу и отметить каждый пункт.', days:D, level:'team', assignee:'', dueTime:'20:30', priority:'mid', active:true,
    checklist:['Проверить чистоту зеркал','Проверить чистоту туалета','Проверить чистоту ванной комнаты','Коврики и пропсы разложены','Пол в залах чистый','Зона ожидания: чай, вода, стаканы'] });
  return { users, trainers, notifications, tasks, templates, payouts, reviews, guide, settings, sales, payroll, plans, penalties, finance, debt, schedule, reports, finConfig, rates, pay, v:6 };
}

function instFromTemplate(tp, day, by){
  return { id:`r-${tp.id}-${day}`, level:tp.level, block:'Регулярно', title:tp.title, desc:tp.desc, assignee:tp.assignee||'', helper:tp.helper||'',
    start:day, due:day, dueTime:tp.dueTime, priority:tp.priority, status:'todo', progress:0, parentId:'', comment:'', createdBy:by||'auto',
    createdAt:day+'T07:00:00', doneBy:'', doneAt:'', late:false, recurringId:tp.id, history:[], comments:[], moves:[],
    checklist:(tp.checklist||[]).map((text,i) => ({ id:`${tp.id}-${day}-${i}`, text, done:false, p:0, by:'', at:'' })) };
}

function defaultGuide(){
  const g = (id,title,steps) => ({ id, title, steps, draft:true, updatedBy:'', updatedAt:'' });
  return [
    g('g1','Открытие смены',['Прийти к 08:30 (при записи на 08:00 — к 07:45): свет, проветрить залы, включить музыку.','Открыть смену в кассе, проверить терминал и размен.','Mobifitness → Расписание на сегодня: проверить записи и отметить новичков.','Написать тренерам о новичках на их занятиях.','[Дополнит управляющий]']),
    g('g2','Закрытие смены',['Сверить кассу с отчётом Mobifitness, закрыть смену в кассе.','Проверить, что все задачи CRM на сегодня закрыты.','Отправить ежедневный отчёт до 23:00 по шаблону.','Выключить свет, обогреватели и технику, закрыть окна, поставить на охрану.']),
    g('g3','Продажа абонемента',['Уточнить цель клиента и удобное время занятий.','Предложить абонемент по прайсу, назвать льготы (студенты, пенсионеры).','Оформить продажу в Mobifitness и заключить договор с клиентом.','Пробить чек, внести данные о договоре в карточку клиента.','[Дополнит управляющий]']),
    g('g4','Продление абонемента',['Список: у кого абонемент кончается в ближайшие 2 недели.','Написать по тексту П1: скидка 10% при продлении до окончания.','Сомневающимся — точечно 15% (согласовать с управляющим).','Если не продлил — записать причину в комментарий в CRM.']),
    g('g5','Возврат денег',['Принять письменное заявление клиента.','Посчитать остаток по правилам студии (оферта).','Передать заявление управляющему, сам возврат не проводить.','[Дополнит владелец]']),
    g('g6','Запись и отмена записи',['Mobifitness → Расписание → выбрать занятие → Записать клиента.','Отмена: не позднее чем за 12 часов, иначе занятие списывается.','Отменить занятие во всех системах (Fitmost, YClients, Mobifitness).','Проверить, что клиенту пришло напоминание.']),
    g('g7','Разделы Mobifitness',['Расписание — занятия, записи, отметки посещений.','Клиенты — карточки, абонементы, теги (НЕ БЕСПОКОИТЬ, ЧЕЛЛЕНДЖ, СОТРУДНИК).','Задачи — автозадачи: напоминания, «осталось 2 занятия», «14 дней без визита».','Финансы — кассовые операции, отчёт смены.','[Дополнит управляющий]']),
    g('g8','Клиенты FitMost',['Проверить бронь клиента в кабинете партнёра FitMost.','Отметить визит в FitMost и в Mobifitness (тег источника).','Предложить «Знакомство» после занятия.','[Дополнит управляющий]']),
    g('g9','Сообщения клиентов',['Отвечать в течение 30 минут во всех каналах (по договору — не дольше 40 минут).','Пропущенный звонок — перезвонить в течение 40 минут.','Связываться с клиентом только со студийного номера.','В конце смены — ноль неотвеченных.']),
    g('g10','Отзывы',['Просить 2–3 отзыва за смену у довольных клиентов.','Не дарить подарки за отзыв: карты удаляют такие отзывы.','Внести отзыв в раздел «Отзывы» панели.'])
  ];
}

const itemP = x => x.p!==undefined ? Number(x.p)||0 : (x.done ? 100 : 0);
const checklistProgress = items => items.length ? Math.round(items.reduce((a,x) => a + itemP(x), 0) / items.length) : 0;
/* Пункты задачи: строки или объекты → объекты с отметкой выполнения */
function normChecklist(list, tid){
  return (list||[]).map((x,i) => typeof x==='string' ? { id:`${tid||'n'}-${Date.now().toString(36)}-${i}`, text:x.trim(), done:false, p:0, by:'', at:'' } : { id:x.id || `${tid||'n'}-${i}-${Math.random().toString(36).slice(2,6)}`, text:String(x.text||'').trim(), done:!!x.done, p:itemP(x), by:x.by||'', at:x.at||'' })
    .filter(x => x.text).slice(0,40);
}
/* Прогресс общей задачи = доля выполненных связанных задач */
function computeLinkedProgress(tasks, pid){
  const kids = tasks.filter(c => c.parentId===pid && c.status!=='cancel');
  if (!kids.length) return null;
  return Math.round(kids.filter(c => c.status==='done').length * 100 / kids.length);
}

/* --- Ядро сервера: createServer(opts) ---
   Одна и та же логика работает в браузере (демо) и в Google Apps Script (рабочая версия).
   Отличается только то, что передаётся в opts:
     load() → db | null            откуда читать данные
     save(db) → true | false        куда сохранять
     seed() → db                    начальные данные
     setPass(user, plain) / checkPass(user, plain) → bool   хранение паролей
     issueToken(user, db) → token / userIdByToken(token, db) → id / dropToken(token, db)
     onReport(rec, db) → rec        фото чека → Google Диск, отчёт → Google Документ
     onGuide(item) → item           фото гайда → Google Диск
     fetchReviews(settings) → { items, stats } | null   отзывы с Яндекс Карт и 2ГИС
     onEvent(type, data, db)        события для Telegram и пушей
     extra(ctx) → { action(payload, user, token) }      дополнительные действия сервера
     publicActions: [...]           действия без входа
     reload: true                   перечитывать данные на каждый запрос (Apps Script)
     delay: мс                      имитация сети (демо) */
function createServer(opts){
  let db = null;
  function load(){ db = opts.load(); if (!db || db.v !== 6){ db = opts.seed(); save(); } }
  const save = () => opts.save(db);
  const setPass = (u, plain) => opts.setPass ? opts.setPass(u, String(plain)) : (u.pass = String(plain));
  const checkPass = (u, plain) => opts.checkPass ? opts.checkPass(u, String(plain||'')) : u.pass === plain;
  const event = (type, data) => { try { opts.onEvent && opts.onEvent(type, data, db); } catch(e){} };
  const err = (msg, code) => { const e = new Error(msg); e.code = code || 'FORBIDDEN'; throw e; };
  const me = token => { const id = opts.userIdByToken ? opts.userIdByToken(token, db) : token; const u = id && db.users.find(x => x.id===id && x.active && x.status==='active'); if(!u) err('Сессия истекла. Войдите снова.','AUTH'); return u; };
  const pubUser = (u, full) => ({ id:u.id, name:u.name, fullName:u.fullName, role:u.role, extraRoles:u.extraRoles||[], color:u.color, avatar:u.avatar||'', active:u.active, status:u.status,
    ...(full ? { login:u.login, phone:u.phone, email:u.email, createdAt:u.createdAt } : {}) });
  const normPhone = s => String(s||'').replace(/\D/g,'').replace(/^8/,'7');

  function generateRecurring(){
    const T = todayStr();
    for (let i = 0; i <= CONFIG.GEN_DAYS_AHEAD; i++){
      const day = addDays(T, i), dow = parseYmd(day).getDay();
      for (const tp of db.templates){
        if (!tp.active || !tp.days.includes(dow)) continue;
        const id = `r-${tp.id}-${day}`;
        if (!db.tasks.some(t => t.id===id)) db.tasks.push(instFromTemplate(tp, day, 'auto'));
      }
    }
  }
  function recompute(pid){
    if (!pid) return; const p = db.tasks.find(t => t.id===pid); if (!p) return;
    const v = computeLinkedProgress(db.tasks, pid);
    p.progress = v===null ? (p.status==='done' ? 100 : 0) : v;
  }
  function ensureFinance(m){
    if (db.finance[m]) return db.finance[m];
    const prev = Object.keys(db.finance).filter(k => k < m).sort().pop();
    const src = prev ? db.finance[prev] : null;
    db.finance[m] = { income:{}, fixed: src ? { ...src.fixed } : Object.fromEntries(FIXED_EXPENSES.map(f => [f.k, f.def])), taxRate: src ? src.taxRate : 1,
      trainers:{}, adminsManual:{}, purchases:[], utilities: src ? src.utilities.map(x => ({ ...x, id:uid('ut') })) : [], custom:[], ownerOps:[] };
    return db.finance[m];
  }

  function applyTaskUpdate(u, old, patch){
    const t = { ...old, ...patch };
    const wasDone = old.status==='done';
    const closer = db.users.find(x => x.id===old.doneBy)?.name || 'другой сотрудник';
    if ('status' in patch && patch.status !== old.status && wasDone && Rules.isLockedFor(u, old) && patch.status!=='work')
      err(`Задачу закрыл(а) ${closer}. Вы можете только вернуть её в работу.`);
    if (t.status==='done' && !wasDone){ t.doneBy = u.id; t.doneAt = nowIso(); t.late = new Date() > new Date(`${t.due}T${t.dueTime||'23:59'}:00`); }
    if (t.status!=='done' && wasDone){ t.doneBy=''; t.doneAt=''; t.late=false; }
    if ('checklist' in patch) t.checklist = normChecklist(patch.checklist, t.id);
    if (t.checklist?.length && t.status==='done' && !wasDone) t.checklist = t.checklist.map(x => x.done ? x : { ...x, done:true, p:100, by:u.id, at:nowIso() });
    const linked = computeLinkedProgress(db.tasks, t.id);
    t.progress = t.checklist?.length ? checklistProgress(t.checklist) : linked===null ? (t.status==='done' ? 100 : 0) : linked;
    const changes = [];
    if (t.status!==old.status) changes.push(`статус: ${STATUS[old.status]} → ${STATUS[t.status]}`);
    const L = { title:'название', assignee:'ответственный', helper:'помощник', due:'срок', dueTime:'срок', priority:'приоритет', desc:'описание', level:'раздел доступа', block:'блок', parentId:'связка', start:'старт' };
    Object.keys(L).forEach(k => { if (k in patch && patch[k]!==old[k]) changes.push(L[k]); });
    if (changes.length){ t.history = [...(old.history||[]), { at:nowIso(), by:u.id, text:[...new Set(changes)].join(', ') }].slice(-25); }
    return t;
  }
  function checkParent(task){
    if (!task.parentId) return;
    if (task.parentId===task.id) err('Задачу нельзя связать саму с собой.','VALIDATION');
    const p = db.tasks.find(x => x.id===task.parentId); if (!p) err('Общая задача не найдена.','NOT_FOUND');
    if (p.parentId) err('Связывать можно только с общей задачей верхнего уровня.','VALIDATION');
    if (db.tasks.some(x => x.parentId===task.id)) err('У этой задачи уже есть свои связанные — она сама общая.','VALIDATION');
  }
  /* Управляющий видит только ставки администраторов (без сумм фикса других руководителей и тренеров) */
  const ratesFor = u => isOwner(u) ? db.rates : { staff: Object.fromEntries(Object.entries(db.rates.staff||{}).filter(([id]) => { const x = db.users.find(y => y.id===id); return x && !isOwner(x) && !isManager(x); })), trainers:{} };
  const ownerOnly = u => { if (!Rules.canSeeFinance(u)) err('Раздел доступен только владельцам.'); };
  const payrollOnly = u => { if (!Rules.canSeePayroll(u)) err('Раздел доступен управляющему и владельцам.'); };
  const upsert = (arr, item) => { const i = arr.findIndex(x => x.id===item.id); if (i>=0) arr[i] = item; else arr.push(item); return item; };

  /* Отзывы с карт: в демо — примеры, в рабочей версии — opts.fetchReviews (Apps Script) */
  function syncReviewsCore(){
    const T = todayStr();
    const got = opts.fetchReviews ? opts.fetchReviews(db.settings) : { items:[
      { ext:'ya-demo-1', source:'yandex', client:'Клиент Яндекс Карт (пример импорта)', date:addDays(T,-3), rating:5, text:'Пример текста отзыва. В рабочей версии здесь будет настоящий отзыв с вашей карточки.' },
      { ext:'ya-demo-2', source:'yandex', client:'Клиент Яндекс Карт (пример импорта)', date:addDays(T,-9), rating:5, text:'Пример текста отзыва с Яндекс Карт: автор, дата, оценка и текст переносятся автоматически.' },
      { ext:'2g-demo-1', source:'2gis', client:'Клиент 2ГИС (пример импорта)', date:addDays(T,-6), rating:5, text:'Пример текста отзыва. В рабочей версии здесь будет настоящий отзыв с карточки в 2ГИС.' }
    ], stats:null };
    let added = 0;
    for (const r of (got && got.items) || []){
      if (!r || !r.ext || db.reviews.some(x => x.externalId===r.ext)) continue;
      db.reviews.push({ id:uid('v'), externalId:r.ext, source:r.source, client:r.client || 'Клиент', date:r.date || T, rating:Number(r.rating)||5, text:String(r.text||'').slice(0,3000),
        createdBy:'auto', confirmed:true, confirmedBy:'auto', origin:'map',
        url: r.url || (r.source==='yandex' ? `https://yandex.ru/maps/org/sukha_prana/${db.settings.yandexOrgId}/reviews/` : `https://2gis.ru/${db.settings.twogisCity||'moscow'}/firm/${db.settings.twogisFirmId}/tab/reviews`) });
      added++;
    }
    db.settings.lastSync = nowIso();
    db.settings.mapStats = { ...db.settings.mapStats, ...((got && got.stats) || {}), at:nowIso() };
    if (got && got.errors && got.errors.length) db.settings.syncErrors = got.errors; else delete db.settings.syncErrors;
    if (added) event('reviews', { added });
    return { added, reviews:db.reviews, settings:db.settings };
  }
  const handlers = {
    login({ login, pass }){
      const q = String(login||'').trim().toLowerCase(); const qp = normPhone(q);
      const u = db.users.find(x => (x.login && x.login.toLowerCase()===q) || (x.email && x.email.toLowerCase()===q) || (qp.length>=10 && normPhone(x.phone)===qp));
      if (!u || !checkPass(u, pass)) err('Неверный логин или пароль.','AUTH');
      if (u.status==='pending') err('Заявка ещё не подтверждена владельцем. Как только её одобрят, вход откроется.','AUTH');
      if (u.status==='rejected') err('Владелец отклонил заявку. Свяжитесь с владельцем студии.','AUTH');
      if (!u.active) err('Учётная запись отключена. Обратитесь к владельцу.','AUTH');
      const token = opts.issueToken ? opts.issueToken(u, db) : u.id; save();
      return { token, user:pubUser(u) };
    },
    logout(_, u, token){ if (opts.dropToken) { opts.dropToken(token, db); save(); } return { ok:true };
    },
    /* Регистрация: аккаунт создаётся неактивным, владельцам уходит уведомление
       (в рабочей версии — ещё и письмо на почту владельцев через Apps Script) */
    register({ fullName, role, phone, email, pass }){
      fullName = String(fullName||'').trim().replace(/\s+/g,' '); email = String(email||'').trim().toLowerCase();
      if (fullName.split(' ').length < 2) err('Укажите фамилию и имя полностью.','VALIDATION');
      if (!ROLES[role]) err('Выберите роль.','VALIDATION');
      if (normPhone(phone).length < 11) err('Укажите телефон полностью, например +7 900 123-45-67.','VALIDATION');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) err('Проверьте адрес почты.','VALIDATION');
      if (String(pass||'').length < 6) err('Пароль — минимум 6 символов.','VALIDATION');
      if (db.users.some(x => (x.email && x.email.toLowerCase()===email) || (x.login && x.login.toLowerCase()===email))) err('Пользователь с такой почтой уже есть.','VALIDATION');
      if (db.users.some(x => normPhone(x.phone) && normPhone(x.phone)===normPhone(phone))) err('Пользователь с таким телефоном уже есть.','VALIDATION');
      const palette = ['#899C84','#CCC1FF','#EBCB8B','#9FC3BE','#E8B4C4','#B9C7A6','#D6CBB5'];
      const nu = { id:uid('u'), name:shortName(fullName), fullName, login:email, email, phone:String(phone).trim(), role, color:palette[db.users.length % palette.length],
        active:false, status:'pending', createdAt:nowIso() };
      setPass(nu, pass); db.users.push(nu); db.notifications.push({ id:uid('n'), type:'signup', userId:nu.id, at:nowIso(), read:false }); save();
      event('signup', { user:nu });
      return { ok:true };
    },
    bootstrap(_, u){
      generateRecurring(); save();
      const levels = Rules.levelsFor(u); const owner = isOwner(u); const pay = Rules.canSeePayroll(u);
      return {
        user: pubUser(u, true),
        users: db.users.filter(x => owner || x.status==='active').map(x => pubUser(x, owner)),
        trainers: db.trainers,
        tasks: db.tasks.filter(t => Rules.canSeeTask(u,t)),
        templates: db.templates.filter(t => levels.includes(t.level)),
        payouts: db.payouts.map(p => Rules.seeAmounts(u) ? p : ({ ...p, amount:null, comment: '' })),
        reviews: db.reviews, guide: db.guide, settings: db.settings, schedule: db.schedule, reports: db.reports, notify: u.notify || defaultNotify(u.role),
        notifications: owner ? db.notifications : [],
        ...(pay ? { sales:db.sales, payroll:db.payroll, plans:db.plans, penalties:db.penalties } : {}),
        ...(owner ? { finance:(ensureFinance(todayStr().slice(0,7)), db.finance), debt:db.debt, finConfig:db.finConfig, pay:db.pay||{} } : {}),
        ...(pay ? { rates: ratesFor(u) } : {})
      };
    },
    saveTask({ task }, u){
      const old = task.id ? db.tasks.find(t => t.id===task.id) : null;
      if (!old){
        const selfSmm = task.level==='smm' && hasRole(u,'smm') && task.assignee===u.id && (!task.helper || task.helper===u.id);
        if (!Rules.levelsFor(u).includes(task.level) && !selfSmm) err(task.level==='smm' ? 'Задачи СММ ставят владелец и управляющий; СММ может поставить задачу только себе.' : 'Нет доступа к этому разделу задач.');
        const t = { id:uid('t'), block:'', desc:'', helper:'', comment:'', progress:0, status:'todo', priority:'mid', dueTime:CONFIG.DEFAULT_DUE_TIME, parentId:'',
          ...task, id:uid('t'), createdBy:u.id, createdAt:nowIso(), doneBy:'', doneAt:'', late:false, recurringId:'', comments:[], history:[{ at:nowIso(), by:u.id, text:'создана' }] };
        if (!t.title || !t.title.trim()) err('Укажите название задачи.','VALIDATION');
        if (!t.start) t.start = t.due;
        t.moves = []; t.checklist = (isOwner(u) || isManager(u)) ? normChecklist(t.checklist, t.id) : [];
        checkParent(t);
        if (t.status==='done'){ t.doneBy=u.id; t.doneAt=nowIso(); t.progress=100; }
        db.tasks.push(t); recompute(t.parentId); save(); return { task:t, parent: t.parentId ? db.tasks.find(x => x.id===t.parentId) : null };
      }
      if (!Rules.canSeeTask(u, old)) err('Нет доступа к этой задаче.');
      const full = Rules.canEditTask(u, old);
      const allowed = full ? null : ['status'];
      const patch = {};
      Object.keys(task).forEach(k => { if (['id','createdBy','createdAt','history','doneBy','doneAt','late','comments','progress','recurringId','moves'].includes(k)) return;
        if (k==='checklist' && !(isOwner(u) || isManager(u))) return; if (task[k]===old[k]) return;
        if (allowed && !allowed.includes(k)) return; patch[k]=task[k]; });
      if ('level' in patch && !Rules.levelsFor(u).includes(patch.level)) err('Нет доступа к этому разделу задач.');
      const t = applyTaskUpdate(u, old, patch);
      checkParent(t);
      db.tasks[db.tasks.indexOf(old)] = t;
      recompute(old.parentId); recompute(t.parentId); save();
      return { task:t, parent: t.parentId ? db.tasks.find(x => x.id===t.parentId) : null, oldParent: old.parentId && old.parentId!==t.parentId ? db.tasks.find(x => x.id===old.parentId) : null };
    },
    deleteTask({ id }, u){
      const t = db.tasks.find(x => x.id===id); if (!t) err('Задача не найдена.','NOT_FOUND');
      if (!Rules.canDeleteTask(u,t)) err('Удалять задачи могут только управляющий и владелец.');
      db.tasks.forEach(c => { if (c.parentId===id) c.parentId=''; });
      db.tasks = db.tasks.filter(x => x.id!==id); recompute(t.parentId); save(); return { ok:true };
    },
    addComment({ id, text }, u){
      const t = db.tasks.find(x => x.id===id); if (!t || !Rules.canSeeTask(u,t)) err('Задача не найдена.','NOT_FOUND');
      const txt = String(text||'').trim(); if (!txt) err('Напишите текст комментария.','VALIDATION');
      if (txt.length > 1000) err('Комментарий длиннее 1000 символов. Сократите.','VALIDATION');
      t.comments = [...(t.comments||[]), { id:uid('c'), at:nowIso(), by:u.id, text:txt }];
      save(); return t;
    },
    deleteComment({ id, cid }, u){
      const t = db.tasks.find(x => x.id===id); if (!t || !Rules.canSeeTask(u,t)) err('Задача не найдена.','NOT_FOUND');
      const c = (t.comments||[]).find(x => x.id===cid); if (!c) err('Комментарий не найден.','NOT_FOUND');
      if (!Rules.canDeleteComment(u,c)) err('Удалить можно только свой комментарий.');
      t.comments = t.comments.filter(x => x.id!==cid); save(); return t;
    },
    /* Синхронизация отзывов с карт. В рабочей версии это делает Apps Script по расписанию:
       2ГИС — открытый JSON отзывов филиала, Яндекс Карты — разбор страницы отзывов организации.
       Новые отзывы добавляются один раз (по ID отзыва на карте) и сразу считаются подтверждёнными. */
    syncReviews(_, u){
      if (!Rules.canSyncReviews(u)) err('Обновлять отзывы с карт может управляющий или владелец.');
      const r = syncReviewsCore(); save(); return r;
    },
    saveTemplate({ tpl }, u){
      if (!Rules.canEditTemplates(u) || !Rules.levelsFor(u).includes(tpl.level)) err('Нет прав на регулярные задачи этого раздела.');
      if (!tpl.title || !String(tpl.title).trim()) err('Укажите название.','VALIDATION');
      if (!tpl.days || !tpl.days.length) err('Выберите хотя бы один день недели.','VALIDATION');
      const i = db.templates.findIndex(x => x.id===tpl.id);
      if (i>=0 && !Rules.levelsFor(u).includes(db.templates[i].level)) err('Нет прав.');
      const t = { active:true, days:[0,1,2,3,4,5,6], priority:'mid', dueTime:CONFIG.DEFAULT_DUE_TIME, helper:'', ...tpl, checklist:(tpl.checklist||[]).map(x => String(x).trim()).filter(Boolean).slice(0,40), id: tpl.id || uid('r'), createdBy: i>=0 ? db.templates[i].createdBy : u.id };
      if (i>=0) db.templates[i]=t; else db.templates.push(t);
      // будущие ещё не начатые экземпляры обновляем под новые настройки
      const T = todayStr();
      db.tasks = db.tasks.filter(x => !(x.recurringId===t.id && x.due>=T && x.status==='todo' && !(x.comments||[]).length));
      generateRecurring(); save();
      return { tpl:t, tasks: db.tasks.filter(x => Rules.canSeeTask(u,x)) };
    },
    deleteTemplate({ id }, u){
      const tp = db.templates.find(x => x.id===id); if (!tp) err('Не найдено.','NOT_FOUND');
      if (!Rules.canEditTemplates(u) || !Rules.levelsFor(u).includes(tp.level)) err('Нет прав.');
      const T = todayStr();
      db.templates = db.templates.filter(x => x.id!==id);
      db.tasks = db.tasks.filter(x => !(x.recurringId===id && x.due>=T && x.status==='todo'));
      save(); return { tasks: db.tasks.filter(x => Rules.canSeeTask(u,x)) };
    },
    savePayout({ p }, u){
      if (!Rules.canCreatePayout(u)) err('Создавать выплаты может только владелец.');
      if (!p.recipient || !(Number(p.amount)>0)) err('Укажите получателя и сумму больше нуля.','VALIDATION');
      if (!p.periodFrom || !p.periodTo) err('Выберите период: с какого по какое число.','VALIDATION');
      if (p.periodFrom > p.periodTo) err('Начало периода позже конца.','VALIDATION');
      if (p.periodFrom.slice(0,7) !== p.periodTo.slice(0,7)) err('Период выплаты — в пределах одного месяца.','VALIDATION');
      p.period = periodLabel(p.periodFrom, p.periodTo);
      const rec = { id:uid('p'), comment:'', issuedBy:'', issuedAt:'', ...p, amount:Number(p.amount), createdBy:u.id, createdAt:nowIso() };
      db.payouts.push(rec); save(); return rec;
    },
    issuePayout({ id }, u){
      if (!Rules.canIssuePayout(u)) err('Нет прав.');
      const p = db.payouts.find(x => x.id===id); if (!p) err('Запись не найдена.','NOT_FOUND');
      if (p.issuedAt) err('Конверт уже отмечен как выданный.');
      p.issuedBy = u.id; p.issuedAt = nowIso(); save();
      return Rules.seeAmounts(u) ? p : { ...p, amount:null, comment:'' };
    },
    deletePayout({ id }, u){
      if (!isOwner(u)) err('Удалять выплаты может только владелец.');
      db.payouts = db.payouts.filter(x => x.id!==id); save(); return { ok:true };
    },
    saveReview({ r }, u){
      if (!r.client || !r.text) err('Заполните имя клиента и текст отзыва.','VALIDATION');
      const rec = { id:uid('v'), confirmed:false, confirmedBy:'', origin:'manual', ...r, rating:Number(r.rating)||5, createdBy:u.id };
      db.reviews.push(rec); save(); return rec;
    },
    confirmReview({ id, value }, u){
      if (!Rules.canConfirmReview(u)) err('Подтверждать отзывы может управляющий или владелец.');
      const r = db.reviews.find(x => x.id===id); if (!r) err('Отзыв не найден.','NOT_FOUND');
      r.confirmed = !!value; r.confirmedBy = value ? u.id : ''; save(); return r;
    },
    saveGuide({ item }, u){
      if (!Rules.canEditGuide(u)) err('Редактировать гайд могут управляющий и владелец.');
      const i = db.guide.findIndex(x => x.id===item.id);
      let g = { ...item, id: item.id || uid('g'), draft:false, updatedBy:u.id, updatedAt:nowIso() };
      if (!g.title || !g.title.trim()) err('Укажите название инструкции.','VALIDATION');
      if (opts.onGuide) g = opts.onGuide(g) || g;
      const prev = JSON.stringify(db.guide);
      if (i>=0) db.guide[i]=g; else db.guide.push(g);
      if (!save()){ db.guide = JSON.parse(prev); err('Фото не поместились в хранилище браузера (это ограничение прототипа). В рабочей версии фото хранятся на Google Диске.','QUOTA'); }
      return g;
    },
    deleteGuide({ id }, u){
      if (!Rules.canEditGuide(u)) err('Нет прав.');
      db.guide = db.guide.filter(x => x.id!==id); save(); return { ok:true };
    },
    saveUser({ user }, u){
      if (!Rules.canManageTeam(u)) err('Управлять командой может только владелец.');
      const i = db.users.findIndex(x => x.id===user.id);
      const owners = db.users.filter(x => x.role==='owner' && x.active && x.status==='active');
      if (i<0) err('Пользователь не найден.','NOT_FOUND');
      const old = db.users[i];
      if (old.role==='owner' && ((user.role && user.role!=='owner') || user.active===false) && owners.length<=1) err('Нельзя убрать последнего владельца.');
      if (user.role && !ROLES[user.role]) err('Неизвестная роль.','VALIDATION');
      if (user.extraRoles) user.extraRoles = user.extraRoles.filter(r => ROLES[r]);
      const { pass:newPass, ...rest } = user;
      if (newPass && String(newPass).length < 4) err('Пароль — минимум 4 символа.','VALIDATION');
      const next = { ...old, ...rest }; if (newPass) setPass(next, newPass);
      if (user.fullName) next.name = shortName(user.fullName);
      db.users[i] = next; save(); return pubUser(next, true);
    },
    approveUser({ id, role }, u){
      if (!Rules.canManageTeam(u)) err('Подтверждать заявки может только владелец.');
      const x = db.users.find(y => y.id===id); if (!x) err('Заявка не найдена.','NOT_FOUND');
      x.status='active'; x.active=true; if (role && ROLES[role]) x.role = role; x.approvedBy=u.id; x.approvedAt=nowIso();
      db.notifications.forEach(n => { if (n.userId===id) n.read = true; }); save();
      return { user:pubUser(x, true), notifications:db.notifications };
    },
    rejectUser({ id }, u){
      if (!Rules.canManageTeam(u)) err('Только владелец.');
      const x = db.users.find(y => y.id===id); if (!x) err('Заявка не найдена.','NOT_FOUND');
      x.status='rejected'; x.active=false; db.notifications.forEach(n => { if (n.userId===id) n.read = true; }); save();
      return { user:pubUser(x, true), notifications:db.notifications };
    },
    saveTrainer({ t }, u){
      if (!Rules.canManageTeam(u)) err('Только владелец.');
      if (!t.fullName || !t.fullName.trim()) err('Укажите ФИО тренера.','VALIDATION');
      const rec = upsert(db.trainers, { active:true, phone:'', note:'', ...t, id: t.id || uid('tr'), name:t.fullName.trim(), fullName:t.fullName.trim() });
      save(); return rec;
    },
    /* График: заменить все смены на дату (редактируют управляющий и владельцы) */
    saveShifts({ date, shifts }, u){
      if (!Rules.canEditSchedule(u)) err('Менять график могут управляющий и владельцы.');
      const tm = /^\d{2}:\d{2}$/;
      const list = (shifts||[]).map(x => {
        const a = db.users.find(y => y.id===x.adminId); if (!a || !a.active || a.status!=='active' || !rolesOf(a).length) err('Выберите сотрудника на смену.','VALIDATION');
        if (!tm.test(x.start) || !tm.test(x.end) || x.start >= x.end) err('Проверьте время смены: начало раньше конца.','VALIDATION');
        return { id: x.id || uid('sh'), date, adminId:x.adminId, start:x.start, end:x.end, half:!!x.half, type: SHIFT_KEYS.includes(x.type) ? x.type : 'auto', note:String(x.note||'').slice(0,120) };
      });
      // одновременно может работать только один администратор
      const sorted = list.slice().sort((a,b) => a.start.localeCompare(b.start));
      for (let i = 1; i < sorted.length; i++) if (sorted[i].start < sorted[i-1].end)
        err(`Одновременно на смене может быть только один человек: смены ${sorted[i-1].start}–${sorted[i-1].end} и ${sorted[i].start}–${sorted[i].end} пересекаются.`,'VALIDATION');
      db.schedule = db.schedule.filter(x => x.date!==date).concat(list); save(); return db.schedule;
    },
    saveRates({ rates }, u){
      if (!Rules.canEditSchedule(u)) err('Ставки меняют управляющий и владельцы.');
      const r = { ...DEFAULT_RATES, ...db.settings.shiftRates };
      ['std','morning','evening','full'].forEach(k => { if (rates[k]!==undefined) r[k] = Math.max(0, Number(rates[k])||0); });
      if (rates.halfFactor!==undefined) r.halfFactor = Math.min(1, Math.max(0, Number(rates.halfFactor)||0));
      db.settings.shiftRates = r; save(); return db.settings;
    },
    /* Отчёт смены: видят все, сдаёт и правит только тот, кто стоит в графике на эту дату.
       В рабочей версии Apps Script дописывает отчёт в Google Документ и кладёт фото чека в папку на Google Диске. */
    saveReport({ r }, u){
      const onShift = db.schedule.some(x => x.date===r.date && x.adminId===u.id);
      if (!onShift && !isOwner(u)) err('Отчёт за этот день может сдать только администратор, который работает в эту смену по графику.');
      if (!r.photo) err('Прикрепите фото чека — без него отчёт не сохранится.','VALIDATION');
      const fields = db.settings.reportFields || DEFAULT_REPORT_FIELDS; const values = {};
      fields.forEach(f => { const v = (r.values||{})[f.k]; values[f.k] = f.type==='text' ? String(v||'').slice(0,300) : Math.max(0, Math.round(Number(v)||0)); });
      const dayTasks = db.tasks.filter(t => t.due===r.date && t.level==='team' && t.status!=='cancel');
      const old = db.reports.find(x => x.date===r.date);
      const shiftAdmin = db.schedule.find(x => x.date===r.date)?.adminId || u.id;
      let rec = { id: old?.id || uid('rep'), date:r.date, adminId: old?.adminId || (onShift ? u.id : shiftAdmin), values, comment:String(r.comment||'').slice(0,500),
        photo:r.photo, photoName:`Чек_${r.date}.jpg`, tasksDone: dayTasks.filter(t => t.status==='done').length, tasksTotal: dayTasks.length,
        createdBy: old?.createdBy || u.id, updatedBy:u.id, updatedAt:nowIso(), editedByOwner: !onShift && isOwner(u) ? u.id : (old?.editedByOwner||'') };
      rec.total = fields.filter(f => f.inTotal).reduce((a,f) => a + (Number(values[f.k])||0), 0);
      // регулярное дело «Отчёт смены в чат» на эту дату закрываем автоматически
      const rt = db.tasks.find(t => t.recurringId==='r8' && t.due===r.date);
      if (rt && rt.status!=='done'){ Object.assign(rt, { status:'done', progress:100, doneBy:u.id, doneAt:nowIso(), late: new Date() > new Date(`${rt.due}T${rt.dueTime}:00`) }); }
      if (opts.onReport) rec = opts.onReport(rec, db) || rec;
      if (old) db.reports[db.reports.indexOf(old)] = rec; else db.reports.push(rec);
      if (!save()){ err('Фото не поместилось в хранилище браузера (ограничение прототипа). Сделайте снимок меньше.','QUOTA'); }
      return { report:rec, task: rt || null };
    },
    saveReportFields({ fields }, u){
      if (!isOwner(u)) err('Поля отчёта меняет владелец.');
      const seen = new Set();
      const list = (fields||[]).map(f => ({ k: f.k || uid('rf'), label:String(f.label||'').trim().slice(0,80), emoji:String(f.emoji||'').slice(0,4), type: REPORT_TYPES[f.type] ? f.type : 'count',
        inTotal: f.type==='money' && !!f.inTotal, ...(f.attachTo ? { attachTo:f.attachTo } : {}) })).filter(f => f.label && !seen.has(f.k) && seen.add(f.k));
      if (!list.length) err('Оставьте хотя бы одно поле.','VALIDATION');
      db.settings.reportFields = list; save(); return db.settings;
    },
    /* Перенос задачи: доступен всем, кто видит задачу; перенос всегда фиксируется */
    moveTask({ id, due, dueTime, reason }, u){
      const t = db.tasks.find(x => x.id===id); if (!t || !Rules.canSeeTask(u,t)) err('Задача не найдена.','NOT_FOUND');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(due||'')) err('Выберите новую дату.','VALIDATION');
      const time = /^\d{2}:\d{2}$/.test(dueTime||'') ? dueTime : t.dueTime;
      if (due===t.due && time===t.dueTime) err('Дата и время не изменились.','VALIDATION');
      const mv = { at:nowIso(), by:u.id, from:t.due, fromTime:t.dueTime, to:due, toTime:time, reason:String(reason||'').trim().slice(0,200) };
      t.moves = [...(t.moves||[]), mv]; t.due = due; t.dueTime = time; if (t.start > due) t.start = due;
      t.history = [...(t.history||[]), { at:mv.at, by:u.id, text:`перенос: ${mv.from} ${mv.fromTime} → ${due} ${time}${mv.reason?` (${mv.reason})`:''}` }].slice(-25);
      save(); return t;
    },
    /* Пункты задачи (подзадачи): отметить пункт или выставить прогресс ползунком */
    setChecklist({ id, itemId, p }, u){
      const t = db.tasks.find(x => x.id===id); if (!t || !Rules.canSeeTask(u,t)) err('Задача не найдена.','NOT_FOUND');
      if (!(t.checklist||[]).length) err('У задачи нет пунктов.','VALIDATION');
      const items = t.checklist.map(x => ({ ...x }));
      // каждый пункт выполняется независимо: свой ползунок 0–100% или галочка
      const it = items.find(x => x.id===itemId); if (!it) err('Пункт не найден.','NOT_FOUND');
      const prevP = itemP(it); const np = Math.max(0, Math.min(100, Math.round((Number(p)||0)/5)*5));
      if (np < prevP && t.status==='done' && Rules.isLockedFor(u,t)){ err(`Задачу закрыл(а) ${db.users.find(x => x.id===t.doneBy)?.name||'другой сотрудник'}. Снять отметки может только он(а), автор или владелец.`); }
      it.p = np; it.done = np>=100; it.by = np>0 ? u.id : ''; it.at = np>0 ? nowIso() : '';
      const after = items.filter(x => x.done).length;
      t.checklist = items; t.progress = checklistProgress(items);
      const old = { ...t, status:t.status };
      if (after===items.length && t.status!=='done'){ t.status='done'; t.doneBy=u.id; t.doneAt=nowIso(); t.late = new Date() > new Date(`${t.due}T${t.dueTime||'23:59'}:00`); }
      else if (after<items.length && t.status==='done'){ t.status='work'; t.doneBy=''; t.doneAt=''; t.late=false; }
      else if (after>0 && t.status==='todo') t.status='work';
      if (old.status!==t.status) t.history = [...(t.history||[]), { at:nowIso(), by:u.id, text:`статус: ${STATUS[old.status]} → ${STATUS[t.status]}` }].slice(-25);
      save(); return { task:t, parent: t.parentId ? db.tasks.find(x => x.id===t.parentId) : null };
    },
    saveRate({ kind, id, rate }, u){
      if (!isOwner(u)){
        const tgt = db.users.find(x => x.id===id);
        if (!(isManager(u) && kind==='staff' && tgt && !isOwner(tgt) && tgt.id!==u.id && ['contract','shift'].includes(rate.mode))) err('Ставки заносит владелец. Управляющий может только переключить администратора между «по договору» и «только фикс за смену».');
        const cur = db.rates.staff[id] || {}; db.rates.staff[id] = { ...cur, mode:rate.mode, amount:cur.amount||0 }; save(); return ratesFor(u);
      }
      const modes = { trainers:RATE_MODES_TRAINER, manager:RATE_MODES_MANAGER, smm:RATE_MODES_SMM }[kind] || RATE_MODES_ADMIN;
      const r = { mode: modes[rate.mode] ? rate.mode : Object.keys(modes)[0], amount: Math.max(0, Number(rate.amount)||0), ...(kind==='manager' ? { pct: Math.max(0, Math.min(100, Number(rate.pct)||0)) } : {}) };
      db.rates[kind] = db.rates[kind] || {}; db.rates[kind][id] = r; save(); return db.rates;
    },
    /* Начисление тренеру / управляющему / СММ за месяц: единая запись для «Финансов» и «Продажи и зарплата» */
    savePay({ month, key, data }, u){
      ownerOnly(u);
      if (!/^(tr|mgr|smm):/.test(key||'')) err('Неизвестная запись начисления.','VALIDATION');
      db.pay = db.pay || {}; db.pay[month] = db.pay[month] || {};
      const cur = db.pay[month][key] || {}; const n = v => v===''||v===null||v===undefined ? '' : Math.max(0, Number(v)||0);
      const next = { ...cur }; ['units','bonus','manual'].forEach(k => { if (k in data) next[k] = n(data[k]); });
      db.pay[month][key] = next; save(); return db.pay;
    },
    saveFinConfig({ config }, u){
      ownerOnly(u);
      const clean = (arr, withGroup) => (arr||[]).map(x => ({ k: x.k || uid('fl'), name:String(x.name||'').trim().slice(0,80), ...(withGroup ? { group:String(x.group||'Прочее').trim().slice(0,60) || 'Прочее' } : { def:Number(x.def)||0 }),
        ...(x.manualOnly ? { manualOnly:true } : {}) })).filter(x => x.name);
      db.finConfig = { income: clean(config.income, true), expenses: clean(config.expenses, false) }; save(); return db.finConfig;
    },
    saveAvatar({ id, avatar }, u){
      const target = id && id!==u.id ? (isOwner(u) ? db.users.find(x => x.id===id) : null) : db.users.find(x => x.id===u.id);
      if (!target) err('Менять аватар другим может только владелец.');
      if (avatar && !AVATARS.includes(avatar)) err('Неизвестный аватар.','VALIDATION');
      target.avatar = avatar || ''; save(); return pubUser(target, isOwner(u));
    },
    /* Владелец добавляет сотрудника вручную — доступ открыт сразу */
    addUser({ user }, u){
      if (!Rules.canManageTeam(u)) err('Добавлять сотрудников может только владелец.');
      const fullName = String(user.fullName||'').trim().replace(/\s+/g,' '); const email = String(user.email||'').trim().toLowerCase(); const login = String(user.login||email||'').trim().toLowerCase();
      if (fullName.split(' ').length < 2) err('Укажите фамилию и имя.','VALIDATION');
      if (!ROLES[user.role]) err('Выберите роль.','VALIDATION');
      if (!login) err('Укажите почту или логин для входа.','VALIDATION');
      if (String(user.pass||'').length < 6) err('Временный пароль — минимум 6 символов.','VALIDATION');
      if (db.users.some(x => (x.login && x.login.toLowerCase()===login) || (email && x.email && x.email.toLowerCase()===email))) err('Такой логин или почта уже есть.','VALIDATION');
      if (user.phone && db.users.some(x => normPhone(x.phone) && normPhone(x.phone)===normPhone(user.phone))) err('Такой телефон уже есть.','VALIDATION');
      const palette = ['#899C84','#CCC1FF','#EBCB8B','#9FC3BE','#E8B4C4','#B9C7A6','#D6CBB5'];
      const nu = { id:uid('u'), name:shortName(fullName), fullName, login, email, phone:String(user.phone||'').trim(), role:user.role, extraRoles:(user.extraRoles||[]).filter(r => ROLES[r] && r!==user.role),
        color:palette[db.users.length % palette.length], avatar: AVATARS.includes(user.avatar) ? user.avatar : '', active:true, status:'active', createdAt:nowIso(), approvedBy:u.id, notify:defaultNotify(user.role) };
      setPass(nu, user.pass); db.users.push(nu); save(); return pubUser(nu, true);
    },
    saveNotify({ notify }, u){
      const x = db.users.find(y => y.id===u.id); const { tgChatId, ...clean } = notify || {}; const prev = x.notify || {};
      x.notify = { ...defaultNotify(x.role), ...prev, ...clean };
      if ('tgChat' in clean && String(clean.tgChat||'').replace('@','').toLowerCase() !== String(prev.tgChat||'').replace('@','').toLowerCase()) delete x.notify.tgChatId;
      save(); return x.notify;
    },
    saveSettings({ settings }, u){
      if (!Rules.canManageTeam(u)) err('Только владелец.');
      db.settings = { ...db.settings, ...settings }; save(); return db.settings;
    },
    /* --- Продажи и зарплата админов --- */
    saveSale({ s }, u){
      payrollOnly(u);
      if (!s.date || !PRODUCT[s.product]) err('Укажите дату и что продано.','VALIDATION');
      if (!(Number(s.price) > 0)) err('Укажите сумму продажи больше нуля.','VALIDATION');
      const rec = upsert(db.sales, { client:'', discount:0, clientType:'current', crmTouch:false, sellerId:'', note:'', ...s, price:Number(s.price), discount:Number(s.discount)||0,
        id: s.id || uid('s'), createdBy: s.createdBy || u.id, createdAt: s.createdAt || nowIso() });
      save(); return rec;
    },
    deleteSale({ id }, u){ payrollOnly(u); db.sales = db.sales.filter(x => x.id!==id); save(); return { ok:true }; },
    savePayroll({ month, adminId, data }, u){
      payrollOnly(u);
      if ('manual' in data && !isOwner(u)) err('Сумму вручную задаёт владелец.');
      db.payroll[month] = db.payroll[month] || {};
      const cur = db.payroll[month][adminId] || { shifts:{}, kpi:{}, bonus:0, note:'' };
      db.payroll[month][adminId] = { ...cur, ...data, shifts:{ ...cur.shifts, ...(data.shifts||{}) }, kpi:{ ...cur.kpi, ...(data.kpi||{}) } };
      save(); return db.payroll[month][adminId];
    },
    savePlan({ month, amount }, u){ payrollOnly(u); db.plans[month] = Number(amount)||0; save(); return db.plans; },
    savePenalty({ p }, u){
      payrollOnly(u);
      if (!PEN[p.code] || !p.adminId || !p.date) err('Выберите администратора, дату и нарушение.','VALIDATION');
      const rec = upsert(db.penalties, { extra:0, note:'', ...p, id: p.id || uid('pn'), createdBy: p.createdBy || u.id });
      save(); return rec;
    },
    deletePenalty({ id }, u){ payrollOnly(u); db.penalties = db.penalties.filter(x => x.id!==id); save(); return { ok:true }; },
    /* --- Финансы (только владельцы) --- */
    getFinance({ month }, u){ ownerOnly(u); ensureFinance(month); save(); return db.finance; },
    saveFinance({ month, data }, u){
      ownerOnly(u); const f = ensureFinance(month);
      db.finance[month] = { ...f, ...data, income:{ ...f.income, ...(data.income||{}) }, fixed:{ ...f.fixed, ...(data.fixed||{}) },
        trainers:{ ...f.trainers, ...(data.trainers||{}) }, adminsManual:{ ...f.adminsManual, ...(data.adminsManual||{}) }, trainerClasses:{ ...(f.trainerClasses||{}), ...(data.trainerClasses||{}) } };
      save(); return db.finance;
    },
    saveDebt({ d }, u){
      ownerOnly(u); if (!(Number(d.amount)>0) || !d.date) err('Укажите дату и сумму.','VALIDATION');
      upsert(db.debt, { note:'', ...d, amount:Number(d.amount), id: d.id || uid('d') }); save(); return db.debt;
    },
    deleteDebt({ id }, u){ ownerOnly(u); db.debt = db.debt.filter(x => x.id!==id); save(); return db.debt; }
  };

  if (opts.extra) Object.assign(handlers, opts.extra({ get db(){ return db; }, save, err, pubUser, upsert, setPass, checkPass, syncReviewsCore, generateRecurring }));
  const PUBLIC = ['login','register', ...(opts.publicActions||[])];
  function callSync(action, payload, token){
    if (!db || opts.reload) load();
    const h = Object.prototype.hasOwnProperty.call(handlers, action) ? handlers[action] : null;
    if (!h) err('Неизвестное действие: '+action,'BAD_REQUEST');
    const u = PUBLIC.includes(action) ? null : me(token);
    return JSON.parse(JSON.stringify(h(payload||{}, u, token) ?? null));
  }
  return {
    reset(){ db = opts.seed(); save(); },
    callSync,
    async call(action, payload, token){
      if (opts.delay) await new Promise(r => setTimeout(r, opts.delay)); // имитация сети
      return callSync(action, payload, token);
    },
    /* для фоновых задач Apps Script (триггеры): прочитать данные, выполнить fn(db), сохранить */
    withDb(fn){ load(); const r = fn(db, { save, syncReviewsCore, generateRecurring, pubUser }); save(); return r; }
  };
}
/*@CORE-END*/

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 4б · СВЯЗЬ С СЕРВЕРОМ
   Что делает:   демо-сервер в браузере и Api.call — единая точка обращения к Google Apps Script.
   Можно менять: ничего; режим и адрес задаются в config.js.
   Не трогать:   Api.call.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 4б. БРАУЗЕР: хранилище, демо-сервер ---------- */
const root = document.getElementById('sp-root');
const app = document.getElementById('sp-app');
const safeLS = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
/* Где хранить вход: в рабочей версии — до выхода (приложение на телефоне не просит пароль каждый раз),
   в демо — до закрытия вкладки */
const safeSS = {
  get(k){ try { return sessionStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { sessionStorage.setItem(k,v); } catch(e){} },
  del(k){ try { sessionStorage.removeItem(k); } catch(e){} }
};


/* Демо-сервер: данные лежат в браузере (localStorage). В рабочей версии его место занимает Apps Script */
const DEMO_KEY = 'sukha_panel_demo_v6';
const DemoServer = createServer({
  load(){ try { return JSON.parse(safeLS.get(DEMO_KEY) || 'null'); } catch(e){ return null; } },
  /* false — только если в хранилище браузера кончилось место (фото в гайде) */
  save(db){ try { localStorage.setItem(DEMO_KEY, JSON.stringify(db)); return true; } catch(e){ return !(e && (e.name==='QuotaExceededError' || e.code===22)); } },
  seed: () => buildSeed(),
  delay: 60
});

const tokenStore = CONFIG.MODE==='gas' ? safeLS : safeSS;

/* --- Api: единая точка входа. Для Google Apps Script меняется только CONFIG --- */
const Api = {
  token: tokenStore.get('sp_token') || '',
  async call(action, payload){
    try {
      if (CONFIG.MODE === 'demo') return await DemoServer.call(action, payload, this.token);
      if (!CONFIG.API_URL) throw Object.assign(new Error('Не указан адрес сервера (CONFIG.API_URL).'), { code:'CONFIG' });
      const ctrl = new AbortController(); const tm = setTimeout(() => ctrl.abort(), 20000);
      // text/plain — чтобы браузер не делал предварительный CORS-запрос, Apps Script его не поддерживает
      const res = await fetch(CONFIG.API_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, token:this.token }), signal:ctrl.signal });
      clearTimeout(tm);
      if (res.status===429) throw Object.assign(new Error('Слишком много запросов. Подождите минуту и повторите.'), { code:'LIMIT' });
      if (!res.ok) throw Object.assign(new Error(`Сервер ответил ошибкой ${res.status}. Повторите через минуту.`), { code:'HTTP' });
      const data = await res.json();
      if (!data.ok) throw Object.assign(new Error(data.error || 'Ошибка сервера.'), { code:data.code || 'SERVER' });
      return data.result;
    } catch(e){
      if (e.name==='AbortError') e.message = 'Сервер не ответил за 20 секунд. Проверьте интернет и повторите.';
      else if (e instanceof TypeError) e.message = 'Нет связи с сервером. Проверьте интернет и повторите.';
      if (e.code==='AUTH' && action!=='login' && action!=='register'){ Auth.logout(true); }
      throw e;
    }
  }
};

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 5 · ВХОД И СОСТОЯНИЕ
   Что делает:   вход/выход и общее состояние экрана S (выбранная вкладка, дата, фильтры).
   Можно менять: вкладку по умолчанию (view:'day').
   Не трогать:   остальное.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 5. АВТОРИЗАЦИЯ ---------- */
const S = { user:null, data:null, view:'day', date:todayStr(), person:'all', level:'all', block:'all', overdueOnly:false, calMonth:todayStr().slice(0,7),
  payMonth:todayStr().slice(0,7), salMonth:todayStr().slice(0,7), finMonth:todayStr().slice(0,7), salAdmin:'', revFilter:'all', guideDraft:null, guideQuery:'',
  expanded:{ ongoing:false }, modal:null, busy:false, lastBadges:new Map(), loginPick:'', authMode:'login' };

const Auth = {
  async login(login, pass){
    const r = await Api.call('login', { login, pass });
    Api.token = r.token; tokenStore.set('sp_token', r.token);
    await loadAll();
  },
  logout(expired){
    if (!expired && Api.token && CONFIG.MODE==='gas') Api.call('logout').catch(() => {});
    Api.token=''; tokenStore.del('sp_token'); S.user=null; S.bootError=''; S.data=null; S.modal=null;
    render(); if (expired) toast('Сессия истекла. Войдите снова.', true);
  }
};

async function loadAll(){
  const d = await Api.call('bootstrap');
  S.data = d; S.user = d.user;
  render(); setTimeout(pushNew, 1200);
}

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 6 · ЗАДАЧИ: ВЫБОРКИ
   Что делает:   какие задачи показать на день, что считается просрочкой, порядок «сначала мои».
   Можно менять: порядок сортировки.
   Не трогать:   расчёт просрочки — от него зависят статистика и уведомления.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 6. ЗАДАЧИ ---------- */
const userById = id => S.data?.users.find(u => u.id===id);
const trainerById = id => S.data?.trainers?.find(t => t.id===id);
const nameOf = id => id==='auto' ? 'Автоматически' : (userById(id)?.name || trainerById(id)?.name || '—');
const dueDate = t => new Date(`${t.due}T${t.dueTime||'23:59'}:00`);
const isOpen = t => t.status!=='done' && t.status!=='cancel';
const isOverdue = t => isOpen(t) && new Date() > dueDate(t);
const dispStatus = t => isOverdue(t) ? 'over' : t.status;
const overdueHours = t => Math.max(0, (Date.now() - dueDate(t).getTime()) / 36e5);
const childrenOf = id => S.data.tasks.filter(c => c.parentId===id);
const hasLinks = t => !!t.id && S.data.tasks.some(c => c.parentId===t.id);
/* Свои задачи — первыми: ответственный → помощник → «Админ смены» (для админов) → остальные */
const mineRank = t => t.assignee===S.user.id ? 0 : t.helper===S.user.id ? 1 : (!t.assignee && isAdminRole(S.user) && t.level==='team') ? 2 : 3;

function visibleTasks(){
  let list = S.data.tasks;
  if (S.level!=='all') list = list.filter(t => t.level===S.level);
  if (S.block!=='all') list = list.filter(t => (t.block||'—')===S.block);
  if (S.person==='me') list = list.filter(t => t.assignee===S.user.id || t.helper===S.user.id || (!t.assignee && isAdminRole(S.user) && t.level==='team'));
  else if (S.person!=='all') list = list.filter(t => t.assignee===S.person || t.helper===S.person);
  return list;
}
/* Задачи для статистики: только по людям, чью статистику роль может видеть (без ответственного — задачи «Админ смены») */
function statsTasks(){
  const roles = Rules.statsRoles(S.user);
  const pure = isPureAdmin(S.user);
  return visibleTasks().filter(t => { if (pure && t.level!=='team') return false; if (!t.assignee) return t.level==='team'; const a = userById(t.assignee); return a && rolesOf(a).some(r => roles.includes(r)); });
}
function statsPeople(){
  const roles = Rules.statsRoles(S.user);
  return S.data.users.filter(u => u.active && u.status==='active' && (isPureAdmin(S.user) ? isAdminRole(u) : rolesOf(u).some(r => roles.includes(r))));
}
function dayBuckets(date){
  const list = visibleTasks(), T = todayStr();
  const sortT = (a,b) => mineRank(a)-mineRank(b) || (a.dueTime||'').localeCompare(b.dueTime||'') || PRIO_W[b.priority]-PRIO_W[a.priority];
  const recurring = list.filter(t => t.recurringId && t.due===date).sort(sortT);
  const dueToday = list.filter(t => !t.recurringId && t.due===date).sort(sortT);
  // Перенос: всё незакрытое с прошлых дней показываем на сегодняшнем чек-листе
  const carried = date===T ? list.filter(t => isOpen(t) && t.due < T).sort((a,b) => mineRank(a)-mineRank(b) || dueDate(a)-dueDate(b)) : [];
  const ongoing = list.filter(t => !t.recurringId && isOpen(t) && t.start<=date && t.due>date).sort((a,b) => mineRank(a)-mineRank(b) || a.due.localeCompare(b.due) || PRIO_W[b.priority]-PRIO_W[a.priority]);
  return { recurring, dueToday, carried, ongoing };
}
function dayMetrics(date){
  const list = statsTasks().filter(t => t.due===date && t.status!=='cancel');
  const done = list.filter(t => t.status==='done').length;
  return { total:list.length, done, over:list.filter(isOverdue).length, pct: list.length ? Math.round(done*100/list.length) : null };
}
const allOverdue = () => visibleTasks().filter(isOverdue).sort((a,b) => mineRank(a)-mineRank(b) || overdueHours(b)-overdueHours(a) || PRIO_W[b.priority]-PRIO_W[a.priority]);
/* Топ-5 невыполненных: сначала самые давно просроченные, при равенстве — более приоритетные; если просроченных мало — ближайшие по сроку */
function top5(){
  const open = statsTasks().filter(isOpen);
  const over = open.filter(isOverdue).sort((a,b) => overdueHours(b)-overdueHours(a) || PRIO_W[b.priority]-PRIO_W[a.priority]);
  const rest = open.filter(t => !isOverdue(t)).sort((a,b) => dueDate(a)-dueDate(b) || PRIO_W[b.priority]-PRIO_W[a.priority]);
  return [...over, ...rest].slice(0,5);
}
function fmtOverdue(t){
  const h = overdueHours(t);
  if (h < 1) return 'просрочено < 1 ч';
  if (h < 24) return `просрочено на ${Math.floor(h)} ч`;
  const d = Math.floor(h/24); return `просрочено на ${d} ${d%10===1&&d%100!==11?'день':(d%10>=2&&d%10<=4&&(d%100<10||d%100>=20)?'дня':'дней')}`;
}

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 7 · ЭКРАНЫ
   Что делает:   вся вёрстка панели. Каждый экран — отдельная функция view…(), подписан ниже: чек-лист, график, отчёт, календарь, статистика, выплаты, отзывы, гайд, команда, зарплата, финансы.
   Можно менять: тексты, подсказки, порядок полей внутри HTML-шаблонов.
   Не трогать:   атрибуты data-act / data-id / id="…" — по ним работают кнопки (БЛОК 9).
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 7. ЭКРАНЫ ---------- */
const ICON_LOTUS = `<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M16 6c3 4 3 10 0 15-3-5-3-11 0-15Z" fill="var(--accent)" opacity=".85"/><path d="M16 21c-4-1-8-4-9-9 4 0 8 3 9 9Z" fill="var(--accent)" opacity=".55"/><path d="M16 21c4-1 8-4 9-9-4 0-8 3-9 9Z" fill="var(--accent)" opacity=".55"/><path d="M6 24c3 1.5 6.5 2 10 2s7-.5 10-2" stroke="var(--accent)" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const ICON_BELL = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`;
/* Аватар: выбранное животное или первая буква имени */
const ava = (id, sm) => { const u = userById(id) || trainerById(id); if (!u) return `<span class="ava${sm?' sm':''}" style="background:var(--st-todo-soft)">?</span>`;
  return `<span class="ava${sm?' sm':''}${u.avatar?' emo':''}" style="background:${esc(u.color||'#E2DDF2')}" title="${esc(u.fullName||u.name)}">${u.avatar ? esc(u.avatar) : esc((u.name||'?').slice(0,1))}</span>`; };
const avatarPicker = (cur, act, id) => `<div class="ava-pick" role="group" aria-label="Выбор аватара">${['', ...AVATARS].map(a => `<button type="button" class="ap${(cur||'')===a?' on':''}" data-act="${act}" data-a="${a}" ${id?`data-id="${id}"`:''} aria-label="${a?'Аватар '+a:'Буква имени'}">${a || 'Аб'}</button>`).join('')}</div>`;
const pendingUsers = () => (S.data?.users||[]).filter(u => u.status==='pending');

function render(){
  if (!S.user && S.bootError && Api.token){ root.innerHTML = `<div class="login"><div class="card" style="max-width:420px;margin:60px auto;text-align:center"><h3>Нет связи с сервером</h3>
    <p class="muted">${esc(S.bootError)}</p><div class="toolbar" style="justify-content:center"><button class="btn primary" data-act="boot-retry">Повторить</button><button class="btn ghost" data-act="logout">Войти заново</button></div></div></div>`; return; }
  if (!S.user){ root.innerHTML = viewLogin(); return; }
  const over = allOverdue().length; const pend = Rules.canManageTeam(S.user) ? pendingUsers().length : 0;
  const tabs = [
    ['day','Чек-лист дня', over], ...(isPureSmm(S.user) ? [] : [['sched','График'], ['rep','Отчёт смены']]), ['cal','Календарь'], ...(isPureSmm(S.user) ? [] : [['stats','Статистика']]), ['pay','Выплаты'], ...(isPureSmm(S.user) ? [] : [['rev','Отзывы']]), ['guide','Гайд'],
    ...(Rules.canSeePayroll(S.user) ? [['sal','Продажи и зарплата']] : []),
    ...(Rules.canSeeFinance(S.user) ? [['fin','Финансы']] : []),
    ...(Rules.canManageTeam(S.user) ? [['team','Команда', pend]] : [])
  ];
  if (!tabs.some(t => t[0]===S.view)) S.view = 'day';
  const views = { day:viewDay, sched:viewSched, rep:viewRep, cal:viewCal, stats:viewStats, pay:viewPay, rev:viewRev, guide:viewGuide, team:viewTeam, sal:viewSal, fin:viewFin };
  const unread = unreadCount();
  root.innerHTML = `
    <header class="top">
      <div class="brand"><div class="mark">${ICON_LOTUS}</div><div><div class="brand-name">Sukha Prana</div><div class="brand-sub">Панель команды студии</div></div></div>
      <div class="who">
        ${CONFIG.MODE==='demo' ? `<span class="demo-pill">Прототип · демо-данные <button class="btn ghost sm" data-act="reset-demo" style="min-height:0;padding:2px 8px">сбросить</button></span>` : ''}
        <button class="iconbtn bell" data-act="ntf" aria-label="Уведомления: ${unread} новых" title="Уведомления">${ICON_BELL}${unread?`<span class="cnt">${unread}</span>`:''}</button>
        <button class="me-btn" data-act="notifyset" title="Мои уведомления и установка на телефон">${ava(S.user.id)}<span class="me-t"><span style="font-weight:600;line-height:1.1;display:block">${esc(S.user.name)}</span><span class="small muted">${rolesOf(S.user).map(r => ROLES[r]).join(' + ')}</span></span></button>
        <button class="btn sm" data-act="logout">Выйти</button>
      </div>
    </header>
    <nav class="tabs-scroll" aria-label="Разделы"><div class="tabs" role="tablist">
      ${tabs.map(([k,l,c]) => `<button class="tab${S.view===k?' on':''}" role="tab" aria-selected="${S.view===k}" data-act="view" data-v="${k}">${l}${c?`<span class="cnt">${c}</span>`:''}</button>`).join('')}
    </div></nav>
    ${pend && S.view!=='team' ? `<div class="banner info" role="status"><div><b>Новые заявки на доступ: ${pend}.</b> <span class="muted small">Сотрудник войдёт в панель только после вашего подтверждения.</span></div><button class="btn sm primary" data-act="view" data-v="team">Посмотреть</button></div>` : ''}
    ${over && ['day','cal','stats'].includes(S.view) && !S.overdueOnly ? `<div class="banner" role="alert"><div style="display:flex;align-items:center;gap:12px"><span class="dot"></span><div><b>Внимание: есть просроченные задачи — ${over}.</b> <span class="muted small">Невыполненное переносится на сегодня, пока его не закроют.</span></div></div><button class="btn sm" data-act="show-overdue">Показать просроченные</button></div>` : ''}
    <main>${views[S.view]()}</main>
    ${bottomNav(tabs)}
    ${S.modal ? (S.modal.type==='more' ? moreSheet(tabs) : renderModal()) : ''}`;
  root.querySelectorAll('input[type=range].rng').forEach(paintRange);
}

/* --- Вход и регистрация --- */
function viewLogin(){
  const brand = `<div class="brand" style="justify-content:center"><div class="mark">${ICON_LOTUS}</div><div><div class="brand-name">Sukha Prana</div><div class="brand-sub">Панель команды · только для сотрудников</div></div></div>`;
  if (S.authMode==='done') return `<div class="login">${brand}<div class="card"><h2 style="font-size:28px">Заявка отправлена</h2>
    <p>Владелец получил уведомление. Как только он подтвердит доступ, войдите с вашей почтой или телефоном и паролем.</p>
    <button class="btn primary" data-act="auth-mode" data-m="login">Ко входу</button></div></div>`;
  if (S.authMode==='register') return `<div class="login wide">${brand}
    <form class="card" id="reg-form" autocomplete="on" novalidate>
      <h2 style="font-size:28px">Регистрация</h2>
      <p class="small muted">Доступ откроется после подтверждения владельцем студии.</p>
      <div class="field"><label for="rg-fio">ФИО</label><input class="input" id="rg-fio" autocomplete="name" placeholder="Фамилия Имя Отчество" required></div>
      <div class="field"><span class="small muted" style="font-weight:600">Роль</span><div class="chips" id="rg-role">
        ${Object.entries(ROLES).map(([k,v],i) => `<label class="chip${(S.regRole||'admin')===k?' on':''}"><input type="radio" name="rg-role" value="${k}"${(S.regRole||'admin')===k?' checked':''} hidden>${v}</label>`).join('')}</div></div>
      <div class="grid2"><div class="field"><label for="rg-phone">Телефон</label><input class="input" id="rg-phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+7 900 123-45-67" required></div>
      <div class="field"><label for="rg-mail">Почта</label><input class="input" id="rg-mail" type="email" autocomplete="email" placeholder="name@mail.ru" required></div>
      <div class="field"><label for="rg-p1">Пароль</label><input class="input" id="rg-p1" type="password" autocomplete="new-password" minlength="6" required></div>
      <div class="field"><label for="rg-p2">Пароль ещё раз</label><input class="input" id="rg-p2" type="password" autocomplete="new-password" minlength="6" required></div></div>
      <label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="rg-agree" required style="margin-top:3px;accent-color:var(--accent)">Согласен(на) на обработку персональных данных для работы в панели студии</label>
      <div id="rg-err" class="small" style="color:var(--st-over);min-height:1em" role="alert"></div>
      <button class="btn primary" type="submit" id="rg-btn">Отправить заявку</button>
      <button class="btn ghost" type="button" data-act="auth-mode" data-m="login">У меня уже есть доступ — войти</button>
    </form></div>`;
  const demo = CONFIG.MODE==='demo' ? `
    <div class="note"><div style="font-weight:600;color:var(--ink);margin-bottom:6px">Демо-входы (пароль 1234)</div>
      <div class="chips">${[['vlad','Владислав · владелец'],['katya','Катя · владелец'],['oleg','Олег · управляющий'],['varvara','Варвара · админ'],['milana','Милана · админ']]
        .map(([l,t]) => `<button type="button" class="chip${S.loginPick===l?' on':''}" data-act="pick-login" data-l="${l}">${t}</button>`).join('')}</div></div>` : '';
  return `<div class="login">${brand}
    <form class="card" id="login-form" autocomplete="on">
      <h2 style="font-size:28px">Вход</h2>
      <div class="field"><label for="lg-login">Почта, телефон или логин</label><input class="input" id="lg-login" name="username" autocomplete="username" required value="${esc(S.loginPick)}"></div>
      <div class="field"><label for="lg-pass">Пароль</label><input class="input" id="lg-pass" name="password" type="password" autocomplete="current-password" required value="${S.loginPick?'1234':''}"></div>
      <div id="lg-err" class="small" style="color:var(--st-over);min-height:1em" role="alert"></div>
      <button class="btn primary" type="submit" id="lg-btn">Войти</button>
      <button class="btn ghost" type="button" data-act="auth-mode" data-m="register">Нет доступа? Зарегистрироваться</button>
      ${demo}
    </form></div>`;
}

/* --- Чек-лист дня --- */
const sel = (id, label, inner) => `<select class="input pill" id="${id}" aria-label="${label}">${inner}</select>`;
function filtersHtml(forStats){
  if (isPureSmm(S.user)) return '';
  const people = forStats ? statsPeople() : S.data.users.filter(u => u.active && u.status==='active');
  const levels = Rules.levelsFor(S.user);
  const blocks = [...new Set(S.data.tasks.map(t => t.block || '—'))].filter(b => b!=='Регулярно').sort((a,b) => a.localeCompare(b,'ru'));
  return `
    ${sel('f-person','Чьи задачи', `<option value="all"${S.person==='all'?' selected':''}>Все задачи</option><option value="me"${S.person==='me'?' selected':''}>Мои</option>
      ${people.filter(u=>u.id!==S.user.id).map(u => `<option value="${u.id}"${S.person===u.id?' selected':''}>${esc(u.name)}</option>`).join('')}`)}
    ${levels.length>1 ? sel('f-level','Раздел', `<option value="all">Все разделы</option>${levels.map(l => `<option value="${l}"${S.level===l?' selected':''}>${LEVELS[l]}</option>`).join('')}`) : ''}
    ${!forStats ? sel('f-block','Блок', `<option value="all">Все блоки</option><option value="Регулярно"${S.block==='Регулярно'?' selected':''}>Регулярно</option>${blocks.map(b => `<option value="${esc(b)}"${S.block===b?' selected':''}>${esc(b)}</option>`).join('')}`) : ''}`;
}

function viewDay(){
  const T = todayStr();
  const d = parseYmd(S.date);
  const isToday = S.date===T;
  const canTpl = Rules.canEditTemplates(S.user);
  const head = `
    <div class="toolbar" style="margin-bottom:14px">
      <div class="datebox">
        <button class="iconbtn" data-act="day-shift" data-n="-1" aria-label="Предыдущий день">‹</button>
        <input type="date" id="f-date" value="${S.date}" aria-label="Дата">
        <button class="iconbtn" data-act="day-shift" data-n="1" aria-label="Следующий день">›</button>
      </div>
      ${!isToday ? `<button class="btn sm" data-act="go-today">Сегодня</button>` : ''}
      ${filtersHtml()}
      <span class="spacer"></span>
      <button class="btn" data-act="export" data-kind="day">Выгрузить отчёт</button>
      ${canTpl ? '<button class="btn" data-act="tpls">Регулярные дела</button>' : ''}
      <button class="btn primary" data-act="new-task">+ Задача</button>
    </div>`;
  if (S.overdueOnly){
    const list = allOverdue();
    return head + `<div class="layout"><div class="section">
      <div class="daytitle"><h2>Просроченные задачи</h2><span class="muted">${list.length}</span><button class="btn ghost sm" data-act="hide-overdue">← к чек-листу</button></div>
      <div class="list">${list.length ? list.map(taskCard).join('') : `<div class="empty">Просроченных задач нет.</div>`}</div></div>${sideSummary()}</div>`;
  }
  const b = dayBuckets(S.date);
  const sec = (key, title, list, hint, collapsible, extra) => {
    if (!list.length) return '';
    const collapsed = collapsible && !S.expanded[key];
    return `<div class="section"><div class="sec-h"><span class="eyebrow">${title}</span><span class="muted small num">${list.length}</span><span class="line"></span>
      ${extra||''}${collapsible ? `<button data-act="toggle-sec" data-k="${key}">${collapsed?'Показать':'Скрыть'}</button>` : ''}</div>
      ${hint && !collapsed ? `<p class="small muted">${hint}</p>` : ''}
      ${collapsed ? '' : `<div class="list">${list.map(taskCard).join('')}</div>`}</div>`;
  };
  const any = b.recurring.length + b.dueToday.length + b.carried.length + b.ongoing.length;
  // Сначала — задачи текущего пользователя (ответственный или помощник; для админа — ещё «Админ смены»), потом все остальные
  const isMine = t => mineRank(t) < 3;
  const mine = [...b.carried, ...b.recurring, ...b.dueToday, ...b.ongoing].filter(isMine).sort((a,c) => mineRank(a)-mineRank(c) || dueDate(a)-dueDate(c) || PRIO_W[c.priority]-PRIO_W[a.priority]);
  const rest = k => b[k].filter(t => !isMine(t));
  const mineTitle = isAdminRole(S.user) ? 'Ваши задачи и задачи смены' : 'Ваши задачи';
  return head + `<div class="layout"><div class="section" style="gap:16px">
    <div class="daytitle"><h2>${isToday?'Сегодня, ':''}${fmtDay(S.date)}</h2><span class="muted">${DOW_FULL[d.getDay()]}</span></div>
    ${mine.length ? `<div class="section mine-sec"><div class="sec-h"><span class="eyebrow">${mineTitle}</span><span class="muted small num">${mine.length}</span><span class="line"></span>${canTpl && mine.some(t=>t.recurringId) ? '<button data-act="tpls">Регулярные</button>' : ''}</div>
      <div class="list">${mine.map(taskCard).join('')}</div></div>` : (any ? `<div class="note">На вас задач на этот день нет.</div>` : '')}
    ${any - mine.length > 0 ? `<div class="others-div"><span>Остальные задачи команды</span></div>` : ''}
    ${sec('carried','Перенесено с прошлых дней', rest('carried'), 'Не закрыты в срок. Остаются здесь, пока их не выполнят или не отменят.')}
    ${sec('recurring','Регулярные дела', rest('recurring'), '', false, canTpl ? '<button data-act="tpls">Настроить</button>' : '')}
    ${sec('due','Срок — в этот день', rest('dueToday'))}
    ${sec('ongoing','Идут по плану', rest('ongoing'), 'Задачи, у которых срок позже.', true)}
    ${any ? '' : `<div class="empty">На ${fmtDay(S.date)} задач нет. <button class="btn ghost sm" data-act="new-task">Добавить задачу</button></div>`}
  </div>${sideSummary()}</div>`;
}
/* Сначала свои задачи, затем — с подписью — все остальные */
function listWithDivider(list){
  const i = list.findIndex(t => mineRank(t)===3);
  if (i<=0) return list.map(taskCard).join('');
  return list.slice(0,i).map(taskCard).join('') + `<div class="others-div"><span>Остальные задачи</span></div>` + list.slice(i).map(taskCard).join('');
}

/* Отметка о переносе задачи */
function movedTag(t){
  const m = t.moves; const first = m[0], last = m[m.length-1];
  const tip = m.map(x => `${fmtDayShort(x.from)} → ${fmtDayShort(x.to)} · ${nameOf(x.by)}${x.reason?` · ${x.reason}`:''}`).join('\n');
  return `<span class="tag moved" title="${esc(tip)}">↷ перенесено${m.length>1?` ${m.length}×`:''} с ${fmtDayShort(first.from)}${last.by?` · ${esc(nameOf(last.by))}`:''}</span>`;
}
/* Задача с пунктами: каждый пункт выполняется независимо — свой ползунок или галочка; общий прогресс = среднее */
function checklistBlock(t, inModal){
  const items = t.checklist; const n = items.length; const done = items.filter(x => x.done).length; const p = checklistProgress(items);
  const open = inModal || (S.clOpen||{})[t.id]; const col = p>=100 ? 'var(--st-done)' : isOverdue(t) ? 'var(--st-over)' : 'var(--accent)';
  return `<div class="cl">
    <div class="linkbar"><div class="lb-track"><span style="width:${p}%;background:${col}"></span></div><span class="small num"><b>${p}%</b> · готово пунктов ${done} из ${n}</span></div>
    <details class="cl-d"${open?' open':''} data-cl-open="${t.id}"><summary>Пункты задачи — отмечайте в любом порядке</summary>
      <ul class="cl-items">${items.map(it => { const ip = itemP(it); return `<li class="${it.done?'ok':''}">
        <label><input type="checkbox" data-cli="${t.id}" data-item="${esc(it.id)}"${it.done?' checked':''}><span>${esc(it.text)}</span></label>
        <div class="cl-p"><input type="range" class="rng sm" min="0" max="100" step="10" value="${ip}" data-clp="${t.id}" data-item="${esc(it.id)}" aria-label="Выполнение пункта «${esc(it.text)}»"><output class="num small" id="clp-${esc(it.id)}${inModal?'-m':''}">${ip}%</output></div>
        ${ip>0 && it.by ? `<span class="small muted cl-who">${esc(nameOf(it.by))}, ${fmtDT(it.at)}</span>` : ''}</li>`; }).join('')}</ul></details></div>`;
}
function paintRange(r){
  const max = Number(r.max)||100, v = Number(r.value); const pct = Math.round(v*100/max);
  r.style.setProperty('--p', pct+'%');
  r.style.setProperty('--c', pct>=100 ? 'var(--st-done)' : r.dataset.over==='1' ? 'var(--st-over)' : 'var(--accent)');
}
function linkBar(t, compact){
  const kids = childrenOf(t.id).filter(c => c.status!=='cancel'); const done = kids.filter(c => c.status==='done').length;
  const p = kids.length ? Math.round(done*100/kids.length) : (t.progress||0);
  const col = p>=100 ? 'var(--st-done)' : isOverdue(t) ? 'var(--st-over)' : 'var(--accent)';
  return `<div class="linkbar" data-act="edit" data-id="${t.id}" title="Открыть связанные задачи"><div class="lb-track"><span style="width:${p}%;background:${col}"></span></div>
    <span class="small num"><b>${p}%</b> · выполнено ${done} из ${kids.length} связанных</span></div>`;
}

function taskCard(t){
  const ds = dispStatus(t);
  const locked = Rules.isLockedFor(S.user, t);
  const canEdit = Rules.canEditTask(S.user, t);
  const prevBadge = S.lastBadges.get(t.id); const pop = prevBadge && prevBadge!==ds; S.lastBadges.set(t.id, ds);
  const dueTxt = t.due===S.date && !S.overdueOnly ? `до ${t.dueTime}` : `до ${fmtDayShort(t.due)} ${t.dueTime}`;
  const nC = (t.comments||[]).length, lastC = nC ? t.comments[nC-1] : null;
  const opts = ['todo','work','wait','done','cancel'].map(s => `<option value="${s}"${t.status===s?' selected':''}${locked && s!=='work' && s!=='done'?' disabled':''}>${STATUS[s]}</option>`).join('');
  const parent = t.parentId ? S.data.tasks.find(x => x.id===t.parentId) : null;
  const assignee = t.assignee ? `${ava(t.assignee,true)}<b>${esc(nameOf(t.assignee))}</b>${t.assignee===S.user.id?' <span class="tag me">вы</span>':''}`
    : `<span class="ava sm" style="background:var(--st-todo-soft)">А</span><b>Админ смены</b> <button class="btn ghost sm" style="min-height:0;padding:1px 8px" data-act="take" data-id="${t.id}">Беру</button>`;
  const shared = !Rules.levelsFor(S.user).includes(t.level);
  return `<article class="task s-${ds}${mineRank(t)<3?' mine':''}" data-id="${t.id}">
    <div class="task-top">
      <span class="prio p-${t.priority}" title="Приоритет: ${PRIO[t.priority]}"></span>
      <div class="task-main"><h4 data-act="edit" data-id="${t.id}" tabindex="0">${esc(t.title)}</h4>${t.desc?`<p class="desc">${esc(t.desc)}</p>`:''}</div>
      <span class="badge b-${ds}${pop?' pop':''}">${STATUS[ds]}</span>
    </div>
    <div class="meta">
      <span class="who">${assignee}</span>
      ${t.helper ? `<span>помогает <b>${esc(nameOf(t.helper))}</b>${t.helper===S.user.id?' <span class="tag me">вы</span>':''}</span>` : ''}
      <span class="num">${dueTxt}</span>
      ${ds==='over' ? `<span style="color:var(--st-over);font-weight:600">${fmtOverdue(t)}</span>` : ''}
      ${t.late ? `<span class="tag late">сделано с опозданием</span>` : ''}
      ${t.block && t.block!=='Регулярно' ? `<span class="tag">${esc(t.block)}</span>` : ''}
      ${!isPureAdmin(S.user) && t.level!=='team' ? `<span class="tag lvl-${t.level}">${LEVELS[t.level]}</span>` : ''}
      ${shared ? `<span class="tag lvl-shared">общая с вами</span>` : ''}
      ${t.moves?.length ? movedTag(t) : ''}
      ${parent ? `<span class="tag link" data-act="edit" data-id="${parent.id}">часть: ${esc(parent.title.length>40?parent.title.slice(0,40)+'…':parent.title)}</span>` : (t.parentId ? '<span class="tag link">часть общей задачи</span>' : '')}
      ${t.status==='done' && t.doneBy ? `<span>закрыл(а) ${esc(nameOf(t.doneBy))}${locked?' · снять «Готово» нельзя':''}</span>` : ''}
    </div>
    ${t.checklist?.length ? checklistBlock(t) : hasLinks(t) ? linkBar(t) : ''}
    ${lastC ? `<div class="cmt-last" data-act="comments" data-id="${t.id}" title="Открыть комментарии">${ava(lastC.by,true)}<span class="tx"><b>${esc(nameOf(lastC.by))}</b> · <span class="muted">${fmtDT(lastC.at)}</span><br>${esc(lastC.text)}</span></div>` : ''}
    <div class="task-bottom">
      ${isOpen(t) ? `<button class="btn sm done-btn" data-act="quick-done" data-id="${t.id}">✓ Готово</button>` : t.status==='done' ? `<button class="btn sm" data-act="reopen" data-id="${t.id}">Вернуть в работу</button>` : ''}
      <button class="btn sm" data-act="comments" data-id="${t.id}">Комментарий${nC?` · ${nC}`:''}</button>
      ${isOpen(t) ? `<button class="btn sm" data-act="move" data-id="${t.id}">Перенести</button>` : ''}
      ${canEdit ? `<button class="btn sm" data-act="edit" data-id="${t.id}">Редактировать</button>` : ''}
      <span class="spacer"></span>
      <select class="status-sel" data-act="status" data-id="${t.id}" aria-label="Статус">${opts}</select>
    </div>
  </article>`;
}

function ringSvg(pct, color){
  const r=38, c=2*Math.PI*r, v = pct==null?0:pct;
  return `<svg viewBox="0 0 92 92" role="img" aria-label="Выполнено ${pct??0}%"><circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="9"/>
    <circle cx="46" cy="46" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${c*v/100} ${c}" transform="rotate(-90 46 46)" style="transition:stroke-dasharray .5s"/>
    <text x="46" y="52" text-anchor="middle" style="font-size:20px;font-weight:700;fill:var(--ink)">${pct==null?'—':pct+'%'}</text></svg>`;
}
function sideSummary(){
  const m = dayMetrics(S.date);
  const tops = top5();
  const mine = S.data.tasks.filter(t => isOpen(t) && (t.assignee===S.user.id || t.helper===S.user.id) && t.due<=S.date).length;
  return `<aside class="side">
    <div class="card"><div class="eyebrow" style="margin-bottom:10px">Итог дня · ${fmtDayShort(S.date)}</div>
      <div class="ring">${ringSvg(m.pct, m.pct>=80?'var(--st-done)':m.pct>=50?'var(--st-work)':'var(--st-over)')}
        <div><div style="font-weight:600">Выполнено ${m.done} из ${m.total}</div><div class="small muted">Задачи со сроком в этот день. На вас открытых: ${mine}.</div></div></div>
      <div class="kpis"><div class="kpi"><b>${m.total-m.done-m.over}</b><span>в работе</span></div><div class="kpi"><b style="color:var(--st-done)">${m.done}</b><span>готово</span></div><div class="kpi"><b style="color:var(--st-over)">${m.over}</b><span>просрочено</span></div></div>
    </div>
    <div class="card"><div class="card-h"><span class="eyebrow">Топ-5 невыполненных</span><button class="btn ghost sm" data-act="view" data-v="stats">Статистика</button></div>
      <div class="mini">${tops.length ? tops.map(t => `<div class="mini-row" data-act="edit" data-id="${t.id}">${ava(t.assignee,true)}<div class="t"><div>${esc(t.title)}</div>
        <span class="small" style="color:${isOverdue(t)?'var(--st-over)':'var(--muted)'}">${isOverdue(t)?fmtOverdue(t):'срок '+fmtDayShort(t.due)+' '+t.dueTime}</span></div></div>`).join('') : '<p class="muted small">Всё выполнено.</p>'}</div>
    </div></aside>`;
}

/* --- Календарь --- */
function viewCal(){
  const [y,m] = S.calMonth.split('-').map(Number);
  const first = new Date(y, m-1, 1); const startOffset = (first.getDay()+6)%7;
  const gridStart = new Date(y, m-1, 1-startOffset);
  const T = todayStr(); const list = visibleTasks();
  const cells = [];
  for (let i=0;i<42;i++){
    const dd = new Date(gridStart); dd.setDate(gridStart.getDate()+i); const s = ymd(dd);
    const ts = list.filter(t => t.due===s && t.status!=='cancel');
    const dots = ts.slice(0,12).map(t => { const st = dispStatus(t); return `<i style="background:var(--st-${st==='over'?'over':st==='done'?'done':st==='wait'?'wait':st==='work'?'work':'todo'})"></i>`; }).join('');
    cells.push(`<button class="day${dd.getMonth()!==m-1?' out':''}${s===T?' today':''}${s===S.date?' sel':''}" data-act="cal-pick" data-d="${s}" aria-label="${fmtDay(s)}: задач ${ts.length}">
      <span class="d">${dd.getDate()}</span><span class="dots">${dots}</span>${ts.length?`<span class="c">${ts.filter(t=>t.status==='done').length}/${ts.length} готово</span>`:''}</button>`);
    if (i>=34 && dd.getMonth()!==m-1 && (i+1)%7===0) break;
  }
  return `<div class="card">
    <div class="card-h"><div class="toolbar"><button class="iconbtn" data-act="cal-shift" data-n="-1" aria-label="Предыдущий месяц">‹</button><h2>${MONTHS[m-1]} ${y}</h2><button class="iconbtn" data-act="cal-shift" data-n="1" aria-label="Следующий месяц">›</button></div>
      <div class="toolbar">${filtersHtml()}</div></div>
    <div class="cal">${['пн','вт','ср','чт','пт','сб','вс'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells.join('')}</div>
    <div class="legend" style="margin-top:14px"><span><i style="background:var(--st-done)"></i>готово</span><span><i style="background:var(--st-work)"></i>в работе</span><span><i style="background:var(--st-over)"></i>просрочено</span><span><i style="background:var(--st-wait)"></i>ждёт решения</span><span><i style="background:var(--st-todo)"></i>не начато</span><span>Нажмите на день, чтобы открыть чек-лист.</span></div>
  </div>`;
}

/* --- Статистика --- */
function weeklySeries(){
  const T = todayStr(); const ws0 = weekStart(T); const list = statsTasks().filter(t => t.status!=='cancel');
  const out = [];
  for (let i=7;i>=0;i--){
    const ws = addDays(ws0, -7*i), we = addDays(ws, 6);
    const inW = list.filter(t => t.due>=ws && t.due<=we && t.due<=T);
    const done = inW.filter(t => t.status==='done').length, onTime = inW.filter(t => t.status==='done' && !t.late).length;
    out.push({ label: fmtDayShort(ws), value: inW.length ? Math.round(done*100/inW.length) : null, onTime: inW.length ? Math.round(onTime*100/inW.length) : null, n:inW.length, cur: i===0 });
  }
  return out;
}
function lineChart(pts){
  const W=620,H=236,L=40,R=34,Tp=26,B=34; const iw=W-L-R, ih=H-Tp-B;
  const x = i => L + (pts.length===1?iw/2:i*iw/(pts.length-1)); const y = v => Tp + ih - v*ih/100;
  const grid = [0,25,50,75,100].map(v => `<line x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end" font-size="11">${v}%</text>`).join('');
  const segs=[]; let cur=[];
  pts.forEach((p,i) => { if (p.value==null){ if(cur.length) segs.push(cur); cur=[]; } else cur.push([x(i),y(p.value)]); }); if(cur.length) segs.push(cur);
  const lines = segs.map(s => `<path d="M${s.map(p=>p.join(',')).join(' L')}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
    + (s.length>1?`<path d="M${s[0][0]},${Tp+ih} L${s.map(p=>p.join(',')).join(' L')} L${s[s.length-1][0]},${Tp+ih} Z" fill="var(--accent)" opacity=".1"/>`:'')).join('');
  const ot = pts.map((p,i) => p.onTime==null ? null : [x(i), y(p.onTime)]).filter(Boolean);
  const otLine = ot.length>1 ? `<path d="M${ot.map(p=>p.join(',')).join(' L')}" fill="none" stroke="var(--st-done)" stroke-width="2" stroke-dasharray="5 4"/>` : '';
  const dots = pts.map((p,i) => p.value==null ? '' : `<circle cx="${x(i)}" cy="${y(p.value)}" r="${p.cur?6:4}" fill="${p.cur?'var(--accent)':'var(--surface)'}" stroke="var(--accent)" stroke-width="2"><title>Неделя с ${p.label}: ${p.value}% (${p.n} задач)</title></circle>${p.cur||i===pts.length-2?`<text x="${x(i)}" y="${y(p.value)-11}" text-anchor="middle" font-size="12" style="fill:var(--ink);font-weight:700">${p.value}%</text>`:''}`).join('');
  const xl = pts.map((p,i) => `<text x="${x(i)}" y="${H-10}" text-anchor="middle" font-size="11">${p.cur?'эта нед.':p.label}</text>`).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Процент выполнения по неделям">${grid}${otLine}${lines}${dots}${xl}</svg>`;
}
function loadRows(){
  const list = statsTasks();
  return statsPeople().map(u => ({
    u, created: list.filter(t => t.createdBy===u.id).length, done: list.filter(t => t.doneBy===u.id).length,
    open: list.filter(t => t.assignee===u.id && isOpen(t)).length, over: list.filter(t => t.assignee===u.id && isOverdue(t)).length
  }));
}
function barChart(rows){
  const W=620, rowH=46, L=96, R=40, Tp=8; const H = Tp + rows.length*rowH + 8;
  const max = Math.max(1, ...rows.map(r => Math.max(r.created, r.done)));
  const sx = v => (W-L-R)*v/max;
  const body = rows.map((r,i) => { const y0 = Tp + i*rowH;
    return `<text x="${L-10}" y="${y0+22}" text-anchor="end" font-size="13" style="fill:var(--ink);font-weight:600">${esc(r.u.name)}</text>
    <rect x="${L}" y="${y0+5}" width="${Math.max(2,sx(r.created))}" height="15" rx="4" fill="var(--accent)"><title>Создано: ${r.created}</title></rect>
    <text x="${L+sx(r.created)+6}" y="${y0+17}" font-size="11.5">${r.created}</text>
    <rect x="${L}" y="${y0+23}" width="${Math.max(2,sx(r.done))}" height="15" rx="4" fill="var(--st-done)"><title>Выполнено: ${r.done}</title></rect>
    <text x="${L+sx(r.done)+6}" y="${y0+35}" font-size="11.5">${r.done}</text>`; }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Нагрузка по сотрудникам">${body}</svg>`;
}
function viewStats(){
  const m = dayMetrics(S.date); const ws = weeklySeries(); const cur = ws[ws.length-1];
  const rows = loadRows(); const tops = top5(); const over = statsTasks().filter(isOverdue).length;
  const lateCnt = statsTasks().filter(t => t.late && t.due >= addDays(todayStr(),-30)).length;
  return `<div style="display:flex;flex-direction:column;gap:18px">
    <div class="toolbar"><div class="datebox"><button class="iconbtn" data-act="day-shift" data-n="-1" aria-label="Предыдущий день">‹</button><input type="date" id="f-date" value="${S.date}" aria-label="Дата"><button class="iconbtn" data-act="day-shift" data-n="1" aria-label="Следующий день">›</button></div>
      ${filtersHtml(true)}<span class="spacer"></span><button class="btn" data-act="export" data-kind="stats">Выгрузить отчёт</button></div>
    <div class="bigkpis">
      <div class="card bigkpi"><span class="eyebrow">Выполнено за ${fmtDayShort(S.date)}</span><b>${m.pct==null?'—':m.pct+'%'}</b><span class="small muted">${m.done} из ${m.total} задач</span></div>
      <div class="card bigkpi"><span class="eyebrow">Эта неделя</span><b>${cur.value==null?'—':cur.value+'%'}</b><span class="small muted">по задачам со сроком до сегодня</span></div>
      <div class="card bigkpi"><span class="eyebrow">Просрочено сейчас</span><b style="color:var(--st-over)">${over}</b><span class="small muted">с переносом на сегодня</span></div>
      <div class="card bigkpi"><span class="eyebrow">С опозданием, 30 дн.</span><b>${lateCnt}</b><span class="small muted">сделано после срока</span></div>
    </div>
    <div class="stats-grid">
      <div class="card"><div class="card-h"><h3>Выполнение по неделям</h3><div class="legend"><span><i style="background:var(--accent)"></i>выполнено</span><span><i style="background:var(--st-done)"></i>в срок</span></div></div>${lineChart(ws)}</div>
      <div class="card"><div class="card-h"><h3>Нагрузка по сотрудникам</h3><div class="legend"><span><i style="background:var(--accent)"></i>создал задач</span><span><i style="background:var(--st-done)"></i>выполнил</span></div></div>${barChart(rows)}
        <p class="small muted" style="margin-top:6px">Регулярные дела создаются автоматически и в «создал» не входят. ${isPureAdmin(S.user)?'Вы видите статистику администраторов.':S.user.role==='manager'?'Статистика владельцев здесь не показывается.':''}</p></div>
    </div>
    <div class="stats-grid">
      <div class="card"><div class="card-h"><h3>Топ-5 невыполненных</h3><span class="small muted">дольше всех просрочены, затем ближайшие</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Задача</th><th>Ответственный</th><th>Срок</th><th class="r">Прогресс</th></tr></thead><tbody>
        ${tops.map(t => `<tr data-act="edit" data-id="${t.id}" style="cursor:pointer"><td><b>${esc(t.title)}</b><div class="small" style="color:${isOverdue(t)?'var(--st-over)':'var(--muted)'}">${isOverdue(t)?fmtOverdue(t):STATUS[t.status]}</div></td><td>${t.assignee?esc(nameOf(t.assignee)):'Админ смены'}</td><td class="num">${fmtDayShort(t.due)} ${t.dueTime}</td><td class="r">${t.progress}%</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Нет открытых задач</td></tr>'}
        </tbody></table></div></div>
      <div class="card"><div class="card-h"><h3>Кто что делает</h3></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Сотрудник</th><th class="r">Открыто</th><th class="r">Просрочено</th><th class="r">Выполнил</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><span class="who" style="display:inline-flex;gap:8px;align-items:center">${ava(r.u.id,true)}${esc(r.u.name)}</span></td><td class="r">${r.open}</td><td class="r" style="color:${r.over?'var(--st-over)':'inherit'}">${r.over}</td><td class="r">${r.done}</td></tr>`).join('')}
        </tbody></table></div><p class="small muted" style="margin-top:8px">Задачи «Админ смены» без ответственного сюда не попадают, пока их кто-то не возьмёт.</p></div>
    </div></div>`;
}

/* --- Выплаты --- */
function viewPay(){
  const owner = Rules.seeAmounts(S.user);
  const recips = [...S.data.users.filter(u => u.active && u.status==='active').map(u => ({ id:u.id, label:`${u.name} · ${rolesOf(u).map(r => ROLES[r].toLowerCase()).join(' + ')}` })),
    ...(S.data.trainers||[]).filter(t => t.active).map(t => ({ id:t.id, label:`${t.fullName} · тренер` }))];
  const inMonth = p => payoutMonth(p)===S.payMonth;
  const mStart = S.payMonth+'-01', mEnd = ymd(new Date(Number(S.payMonth.slice(0,4)), Number(S.payMonth.slice(5)), 0));
  const list = S.data.payouts.filter(inMonth).filter(p => !isPureSmm(S.user) || p.recipient===S.user.id).sort((a,b) => (!!a.issuedAt - !!b.issuedAt) || (b.plannedDate||'').localeCompare(a.plannedDate||''));
  const pending = list.filter(p => !p.issuedAt).length;
  const totals = owner ? Object.values(list.reduce((acc,p) => { const k=p.recipient; acc[k] = acc[k] || { id:k, sum:0, issued:0, n:0 }; acc[k].sum+=p.amount; acc[k].n++; if(p.issuedAt) acc[k].issued+=p.amount; return acc; }, {})) : [];
  const form = owner ? `<form class="card" id="pay-form"><div class="card-h"><h3>Новая выплата</h3><span class="small muted">видит только владелец; админы и управляющий отмечают выдачу конверта</span></div>
    <div class="grid3">
      <div class="field"><label for="pf-r">Кому</label><select class="input" id="pf-r" required><option value="">Выберите</option><optgroup label="Сотрудники">${recips.filter(r=>!r.id.startsWith('tr')).map(r=>`<option value="${r.id}">${esc(r.label)}</option>`).join('')}</optgroup><optgroup label="Тренеры">${recips.filter(r=>r.id.startsWith('tr')).map(r=>`<option value="${r.id}">${esc(r.label)}</option>`).join('')}</optgroup></select></div>
      <div class="field"><span class="small muted" style="font-weight:600">За период (в пределах месяца)</span><div class="range"><input class="input" type="date" id="pf-from" value="${mStart}" min="${mStart}" max="${mEnd}" aria-label="С" required><span>—</span><input class="input" type="date" id="pf-to" value="${mEnd}" min="${mStart}" max="${mEnd}" aria-label="По" required></div>
        <div class="chips" style="margin-top:6px"><button type="button" class="chip" data-act="pf-range" data-k="h1">1–15</button><button type="button" class="chip" data-act="pf-range" data-k="h2">16–конец</button><button type="button" class="chip" data-act="pf-range" data-k="all">Весь месяц</button></div></div>
      <div class="field"><label for="pf-a">Сумма, ₽</label><input class="input num" id="pf-a" type="number" min="1" step="1" inputmode="numeric" required></div>
      <div class="field"><label for="pf-d">Дата выдачи (план)</label><input class="input" id="pf-d" type="date" value="${todayStr()}"></div>
      <div class="field" style="grid-column:span 2"><label for="pf-c">Комментарий</label><input class="input" id="pf-c" placeholder="Например: смены + 3 продажи"></div>
    </div><div class="modal-f" style="margin-top:12px"><button class="btn primary" type="submit">Подготовить конверт</button></div></form>` : '';
  return `<div style="display:flex;flex-direction:column;gap:18px">
    <div class="toolbar"><h2>Выплаты</h2><span class="spacer"></span><label class="small muted" for="f-paymonth">Месяц</label><input class="input" type="month" id="f-paymonth" value="${S.payMonth}" style="width:auto"></div>
    ${!owner ? `<div class="note">Здесь только отметка о выдаче конверта. Суммы видит владелец. Конвертов к выдаче: <b>${pending}</b>.</div>` : ''}
    ${form}
    <div class="${owner?'stats-grid':''}" style="${owner?'grid-template-columns:minmax(0,1.6fr) minmax(0,1fr)':''}">
    <div class="card"><div class="card-h"><h3>${owner?'Журнал выплат':'Конверты'}</h3><span class="small muted">${list.length} за ${MONTHS[Number(S.payMonth.slice(5))-1].toLowerCase()}</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Кому</th><th>Период</th>${owner?'<th class="r">Сумма</th>':''}<th>Выдача</th>${owner?'<th>Комментарий</th>':''}<th></th></tr></thead><tbody>
      ${list.map(p => `<tr><td><span style="display:inline-flex;gap:8px;align-items:center">${ava(p.recipient,true)}<b>${esc(nameOf(p.recipient))}</b></span></td><td>${esc(p.periodFrom ? periodLabel(p.periodFrom, p.periodTo) : p.period)}${p.issuedAt && owner ? '<div class="small" style="color:var(--st-done)">учтено в финансах</div>' : ''}</td>
        ${owner?`<td class="r"><b>${money(p.amount)}</b></td>`:''}
        <td>${p.issuedAt ? `<span class="badge b-done">Выдан</span><div class="small muted">${esc(nameOf(p.issuedBy))}, ${fmtDT(p.issuedAt)}</div>` : `<span class="badge b-work">Ждёт выдачи</span><div class="small muted">план ${p.plannedDate?fmtDayShort(p.plannedDate):'—'}</div>`}</td>
        ${owner?`<td class="small">${esc(p.comment)}</td>`:''}
        <td style="white-space:nowrap">${!p.issuedAt && Rules.canIssuePayout(S.user) ? `<button class="btn sm primary" data-act="issue" data-id="${p.id}">Конверт выдан</button>` : ''}${owner?` <button class="btn sm ghost" data-act="del-pay" data-id="${p.id}" aria-label="Удалить">Удалить</button>`:''}</td></tr>`).join('') || `<tr><td colspan="6" class="muted">В этом месяце выплат нет.</td></tr>`}
      </tbody></table></div></div>
    ${owner ? `<div class="card"><div class="card-h"><h3>Итого за месяц</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Сотрудник</th><th class="r">Начислено</th><th class="r">Выдано</th></tr></thead><tbody>
      ${totals.map(t => `<tr><td>${esc(nameOf(t.id))}</td><td class="r">${money(t.sum)}</td><td class="r">${money(t.issued)}</td></tr>`).join('')}
      <tr><td><b>Всего</b></td><td class="r"><b>${money(totals.reduce((s,t)=>s+t.sum,0))}</b></td><td class="r"><b>${money(totals.reduce((s,t)=>s+t.issued,0))}</b></td></tr></tbody></table></div></div>` : ''}
    </div></div>`;
}

/* --- Отзывы --- */
const SOURCES = { yandex:'Яндекс Карты', '2gis':'2ГИС', oral:'Устно на стойке', site:'Сайт / соцсети', other:'Другое' };
function viewRev(){
  const st = S.data.settings || {}; const ms = st.mapStats || {};
  let list = [...S.data.reviews].sort((a,b) => b.date.localeCompare(a.date));
  if (S.revFilter==='new') list = list.filter(r => !r.confirmed);
  if (S.revFilter==='map') list = list.filter(r => r.origin==='map');
  if (S.revFilter==='manual') list = list.filter(r => r.origin!=='map');
  const yUrl = `https://yandex.ru/maps/org/sukha_prana/${encodeURIComponent(st.yandexOrgId||CONFIG.YANDEX_ORG_ID)}/reviews/`;
  const gUrl = `https://2gis.ru/${encodeURIComponent(st.twogisCity||'moscow')}/firm/${encodeURIComponent(st.twogisFirmId||CONFIG.TWOGIS_FIRM_ID)}/tab/reviews`;
  const fromMap = S.data.reviews.filter(r => r.origin==='map');
  const mapCard = (name, url, stat, src) => `<div class="mapcard"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b>${name}</b>${stat?`<span class="stars">★ <span style="color:var(--ink);font-weight:700">${Number(stat.rating).toFixed(1)}</span></span>`:''}</div>
    <span class="small muted">${stat ? `${stat.ratings?stat.ratings+' оценок · ':''}${stat.reviews} отзывов на карте · ${fromMap.filter(r=>r.source===src).length} уже в панели` : 'нет данных'}</span>
    <a class="btn sm" href="${url}" target="_blank" rel="noopener">Открыть на карте ↗</a></div>`;
  return `<div style="display:flex;flex-direction:column;gap:18px">
    <div class="toolbar"><h2>Отзывы</h2></div>
    <div class="card"><div class="card-h"><h3>Автоподгрузка с карт</h3>
      <div class="toolbar"><span class="small muted">${st.lastSync ? 'Обновлено '+fmtDT(st.lastSync) : 'Автообновление каждые 6 часов'}</span>${Rules.canSyncReviews(S.user)?'<button class="btn sm primary" data-act="sync-reviews">Обновить сейчас</button>':''}</div></div>
      <div class="maps">${mapCard('Яндекс Карты', yUrl, ms.yandex, 'yandex')}${mapCard('2ГИС', gUrl, ms.twogis, '2gis')}</div>
      ${(st.syncErrors||[]).length ? `<div class="note small" style="margin-top:10px">⚠️ ${st.syncErrors.map(esc).join('<br>')}</div>` : ''}
      <p class="small muted" style="margin-top:10px">Сервер раз в 6 часов забирает новые отзывы с обеих карточек и добавляет их в список с пометкой источника. Отзывы с карт уже проверены картой, их подтверждать не нужно.${CONFIG.MODE==='demo'?' В прототипе кнопка «Обновить сейчас» добавляет примеры, настоящие отзывы появятся после подключения сервера.':''}</p></div>
    <form class="card" id="rev-form"><div class="card-h"><h3>Добавить отзыв вручную</h3><span class="small muted">устные, из соцсетей, с сайта</span></div>
      <div class="grid3">
        <div class="field"><label for="rf-c">Клиент</label><input class="input" id="rf-c" required placeholder="Имя, можно с первой буквой фамилии"></div>
        <div class="field"><label for="rf-d">Дата</label><input class="input" id="rf-d" type="date" value="${todayStr()}" required></div>
        <div class="field"><label for="rf-s">Источник</label><select class="input" id="rf-s">${Object.entries(SOURCES).filter(([k])=>k!=='yandex'&&k!=='2gis').map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
        <div class="field"><label for="rf-r">Оценка</label><select class="input" id="rf-r">${[5,4,3,2,1].map(n=>`<option value="${n}">${'★'.repeat(n)} ${n}</option>`).join('')}</select></div>
        <div class="field" style="grid-column:span 2"><label for="rf-t">Текст</label><input class="input" id="rf-t" required></div>
      </div><div class="modal-f" style="margin-top:12px"><button class="btn primary" type="submit">Сохранить отзыв</button></div></form>
    <div class="card"><div class="card-h"><h3>Все отзывы <span class="muted small num">${S.data.reviews.length}</span></h3><div class="chips">${[['all','Все'],['map','С карт'],['manual','Внесены вручную'],['new','Ждут подтверждения']].map(([k,l])=>`<button class="chip${S.revFilter===k?' on':''}" data-act="rev-filter" data-k="${k}">${l}</button>`).join('')}</div></div>
      ${list.map(r => `<div class="rev"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><b>${esc(r.client)}</b> <span class="stars" aria-label="${r.rating} из 5">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</span></div>
        <span class="small muted">${fmtDay(r.date)} · ${SOURCES[r.source]||r.source}${r.origin==='map'?' · загружен автоматически':' · внёс(ла) '+esc(nameOf(r.createdBy))}</span></div><p>${esc(r.text)}</p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${r.origin==='map' ? `<span class="badge b-wait">С карт</span>${r.url?`<a class="small" style="color:var(--accent-text)" href="${esc(r.url)}" target="_blank" rel="noopener">Открыть на карте ↗</a>`:''}`
          : (r.confirmed?`<span class="badge b-done">Подтверждён · ${esc(nameOf(r.confirmedBy))}</span>`:`<span class="badge b-work">Ждёт подтверждения</span>`)
          + (Rules.canConfirmReview(S.user) ? ` <button class="btn sm${r.confirmed?'':' primary'}" data-act="confirm-rev" data-id="${r.id}" data-v="${r.confirmed?0:1}">${r.confirmed?'Снять подтверждение':'Подтвердить'}</button>` : '')}</div></div>`).join('') || '<p class="muted">Отзывов нет.</p>'}
    </div></div>`;
}

/* --- Гайд --- */
const normSteps = g => (g.steps||[]).map(x => typeof x==='string' ? { t:x, img:'' } : { t:x.t||'', img:x.img||'' });
function viewGuide(){
  const can = Rules.canEditGuide(S.user); const q = S.guideQuery.trim().toLowerCase();
  const list = S.data.guide.filter(g => !q || g.title.toLowerCase().includes(q) || normSteps(g).map(x=>x.t).join(' ').toLowerCase().includes(q));
  const editing = S.guideDraft;
  return `<div style="display:flex;flex-direction:column;gap:14px">
    <div class="toolbar"><h2>На все случаи жизни</h2><span class="spacer"></span><input class="input" id="f-guide" type="search" placeholder="Поиск по инструкциям" value="${esc(S.guideQuery)}" style="width:min(280px,100%)">
      ${can?'<button class="btn" data-act="guide-import">Загрузить из Word</button><button class="btn primary" data-act="guide-new">+ Инструкция</button>':''}</div>
    ${can ? `<p class="small muted">Заготовки помечены «черновик». Инструкции можно загрузить из файла Word (.docx) вместе с фотографиями: заголовок в документе станет названием инструкции, пункты и абзацы под ним — шагами, фото прикрепятся к шагу, рядом с которым стоят.</p>` : ''}
    <div>${list.map(g => editing && editing.id===g.id ? guideEditor() : `<details class="acc"${q?' open':''}><summary>${esc(g.title)} ${g.draft?'<span class="draft">черновик</span>':''}${normSteps(g).some(x=>x.img)?'<span class="tag">с фото</span>':''}<span class="chev">›</span></summary>
      <div class="body"><ol>${normSteps(g).map(st => `<li><div class="step">${st.t?`<span>${esc(st.t)}</span>`:''}${st.img?`<img class="step-img" src="${esc(st.img)}" alt="Фото к шагу" loading="lazy" data-act="zoom">`:''}</div></li>`).join('')}</ol>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><span class="small muted">${g.updatedBy?'Обновил(а) '+esc(nameOf(g.updatedBy))+', '+fmtDT(g.updatedAt):'Заготовка'}${g.sourceFile?' · из файла '+esc(g.sourceFile):''}</span>${can?`<button class="btn sm" data-act="guide-edit" data-id="${g.id}">Редактировать</button>`:''}</div></div></details>`).join('')}
    ${editing && !editing.id ? guideEditor() : ''}
    ${!list.length && !(editing && !editing.id) ? '<div class="empty">Ничего не найдено.</div>' : ''}</div></div>`;
}
function guideEditor(){
  const g = S.guideDraft;
  return `<form class="card" id="guide-form" style="margin-top:10px;display:flex;flex-direction:column;gap:12px"><div class="field"><label for="gf-t">Название</label><input class="input" id="gf-t" value="${esc(g.title)}" required></div>
    <div class="field"><span class="small muted" style="font-weight:600">Шаги (до ${CONFIG.GUIDE_MAX_STEPS}) — к каждому можно приложить фото</span>
    <div style="display:flex;flex-direction:column;gap:10px">${g.steps.map((st,i) => `<div class="step-row"><span class="step-n">${i+1}</span>
      <textarea class="input" rows="2" data-gstep="${i}" aria-label="Шаг ${i+1}" placeholder="Что сделать">${esc(st.t)}</textarea>
      <div class="step-media">${st.img ? `<img src="${esc(st.img)}" alt="Фото к шагу ${i+1}"><button type="button" class="btn ghost sm" data-act="step-img-del" data-i="${i}">убрать фото</button>`
        : `<label class="btn sm">Фото<input type="file" accept="image/*" data-gimg="${i}" hidden></label>`}</div>
      <button type="button" class="iconbtn" data-act="step-del" data-i="${i}" aria-label="Удалить шаг ${i+1}">✕</button></div>`).join('')}</div>
    ${g.steps.length < CONFIG.GUIDE_MAX_STEPS ? '<button type="button" class="btn sm" data-act="step-add" style="align-self:flex-start">+ Шаг</button>' : ''}</div>
    <div class="modal-f">${g.id?`<button type="button" class="btn danger" data-act="guide-del" data-id="${g.id}">Удалить</button>`:''}<span class="spacer"></span><button type="button" class="btn" data-act="guide-cancel">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form>`;
}

/* --- Импорт инструкций из Word (.docx) ---
   mammoth.js превращает документ в HTML (фото — внутрь как data:), дальше разбираем:
   Заголовок 1–3 или короткий жирный абзац → новая инструкция; пункты списка и абзацы → шаги; фото → к ближайшему шагу. */
function parseDocHtml(html, fileName){
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const sections = []; let cur = null;
  const clean = t => t.replace(/\s+/g,' ').replace(/^\s*(шаг\s*)?\d{1,2}\s*[.)]\s*/i,'').trim();
  const newSec = title => { cur = { title: clean(title).slice(0,120) || 'Инструкция', steps:[] }; sections.push(cur); };
  const ensure = () => { if (!cur) newSec((fileName||'Инструкция из Word').replace(/\.docx$/i,'')); };
  const addText = t => { t = clean(t); if (!t) return; ensure(); cur.steps.push({ t, img:'' }); };
  const addImg = src => { if (!src) return; ensure(); const last = cur.steps[cur.steps.length-1]; if (last && !last.img) last.img = src; else cur.steps.push({ t:'', img:src }); };
  const textOf = el => { const c = el.cloneNode(true); c.querySelectorAll('img').forEach(i => i.remove()); return c.textContent || ''; };
  const isBoldTitle = el => { const t = textOf(el).trim(); if (!t || t.length > 80) return false; const kids = [...el.childNodes].filter(n => !(n.nodeType===3 && !n.textContent.trim()));
    return kids.length>0 && kids.every(n => n.nodeName==='STRONG' || n.nodeName==='B'); };
  const walk = el => {
    const tag = el.tagName;
    if (/^H[1-4]$/.test(tag)){ newSec(textOf(el)); el.querySelectorAll('img').forEach(i => addImg(i.getAttribute('src'))); return; }
    if (tag==='OL' || tag==='UL'){ [...el.children].forEach(li => { const nested = [...li.querySelectorAll(':scope > ol, :scope > ul')]; nested.forEach(n => n.remove());
      addText(textOf(li)); li.querySelectorAll('img').forEach(i => addImg(i.getAttribute('src'))); nested.forEach(walk); }); return; }
    if (tag==='TABLE'){ el.querySelectorAll('tr').forEach(tr => { addText([...tr.children].map(td => textOf(td).trim()).filter(Boolean).join(' — ')); tr.querySelectorAll('img').forEach(i => addImg(i.getAttribute('src'))); }); return; }
    if (tag==='P' && isBoldTitle(el)){ newSec(textOf(el)); return; }
    addText(textOf(el)); el.querySelectorAll('img').forEach(i => addImg(i.getAttribute('src')));
  };
  [...doc.body.firstElementChild.children].forEach(walk);
  // длинные инструкции делим на части, пустые убираем
  const out = [];
  sections.filter(x => x.steps.length).forEach(x => {
    for (let i=0, part=1; i < x.steps.length; i += CONFIG.GUIDE_MAX_STEPS, part++){
      out.push({ title: x.steps.length > CONFIG.GUIDE_MAX_STEPS ? `${x.title} (часть ${part})` : x.title, steps: x.steps.slice(i, i+CONFIG.GUIDE_MAX_STEPS), on:true });
    }
  });
  return out;
}
function compressImg(src){
  return new Promise(res => {
    const im = new Image();
    im.onload = () => { const k = Math.min(1, CONFIG.IMG_MAX_SIDE / Math.max(im.naturalWidth, im.naturalHeight)); const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth*k)); c.height = Math.max(1, Math.round(im.naturalHeight*k)); const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0,0,c.width,c.height); x.drawImage(im, 0, 0, c.width, c.height);
      try { res(c.toDataURL('image/jpeg', 0.78)); } catch(e){ res(src); } };
    im.onerror = () => res(''); // форматы, которые браузер не показывает (EMF/WMF), пропускаем
    im.src = src;
  });
}
async function importDocx(file){
  const m = S.modal;
  if (!/\.docx$/i.test(file.name)){ m.error = 'Нужен файл .docx. Старый формат .doc откройте в Word и сохраните как .docx.'; render(); return; }
  m.stage = 'parsing'; m.error = ''; m.fileName = file.name; render();
  try {
    await loadScript(CONFIG.MAMMOTH_URL, 'mammoth');
    const res = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const secs = parseDocHtml(res.value, file.name);
    let total = 0, skipped = 0;
    for (const sec of secs) for (const st of sec.steps) if (st.img){ total++; st.img = await compressImg(st.img); if (!st.img) skipped++; }
    secs.forEach(sec => sec.steps = sec.steps.filter(st => st.t || st.img));
    if (!secs.length) throw new Error('В документе не нашлось текста. Проверьте, что это инструкция, а не скан-картинка.');
    Object.assign(m, { stage:'preview', sections:secs, photos: total-skipped, skipped });
  } catch(e){ m.stage = 'pick'; m.error = e.message || 'Не удалось прочитать файл.'; }
  if (S.modal === m) render();
}
function importModal(m){
  const body = m.stage==='parsing' ? `<div class="empty">Читаю «${esc(m.fileName)}» и уменьшаю фото…</div>`
    : m.stage==='preview' ? `<p class="small muted">Найдено инструкций: <b>${m.sections.length}</b>, фото: <b>${m.photos}</b>${m.skipped?`, не удалось прочитать ${m.skipped} (формат EMF/WMF — вставьте их в Word как JPG или PNG)`:''}. Снимите галочки с лишнего.</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:46vh;overflow:auto">${m.sections.map((sec,i) => `<label class="imp-row"><input type="checkbox" data-imp="${i}"${sec.on?' checked':''}>
        <div style="flex:1;min-width:0"><b>${esc(sec.title)}</b><div class="small muted">${sec.steps.length} шаг.${sec.steps.filter(x=>x.img).length?` · фото: ${sec.steps.filter(x=>x.img).length}`:''} · ${esc((sec.steps.find(x=>x.t)||{t:''}).t.slice(0,90))}</div>
        <div class="thumbs">${sec.steps.filter(x=>x.img).slice(0,4).map(x=>`<img src="${esc(x.img)}" alt="">`).join('')}</div></div></label>`).join('')}</div>
      <div class="field"><span class="small muted" style="font-weight:600">Если инструкция с таким названием уже есть</span><div class="chips">
        <label class="chip${m.mode==='replace'?' on':''}"><input type="radio" name="imp-mode" value="replace"${m.mode==='replace'?' checked':''} hidden>Заменить её</label>
        <label class="chip${m.mode==='add'?' on':''}"><input type="radio" name="imp-mode" value="add"${m.mode==='add'?' checked':''} hidden>Добавить как новую</label></div></div>`
    : `<label class="dropzone" for="imp-file"><b>Выберите файл Word (.docx)</b><span class="small muted">Заголовки → названия инструкций, пункты и абзацы → шаги, фото → к шагам</span><input type="file" id="imp-file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden></label>`;
  const n = m.sections ? m.sections.filter(x=>x.on).length : 0;
  return `<div class="overlay" data-act="close-bg"><div class="modal"><div class="modal-h"><h3>Загрузить инструкции из Word</h3><button class="iconbtn" data-act="close" aria-label="Закрыть">✕</button></div>
    ${m.error?`<div class="note warn">${esc(m.error)}</div>`:''}${body}
    <div class="modal-f">${m.stage==='preview'?'<button class="btn ghost" data-act="imp-again">Другой файл</button>':''}<span class="spacer"></span><button class="btn" data-act="close">Отмена</button>
      ${m.stage==='preview'?`<button class="btn primary" data-act="imp-go"${n?'':' disabled'}>Загрузить ${n}</button>`:''}</div></div></div>`;
}
async function doImport(){
  const m = S.modal; const chosen = m.sections.filter(x => x.on); let done = 0;
  try {
    for (const sec of chosen){
      const same = m.mode==='replace' ? S.data.guide.find(g => g.title.trim().toLowerCase()===sec.title.trim().toLowerCase()) : null;
      const g = await Api.call('saveGuide', { item:{ id: same ? same.id : '', title:sec.title, steps:sec.steps, sourceFile:m.fileName } });
      replaceIn(S.data.guide, g); done++;
    }
    S.modal = null; render(); toast(`Загружено инструкций: ${done}`);
  } catch(e){ S.modal = null; render(); toast((done?`Загружено ${done} из ${chosen.length}. `:'') + e.message, true); }
}

/* --- Команда (владелец): заявки, сотрудники, тренеры, карты --- */
function viewTeam(){
  const st = S.data.settings || {};
  const pend = pendingUsers();
  const staff = S.data.users.filter(u => u.status==='active' || (u.status!=='pending' && u.status!=='rejected'));
  const rejected = S.data.users.filter(u => u.status==='rejected');
  return `<div style="display:flex;flex-direction:column;gap:18px">
    <div class="toolbar"><h2>Команда и доступ</h2></div>
    <div class="card${pend.length?' attn':''}"><div class="card-h"><h3>Заявки на доступ ${pend.length?`<span class="badge b-over">${pend.length}</span>`:''}</h3><span class="small muted">сотрудник регистрируется сам на экране входа</span></div>
      ${pend.length ? `<div class="req-list">${pend.map(u => `<div class="req">
        <div class="req-main">${ava(u.id)}<div style="min-width:0"><b>${esc(u.fullName)}</b><div class="small muted">${esc(u.phone)} · ${esc(u.email)} · заявка ${fmtDT(u.createdAt)}</div></div></div>
        <div class="req-act"><label class="small muted" for="ap-${u.id}">Роль</label><select class="input pill" id="ap-${u.id}">${Object.entries(ROLES).map(([k,v]) => `<option value="${k}"${u.role===k?' selected':''}>${v}${u.role===k?' (выбрал сам)':''}</option>`).join('')}</select>
          <button class="btn sm primary" data-act="approve" data-id="${u.id}">Подтвердить</button><button class="btn sm danger" data-act="reject" data-id="${u.id}">Отклонить</button></div></div>`).join('')}</div>`
        : '<p class="muted small">Новых заявок нет. Как только кто-то зарегистрируется, здесь и на колокольчике в шапке появится уведомление.</p>'}
      <p class="small muted" style="margin-top:10px">В рабочей версии о каждой заявке владельцам дополнительно приходит письмо на почту.</p></div>
    <div class="card"><div class="card-h"><h3>Сотрудники</h3><button class="btn sm primary" data-act="user-add">+ Сотрудник</button><span class="small muted">роль определяет, какие разделы и задачи видит человек</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>ФИО</th><th>Контакты</th><th>Роль</th><th>Доступ</th><th></th></tr></thead><tbody>
      ${staff.map(u => `<tr><td><span style="display:inline-flex;gap:8px;align-items:center">${ava(u.id,true)}<span><b>${esc(u.fullName||u.name)}</b><div class="small muted">в панели: ${esc(u.name)}</div></span></span></td>
        <td class="small">${esc(u.phone||'—')}<br>${esc(u.email||u.login||'—')}</td>
        <td><select class="input pill" data-act="role" data-id="${u.id}" aria-label="Роль ${esc(u.name)}"${u.id===S.user.id?' disabled title="Свою роль поменяет другой владелец"':''}>${Object.entries(ROLES).map(([k,v])=>`<option value="${k}"${u.role===k?' selected':''}>${v}</option>`).join('')}</select>
          <div class="chips xs-wrap">${['admin','manager','smm'].filter(r => r!==u.role).map(r => { const on = (u.extraRoles||[]).includes(r); return `<button class="chip xs${on?' on':''}" data-act="extra-role" data-id="${u.id}" data-r="${r}" title="Совмещает должности">${on?'✓ ':'+ '}${ROLES[r].toLowerCase()}</button>`; }).join('')}</div></td>
        <td><button class="btn sm${u.active?'':' primary'}" data-act="toggle-user" data-id="${u.id}"${u.id===S.user.id?' disabled':''}>${u.active?'Отключить':'Включить'}</button></td>
        <td style="white-space:nowrap"><button class="btn sm ghost" data-act="user-edit" data-id="${u.id}">Изменить</button><button class="btn sm ghost" data-act="pass" data-id="${u.id}">Пароль</button></td></tr>`).join('')}
      </tbody></table></div>
      ${rejected.length ? `<p class="small muted" style="margin-top:8px">Отклонённые заявки: ${rejected.map(u => esc(u.fullName)).join(', ')}. <button class="btn ghost sm" data-act="approve" data-id="${rejected[0].id}">Восстановить первую</button></p>` : ''}
      <div class="note" style="margin-top:12px"><b>Кто что видит.</b> Владелец — всё. Совмещение (например, управляющий + администратор) добавляет права обеих должностей: человек попадает в график, отчёты и зарплату админов. Управляющий — задачи управления и команды, «Продажи и зарплата», удаляет и редактирует задачи, правит гайд и регулярные дела. Администратор — задачи команды и те, где он участник, отмечает выдачу конвертов, вносит отзывы. Любой видит задачу, если он в ней ответственный или помощник.</div>
    </div>
    <div class="card"><div class="card-h"><h3>Тренеры <span class="muted small num">${(S.data.trainers||[]).filter(t=>t.active).length}</span></h3><button class="btn sm primary" data-act="trainer-edit" data-id="">+ Тренер</button></div>
      <div class="tr-grid">${(S.data.trainers||[]).map(t => `<div class="tr-item${t.active?'':' off'}">${ava(t.id,true)}<div style="min-width:0;flex:1"><b>${esc(t.fullName)}</b><div class="small muted">${esc(t.phone||'телефон не указан')}${t.note?' · '+esc(t.note):''}</div></div>
        <button class="btn ghost sm" data-act="trainer-edit" data-id="${t.id}">Изменить</button></div>`).join('')}</div>
      <p class="small muted" style="margin-top:8px">Тренеры не входят в панель. Список нужен для выплат и для оплаты тренерам в разделе «Финансы».</p></div>
    <form class="card" id="maps-form"><div class="card-h"><h3>Карточки на картах</h3></div>
      <div class="grid3"><div class="field"><label for="mf-y">ID организации в Яндекс Картах</label><input class="input" id="mf-y" value="${esc(st.yandexOrgId)}"></div>
      <div class="field"><label for="mf-g">ID филиала в 2ГИС</label><input class="input" id="mf-g" value="${esc(st.twogisFirmId)}"></div>
      <div class="field"><label for="mf-c">Город в 2ГИС</label><input class="input" id="mf-c" value="${esc(st.twogisCity||'moscow')}"></div></div>
      <div class="modal-f" style="margin-top:12px"><button class="btn primary" type="submit">Сохранить</button></div></form>
  </div>`;
}

/* --- Модальные окна --- */
const closeX = '<button type="button" class="iconbtn" data-act="close" aria-label="Закрыть">✕</button>';
function renderModal(){
  const m = S.modal;
  if (m.type==='task') return taskModal(m);
  if (m.type==='export') return exportModal(m);
  if (m.type==='pass') return `<div class="overlay" data-act="close-bg"><form class="modal" id="pass-form" data-id="${m.id}" style="max-width:420px"><div class="modal-h"><h3>Новый пароль · ${esc(nameOf(m.id))}</h3>${closeX}</div>
    <div class="field"><label for="pw-1">Пароль (от 6 символов)</label><input class="input" id="pw-1" type="password" minlength="6" required autocomplete="new-password"></div>
    <div class="modal-f"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
  if (m.type==='confirm') return `<div class="overlay" data-act="close-bg"><div class="modal" style="max-width:440px"><h3>${esc(m.title)}</h3><p class="muted">${esc(m.text)}</p>
    <div class="modal-f"><button class="btn" data-act="close">Отмена</button><button class="btn primary" data-act="confirm-yes" style="background:var(--st-over);border-color:var(--st-over);color:#fff">${esc(m.yes||'Удалить')}</button></div></div></div>`;
  if (m.type==='tpls') return tplsModal();
  if (m.type==='ntf') return notifModal();
  if (m.type==='notifyset') return notifySetModal();
  if (m.type==='shifts') return shiftsModal(m);
  if (m.type==='move') return moveModal(m);
  if (m.type==='adduser') return addUserModal(m);
  if (m.type==='cfgren'){ const it = S.data.finConfig[m.kind].find(x => x.k===m.k) || {};
    return `<div class="overlay" data-act="close-bg"><form class="modal" id="cfgren-form" style="max-width:460px"><div class="modal-h"><h3>Переименовать</h3>${closeX}</div>
      <div class="field"><label for="cr-n">Название</label><input class="input" id="cr-n" value="${esc(it.name||'')}" required></div>
      ${m.kind==='income' ? `<div class="field"><label for="cr-g">Группа</label><input class="input" id="cr-g" value="${esc(it.group||'')}" list="cr-groups"><datalist id="cr-groups">${[...new Set(S.data.finConfig.income.map(x => x.group))].map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>` : ''}
      <div class="modal-f"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`; }
  if (m.type==='repfields') return repFieldsModal(m);
  if (m.type==='tpl') return tplModal(m.tpl || {});
  if (m.type==='import') return importModal(m);
  if (m.type==='user') return userModal(m);
  if (m.type==='trainer') return trainerModal(m);
  if (m.type==='sale') return saleModal(m);
  if (m.type==='penalty') return penaltyModal(m);
  if (m.type==='img') return `<div class="overlay" data-act="close-bg" style="align-items:center"><div class="modal wide" style="padding:12px"><img src="${esc(m.src)}" alt="Фото к шагу" style="width:100%;border-radius:10px"><div class="modal-f"><button class="btn" data-act="close">Закрыть</button></div></div></div>`;
  return '';
}

const dayChips = (name, days) => `<div class="chips" id="${name}">${[1,2,3,4,5,6,0].map(d=>`<label class="chip${days.includes(d)?' on':''}"><input type="checkbox" value="${d}"${days.includes(d)?' checked':''} hidden>${DOW[d]}</label>`).join('')}</div>`;
const peopleOptions = (cur, emptyLabel, onlySmm) => `<option value="">${emptyLabel}</option>` + S.data.users.filter(u => u.active && u.status==='active' && (!onlySmm || hasRole(u,'smm')))
  .map(u => `<option value="${u.id}"${cur===u.id?' selected':''}>${esc(u.name)} · ${rolesOf(u).map(r => ROLES[r].toLowerCase()).join(' + ')}</option>`).join('');
const parentCandidates = t => S.data.tasks.filter(x => x.id!==t.id && !x.parentId && !x.recurringId && isOpen(x) && !(t.id && x.parentId===t.id))
  .sort((a,b) => mineRank(a)-mineRank(b) || a.title.localeCompare(b.title,'ru'));

function linkedSection(t, canEdit){
  const kids = childrenOf(t.id);
  const cands = canEdit ? S.data.tasks.filter(x => x.id!==t.id && !x.parentId && !x.recurringId && isOpen(x) && !hasLinks(x) && x.id!==t.parentId) : [];
  if (!kids.length && !canEdit) return '';
  if (t.parentId && !kids.length) return '';
  return `<div class="field"><span class="small muted" style="font-weight:600">Связанные задачи${kids.length?` · выполнено ${kids.filter(k=>k.status==='done').length} из ${kids.filter(k=>k.status!=='cancel').length}`:''}</span>
    ${kids.length ? linkBar(t) + `<div class="kids">${kids.map(k => `<div class="kid"><span class="badge b-${dispStatus(k)}">${STATUS[dispStatus(k)]}</span><span class="kt" data-act="edit" data-id="${k.id}">${esc(k.title)}</span>
      <span class="small muted">${k.assignee?esc(nameOf(k.assignee)):'Админ смены'} · до ${fmtDayShort(k.due)}</span>${canEdit?`<button type="button" class="btn ghost sm" data-act="unlink" data-id="${k.id}">отвязать</button>`:''}</div>`).join('')}</div>`
      : '<p class="small muted">Свяжите с этой задачей другие — прогресс будет считаться по их выполнению.</p>'}
    ${canEdit ? `<div class="toolbar"><button type="button" class="btn sm" data-act="new-child" data-id="${t.id}">+ Новая связанная задача</button>
      ${cands.length ? `<select class="input pill" id="link-existing" data-id="${t.id}" aria-label="Привязать существующую задачу"><option value="">Привязать существующую…</option>${cands.map(c => `<option value="${c.id}">${esc(c.title.slice(0,60))}</option>`).join('')}</select>` : ''}</div>` : ''}</div>`;
}

function taskModal(m){
  const t = m.task; const isNew = !t.id;
  const canEdit = isNew || Rules.canEditTask(S.user, t);
  const canDel = !isNew && Rules.canDeleteTask(S.user, t);
  const locked = !isNew && Rules.isLockedFor(S.user, t);
  const levels = Rules.createLevels(S.user).concat(t.level && !Rules.createLevels(S.user).includes(t.level) ? [t.level] : []);
  const lvl = t.level || levels[levels.length-1];
  const smmSelf = lvl==='smm' && !isOwner(S.user) && !isManager(S.user); // СММ ставит задачу только себе
  const canRepeat = isNew && Rules.canEditTemplates(S.user) && !t.parentId;
  const parent = t.parentId ? S.data.tasks.find(x => x.id===t.parentId) : null;
  const blocks = [...new Set(S.data.tasks.map(x => x.block).filter(Boolean))].filter(b => b!=='Регулярно');
  const footerInfo = !isNew ? `<div class="small muted">Создал(а) ${esc(nameOf(t.createdBy))} · ${fmtDT(t.createdAt)}${t.late?' · <span style="color:var(--st-over)">сделано с опозданием</span>':''}</div>
      ${t.history?.length ? `<details class="hist-d"><summary class="small">История изменений · ${t.history.length}</summary><div class="hist">${[...t.history].reverse().map(h => `<div><b>${fmtDT(h.at)}</b> ${esc(nameOf(h.by))}: ${esc(h.text)}</div>`).join('')}</div></details>` : ''}` : '';
  if (!canEdit){
    // Просмотр: админ меняет статус, пишет комментарии; редактировать поля могут владелец, управляющий и автор
    const ds = dispStatus(t);
    return `<div class="overlay" data-act="close-bg"><div class="modal" id="task-view"><div class="modal-h"><h3>${esc(t.title)}</h3>${closeX}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="badge b-${ds}">${STATUS[ds]}</span>${t.late?'<span class="tag late">сделано с опозданием</span>':''}${t.block?`<span class="tag">${esc(t.block)}</span>`:''}</div>
      ${t.desc ? `<p>${esc(t.desc)}</p>` : ''}
      <dl class="dl"><dt>Ответственный</dt><dd>${t.assignee?esc(nameOf(t.assignee)):'Админ смены'}</dd>${t.helper?`<dt>Помощник</dt><dd>${esc(nameOf(t.helper))}</dd>`:''}
        <dt>Старт</dt><dd>${fmtDay(t.start||t.due)}</dd><dt>Срок</dt><dd>${fmtDay(t.due)}, ${t.dueTime}</dd><dt>Приоритет</dt><dd>${PRIO[t.priority]}</dd>
        ${parent?`<dt>Часть задачи</dt><dd><span class="tag link" data-act="edit" data-id="${parent.id}">${esc(parent.title)}</span></dd>`:''}</dl>
      ${locked ? `<div class="note warn">Задачу закрыл(а) ${esc(nameOf(t.doneBy))}. Снять «Готово» может только он(а), автор или владелец. Вы можете вернуть её в работу.</div>` : ''}
      ${t.checklist?.length ? checklistBlock(t, true) : ''}
      ${linkedSection(t, false)}
      ${movesList(t)}
      ${commentsBlock(t)}
      ${footerInfo}
      <div class="modal-f">${isOpen(t) ? `<button class="btn" data-act="move" data-id="${t.id}">Перенести</button>` : ''}${isOpen(t) ? `<button class="btn primary" data-act="quick-done" data-id="${t.id}">✓ Готово</button>` : t.status==='done' ? `<button class="btn" data-act="reopen" data-id="${t.id}">Вернуть в работу</button>` : ''}<span class="spacer"></span><button class="btn" data-act="close">Закрыть</button></div></div></div>`;
  }
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="task-form" data-id="${esc(t.id||'')}" novalidate>
    <div class="modal-h"><h3>${isNew?(t.parentId?'Новая связанная задача':'Новая задача'):'Редактирование задачи'}</h3>${closeX}</div>
    ${locked ? `<div class="note warn">Задачу закрыл(а) ${esc(nameOf(t.doneBy))}. Снять «Готово» может только он(а), автор или владелец. Вы можете вернуть её в работу.</div>` : ''}
    <div class="field"><label for="tf-title">Название</label><input class="input" id="tf-title" value="${esc(t.title)}" required maxlength="160"></div>
    <div class="field"><label for="tf-desc">Что конкретно сделать</label><textarea class="input" id="tf-desc" rows="3">${esc(t.desc)}</textarea></div>
    <div class="grid3">
      <div class="field"><label for="tf-level">Раздел (кто видит)</label><select class="input" id="tf-level"${t.recurringId?' disabled':''}>${levels.map(l=>`<option value="${l}"${lvl===l?' selected':''}>${LEVELS[l]}</option>`).join('')}</select></div>
      <div class="field"><label for="tf-ass">Ответственный</label><select class="input" id="tf-ass">${smmSelf ? `<option value="${S.user.id}" selected>${esc(S.user.name)} (вы)</option>` : peopleOptions(t.assignee, lvl==='team'?'Админ смены':'Не назначен', lvl==='smm')}</select></div>
      <div class="field"><label for="tf-help">Помощник</label><select class="input" id="tf-help">${smmSelf ? '<option value="">—</option>' : peopleOptions(t.helper, '—')}</select></div>
    </div>
    <p class="small muted" style="margin-top:-4px">Ответственный и помощник видят задачу, даже если раздел выше их роли.</p>
    ${canRepeat ? `<label class="repeat-toggle"><input type="checkbox" id="tf-repeat"${m.repeat?' checked':''}> <span><b>Регулярная задача</b> — повторять по дням недели</span></label>
      ${m.repeat ? `<div class="field">${dayChips('tf-days', m.days || [1,2,3,4,5])}</div>` : ''}` : ''}
    <div class="grid3">
      ${m.repeat ? '' : `<div class="field"><label for="tf-start">Старт</label><input class="input" id="tf-start" type="date" value="${t.start||t.due}"></div>
      <div class="field"><label for="tf-due">Срок</label><input class="input" id="tf-due" type="date" value="${t.due}" required></div>`}
      <div class="field"><label for="tf-time">Дедлайн, время</label><input class="input" id="tf-time" type="time" value="${t.dueTime}" required></div>
      <div class="field"><label for="tf-prio">Приоритет</label><select class="input" id="tf-prio">${Object.entries(PRIO).map(([k,v])=>`<option value="${k}"${t.priority===k?' selected':''}>${v}</option>`).join('')}</select></div>
      ${m.repeat ? '' : `<div class="field"><label for="tf-status">Статус</label><select class="input" id="tf-status">${['todo','work','wait','done','cancel'].map(s=>`<option value="${s}"${t.status===s?' selected':''}${locked&&s!=='work'&&s!=='done'?' disabled':''}>${STATUS[s]}</option>`).join('')}</select></div>`}
      <div class="field"><label for="tf-block">Блок (тема)</label><input class="input" id="tf-block" list="tf-blocks" value="${esc(t.block==='Регулярно'?'':t.block)}" placeholder="Продажи, Новый год…"><datalist id="tf-blocks">${blocks.map(b=>`<option value="${esc(b)}">`).join('')}</datalist></div>
    </div>
    ${m.repeat || hasLinks(t) ? '' : parentPicker(t)}
    ${(isOwner(S.user) || isManager(S.user)) && !hasLinks(t) ? checklistEditor(m, t.checklist) : (t.checklist?.length && !isNew ? checklistBlock(t, true) : '')}
    ${!isNew && !t.parentId && !t.checklist?.length ? linkedSection(t, true) : ''}
    ${!isNew ? movesList(t) : ''}
    ${isNew && m.repeat ? '' : isNew ? `<div class="field"><label for="tf-com">Комментарий</label><textarea class="input" id="tf-com" rows="2" placeholder="Необязательно: уточнение, ссылка, договорённость"></textarea></div>` : commentsBlock(t)}
    ${footerInfo}
    <div id="tf-err" class="small" style="color:var(--st-over)" role="alert"></div>
    <div class="modal-f">${canDel?`<button type="button" class="btn danger" data-act="del-task" data-id="${t.id}">Удалить</button>`:''}<span class="spacer"></span><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">${isNew?(m.repeat?'Создать регулярную':'Создать'):'Сохранить'}</button></div>
  </form></div>`;
}

function movesList(t){
  if (!t.moves?.length) return '';
  return `<div class="field"><span class="small muted" style="font-weight:600">Переносы · ${t.moves.length}</span><div class="moves">${t.moves.map(x => `<div><b>${fmtDayShort(x.from)} ${x.fromTime} → ${fmtDayShort(x.to)} ${x.toTime}</b> · ${esc(nameOf(x.by))}, ${fmtDT(x.at)}${x.reason?` · ${esc(x.reason)}`:''}</div>`).join('')}</div></div>`;
}
function moveModal(m){
  const t = S.data.tasks.find(x => x.id===m.id); const T = todayStr(); const base = t.due < T ? T : t.due;
  const nextMon = (() => { const d = parseYmd(base); d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7)); return ymd(d); })();
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="move-form" data-id="${t.id}" style="max-width:480px"><div class="modal-h"><h3>Перенести задачу</h3>${closeX}</div>
    <p><b>${esc(t.title)}</b><br><span class="small muted">Сейчас: ${fmtDay(t.due)}, ${t.dueTime}${t.moves?.length?` · уже переносили ${t.moves.length} раз`:''}</span></p>
    <div class="chips"><button type="button" class="chip" data-act="mv-quick" data-d="${addDays(T,1)}">Завтра</button><button type="button" class="chip" data-act="mv-quick" data-d="${addDays(base,2)}">+2 дня</button><button type="button" class="chip" data-act="mv-quick" data-d="${nextMon}">Следующий пн</button><button type="button" class="chip" data-act="mv-quick" data-d="${addDays(base,7)}">Через неделю</button></div>
    <div class="grid2"><div class="field"><label for="mv-d">Новая дата</label><input class="input" type="date" id="mv-d" value="${addDays(base,1)}" required></div><div class="field"><label for="mv-t">Время</label><input class="input" type="time" id="mv-t" value="${t.dueTime}"></div></div>
    <div class="field"><label for="mv-r">Причина (необязательно)</label><input class="input" id="mv-r" maxlength="200" placeholder="Например: клиент перенёс встречу"></div>
    <p class="small muted">Перенос отметится на карточке и в истории задачи: кто, когда и с какой даты.</p>
    <div class="modal-f"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Перенести</button></div></form></div>`;
}
/* «Входит в общую задачу»: поиск по названию — начните вводить текст */
function parentPicker(t){
  const cands = parentCandidates(t); const cur = cands.find(p => p.id===t.parentId) || S.data.tasks.find(p => p.id===t.parentId);
  return `<div class="field pp"><label for="tf-parent-q">Входит в общую задачу</label>
    <input class="input" id="tf-parent-q" autocomplete="off" placeholder="Начните вводить название… (пусто — самостоятельная задача)" value="${esc(cur?.title||'')}">
    <input type="hidden" id="tf-parent" value="${esc(t.parentId||'')}">
    <div class="pp-list" id="pp-list" hidden></div></div>`;
}
function parentMatches(q, t){
  const norm = x => x.toLowerCase().replace(/ё/g,'е'); const words = norm(q).split(/\s+/).filter(Boolean);
  return parentCandidates(t).filter(p => words.every(w => norm(p.title).includes(w))).slice(0,8);
}
/* Пункты задачи — каждый в своём поле; при выполнении у каждого свой ползунок */
function checklistEditor(m, list){
  if (!m.cl) m.cl = (list||[]).map((x,i) => typeof x==='string' ? { id:'n'+i+Date.now().toString(36), text:x, p:0, done:false } : { ...x });
  return `<div class="field" id="cle-box"><span class="small muted" style="font-weight:600">Пункты задачи (подзадачи) — необязательно</span>
    <div class="cle">${m.cl.map((x,i) => `<div class="cle-row"><span class="cle-n">${i+1}</span><input class="input" data-cle="${i}" value="${esc(x.text)}" placeholder="Например: проверить чистоту зеркал" aria-label="Пункт ${i+1}">
      ${x.p ? `<span class="small muted num">${itemP(x)}%</span>` : ''}<button type="button" class="iconbtn sm" data-act="cle-up" data-i="${i}" aria-label="Выше"${i===0?' disabled':''}>↑</button><button type="button" class="iconbtn sm" data-act="cle-del" data-i="${i}" aria-label="Удалить пункт ${i+1}">✕</button></div>`).join('')}</div>
    <button type="button" class="btn sm" data-act="cle-add" style="align-self:flex-start">+ Пункт</button>
    <span class="small muted">Если пункты есть, каждый выполняется своим ползунком или галочкой в любом порядке, общий прогресс считается сам.</span></div>`;
}
/* Перерисовать только список пунктов, не трогая остальные поля формы */
function redrawCl(){ const box = document.getElementById('cle-box'); if (box) box.outerHTML = checklistEditor(S.modal); }
function addUserModal(m){
  const d = m.d || (m.d = { role:'admin', extra:[], avatar:'' });
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="adduser-form" style="max-width:600px"><div class="modal-h"><h3>Новый сотрудник</h3>${closeX}</div>
    <p class="small muted">Сотрудник сможет войти сразу, без подтверждения. Передайте ему логин и временный пароль — сменить пароль можно в «Команда» → «Пароль».</p>
    <div class="field"><label for="au-fio">ФИО</label><input class="input" id="au-fio" required placeholder="Фамилия Имя Отчество"></div>
    <div class="field"><span class="small muted" style="font-weight:600">Роль</span><div class="chips">${Object.entries(ROLES).map(([k,v]) => `<label class="chip${d.role===k?' on':''}"><input type="radio" name="au-role" value="${k}"${d.role===k?' checked':''} hidden>${v}</label>`).join('')}</div></div>
    <div class="field"><span class="small muted" style="font-weight:600">Совмещает (необязательно)</span><div class="chips">${['admin','manager','smm'].map(r => `<label class="chip${d.extra.includes(r)?' on':''}"><input type="checkbox" name="au-extra" value="${r}"${d.extra.includes(r)?' checked':''} hidden>${ROLES[r]}</label>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label for="au-ph">Телефон</label><input class="input" id="au-ph" type="tel" inputmode="tel" placeholder="+7 900 123-45-67"></div>
      <div class="field"><label for="au-em">Почта</label><input class="input" id="au-em" type="email" placeholder="name@mail.ru"></div>
      <div class="field"><label for="au-lg">Логин для входа</label><input class="input" id="au-lg" autocomplete="off" placeholder="по умолчанию — почта"></div>
      <div class="field"><label for="au-pw">Временный пароль</label><input class="input" id="au-pw" autocomplete="new-password" value="${esc(m.pw || (m.pw = 'sp-' + Math.random().toString(36).slice(2,8)))}" required></div></div>
    <div class="field"><span class="small muted" style="font-weight:600">Аватар</span>${avatarPicker(d.avatar, 'au-avatar')}</div>
    <div class="modal-f"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Добавить</button></div></form></div>`;
}
function commentsBlock(t){
  const list = t.comments || [];
  return `<div class="field" id="cmt-block"><span class="small muted" style="font-weight:600">Комментарии${list.length?` · ${list.length}`:''}</span>
    ${list.length ? `<div class="cmts" id="cmt-list">${list.map(c => `<div class="cmt${c.by===S.user.id?' mine':''}">${ava(c.by,true)}<div class="bubble"><div class="small"><b>${esc(nameOf(c.by))}</b> <span class="muted">${fmtDT(c.at)}</span>
      ${Rules.canDeleteComment(S.user,c)?`<button type="button" class="btn ghost sm" style="min-height:0;padding:0 6px;float:right" data-act="del-comment" data-id="${t.id}" data-cid="${c.id}">удалить</button>`:''}</div><p>${esc(c.text)}</p></div></div>`).join('')}</div>`
      : '<p class="small muted">Пока без комментариев. Напишите, что сделано, что мешает или о чём договорились.</p>'}
    <div class="cmt-new"><textarea class="input" id="cmt-text" rows="2" maxlength="1000" placeholder="Написать комментарий… (Ctrl+Enter — отправить)"></textarea><button type="button" class="btn primary" data-act="add-comment" data-id="${t.id}">Отправить</button></div></div>`;
}

function tplsModal(){
  const list = S.data.templates.slice().sort((a,b) => (b.active-a.active) || a.dueTime.localeCompare(b.dueTime));
  return `<div class="overlay" data-act="close-bg"><div class="modal wide"><div class="modal-h"><h3>Регулярные дела</h3>${closeX}</div>
    <p class="small muted">Создаются сами на ${CONFIG.GEN_DAYS_AHEAD} дней вперёд в выбранные дни. Изменения применяются к будущим, ещё не начатым делам.</p>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дело</th><th>Дни</th><th>Кто</th><th>До</th><th>Раздел</th><th></th></tr></thead><tbody>
    ${list.map(t => `<tr class="${t.active?'':'muted'}"><td><b>${esc(t.title)}</b>${t.active?'':' <span class="tag">на паузе</span>'}</td><td class="small">${t.days.length===7?'каждый день':t.days.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DOW[d]).join(', ')}</td>
      <td>${t.assignee?esc(nameOf(t.assignee)):'Админ смены'}</td><td class="num">${t.dueTime}</td><td class="small">${LEVELS[t.level]}</td>
      <td style="white-space:nowrap"><button class="btn sm ghost" data-act="tpl-edit" data-id="${t.id}">Изменить</button><button class="btn sm ghost" data-act="toggle-tpl" data-id="${t.id}">${t.active?'Пауза':'Включить'}</button></td></tr>`).join('')}
    </tbody></table></div>
    <div class="modal-f"><button class="btn" data-act="close">Закрыть</button><button class="btn primary" data-act="tpl-edit" data-id="">+ Регулярное дело</button></div></div></div>`;
}
function tplModal(tp){
  const levels = Rules.levelsFor(S.user);
  const days = tp.days || [1,2,3,4,5,6,0];
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="tpl-form" data-id="${esc(tp.id||'')}"><div class="modal-h"><h3>${tp.id?'Регулярное дело':'Новое регулярное дело'}</h3>${closeX}</div>
    <div class="field"><label for="rp-t">Название</label><input class="input" id="rp-t" value="${esc(tp.title||'')}" required></div>
    <div class="field"><label for="rp-d">Описание</label><input class="input" id="rp-d" value="${esc(tp.desc||'')}"></div>
    ${checklistEditor(S.modal, (tp.checklist||[]).map(text => ({ text })))}
    <div class="field"><span class="small muted" style="font-weight:600">Дни недели</span>${dayChips('rp-days', days)}</div>
    <div class="grid2"><div class="field"><label for="rp-l">Раздел</label><select class="input" id="rp-l">${levels.map(l=>`<option value="${l}"${(tp.level||'team')===l?' selected':''}>${LEVELS[l]}</option>`).join('')}</select></div>
    <div class="field"><label for="rp-a">Ответственный</label><select class="input" id="rp-a">${peopleOptions(tp.assignee||'', 'Админ смены')}</select></div>
    <div class="field"><label for="rp-h">Помощник</label><select class="input" id="rp-h">${peopleOptions(tp.helper||'', '—')}</select></div>
    <div class="field"><label for="rp-tm">До (время)</label><input class="input" id="rp-tm" type="time" value="${tp.dueTime||CONFIG.DEFAULT_DUE_TIME}"></div>
    <div class="field"><label for="rp-p">Приоритет</label><select class="input" id="rp-p">${Object.entries(PRIO).map(([k,v])=>`<option value="${k}"${(tp.priority||'mid')===k?' selected':''}>${v}</option>`).join('')}</select></div></div>
    <div class="modal-f">${tp.id?`<button type="button" class="btn danger" data-act="tpl-del" data-id="${tp.id}">Удалить</button>`:''}<span class="spacer"></span><button type="button" class="btn" data-act="tpls">Назад</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
}
function userModal(m){
  const u = userById(m.id) || {};
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="user-form" data-id="${esc(m.id)}" style="max-width:520px"><div class="modal-h"><h3>Сотрудник</h3>${closeX}</div>
    <div class="field"><label for="uf-fio">ФИО</label><input class="input" id="uf-fio" value="${esc(u.fullName||u.name||'')}" required></div>
    <div class="field"><span class="small muted" style="font-weight:600">Аватар</span>${avatarPicker(u.avatar, 'set-avatar', u.id)}</div>
    <div class="grid2"><div class="field"><label for="uf-ph">Телефон</label><input class="input" id="uf-ph" type="tel" value="${esc(u.phone||'')}"></div>
    <div class="field"><label for="uf-em">Почта</label><input class="input" id="uf-em" type="email" value="${esc(u.email||'')}"></div></div>
    <div class="modal-f"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
}
function trainerModal(m){
  const t = (S.data.trainers||[]).find(x => x.id===m.id) || {};
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="trainer-form" data-id="${esc(m.id||'')}" style="max-width:520px"><div class="modal-h"><h3>${t.id?'Тренер':'Новый тренер'}</h3>${closeX}</div>
    <div class="field"><label for="trf-n">ФИО</label><input class="input" id="trf-n" value="${esc(t.fullName||'')}" required></div>
    <div class="grid2"><div class="field"><label for="trf-p">Телефон</label><input class="input" id="trf-p" type="tel" value="${esc(t.phone||'')}"></div>
    <div class="field"><label for="trf-note">Заметка (направления, ставка)</label><input class="input" id="trf-note" value="${esc(t.note||'')}"></div></div>
    <label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="trf-a"${t.active===false?'':' checked'} style="accent-color:var(--accent)"> Работает в студии</label>
    <div class="modal-f"><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
}

/* --- Продажи и зарплата администраторов (управляющий и владельцы) ---
   Расчёт по Договору администратора: Приложение 1 (смены, проценты, KPI) и Приложение 2 (неустойки). */
const monthName = m => { const [y,mm] = m.split('-').map(Number); return `${MONTHS[mm-1]} ${y}`; };
const adminsList = () => S.data.users.filter(u => isAdminRole(u) && u.status==='active' && u.active);
/* На смену можно поставить администратора, управляющего или владельца */
const shiftStaff = () => S.data.users.filter(u => u.status==='active' && u.active && (isOwner(u) || isManager(u) || isAdminRole(u)));
/* В расчёт зарплаты попадают администраторы и все, кроме владельцев, у кого есть смены в месяце */
/* В расчёт по договору попадают администраторы (кроме владельцев). Свою зарплату управляющий здесь не видит */
const payrollStaff = M => S.data.users.filter(u => u.status==='active' && u.active && !isOwner(u) && isAdminRole(u) && (isOwner(S.user) || !isManager(u)));
const salesOf = (month, sellerId) => (S.data.sales||[]).filter(s => s.date.slice(0,7)===month && (!sellerId || s.sellerId===sellerId));
const isEmpty = v => v===undefined || v===null || v==='';

function calcPayroll(month, adminId){
  const res = calcPayrollRaw(month, adminId); const man = ((((S.data.payroll||{})[month]||{})[adminId])||{}).manual;
  if (isEmpty(man)) return res;
  return { ...res, calcNet: res.net, net: Number(man), manualSet:true };
}
function calcPayrollRaw(month, adminId){
  const pr = ((S.data.payroll||{})[month]||{})[adminId] || { shifts:{}, kpi:{}, bonus:0 };
  // Смены берутся из графика: тип по времени, половинчатая смена — по коэффициенту
  const rates = { ...DEFAULT_RATES, ...((S.data.settings||{}).shiftRates||{}) };
  const list = (S.data.schedule||[]).filter(x => x.adminId===adminId && x.date.slice(0,7)===month).sort((a,b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .map(x => ({ ...x, ...shiftPay(x, rates) }));
  const shifts = SHIFT_TYPES.map(t => { const l = list.filter(x => x.kind===t.k); return { ...t, pay:rates[t.k], n:l.reduce((a,x) => a+x.units, 0), whole:l.filter(x => !x.half).length, halves:l.filter(x => x.half).length, sum:l.reduce((a,x) => a+x.pay, 0) }; });
  const adjust = Number(pr.shiftAdjust)||0;
  const nShifts = shifts.reduce((a,x) => a+x.n, 0), fixed = shifts.reduce((a,x) => a+x.sum, 0) + adjust;
  const worked = list.filter(x => x.date <= todayStr()).length;
  const sales = salesOf(month, adminId).map(s => ({ ...s, c:commission(s) })).sort((a,b) => a.date.localeCompare(b.date));
  const percent = sales.reduce((a,s) => a+s.c.sum, 0), salesTotal = sales.reduce((a,s) => a+s.price, 0);
  const auto = {
    reviews: (S.data.reviews||[]).filter(r => r.origin!=='map' && r.createdBy===adminId && r.date.slice(0,7)===month).length,
    returns: sales.filter(s => PRODUCT[s.product]?.group==='ab' && s.clientType==='return' && s.crmTouch).length,
    commercial: sales.filter(s => PRODUCT[s.product]?.group==='commercial').length,
    personal: sales.filter(s => PRODUCT[s.product]?.group==='personal').length
  };
  const kpi = KPIS.map(k => { const raw = pr.kpi?.[k.k]; const manual = !isEmpty(raw);
    const v = manual ? Number(raw) : (k.auto ? auto[k.k] : null); return { ...k, v, manual, autoV:auto[k.k], bonus: v===null ? 0 : k.calc(v) }; });
  const plan = Number((S.data.plans||{})[month])||0;
  const best = Math.max(0, ...adminsList().map(a => salesOf(month, a.id).reduce((x,s) => x+s.price, 0)));
  const planOk = plan>0 && salesTotal>=plan && salesTotal===best;
  const eligible = nShifts >= KPI_MIN_SHIFTS;
  const kpiRaw = kpi.reduce((a,k) => a+k.bonus, 0) + (planOk ? KPI_PLAN_BONUS : 0);
  const kpiSum = eligible ? Math.min(kpiRaw, KPI_MAX) : 0;
  const bonus = Number(pr.bonus)||0;
  const gross = fixed + percent + kpiSum + bonus;
  const allPen = S.data.penalties||[];
  const pens = allPen.filter(p => p.adminId===adminId && p.date.slice(0,7)===month).map(p => ({ ...p, a:penaltyAmount(p, allPen) })).sort((a,b) => a.date.localeCompare(b.date));
  const penRaw = pens.reduce((a,p) => a+p.a.sum, 0), penCap = Math.floor(gross*0.5), penApplied = Math.min(penRaw, penCap);
  const net = gross - penApplied;
  const counted = pens.filter(p => p.a.sum>0).length;
  const staffRate = ((S.data.rates||{}).staff||{})[adminId];
  const advOverride = !isEmpty(pr.advance) ? Number(pr.advance) : null;
  if (staffRate && staffRate.mode==='shift'){ // только фикс за смену: проценты и KPI не начисляются, неустойки — по договору
    const g = fixed + bonus; const pc = Math.floor(g*0.5), pa = Math.min(penRaw, pc);
    return { pr, list, rates, adjust, worked, shifts, nShifts, fixed, sales, percent:0, salesTotal, auto, kpi, plan, best, planOk:false, eligible:false, kpiRaw:0, kpiSum:0, bonus, gross:g, pens, penRaw, penCap:pc, penApplied:pa, net:g-pa,
      advance: advOverride ?? Math.round(fixed*0.3), advanceAuto: Math.round(fixed*0.3), systematic: counted>=3, shiftMode:true, mode:'shift' }; }
  if (staffRate && staffRate.mode==='fixed'){ const amt = Number(staffRate.amount)||0;
    return { pr, list, rates, adjust, worked, shifts, nShifts, fixed:amt, sales, percent:0, salesTotal, auto, kpi, plan, best, planOk:false, eligible:false, kpiRaw:0, kpiSum:0, bonus, gross:amt+bonus, pens, penRaw:0, penCap:0, penApplied:0, net:amt+bonus, advance: advOverride ?? Math.round(amt*0.3), advanceAuto:Math.round(amt*0.3), systematic:false, fixedMode:true, mode:'fixed' }; }
  return { pr, list, rates, adjust, worked, shifts, nShifts, fixed, sales, percent, salesTotal, auto, kpi, plan, best, planOk, eligible, kpiRaw, kpiSum, bonus, gross, pens, penRaw, penCap, penApplied, net,
    advance: advOverride ?? Math.round(fixed*0.3), advanceAuto: Math.round(fixed*0.3), systematic: counted>=3, mode:'contract' };
}

function viewSal(){
  const M = S.salMonth; const admins = payrollStaff(M); const owner = isOwner(S.user);
  if (!S.salAdmin || !admins.some(a => a.id===S.salAdmin)) S.salAdmin = admins[0]?.id || '';
  const sub = [['pay','Администраторы'], ...(owner ? [['mgr','Управляющий'],['tr','Тренеры'],['smm','СММ']] : []), ['sales','Журнал продаж'], ['pen','Неустойки']];
  if (!sub.some(x => x[0]===S.salTab)) S.salTab = 'pay';
  const tab = S.salTab;
  const head = `<div class="toolbar"><h2>Продажи и зарплата</h2><span class="spacer"></span>
      <label class="small muted" for="f-salmonth">Месяц</label><input class="input pill" type="month" id="f-salmonth" value="${M}"></div>
    <div class="subtabs" role="tablist">${sub.map(([k,l]) => `<button class="subtab${tab===k?' on':''}" data-act="sal-tab" data-k="${k}" role="tab" aria-selected="${tab===k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab==='sales') body = salesJournal(M);
  else if (tab==='pen') body = penaltiesJournal(M);
  else if (PAY_KINDS[tab]) body = payKindScreen(tab, M);
  else body = payrollScreen(M, admins);
  return `<div style="display:flex;flex-direction:column;gap:16px">${head}${body}</div>`;
}

/* --- Начисления тренерам, управляющему и СММ (только владелец).
   Та же запись показывается в «Финансах»: поменяли сумму там — она поменяется здесь, и наоборот. --- */
const PAY_DEFAULT = { tr:{ mode:'perClass', amount:0 }, mgr:{ mode:'fixed', amount:0, pct:0 }, smm:{ mode:'fixed', amount:0 } };
const payRecord = (M, key) => (((S.data.pay||{})[M])||{})[key] || {};
function revenueOf(M){
  const f = (S.data.finance||{})[M]; const manual = f ? Object.values(f.income||{}).reduce((a,v) => a + (Number(v)||0), 0) : 0;
  return salesOf(M).reduce((a,x) => a + x.price, 0) + manual;
}
function payAccrual(M, key){
  const [kind, id] = key.split(':'); const r = { ...PAY_DEFAULT[kind], ...((((S.data.rates||{})[PAY_KINDS[kind].rates])||{})[id] || {}) };
  const rec = payRecord(M, key); const units = Number(rec.units)||0, bonus = Number(rec.bonus)||0;
  const revenue = kind==='mgr' ? revenueOf(M) : 0;
  const base = kind==='mgr' ? (r.mode==='params' ? r.amount + Math.round(revenue*(Number(r.pct)||0)/100) : r.amount) : (r.mode==='fixed' ? r.amount : r.amount*units);
  const calc = base + bonus; const manual = isEmpty(rec.manual) ? null : Number(rec.manual);
  return { key, kind, id, rate:r, units, bonus, calc, manual, sum: manual ?? calc, revenue };
}
function payPeople(kind){
  if (kind==='tr') return (S.data.trainers||[]).filter(t => t.active).map(t => ({ id:t.id, name:t.fullName, sub:t.note||'' }));
  if (kind==='mgr') return S.data.users.filter(u => u.status==='active' && isManager(u) && !isOwner(u)).map(u => ({ id:u.id, name:u.fullName||u.name, sub:rolesOf(u).map(r => ROLES[r].toLowerCase()).join(' + ') }));
  return S.data.users.filter(u => u.status==='active' && hasRole(u,'smm')).map(u => ({ id:u.id, name:u.fullName||u.name, sub: rolesOf(u).length>1 ? 'совмещает: '+rolesOf(u).map(r => ROLES[r].toLowerCase()).join(' + ')+' — СММ оплачивается отдельно' : 'СММ' }));
}
const paidTo = (M, id) => (S.data.payouts||[]).filter(p => p.recipient===id && p.issuedAt && payoutMonth(p)===M).reduce((a,p) => a + (Number(p.amount)||0), 0);
function payKindScreen(kind, M){
  const K = PAY_KINDS[kind]; const people = payPeople(kind);
  if (!people.length) return `<div class="empty">${kind==='smm' ? 'В команде нет никого с ролью СММ. Добавьте роль во вкладке «Команда».' : kind==='mgr' ? 'Нет управляющего.' : 'Нет тренеров.'}</div>`;
  const rows = people.map(pp => ({ pp, a:payAccrual(M, `${kind}:${pp.id}`), paid:paidTo(M, pp.id) }));
  const total = rows.reduce((x,r) => x + r.a.sum, 0), paid = rows.reduce((x,r) => x + r.paid, 0);
  const unitsCol = kind!=='mgr';
  return `<div class="card"><div class="card-h"><h3>${K.title} · ${monthName(M).toLowerCase()}</h3><span class="small muted">начислено ${money(total)} · выдано ${money(paid)}</span></div>
    <div class="tbl-wrap"><table class="tbl pay-tbl"><thead><tr><th>Сотрудник</th><th>Как платим</th><th class="r">Ставка, ₽</th>${kind==='mgr'?'<th class="r">% от выручки</th>':''}${unitsCol?`<th class="r">${K.unit}</th>`:''}<th class="r">Премия</th><th class="r">Сумма вручную</th><th class="r">Начислено</th><th class="r">Выдано</th><th></th></tr></thead><tbody>
    ${rows.map(({pp,a,paid}) => { const showUnits = unitsCol && a.rate.mode!=='fixed'; return `<tr><td><b>${esc(pp.name)}</b>${pp.sub?`<div class="small muted">${esc(pp.sub)}</div>`:''}</td>
      <td><select class="input pill" data-prate="${kind}" data-id="${pp.id}" data-f="mode" aria-label="Как платим ${esc(pp.name)}">${Object.entries(K.modes).map(([k,v]) => `<option value="${k}"${a.rate.mode===k?' selected':''}>${v}</option>`).join('')}</select></td>
      <td class="r"><input class="input num money-in" type="number" min="0" step="100" inputmode="numeric" data-prate="${kind}" data-id="${pp.id}" data-f="amount" value="${a.rate.amount||''}" placeholder="0" aria-label="Ставка ${esc(pp.name)}"></td>
      ${kind==='mgr' ? `<td class="r">${a.rate.mode==='params' ? `<input class="input num" style="width:70px" type="number" min="0" max="100" step="0.5" data-prate="mgr" data-id="${pp.id}" data-f="pct" value="${a.rate.pct||''}" placeholder="0" aria-label="Процент от выручки"><div class="small muted">выручка ${money(a.revenue)}</div>` : '—'}</td>` : ''}
      ${unitsCol ? `<td class="r">${showUnits ? `<input class="input num" style="width:70px" type="number" min="0" step="1" inputmode="numeric" data-pay="${a.key}" data-f="units" value="${a.units||''}" placeholder="0" aria-label="${K.unit}">` : '—'}</td>` : ''}
      <td class="r"><input class="input num money-in" style="width:96px" type="number" min="0" step="100" inputmode="numeric" data-pay="${a.key}" data-f="bonus" value="${a.bonus||''}" placeholder="0" aria-label="Премия"></td>
      <td class="r"><input class="input num money-in" type="number" min="0" step="100" inputmode="numeric" data-pay="${a.key}" data-f="manual" value="${a.manual??''}" placeholder="${a.calc}" aria-label="Сумма вручную"></td>
      <td class="r"><b>${money(a.sum)}</b>${a.manual!==null?'<div class="small muted">вручную</div>':''}</td><td class="r">${paid?money(paid):'—'}</td>
      <td class="r">${a.sum > paid ? `<button class="btn sm" data-act="pay-out" data-key="${a.key}">Выплатить ${money(a.sum - paid)}</button>` : ''}</td></tr>`; }).join('')}
    <tr class="sum"><td colspan="6">Итого</td><td class="r">${money(total)}</td><td class="r">${money(paid)}</td><td></td></tr></tbody></table></div>
    <p class="small muted">${kind==='tr' ? 'За занятие: ставка × количество занятий. ' : kind==='smm' ? 'За публикацию: ставка × количество публикаций. ' : 'Оклад + процент от выручки студии за месяц (продажи из журнала + ручные доходы из «Финансов»). '}«Сумма вручную» заменяет расчёт — её же можно ввести в «Финансах», суммы совпадают автоматически.${kind==='smm'?' Если человек совмещает СММ с другой ролью, за СММ платится отдельно от основной должности.':''}</p></div>`;
}

function payrollScreen(M, admins){
  if (!admins.length) return '<div class="empty">В этом месяце некого рассчитывать: нет администраторов и смен.</div>';
  const rows = admins.map(a => ({ a, c:calcPayroll(M, a.id) }));
  const cur = rows.find(r => r.a.id===S.salAdmin) || rows[0]; const c = cur.c; const owner = isOwner(S.user);
  const summary = `<div class="card"><div class="card-h"><h3>Итоги за ${monthName(M).toLowerCase()}</h3>
      <div class="toolbar"><label class="small muted" for="sal-plan">План продаж на месяц, ₽</label><input class="input pill num" id="sal-plan" type="number" min="0" step="1000" inputmode="numeric" value="${c.plan||''}" style="width:140px"></div></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Администратор</th><th class="r">Смен</th><th class="r">Фикс.</th><th class="r">% с продаж</th><th class="r">KPI</th><th class="r">Неустойки</th><th class="r">К начислению</th></tr></thead><tbody>
    ${rows.map(({a,c}) => `<tr class="pick${a.id===cur.a.id?' sel':''}" data-act="sal-admin" data-id="${a.id}"><td><span style="display:inline-flex;gap:8px;align-items:center">${ava(a.id,true)}<b>${esc(a.name)}</b></span></td>
      <td class="r">${c.nShifts}</td><td class="r">${money(c.fixed)}</td><td class="r">${money(c.percent)}</td><td class="r">${c.fixedMode?'<span class="muted small">фикс в месяц</span>':c.shiftMode?'<span class="muted small">только смены</span>':c.eligible?money(c.kpiSum):'<span class="muted small">меньше 13 смен</span>'}</td>
      <td class="r" style="color:${c.penApplied?'var(--st-over)':'inherit'}">${c.penApplied?'−'+money(c.penApplied):'—'}</td><td class="r"><b>${money(c.net)}</b></td></tr>`).join('')}
    <tr class="sum"><td>Всего</td><td class="r">${rows.reduce((x,r)=>x+r.c.nShifts,0)}</td><td class="r">${money(rows.reduce((x,r)=>x+r.c.fixed,0))}</td><td class="r">${money(rows.reduce((x,r)=>x+r.c.percent,0))}</td><td class="r">${money(rows.reduce((x,r)=>x+r.c.kpiSum,0))}</td><td class="r">−${money(rows.reduce((x,r)=>x+r.c.penApplied,0))}</td><td class="r"><b>${money(rows.reduce((x,r)=>x+r.c.net,0))}</b></td></tr>
    </tbody></table></div></div>`;
  const pickers = `<div class="chips">${rows.map(({a}) => `<button class="chip${a.id===cur.a.id?' on':''}" data-act="sal-admin" data-id="${a.id}">${esc(a.name)}</button>`).join('')}</div>`;
  const canRates = Rules.canEditSchedule(S.user);
  const shiftsCard = `<div class="card"><div class="card-h"><h3>1. Смены — из графика</h3><button class="btn sm" data-act="view" data-v="sched">Открыть график</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Тип смены</th><th class="r">Ставка</th><th class="r">Целых</th><th class="r">Половин</th><th class="r">Сумма</th></tr></thead><tbody>
      ${c.shifts.map(t => `<tr><td><b>${t.name}</b><div class="small muted">${t.time}</div></td><td class="r">${money(t.pay)}</td><td class="r">${t.whole||'—'}</td><td class="r">${t.halves||'—'}</td><td class="r"><b>${t.sum?money(t.sum):'—'}</b></td></tr>`).join('')}
    </tbody></table></div>
    ${c.list.length ? `<details class="hist-d" style="margin-top:8px"><summary class="small">Все смены месяца · ${c.list.length} (прошло ${c.worked})</summary><div class="shift-days">${c.list.map(x => `<span class="sd${x.date>todayStr()?' future':''}" title="${SHIFT_TYPES.find(t=>t.k===x.kind).name}${x.half?', половина смены':''}">${fmtDayShort(x.date)} · ${x.start}–${x.end}${x.half?' · ½':''}</span>`).join('')}</div></details>` : '<p class="small muted">В графике на этот месяц смен нет.</p>'}
    <div class="grid2" style="margin-top:10px"><div class="field"><label for="pr-adj">Корректировка фиксированной части, ₽</label><input class="input num" id="pr-adj" type="number" step="100" inputmode="numeric" data-pr="shiftAdjust" value="${c.adjust||''}" placeholder="0 — без корректировки"${canRates?'':' disabled'}></div></div>
    <div class="sum-line"><span>Смен за месяц: <b>${String(c.nShifts).replace('.',',')}</b>${c.nShifts<KPI_MIN_SHIFTS?` · для KPI нужно не меньше ${KPI_MIN_SHIFTS}`:''}</span><span>Фиксированная часть: <b>${money(c.fixed)}</b></span></div>
    <p class="small muted">Тип считается по времени: начало раньше 08:30 — расширенное утро, конец позже 21:30 — расширенный вечер, оба — полный период. Половина смены оплачивается по коэффициенту ${String(c.rates.halfFactor).replace('.',',')}. Если доплату не положено платить (не было записи на 08:00 / 21:00), поменяйте время или тип смены в графике.</p></div>`;
  const ratesCard = canRates ? `<div class="card"><div class="card-h"><h3>Ставки за смену</h3><span class="small muted">для всех администраторов</span></div>
    <div class="rates">${SHIFT_TYPES.map(t => `<label><span>${t.name}<span class="small muted"> ${t.time}</span></span><input class="input num" type="number" min="0" step="50" inputmode="numeric" data-rate="${t.k}" value="${c.rates[t.k]}"></label>`).join('')}
      <label><span>Половина смены, доля от ставки</span><input class="input num" type="number" min="0" max="1" step="0.05" data-rate="halfFactor" value="${c.rates.halfFactor}"></label></div>
    <p class="small muted">По договору: 2 000 / 2 300 / 2 350 / 2 650 ₽. Изменения сразу пересчитывают зарплату за все месяцы, где нет ручной корректировки.</p></div>` : '';
  const pctCard = `<div class="card"><div class="card-h"><h3>2. Процент с продаж</h3><button class="btn sm" data-act="sale-edit" data-id="" data-seller="${cur.a.id}">+ Продажа</button></div>
    ${c.sales.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Что продано</th><th>Клиент</th><th class="r">Сумма</th><th class="r">%</th><th class="r">Админу</th></tr></thead><tbody>
      ${c.sales.map(s => `<tr data-act="sale-edit" data-id="${s.id}" class="pick"><td class="num">${fmtDayShort(s.date)}</td><td>${esc(PRODUCT[s.product]?.name||s.product)}${s.c.note?`<div class="small" style="color:var(--st-work)">${esc(s.c.note)}</div>`:''}</td>
        <td class="small">${esc(CLIENT_TYPES[s.clientType]?.split(' (')[0]||'')}</td><td class="r">${money(s.price)}</td><td class="r">${s.c.rate}%</td><td class="r"><b>${money(s.c.sum)}</b></td></tr>`).join('')}
      </tbody></table></div>` : '<p class="muted small">Продаж этого администратора в журнале за месяц нет.</p>'}
    <div class="sum-line"><span>Продано на <b>${money(c.salesTotal)}</b></span><span>Переменная часть: <b>${money(c.percent)}</b></span></div>
    <p class="small muted">Новым клиентам — 10%, возврат после 30+ дней — 8% (если касание в CRM было не позднее чем за 24 часа до покупки), разовое — 5%, персональное и коммерческий класс новому клиенту — 5%, товары — 10%, действующим клиентам и пробные — 0%.</p></div>`;
  const kpiCard = `<div class="card"><div class="card-h"><h3>3. KPI</h3><span class="small muted">до ${money(KPI_MAX)} в месяц</span></div>
    ${!c.eligible ? `<div class="note warn">Смен ${c.nShifts} из ${KPI_MIN_SHIFTS}: бонусы KPI в этом месяце не начисляются (п. 3.3.3).</div>` : ''}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Показатель</th><th>Условие</th><th>Значение</th><th class="r">Бонус</th></tr></thead><tbody>
    ${c.kpi.map(k => `<tr><td><b>${k.name}</b>${k.auto?`<div class="small muted">из панели: ${k.autoV}</div>`:''}</td><td class="small">${k.target}</td>
      <td><div class="kpi-in"><input class="input num" type="number" min="0" step="1" inputmode="numeric" data-pr="kpi.${k.k}" value="${k.manual?k.v:''}" placeholder="${k.auto?k.autoV:'—'}" aria-label="${esc(k.name)}"><span class="small muted">${k.unit}</span></div></td>
      <td class="r">${k.bonus?`<b>${money(k.bonus)}</b>`:'—'}</td></tr>`).join('')}
    <tr><td><b>Выполнение плана продаж</b><div class="small muted">продано ${money(c.salesTotal)} из ${c.plan?money(c.plan):'— (план не задан)'}</div></td><td class="small">лучший результат среди админов и не ниже плана — 3 000 ₽</td><td class="small">${c.planOk?'выполнен':'нет'}</td><td class="r">${c.planOk?`<b>${money(KPI_PLAN_BONUS)}</b>`:'—'}</td></tr>
    </tbody></table></div>
    <p class="small muted">Пустое поле — значение берётся из панели (отзывы, возвраты, продажи) или не учитывается. Конверсию, продления, работу со спящей базой и замечания по чистоте вносит управляющий из CRM.</p></div>`;
  const penCard = `<div class="card"><div class="card-h"><h3>4. Неустойки</h3><button class="btn sm" data-act="pen-edit" data-id="" data-admin="${cur.a.id}">+ Нарушение</button></div>
    ${c.pens.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Нарушение</th><th>Как считается</th><th class="r">Сумма</th></tr></thead><tbody>
      ${c.pens.map(p => `<tr class="pick" data-act="pen-edit" data-id="${p.id}"><td class="num">${fmtDayShort(p.date)}</td><td><b>${esc(p.code)}</b> ${esc(PEN[p.code]?.text||'')}${p.note?`<div class="small muted">${esc(p.note)}</div>`:''}</td>
        <td class="small${p.a.terminate?' warn-t':''}">${esc(p.a.label)}</td><td class="r">${p.a.sum?'−'+money(p.a.sum):'0 ₽'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Нарушений за месяц нет.</p>'}
    ${c.penRaw>c.penCap ? `<div class="note warn">Неустойки (${money(c.penRaw)}) больше 50% вознаграждения — удерживается не больше ${money(c.penCap)} (п. 6.3 договора).</div>` : ''}
    ${c.systematic ? `<div class="note warn">3 и более нарушений с неустойкой за месяц — основание для расторжения договора (п. 7.6 Приложения 2).</div>` : ''}
    <p class="small muted">Категория 1 — неустойка с первого раза. Категории 2–6 — в первый раз устное замечание, с повтора того же пункта за 90 дней — неустойка.</p></div>`;
  const modes = owner ? RATE_MODES_ADMIN : { contract:RATE_MODES_ADMIN.contract, shift:RATE_MODES_ADMIN.shift, ...(c.mode==='fixed'?{ fixed:RATE_MODES_ADMIN.fixed }:{}) };
  const modeCtl = `<div class="field"><span class="small muted" style="font-weight:600">Как считаем зарплату</span><div class="seg">${Object.entries(modes).map(([k,v]) =>
    `<label class="seg-i${c.mode===k?' on':''}"><input type="radio" name="paymode" value="${k}" data-paymode="${cur.a.id}"${c.mode===k?' checked':''}${k==='fixed'&&!owner?' disabled':''} hidden>${k==='contract'?'По договору':k==='shift'?'Только фикс за смену':'Фикс в месяц'}</label>`).join('')}</div>
    <span class="small muted">${c.mode==='contract'?'Смены + процент с продаж + KPI − неустойки.':c.mode==='shift'?'Только оплата смен из графика (+ премия − неустойки), без процентов и KPI.':`Одна сумма в месяц — ${money(c.fixed)}; задаётся во вкладке «Ставки».`}</span></div>`;
  const totalCard = `<div class="card total-card"><div class="card-h"><h3>Итого · ${esc(cur.a.fullName||cur.a.name)}</h3><span class="small muted">${monthName(M)}</span></div>
    ${modeCtl}
    <dl class="totals"><dt>Фиксированная часть</dt><dd>${money(c.fixed)}</dd><dt>Процент с продаж</dt><dd>${money(c.percent)}</dd><dt>KPI</dt><dd>${money(c.kpiSum)}</dd>
      <dt><label for="pr-bonus">Разовая премия (п. 3.5)</label></dt><dd><input class="input num" id="pr-bonus" type="number" min="0" step="100" inputmode="numeric" data-pr="bonus" value="${c.bonus||''}" placeholder="0" style="max-width:140px;text-align:right"></dd>
      <dt>Неустойки</dt><dd style="color:var(--st-over)">${c.penApplied?'−'+money(c.penApplied):'0 ₽'}</dd>
      ${owner || c.manualSet ? `<dt><label for="pr-man">Сумма вручную</label><div class="small muted">${c.manualSet?`заменяет расчёт ${money(c.calcNet)}`:'пусто — считается по договору'}</div></dt><dd><input class="input num" id="pr-man" type="number" min="0" step="100" inputmode="numeric" data-pr="manual" value="${c.manualSet?c.net:''}" placeholder="${c.calcNet??c.net}" style="max-width:140px;text-align:right"${owner?'':' disabled'}></dd>` : ''}
      <dt class="grand">К начислению</dt><dd class="grand">${money(c.net)}</dd>
      <dt><label for="pr-adv">Аванс (до 20-го)</label><div class="small muted">${c.advance===c.advanceAuto?'30% фиксированной части':`по расчёту ${money(c.advanceAuto)}, изменено вручную`}</div></dt>
      <dd><input class="input num" id="pr-adv" type="number" min="0" step="500" inputmode="numeric" data-pr="advance" value="${c.advance===c.advanceAuto?'':c.advance}" placeholder="${c.advanceAuto}" style="max-width:140px;text-align:right"></dd>
      <dt>Остаток после аванса</dt><dd>${money(Math.max(0, c.net - c.advance))}</dd></dl>
    ${c.advance > c.net ? '<div class="note warn">Аванс больше суммы к начислению — проверьте.</div>' : ''}
    <p class="small muted">Окончательный расчёт — до 10-го следующего месяца после подписания акта.</p>
    ${owner ? `<div class="modal-f"><button class="btn" data-act="sal-payout" data-kind="advance">Выплатить аванс ${money(c.advance)}</button><button class="btn primary" data-act="sal-payout" data-kind="final">Выплатить остаток ${money(Math.max(0, c.net - c.advance))}</button></div>` : '<p class="small muted">Создать выплату может владелец.</p>'}</div>`;
  const fixedNote = c.fixedMode ? `<div class="note warn">${esc(cur.a.name)} получает фикс ${money(c.fixed)} в месяц — смены, проценты и KPI ниже показаны для справки и в сумму не входят.</div>` : c.shiftMode ? `<div class="note warn">${esc(cur.a.name)}: только фикс за смену — проценты и KPI ниже показаны для справки и в сумму не входят.</div>` : '';
  return summary + `<div class="toolbar">${pickers}</div>${fixedNote}<div class="sal-grid"><div class="sal-col">${shiftsCard}${pctCard}${kpiCard}${penCard}</div><div class="sal-side">${totalCard}${ratesCard}</div></div>`;
}

function salesJournal(M){
  const f = S.salesSeller || 'all';
  const list = salesOf(M, f==='all'?'':f).sort((a,b) => b.date.localeCompare(a.date));
  const total = list.reduce((a,s) => a+s.price, 0);
  const byLine = {}; list.forEach(s => { const k = PRODUCT[s.product]?.name || s.product; byLine[k] = (byLine[k]||0) + s.price; });
  const sellers = S.data.users.filter(u => u.status==='active' && (isAdminRole(u) || isManager(u)));
  return `<div class="card"><div class="card-h"><h3>Журнал продаж</h3><div class="toolbar">
      ${sel('f-seller','Продавец', `<option value="all">Все продавцы</option>${sellers.map(u => `<option value="${u.id}"${f===u.id?' selected':''}>${esc(u.name)}</option>`).join('')}`)}
      <button class="btn primary sm" data-act="sale-edit" data-id="">+ Продажа</button></div></div>
    <p class="small muted">Сюда управляющий или владелец вносит продажи абонементов и услуг. Из журнала автоматически считаются проценты администраторам и доходы студии в разделе «Финансы».</p>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Клиент</th><th>Что продано</th><th>Тип клиента</th><th>Продал(а)</th><th class="r">Сумма</th><th class="r">% админу</th></tr></thead><tbody>
      ${list.map(s => { const c = commission(s); return `<tr class="pick" data-act="sale-edit" data-id="${s.id}"><td class="num">${fmtDayShort(s.date)}</td><td>${esc(s.client||'—')}</td><td>${esc(PRODUCT[s.product]?.name||s.product)}</td>
        <td class="small">${esc(CLIENT_TYPES[s.clientType]||'')}${s.clientType==='return'?(s.crmTouch?' · касание в CRM есть':' · <span style="color:var(--st-work)">нет касания</span>'):''}</td>
        <td>${s.sellerId?esc(nameOf(s.sellerId)):'—'}</td><td class="r"><b>${money(s.price)}</b>${s.discount?`<div class="small muted">скидка ${s.discount}%</div>`:''}</td><td class="r">${c.sum?money(c.sum):'—'}</td></tr>`; }).join('')}
      <tr class="sum"><td colspan="5">Итого за ${monthName(M).toLowerCase()} · ${list.length} продаж</td><td class="r">${money(total)}</td><td class="r">${money(list.reduce((a,s)=>a+commission(s).sum,0))}</td></tr></tbody></table></div>
      <div class="chips" style="margin-top:12px">${Object.entries(byLine).sort((a,b)=>b[1]-a[1]).map(([k,v]) => `<span class="tag">${esc(k)}: <b>${money(v)}</b></span>`).join('')}</div>`
      : '<div class="empty">За этот месяц продаж нет. Нажмите «+ Продажа».</div>'}</div>`;
}

function penaltiesJournal(M){
  const allPen = S.data.penalties||[];
  const list = allPen.filter(p => p.date.slice(0,7)===M).sort((a,b) => b.date.localeCompare(a.date));
  return `<div class="card"><div class="card-h"><h3>Неустойки за ${monthName(M).toLowerCase()}</h3><button class="btn primary sm" data-act="pen-edit" data-id="">+ Нарушение</button></div>
    <p class="small muted">Факт нарушения фиксирует заказчик с датой и доказательствами. Администратор может дать объяснение в течение 2 рабочих дней — добавьте его в примечание.</p>
    ${list.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Администратор</th><th>Нарушение</th><th>Как считается</th><th class="r">Сумма</th></tr></thead><tbody>
      ${list.map(p => { const a = penaltyAmount(p, allPen); return `<tr class="pick" data-act="pen-edit" data-id="${p.id}"><td class="num">${fmtDayShort(p.date)}</td><td>${esc(nameOf(p.adminId))}</td>
        <td><b>${esc(p.code)}</b> ${esc(PEN[p.code]?.text||'')}${p.note?`<div class="small muted">${esc(p.note)}</div>`:''}</td><td class="small${a.terminate?' warn-t':''}">${esc(a.label)}</td><td class="r">${a.sum?'−'+money(a.sum):'0 ₽'}</td></tr>`; }).join('')}
      </tbody></table></div>` : '<div class="empty">Нарушений за месяц нет.</div>'}
    <details class="hist-d" style="margin-top:12px"><summary class="small">Справочник неустоек (Приложение № 2)</summary>
      ${Object.entries(PEN_CATS).map(([n,name]) => `<div class="pen-cat"><div class="eyebrow">Категория ${n}: ${name}</div><table class="tbl"><tbody>${PENALTIES.filter(p => p.cat===Number(n)).map(p => `<tr><td class="num small">${p.code}</td><td class="small">${esc(p.text)}</td><td class="r small">${money(p.first)}</td><td class="r small">${p.repeat===null?'расторжение':money(p.repeat||p.first)}</td></tr>`).join('')}</tbody></table></div>`).join('')}
    </details></div>`;
}

function saleModal(m){
  const s = (S.data.sales||[]).find(x => x.id===m.id) || { date: S.salMonth===todayStr().slice(0,7) ? todayStr() : S.salMonth+'-01', product:'ab8', price:PRODUCT.ab8.price, clientType:'new', crmTouch:false, sellerId:m.seller||'', discount:0, client:'', note:'' };
  const c = commission(s);
  const sellers = S.data.users.filter(u => u.status==='active' && (isAdminRole(u) || isManager(u)));
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="sale-form" data-id="${esc(s.id||'')}" style="max-width:620px"><div class="modal-h"><h3>${s.id?'Продажа':'Новая продажа'}</h3>${closeX}</div>
    <div class="grid2"><div class="field"><label for="sf-date">Дата</label><input class="input" id="sf-date" type="date" value="${s.date}" required></div>
      <div class="field"><label for="sf-client">Клиент</label><input class="input" id="sf-client" value="${esc(s.client)}" placeholder="Имя или номер карты"></div></div>
    <div class="field"><label for="sf-prod">Что продано</label><select class="input" id="sf-prod">${PRODUCTS.map(p => `<option value="${p.k}"${s.product===p.k?' selected':''}>${esc(p.name)}${p.price?` — ${money(p.price)}`:''}</option>`).join('')}</select></div>
    <div class="grid3"><div class="field"><label for="sf-price">Сумма оплаты, ₽</label><input class="input num" id="sf-price" type="number" min="0" step="100" inputmode="numeric" value="${s.price||''}" required></div>
      <div class="field"><label for="sf-disc">Скидка, %</label><input class="input num" id="sf-disc" type="number" min="0" max="100" step="1" inputmode="numeric" value="${s.discount||''}" placeholder="0"></div>
      <div class="field"><label for="sf-seller">Продал(а)</label><select class="input" id="sf-seller"><option value="">—</option>${sellers.map(u => `<option value="${u.id}"${s.sellerId===u.id?' selected':''}>${esc(u.name)}</option>`).join('')}</select></div></div>
    <div class="field"><span class="small muted" style="font-weight:600">Клиент</span><div class="chips">${Object.entries(CLIENT_TYPES).map(([k,v]) => `<label class="chip${s.clientType===k?' on':''}"><input type="radio" name="sf-ct" value="${k}"${s.clientType===k?' checked':''} hidden>${v}</label>`).join('')}</div></div>
    <label class="small" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="sf-crm"${s.crmTouch?' checked':''} style="margin-top:3px;accent-color:var(--accent)">Касание администратора зафиксировано в CRM не позднее чем за 24 часа до покупки (нужно для процента за возврат)</label>
    <div class="field"><label for="sf-note">Примечание</label><input class="input" id="sf-note" value="${esc(s.note)}"></div>
    <div class="note" id="sf-calc">Администратору: <b>${c.rate}% — ${money(c.sum)}</b>${c.note?` · ${esc(c.note)}`:''}</div>
    <div class="modal-f">${s.id?`<button type="button" class="btn danger" data-act="sale-del" data-id="${s.id}">Удалить</button>`:''}<span class="spacer"></span><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
}
function penaltyModal(m){
  const p = { ...((S.data.penalties||[]).find(x => x.id===m.id) || { date:todayStr(), adminId:m.admin || S.salAdmin || '', code:'', extra:0, note:'' }), ...(m.draft||{}) };
  const item = PEN[p.code];
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="pen-form" data-id="${esc(p.id||'')}" style="max-width:640px"><div class="modal-h"><h3>${p.id?'Нарушение':'Новое нарушение'}</h3>${closeX}</div>
    <div class="grid2"><div class="field"><label for="pf-adm">Администратор</label><select class="input" id="pf-adm" required><option value="">Выберите</option>${adminsList().map(a => `<option value="${a.id}"${p.adminId===a.id?' selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="pf-date">Дата нарушения</label><input class="input" id="pf-date" type="date" value="${p.date}" required></div></div>
    <div class="field"><label for="pf-code">Нарушение (Приложение № 2)</label><select class="input" id="pf-code" required><option value="">Выберите пункт</option>
      ${Object.entries(PEN_CATS).map(([n,name]) => `<optgroup label="${n}. ${name}">${PENALTIES.filter(x => x.cat===Number(n)).map(x => `<option value="${x.code}"${p.code===x.code?' selected':''}>${x.code} ${esc(x.text)}</option>`).join('')}</optgroup>`).join('')}</select></div>
    ${item && item.extra ? `<div class="field"><label for="pf-extra">Сумма ущерба, ₽ (недостача, замена замков, 50% ставки тренеру)</label><input class="input num" id="pf-extra" type="number" min="0" step="100" inputmode="numeric" value="${p.extra||''}"></div>` : ''}
    <div class="field"><label for="pf-note">Обстоятельства и доказательства</label><textarea class="input" id="pf-note" rows="2" placeholder="Скриншот, запись камеры, данные CRM, объяснение администратора">${esc(p.note)}</textarea></div>
    ${item ? `<div class="note">Первичная — ${money(item.first)}, повторная — ${item.repeat===null?'расторжение договора':money(item.repeat||item.first)}. ${item.cat===1?'Категория 1: с первого раза.':'Категории 2–6: первый раз — устное замечание.'}</div>` : ''}
    <div class="modal-f">${p.id?`<button type="button" class="btn danger" data-act="pen-del" data-id="${p.id}">Удалить</button>`:''}<span class="spacer"></span><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
}

/* --- Финансы студии (только владельцы) --- */
function calcFinance(M){
  const f = (S.data.finance||{})[M]; if (!f) return null;
  const cfg = S.data.finConfig || { income:INCOME_LINES, expenses:FIXED_EXPENSES.filter(e => e.k!=='manager') };
  const R = S.data.rates || { trainers:{}, staff:{} };
  const sales = salesOf(M);
  const auto = {}; sales.forEach(s => { const l = PRODUCT[s.product]?.line || 'other'; auto[l] = (auto[l]||0) + s.price; });
  const known = new Set(cfg.income.map(l => l.k));
  const lostAuto = Object.entries(auto).filter(([k]) => !known.has(k)).reduce((a,[,v]) => a+v, 0); // продажи по удалённым строкам
  const income = cfg.income.map(l => { const a = l.manualOnly ? 0 : (auto[l.k]||0), m = Number(f.income[l.k])||0; return { ...l, auto:a, manual:m, total:a+m }; });
  if (lostAuto) income.push({ k:'__other', name:'Прочие продажи из журнала', group:'Прочее', auto:lostAuto, manual:0, total:lostAuto, system:true });
  const incomeTotal = income.reduce((x,l) => x+l.total, 0);
  // ФОТ: одна сумма начисления на человека и должность — та же, что в «Продажи и зарплата». Выданное по журналу — для контроля
  const paid = {}; (S.data.payouts||[]).filter(p => p.issuedAt && payoutMonth(p)===M).forEach(p => { paid[p.recipient] = (paid[p.recipient]||0) + (Number(p.amount)||0); });
  const fotRows = [];
  S.data.users.filter(u => u.status==='active' && !isOwner(u) && isAdminRole(u)).forEach(u => { const c = calcPayroll(M, u.id); fotRows.push({ key:'adm:'+u.id, pid:u.id, name:u.fullName||u.name, role:'Администратор', how: c.mode==='contract'?'по договору':c.mode==='shift'?'только смены':'фикс в месяц', sum:c.net, calc:c.calcNet ?? c.net, manual:c.manualSet ? c.net : null }); });
  ['mgr','smm','tr'].forEach(kind => payPeople(kind).forEach(pp => { const a = payAccrual(M, `${kind}:${pp.id}`);
    fotRows.push({ key:a.key, pid:pp.id, name:pp.name, role:{ mgr:'Управляющий', smm:'СММ', tr:'Тренер' }[kind], how: PAY_KINDS[kind].modes[a.rate.mode] + (a.rate.amount ? ` · ${money(a.rate.amount)}` : ''), sum:a.sum, calc:a.calc, manual:a.manual, kind }); }));
  const byPerson = {}; fotRows.forEach(r => { byPerson[r.pid] = (byPerson[r.pid]||0) + r.sum; });
  const overpaid = Object.entries(paid).reduce((a,[id,v]) => a + Math.max(0, v - (byPerson[id]||0)), 0); // выдано сверх начисленного (или людям без начисления)
  const fot = { accrued: fotRows.reduce((a,r) => a+r.sum, 0), paid: Object.values(paid).reduce((a,v) => a+v, 0) };
  const otherPaid = overpaid;
  const fixed = cfg.expenses.map(e => ({ ...e, sum: f.fixed[e.k]===undefined ? (Number(e.def)||0) : (Number(f.fixed[e.k])||0) }));
  const fixedTotal = fixed.reduce((x,e) => x+e.sum, 0);
  const sumList = arr => (arr||[]).reduce((x,i) => x+(Number(i.amount)||0), 0);
  const purchasesTotal = sumList(f.purchases), utilitiesTotal = sumList(f.utilities), customTotal = sumList(f.custom);
  const tax = Math.round(incomeTotal * (Number(f.taxRate)||0) / 100);
  const expensesTotal = fot.accrued + otherPaid + fixedTotal + purchasesTotal + utilitiesTotal + customTotal + tax;
  const profit = incomeTotal - expensesTotal;
  const personal = { u1:0, u2:0 }; [...(f.purchases||[]), ...(f.utilities||[]), ...(f.custom||[])].forEach(i => { if (personal[i.payer]!==undefined) personal[i.payer] += Number(i.amount)||0; });
  const ops = f.ownerOps||[]; const opSum = (o,t) => ops.filter(x => x.owner===o && x.type===t).reduce((s,x) => s+(Number(x.amount)||0), 0);
  const dividends = opSum('u1','div') + opSum('u2','div');
  const debtBal = (S.data.debt||[]).reduce((x,d) => x + (d.type==='loan' ? d.amount : -d.amount), 0);
  return { f, cfg, income, incomeTotal, fotRows, paid, fot, otherPaid, fixed, fixedTotal, purchasesTotal, utilitiesTotal, customTotal, tax, expensesTotal, profit,
    personal, ops, opSum, dividends, remainder: profit - dividends, debtBal, salesCount: sales.length };
}
const numIn = (path, val, label, ph) => `<input class="input num money-in" type="number" step="1" inputmode="numeric" data-fin="${path}" value="${val||''}" placeholder="${ph??0}" aria-label="${esc(label)}">`;
const rateText = r => !r || !r.amount && r.mode!=='contract' ? '<span class="muted">ставка не задана</span>' : r.mode==='perClass' ? `${money(r.amount)} за занятие` : r.mode==='fixed' ? `${money(r.amount)} в месяц` : 'по договору';

function finList(kind, title, items, hint, withPayer){
  const ed = true;
  return `<div class="card"><div class="card-h"><h3>${title}</h3><span class="small muted num">${money((items||[]).reduce((x,i)=>x+(Number(i.amount)||0),0))}</span></div>
    ${hint?`<p class="small muted">${hint}</p>`:''}
    ${(items||[]).length ? `<div class="tbl-wrap"><table class="tbl"><tbody>${items.map(i => `<tr><td>${esc(i.name)}${i.date?`<div class="small muted">${fmtDay(i.date)}</div>`:''}</td>
      ${withPayer?`<td class="small">${PAYERS[i.payer]||'Студия'}</td>`:''}<td class="r"><b>${money(i.amount)}</b></td>${ed?`<td class="r"><button class="btn ghost sm" data-act="fin-del" data-kind="${kind}" data-id="${i.id}" aria-label="Удалить">✕</button></td>`:''}</tr>`).join('')}</tbody></table></div>` : '<p class="muted small">Пока пусто.</p>'}
    <form class="fin-add" data-kind="${kind}"><input class="input" name="name" placeholder="Наименование" required aria-label="Наименование"><input class="input" name="date" type="date" value="${todayStr().slice(0,7)===S.finMonth?todayStr():S.finMonth+'-01'}" aria-label="Дата">
      <input class="input num" name="amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Сумма" required aria-label="Сумма">
      ${withPayer?`<select class="input" name="payer" aria-label="Кто оплатил">${Object.entries(PAYERS).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}</select>`:''}<button class="btn sm primary" type="submit">Добавить</button></form></div>`;
}

function viewFin(){
  const M = S.finMonth;
  if (!(S.data.finance||{})[M]){ if (!S.finLoading){ S.finLoading = true; Api.call('getFinance', { month:M }).then(fin => { S.data.finance = fin; S.finLoading=false; render(); }).catch(e => { S.finLoading=false; toast(e.message, true); }); }
    return `<div class="toolbar"><h2>Финансы</h2></div><div class="empty">Загружаю ${monthName(M).toLowerCase()}…</div>`; }
  const c = calcFinance(M); const ed = true;
  const groups = [...new Set(c.income.map(l => l.group))];
  const tile = (label, v, hint, color) => `<div class="card bigkpi"><span class="eyebrow">${label}</span><b class="num" style="${color?`color:${color}`:''}">${money(v)}</b><span class="small muted">${hint}</span></div>`;
  const tools = (kind, l) => l.system ? '' : `<span class="row-tools"><button class="iconbtn sm" data-act="cfg-ren" data-kind="${kind}" data-k="${l.k}" aria-label="Переименовать «${esc(l.name)}»" title="Переименовать">✎</button><button class="iconbtn sm" data-act="cfg-del" data-kind="${kind}" data-k="${l.k}" aria-label="Удалить «${esc(l.name)}»" title="Удалить">✕</button></span>`;
  const incRow = l => `<tr><td><span class="ln">${esc(l.name)}</span>${tools('income', l)}</td><td class="r muted">${l.manualOnly?'':(l.auto?money(l.auto):'—')}</td><td class="r">${l.system?'':numIn('income.'+l.k, l.manual, l.name)}</td><td class="r"><b>${l.total?money(l.total):'—'}</b></td></tr>`;
  const incomeCard = `<div class="card"><div class="card-h"><h3>1. Доходы</h3><span class="small muted">из журнала продаж + вручную</span></div>
    <div class="tbl-wrap"><table class="tbl fin"><thead><tr><th>Источник</th><th class="r">Из журнала</th><th class="r">Вручную</th><th class="r">Итого</th></tr></thead><tbody>
    ${groups.map(g => `<tr class="grp"><td colspan="4">${esc(g)}</td></tr>${c.income.filter(l => l.group===g).map(incRow).join('')}`).join('')}
    ${true ? `<tr><td colspan="4"><form class="fin-add" id="cfg-add-income"><input class="input" name="name" placeholder="Новая строка дохода" required aria-label="Название"><input class="input" name="group" placeholder="Группа" list="fin-groups" value="${esc(groups[groups.length-1]||'Прочее')}" aria-label="Группа"><button class="btn sm primary" type="submit">+ Добавить</button></form>
      <datalist id="fin-groups">${groups.map(g => `<option value="${esc(g)}">`).join('')}</datalist></td></tr>` : ''}
    <tr class="sum"><td>Итого доходов</td><td></td><td></td><td class="r">${money(c.incomeTotal)}</td></tr></tbody></table></div>
    <p class="small muted">«Из журнала» — продажи из «Продажи и зарплата» (${c.salesCount} за месяц). «Вручную» — то, что прошло мимо журнала, и расхождение с кассой. ✎ — переименовать строку, ✕ — удалить (продажи удалённой строки попадут в «Прочие продажи из журнала»).</p></div>`;
  const roleOrder = ['Управляющий','Администратор','СММ','Тренер'];
  const fotHtml = roleOrder.map(role => { const rows = c.fotRows.filter(r => r.role===role); if (!rows.length) return '';
    const body = rows.map(r => `<tr><td>${esc(r.name)}<div class="small muted">${esc(r.how)}${r.manual!==null?' · сумма введена вручную':''}</div></td>
      <td class="r"><input class="input num money-in" type="number" min="0" step="100" inputmode="numeric" data-fot="${r.key}" value="${r.manual??''}" placeholder="${r.calc}" aria-label="Начислено: ${esc(r.name)}, ${role.toLowerCase()}"></td>
      <td class="r"><b>${money(r.sum)}</b></td><td class="r">${c.paid[r.pid]?money(c.paid[r.pid]):'—'}</td></tr>`).join('');
    const sum = rows.reduce((a,r) => a+r.sum, 0);
    return role==='Тренер' ? `<tr><td colspan="4"><details class="inline-d"${S.finOpen?' open':''}><summary>Тренеры · ${rows.length} · начислено ${money(sum)}</summary><div class="tbl-wrap"><table class="tbl fin"><tbody>${body}</tbody></table></div></details></td></tr>`
      : `<tr class="grp"><td colspan="4">${role==='Администратор'?'Администраторы':role==='СММ'?'СММ':role}</td></tr>${body}`; }).join('');
  const expRow = e => `<tr><td><span class="ln">${esc(e.name)}</span>${tools('expenses', e)}</td><td class="r" colspan="2">${numIn('fixed.'+e.k, e.sum, e.name)}</td><td class="r"><b>${e.sum?money(e.sum):'—'}</b></td></tr>`;
  const expCard = `<div class="card"><div class="card-h"><h3>2. Расходы</h3></div>
    <div class="tbl-wrap"><table class="tbl fin"><thead><tr><th>ФОТ (зарплаты)</th><th class="r">Сумма вручную</th><th class="r">Начислено</th><th class="r">Выдано</th></tr></thead><tbody>
      ${fotHtml}
      ${c.otherPaid ? `<tr><td>Выдано сверх начисленного</td><td></td><td class="r"><b>${money(c.otherPaid)}</b></td><td></td></tr>` : ''}
      <tr class="sum"><td>Итого ФОТ</td><td></td><td class="r">${money(c.fot.accrued + c.otherPaid)}</td><td class="r">${money(c.fot.paid)}</td></tr>
      <tr class="grp"><td colspan="4">Постоянные и прочие расходы</td></tr>
      ${c.fixed.map(expRow).join('')}
      <tr><td colspan="4"><form class="fin-add" id="cfg-add-expenses"><input class="input" name="name" placeholder="Новая статья расхода" required aria-label="Название"><input class="input num" name="def" type="number" min="0" step="100" placeholder="Сумма по умолчанию" aria-label="Сумма по умолчанию"><button class="btn sm primary" type="submit">+ Добавить</button></form></td></tr>
      <tr><td>Затраты на расходники<div class="small muted">список ниже</div></td><td></td><td class="r" colspan="2"><b>${money(c.purchasesTotal)}</b></td></tr>
      <tr><td>Коммуналка и сервисы<div class="small muted">список ниже</div></td><td></td><td class="r" colspan="2"><b>${money(c.utilitiesTotal)}</b></td></tr>
      <tr><td>Затраты собственников</td><td></td><td class="r" colspan="2"><b>${money(c.customTotal)}</b></td></tr>
      <tr><td>Налоги и банк<div class="small muted">% от доходов</div></td><td class="r"><span class="pct-in"><input class="input num" type="number" min="0" max="30" step="0.1" data-fin="taxRate" value="${c.f.taxRate}" aria-label="Процент налогов и банка">%</span></td><td class="r" colspan="2"><b>${money(c.tax)}</b></td></tr>
      <tr class="sum"><td>Итого расходов</td><td></td><td class="r" colspan="2">${money(c.expensesTotal)}</td></tr></tbody></table></div>
    <p class="small muted">Зарплаты считаются в «Продажи и зарплата». Если ввести сумму здесь, она сразу появится там, и наоборот. В расходы идёт начисленное; если выдали больше, разница добавляется отдельной строкой.</p></div>`;
  const resCard = `<div class="card"><div class="card-h"><h3>3. Финансовый результат</h3></div>
    <dl class="totals"><dt>Доходы</dt><dd>${money(c.incomeTotal)}</dd><dt>Расходы</dt><dd>−${money(c.expensesTotal)}</dd>
      <dt class="grand">${c.profit>=0?'Прибыль':'Убыток'} месяца</dt><dd class="grand" style="color:${c.profit>=0?'var(--st-done)':'var(--st-over)'}">${money(c.profit)}</dd></dl>
    ${c.fot.accrued > c.fot.paid ? `<p class="small muted">Из начисленных зарплат ещё не выдано ${money(c.fot.accrued - c.fot.paid)}.</p>` : ''}</div>`;
  const ownersCard = `<div class="card"><div class="card-h"><h3>4. Средства собственников</h3></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Операция</th><th class="r">Влад</th><th class="r">Катя</th></tr></thead><tbody>
      <tr><td>Внесено средств в студию</td><td class="r">${money(c.opSum('u1','in'))}</td><td class="r">${money(c.opSum('u2','in'))}</td></tr>
      <tr><td>Выведено дивидендов</td><td class="r">${money(c.opSum('u1','div'))}</td><td class="r">${money(c.opSum('u2','div'))}</td></tr>
      <tr><td>Оплачено из личных средств</td><td class="r">${money(c.personal.u1)}</td><td class="r">${money(c.personal.u2)}</td></tr>
      <tr class="sum"><td>Итого остаток в студии</td><td class="r" colspan="2">${money(c.remainder)}</td></tr></tbody></table></div>
    ${(c.ops||[]).length ? `<div class="chips" style="margin-top:8px">${c.ops.map(o => `<span class="tag">${fmtDayShort(o.date)} · ${esc(nameOf(o.owner))} · ${o.type==='in'?'внёс':'дивиденды'} ${money(o.amount)}${ed?` <button class="btn ghost sm" style="min-height:0;padding:0 4px" data-act="fin-del" data-kind="ownerOps" data-id="${o.id}" aria-label="Удалить">✕</button>`:''}</span>`).join('')}</div>` : ''}
    <form class="fin-add" data-kind="ownerOps"><select class="input" name="owner" aria-label="Кто"><option value="u1">Влад</option><option value="u2">Катя</option></select>
      <select class="input" name="type" aria-label="Операция"><option value="in">Внёс в студию</option><option value="div">Вывел дивиденды</option></select>
      <input class="input" name="date" type="date" value="${todayStr()}" aria-label="Дата"><input class="input num" name="amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Сумма" required aria-label="Сумма"><button class="btn sm primary" type="submit">Добавить</button></form></div>`;
  const debt = (S.data.debt||[]).slice().sort((a,b) => a.date.localeCompare(b.date)); let run = 0;
  const debtCard = `<div class="card"><div class="card-h"><h3>5. Долг студии перед собственниками</h3><b class="num" style="font-size:20px">${money(c.debtBal)}</b></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Кто</th><th>Операция</th><th class="r">Сумма</th><th class="r">Остаток долга</th>${ed?'<th></th>':''}</tr></thead><tbody>
    ${debt.map(d => { run += d.type==='loan' ? d.amount : -d.amount; return `<tr><td class="num">${fmtDayShort(d.date)}.${d.date.slice(2,4)}</td><td>${esc(nameOf(d.owner))}</td><td>${d.type==='loan'?'Вложил(а) в студию':'Студия вернула'}${d.note?`<div class="small muted">${esc(d.note)}</div>`:''}</td>
      <td class="r" style="color:${d.type==='loan'?'var(--st-over)':'var(--st-done)'}">${d.type==='loan'?'+':'−'}${money(d.amount)}</td><td class="r"><b>${money(run)}</b></td>${ed?`<td class="r"><button class="btn ghost sm" data-act="debt-del" data-id="${d.id}" aria-label="Удалить">✕</button></td>`:''}</tr>`; }).join('')}</tbody></table></div>
    ${(c.personal.u1||c.personal.u2) ? `<div class="note">В этом месяце из личных средств оплачено: Влад ${money(c.personal.u1)}, Катя ${money(c.personal.u2)}. <button class="btn sm" data-act="debt-from-personal">Добавить в долг студии</button></div>` : ''}
    <form class="fin-add" id="debt-form"><select class="input" name="owner" aria-label="Кто"><option value="u1">Влад</option><option value="u2">Катя</option></select>
      <select class="input" name="type" aria-label="Операция"><option value="loan">Вложил(а) в студию</option><option value="repay">Студия вернула</option></select>
      <input class="input" name="date" type="date" value="${todayStr()}" aria-label="Дата"><input class="input num" name="amount" type="number" min="1" step="1" inputmode="numeric" placeholder="Сумма" required aria-label="Сумма">
      <input class="input" name="note" placeholder="Комментарий" aria-label="Комментарий"><button class="btn sm primary" type="submit">Добавить</button></form></div>`;
  return `<div style="display:flex;flex-direction:column;gap:18px">
    <div class="toolbar"><h2>Финансы</h2><span class="tag lvl-owners">видят только владельцы</span><span class="spacer"></span>
      <label class="small muted" for="f-finmonth">Месяц</label><input class="input pill" type="month" id="f-finmonth" value="${M}"></div>
    <div class="bigkpis">${tile('Доходы', c.incomeTotal, monthName(M))}${tile('Расходы', c.expensesTotal, 'вкл. зарплаты и налоги')}${tile(c.profit>=0?'Прибыль':'Убыток', c.profit, 'доходы − расходы', c.profit>=0?'var(--st-done)':'var(--st-over)')}${tile('Долг студии', c.debtBal, 'перед собственниками', c.debtBal>0?'var(--st-over)':'')}</div>
    <div class="fin-grid"><div class="fin-col">${incomeCard}${resCard}${ownersCard}</div><div class="fin-col">${expCard}</div></div>
    <div class="fin-grid three">${finList('purchases','Закупки товаров и расходников', c.f.purchases, 'Если платили из своих — выберите, кто.', true)}
      ${finList('utilities','Коммуналка и сервисы', c.f.utilities, 'Переносятся в следующий месяц автоматически.', true)}
      ${finList('custom','Затраты собственников', c.f.custom, 'Ваши личные траты на студию.', true)}</div>
    ${debtCard}</div>`;
}

/* --- График администраторов: видят все, правят управляющий и владельцы --- */
const shiftsOn = date => (S.data.schedule||[]).filter(x => x.date===date).sort((a,b) => a.start.localeCompare(b.start));
const KIND_SHORT = { std:'', morning:'утро+', evening:'вечер+', full:'полный' };
function shiftChip(x, compact){
  const u = userById(x.adminId); const k = shiftKind(x);
  return `<span class="sh-chip${x.adminId===S.user.id?' me':''}" style="--c:${esc(u?.color||'#E2DDF2')}" title="${esc(u?.name||'')} ${x.start}–${x.end}${x.half?', половина смены':''}">
    <i></i><b>${esc(compact ? (u?.name||'?').slice(0,3) : (u?.name||'?'))}</b><span class="num">${x.start.replace(':00','')}–${x.end.replace(':00','')}</span>${x.half?'<em>½</em>':''}${KIND_SHORT[k]&&!compact?`<em>${KIND_SHORT[k]}</em>`:''}</span>`;
}
function viewSched(){
  const M = S.schMonth || todayStr().slice(0,7); S.schMonth = M;
  const [y,m] = M.split('-').map(Number); const first = new Date(y, m-1, 1); const off = (first.getDay()+6)%7; const days = new Date(y, m, 0).getDate();
  const T = todayStr(); const can = Rules.canEditSchedule(S.user); const rates = { ...DEFAULT_RATES, ...((S.data.settings||{}).shiftRates||{}) };
  const cells = [];
  for (let i=0;i<off;i++) cells.push('<div class="sch-day empty" aria-hidden="true"></div>');
  for (let d=1; d<=days; d++){
    const date = `${M}-${pad(d)}`; const list = shiftsOn(date); const dow = parseYmd(date).getDay();
    cells.push(`<${can?'button':'div'} class="sch-day${date===T?' today':''}${dow===0||dow===6?' we':''}"${can?` data-act="sch-day" data-d="${date}" aria-label="${fmtDay(date)}: изменить смены"`:''}>
      <span class="d num">${d}</span>${list.map(x => shiftChip(x, true)).join('')}${!list.length?'<span class="none">нет смены</span>':''}</${can?'button':'div'}>`);
  }
  const admins = shiftStaff().filter(u => isAdminRole(u) || (S.data.schedule||[]).some(x => x.adminId===u.id && x.date.slice(0,7)===M));
  const sums = admins.map(a => { const l = (S.data.schedule||[]).filter(x => x.adminId===a.id && x.date.slice(0,7)===M).map(x => ({ ...x, ...shiftPay(x, rates) }));
    return { a, n:l.reduce((s,x)=>s+x.units,0), hours:l.reduce((s,x)=>s+x.hours,0), pay:l.reduce((s,x)=>s+x.pay,0), halves:l.filter(x=>x.half).length }; });
  const todayList = shiftsOn(T);
  const agenda = []; for (let d=1; d<=days; d++){ const date = `${M}-${pad(d)}`; if (date < T && M===T.slice(0,7)) continue; const list = shiftsOn(date);
    agenda.push(`<div class="ag-row${date===T?' today':''}" ${can?`data-act="sch-day" data-d="${date}" role="button" tabindex="0"`:''}><div class="ag-d"><b>${parseYmd(date).getDate()}</b><span>${DOW[parseYmd(date).getDay()]}</span></div><div class="ag-s">${list.map(x => shiftChip(x)).join('') || '<span class="none">нет смены</span>'}</div></div>`); }
  return `<div style="display:flex;flex-direction:column;gap:16px">
    <div class="toolbar"><h2>График смен</h2><span class="spacer"></span>
      <div class="datebox"><button class="iconbtn" data-act="sch-shift" data-n="-1" aria-label="Предыдущий месяц">‹</button><span class="mlabel">${monthName(M)}</span><button class="iconbtn" data-act="sch-shift" data-n="1" aria-label="Следующий месяц">›</button></div></div>
    <div class="card today-shift"><span class="eyebrow">Сегодня на смене</span>${todayList.length ? `<div class="chips">${todayList.map(x => shiftChip(x)).join('')}</div>` : '<span class="muted">по графику никого</span>'}
      ${can ? '<span class="small muted">Нажмите на день, чтобы поставить или изменить смену. По умолчанию — 09:00–21:00.</span>' : '<span class="small muted">График меняют управляющий и владельцы.</span>'}</div>
    <div class="card sch-card"><div class="sch-grid">${['пн','вт','ср','чт','пт','сб','вс'].map(x=>`<div class="dow">${x}</div>`).join('')}${cells.join('')}</div>
      <div class="sch-agenda">${agenda.join('')}</div>
      <div class="legend" style="margin-top:12px"><span><b>½</b> — половина смены</span><span><b>утро+</b> — начало раньше 08:30</span><span><b>вечер+</b> — конец позже 21:30</span></div></div>
    <div class="card"><div class="card-h"><h3>Итоги месяца</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Сотрудник</th><th class="r">Смен</th><th class="r">Из них половин</th><th class="r">Часов</th>${can?'<th class="r">Фикс. часть</th>':''}</tr></thead><tbody>
      ${sums.map(r => `<tr><td><span style="display:inline-flex;gap:8px;align-items:center">${ava(r.a.id,true)}<b>${esc(r.a.name)}</b></span></td><td class="r">${String(r.n).replace('.',',')}</td><td class="r">${r.halves||'—'}</td><td class="r">${Math.round(r.hours)}</td>${can?`<td class="r"><b>${money(r.pay)}</b></td>`:''}</tr>`).join('')}
    </tbody></table></div>${can?'<p class="small muted">На смену можно ставить администраторов, управляющего и владельцев; одновременно — только один человек. Оплата смен попадает в «Продажи и зарплата» автоматически, смены владельцев не оплачиваются.</p>':''}</div></div>`;
}
function shiftsModal(m){
  const rates = { ...DEFAULT_RATES, ...((S.data.settings||{}).shiftRates||{}) };
  const rows = m.rows;
  return `<div class="overlay" data-act="close-bg"><div class="modal" style="max-width:720px"><div class="modal-h"><h3>Смены · ${fmtDay(m.date)}, ${DOW_FULL[parseYmd(m.date).getDay()]}</h3>${closeX}</div>
    ${rows.length ? rows.map((r,i) => { const sp = shiftPay(r, rates); return `<div class="sh-row">
      <div class="field"><label for="sr-a-${i}">Кто на смене</label><select class="input" id="sr-a-${i}" data-sr="${i}" data-k="adminId">${shiftStaff().map(a => `<option value="${a.id}"${r.adminId===a.id?' selected':''}>${esc(a.name)} · ${rolesOf(a).map(x => ROLES[x].toLowerCase()).join(' + ')}</option>`).join('')}</select></div>
      <div class="field"><label for="sr-s-${i}">С</label><input class="input" type="time" id="sr-s-${i}" data-sr="${i}" data-k="start" value="${r.start}" step="900"></div>
      <div class="field"><label for="sr-e-${i}">До</label><input class="input" type="time" id="sr-e-${i}" data-sr="${i}" data-k="end" value="${r.end}" step="900"></div>
      <div class="field"><label for="sr-t-${i}">Оплата</label><select class="input" id="sr-t-${i}" data-sr="${i}" data-k="type"><option value="auto"${r.type==='auto'?' selected':''}>по времени</option>${SHIFT_TYPES.map(t => `<option value="${t.k}"${r.type===t.k?' selected':''}>${t.name}</option>`).join('')}</select></div>
      <label class="half"><input type="checkbox" data-sr="${i}" data-k="half"${r.half?' checked':''}> ½ смены</label>
      <div class="sh-pay small"><b>${money(sp.pay)}</b><span class="muted">${SHIFT_TYPES.find(t=>t.k===sp.kind).name.toLowerCase()}${r.half?', половина':''}</span></div>
      <button type="button" class="iconbtn" data-act="sr-del" data-i="${i}" aria-label="Убрать смену">✕</button></div>`; }).join('') : '<p class="muted">В этот день смен нет.</p>'}
    ${(() => { const so = rows.slice().sort((x,y) => x.start.localeCompare(y.start)); for (let i=1;i<so.length;i++) if (so[i].start < so[i-1].end) return `<div class="note warn">Одновременно может работать только один администратор. Смены ${so[i-1].start}–${so[i-1].end} и ${so[i].start}–${so[i].end} пересекаются — поправьте время.</div>`; return ''; })()}
    <div class="toolbar"><button type="button" class="btn sm" data-act="sr-add">+ Смена 09:00–21:00</button><button type="button" class="btn sm" data-act="sr-add" data-half="1">+ Вторая половина 15:00–21:00</button></div>
    <p class="small muted">Половинчатая смена оплачивается по коэффициенту ${String(rates.halfFactor).replace('.',',')} от ставки (меняется в «Продажи и зарплата»).</p>
    <div class="modal-f"><span class="spacer"></span><button class="btn" data-act="close">Отмена</button><button class="btn primary" data-act="sr-save">Сохранить</button></div></div></div>`;
}

/* --- Отчёт смены (поля настраивает владелец) --- */
const fmtN = n => (Number(n)||0).toLocaleString('ru-RU');
const repFields = () => (S.data.settings||{}).reportFields || DEFAULT_REPORT_FIELDS;
const repVal = (r, k) => (r.values||{})[k] ?? r[k] ?? '';
function reportText(r){
  const d = parseYmd(r.date); const F = repFields();
  const line = f => { const v = repVal(r, f.k); const att = F.find(x => x.attachTo===f.k); const note = att ? repVal(r, att.k) : '';
    return `${f.emoji?f.emoji+' ':''}${f.label}: ${f.type==='text' ? v : fmtN(v)}${note?` (${note})`:''}`; };
  const money = F.filter(f => f.inTotal), counts = F.filter(f => f.type==='count'), other = F.filter(f => !f.inTotal && f.type!=='count' && !f.attachTo);
  const total = money.reduce((a,f) => a + (Number(repVal(r,f.k))||0), 0);
  const blocks = [[`📆 Дата отчета: ${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} г.`, ...(money.length?[`💰 Всего: ${fmtN(total)}`]:[]), ...money.map(line)].join('\n')];
  if (counts.length) blocks.push(counts.map(line).join('\n'));
  blocks.push(`4️⃣ Задач выполнено ${r.tasksDone} из ${r.tasksTotal}`);
  if (other.length) blocks.push(other.map(line).join('\n'));
  if (r.comment) blocks.push(`💬 ${r.comment}`);
  return blocks.join('\n\n');
}
const reportTotal = r => repFields().filter(f => f.inTotal).reduce((a,f) => a + (Number(repVal(r,f.k))||0), 0);
const dayTeamTasks = date => S.data.tasks.filter(t => t.due===date && t.level==='team' && t.status!=='cancel');
const driveNote = date => `Google Документ «Отчёты смен Sukha Prana» · фото: папка «Отчёты смен / ${date.slice(0,7)}», файл «Чек_${date}.jpg»`;
function viewRep(){
  const date = S.repDate || todayStr(); S.repDate = date;
  const rep = (S.data.reports||[]).find(r => r.date===date);
  const onShift = shiftsOn(date); const mine = onShift.some(x => x.adminId===S.user.id); const owner = isOwner(S.user);
  const canEdit = mine || owner;
  const tt = dayTeamTasks(date); const tDone = tt.filter(t => t.status==='done').length;
  let main;
  if (S.repEdit && canEdit) main = reportForm(date, rep, tDone, tt.length);
  else if (rep) main = `<div class="card rep-card"><div class="card-h"><h3>Отчёт за ${fmtDay(date)}</h3><span class="badge b-done">сдан</span></div>
      <div class="rep-wrap"><pre class="rep-text">${esc(reportText(rep))}</pre>
      <figure class="rep-photo"><img src="${esc(rep.photo)}" alt="Фото чека за ${fmtDay(date)}" data-act="zoom"><figcaption class="small muted">${esc(rep.photoName||`Чек_${date}.jpg`)} · нажмите, чтобы увеличить</figcaption></figure></div>
      <p class="small muted">Сдал(а) ${esc(nameOf(rep.createdBy))}${rep.updatedBy && rep.updatedBy!==rep.createdBy?`, изменил(а) ${esc(nameOf(rep.updatedBy))}`:''} · ${fmtDT(rep.updatedAt)}.</p>
      <p class="small drive">${CONFIG.MODE==='demo'?'В рабочей версии сохраняется: ':'Сохранено: '}${esc(driveNote(date))}</p>
      <div class="modal-f"><button class="btn" data-act="rep-copy">Скопировать текст для чата</button>${canEdit?`<button class="btn primary" data-act="rep-edit">${mine?'Изменить':'Исправить (владелец)'}</button>`:''}</div></div>`;
  else main = `<div class="card"><div class="card-h"><h3>Отчёт за ${fmtDay(date)}</h3><span class="badge ${date<todayStr()?'b-over':'b-work'}">${date<todayStr()?'не сдан':'ещё не сдан'}</span></div>
      ${onShift.length ? `<p>Сдаёт администратор на смене: <b>${onShift.map(x => esc(nameOf(x.adminId))).join(', ')}</b>.</p>` : '<p class="muted">По графику в этот день смены нет.</p>'}
      ${canEdit ? `<button class="btn primary" data-act="rep-edit">${mine?'Заполнить отчёт':'Заполнить за администратора (владелец)'}</button>` : '<p class="small muted">Заполнить и изменить отчёт может только тот, кто работает в этот день.</p>'}</div>`;
  const hist = []; for (let i=0;i<14;i++){ const d = addDays(todayStr(), -i); const r = (S.data.reports||[]).find(x => x.date===d); const sh = shiftsOn(d);
    hist.push(`<tr class="pick${d===date?' sel':''}" data-act="rep-date" data-d="${d}"><td class="num">${fmtDayShort(d)} <span class="muted small">${DOW[parseYmd(d).getDay()]}</span></td><td>${sh.map(x => esc(nameOf(x.adminId))).join(', ')||'<span class="muted">—</span>'}</td>
      <td class="r">${r?money(reportTotal(r)):'—'}</td><td>${r?'<span class="badge b-done">сдан</span>':sh.length?(d===todayStr()?'<span class="badge b-work">сегодня</span>':'<span class="badge b-over">нет</span>'):'<span class="muted small">нет смены</span>'}</td></tr>`); }
  return `<div style="display:flex;flex-direction:column;gap:16px">
    <div class="toolbar"><h2>Отчёт смены</h2><span class="spacer"></span>${owner?'<button class="btn" data-act="repfields">Поля отчёта</button>':''}<div class="datebox"><button class="iconbtn" data-act="rep-shift" data-n="-1" aria-label="Предыдущий день">‹</button><input type="date" id="f-repdate" value="${date}" max="${todayStr()}" aria-label="Дата отчёта"><button class="iconbtn" data-act="rep-shift" data-n="1" aria-label="Следующий день">›</button></div></div>
    <div class="sal-grid"><div class="sal-col">${main}</div>
    <div class="sal-side"><div class="card"><div class="card-h"><h3>Последние 2 недели</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Дата</th><th>Смена</th><th class="r">Всего</th><th>Отчёт</th></tr></thead><tbody>${hist.join('')}</tbody></table></div>
      <p class="small muted">Отчёты видят все администраторы, управляющий и владельцы. Каждый отчёт дописывается в Google Документ, фото чека — в папку месяца на Google Диске с датой отчёта в названии.</p></div></div></div></div>`;
}
function reportForm(date, rep, tDone, tTotal){
  const F = repFields();
  if (!S.repDraft){ const vals = {}; F.forEach(f => vals[f.k] = rep ? repVal(rep, f.k) : ''); S.repDraft = { values:vals, comment:rep?.comment||'', photo:rep?.photo||'' }; }
  const r = S.repDraft; const total = F.filter(f => f.inTotal).reduce((a,f) => a + (Number(r.values[f.k])||0), 0);
  const fld = f => f.type==='text'
    ? `<div class="field"><label for="rpf-${f.k}">${esc(f.emoji)} ${esc(f.label)}</label><input class="input" id="rpf-${f.k}" data-rp="${esc(f.k)}" value="${esc(r.values[f.k]??'')}"></div>`
    : `<div class="field"><label for="rpf-${f.k}">${esc(f.emoji)} ${esc(f.label)}${f.type==='money'?', ₽':''}</label><input class="input num" id="rpf-${f.k}" data-rp="${esc(f.k)}" type="number" min="0" step="1" inputmode="numeric" value="${r.values[f.k]??''}" placeholder="0"></div>`;
  const money = F.filter(f => f.inTotal), counts = F.filter(f => f.type==='count'), other = F.filter(f => !f.inTotal && f.type!=='count');
  const onShift = shiftsOn(date).some(x => x.adminId===S.user.id);
  return `<form class="card" id="rep-form"><div class="card-h"><h3>Отчёт за ${fmtDay(date)}</h3><span class="small muted">${onShift?'заполняет администратор на смене':'правка владельцем — отметится в отчёте'}</span></div>
    ${money.length ? `<div class="rep-sec"><span class="eyebrow">Выручка за смену</span><div class="grid3">${money.map(fld).join('')}</div>
      <div class="rep-total">💰 Всего: <b class="num" id="rp-total">${fmtN(total)}</b> <span class="small muted">считается само</span></div></div>` : ''}
    ${counts.length ? `<div class="rep-sec"><span class="eyebrow">Продажи и показатели</span><div class="grid3">${counts.map(fld).join('')}</div></div>` : ''}
    <div class="rep-sec"><span class="eyebrow">Задачи</span><p>4️⃣ Задач выполнено <b>${tDone} из ${tTotal}</b> <span class="small muted">— по чек-листу команды, обновится при сохранении</span></p></div>
    ${other.length ? `<div class="rep-sec"><span class="eyebrow">Касса и прочее</span><div class="grid2">${other.map(fld).join('')}</div></div>` : ''}
    <div class="rep-sec"><span class="eyebrow">Фото чека — обязательно</span>
      <div class="photo-in">${r.photo ? `<img src="${esc(r.photo)}" alt="Фото чека" data-act="zoom"><button type="button" class="btn sm ghost" data-act="rp-photo-del">Заменить</button>`
        : `<label class="dropzone small-dz" for="rp-photo"><b>Сфотографировать или выбрать чек</b><span class="small muted">Сохранится как «Чек_${date}.jpg»</span><input type="file" id="rp-photo" accept="image/*" capture="environment" hidden></label>`}</div></div>
    <div class="field"><label for="rp-comment">Комментарий (необязательно)</label><textarea class="input" id="rp-comment" data-rp-c="1" rows="2">${esc(r.comment)}</textarea></div>
    <div class="modal-f"><button type="button" class="btn" data-act="rep-cancel">Отмена</button><button class="btn primary" type="submit">${rep?'Сохранить изменения':'Сдать отчёт'}</button></div></form>`;
}
function repFieldsModal(m){
  const list = m.list;
  return `<div class="overlay" data-act="close-bg"><div class="modal" style="max-width:720px"><div class="modal-h"><h3>Поля отчёта смены</h3>${closeX}</div>
    <p class="small muted">Порядок полей = порядок строк в отчёте. Суммы с галочкой «в итог» складываются в «💰 Всего». Старые отчёты сохраняют свои значения.</p>
    <div class="rf-list">${list.map((f,i) => `<div class="rf-row">
      <input class="input rf-emo" data-rf="${i}" data-k="emoji" value="${esc(f.emoji)}" aria-label="Значок" maxlength="4">
      <input class="input" data-rf="${i}" data-k="label" value="${esc(f.label)}" aria-label="Название поля">
      <select class="input" data-rf="${i}" data-k="type" aria-label="Тип">${Object.entries(REPORT_TYPES).map(([k,v]) => `<option value="${k}"${f.type===k?' selected':''}>${v}</option>`).join('')}</select>
      <label class="small rf-tot"><input type="checkbox" data-rf="${i}" data-k="inTotal"${f.inTotal?' checked':''}${f.type!=='money'?' disabled':''}> в итог</label>
      <span class="rf-btns"><button type="button" class="iconbtn" data-act="rf-up" data-i="${i}" aria-label="Выше"${i===0?' disabled':''}>↑</button><button type="button" class="iconbtn" data-act="rf-down" data-i="${i}" aria-label="Ниже"${i===list.length-1?' disabled':''}>↓</button><button type="button" class="iconbtn" data-act="rf-del" data-i="${i}" aria-label="Удалить поле">✕</button></span></div>`).join('')}</div>
    <div class="toolbar"><button type="button" class="btn sm" data-act="rf-add" data-t="count">+ Количество</button><button type="button" class="btn sm" data-act="rf-add" data-t="money">+ Сумма</button><button type="button" class="btn sm" data-act="rf-add" data-t="text">+ Текст</button><button type="button" class="btn ghost sm" data-act="rf-reset">Вернуть как было</button></div>
    <div class="note"><b>Предпросмотр:</b><pre class="rep-text" style="margin-top:6px">${esc(reportText({ date:todayStr(), values:Object.fromEntries(list.map(f => [f.k, f.type==='text'?'…':0])), tasksDone:0, tasksTotal:0 }).replace(/: 0/g, ': …'))}</pre></div>
    <div class="modal-f"><span class="spacer"></span><button class="btn" data-act="close">Отмена</button><button class="btn primary" data-act="rf-save">Сохранить</button></div></div></div>`;
}

/* --- Уведомления: центр в панели + настройки у каждого --- */
function isMutedNow(n){
  const st = S.data.notify || defaultNotify(S.user.role); const now = new Date(); const T = todayStr();
  if ((st.offDays||[]).includes(now.getDay())) return 'выходной день';
  if ((st.offDates||[]).includes(T)) return 'отмечен как нерабочий';
  if (st.onlyShifts && isAdminRole(S.user) && !shiftsOn(T).some(x => x.adminId===S.user.id) && !isManager(S.user) && !isOwner(S.user)) return 'сегодня нет вашей смены';
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`; const qf = st.quietFrom, qt = st.quietTo;
  if (qf && qt && (qf < qt ? (hm>=qf && hm<qt) : (hm>=qf || hm<qt))) return `тихие часы ${qf}–${qt}`;
  return '';
}
function computeNotifications(){
  if (!S.data) return [];
  const me = S.user.id, st = S.data.notify || defaultNotify(S.user.role), ty = st.types||{}; const now = Date.now(); const T = todayStr(); const out = [];
  const myTask = t => t.assignee===me || t.helper===me || (!t.assignee && isAdminRole(S.user) && t.level==='team' && shiftsOn(t.due).some(x => x.adminId===me));
  S.data.tasks.forEach(t => {
    if (ty.assigned && (t.assignee===me || t.helper===me) && t.createdBy!==me && t.createdBy!=='auto' && now - new Date(t.createdAt).getTime() < 3*864e5)
      out.push({ id:'as-'+t.id, at:t.createdAt, icon:'📌', title:'Новая задача для вас', text:`${t.title} — от ${nameOf(t.createdBy)}, срок ${fmtDayShort(t.due)} ${t.dueTime}`, task:t.id });
    if (!isOpen(t) || !myTask(t)) return;
    const left = (dueDate(t).getTime() - now)/60000;
    if (ty.deadline && left > 0 && left <= (st.remindMin||60)) out.push({ id:`dl-${t.id}-${t.due}`, at:new Date(dueDate(t).getTime() - (st.remindMin||60)*60000).toISOString(), icon:'⏰', title:`Через ${Math.round(left)} мин дедлайн`, text:t.title, task:t.id });
    if (ty.overdue && left <= 0 && t.due >= addDays(T,-3)) out.push({ id:`ov-${t.id}`, at:dueDate(t).toISOString(), icon:'⚠️', title:'Задача просрочена', text:`${t.title} — ${fmtOverdue(t)}`, task:t.id, urgent:true });
  });
  if (ty.comments) S.data.tasks.filter(t => t.assignee===me || t.helper===me || t.createdBy===me).forEach(t => (t.comments||[]).filter(c => c.by!==me && now - new Date(c.at).getTime() < 3*864e5)
    .forEach(c => out.push({ id:'cm-'+c.id, at:c.at, icon:'💬', title:`${nameOf(c.by)} прокомментировал(а)`, text:`«${t.title}»: ${c.text}`, task:t.id })));
  if (ty.schedule && isAdminRole(S.user)){ const tm = addDays(T,1); const sTom = shiftsOn(tm).find(x => x.adminId===me), sTod = shiftsOn(T).find(x => x.adminId===me);
    if (sTod) out.push({ id:'sh-'+T, at:T+'T07:00:00', icon:'🗓', title:'Сегодня ваша смена', text:`${sTod.start}–${sTod.end}${sTod.half?' (половина смены)':''}`, view:'sched' });
    if (sTom) out.push({ id:'sh-'+tm, at:T+'T18:00:00', icon:'🗓', title:'Завтра ваша смена', text:`${sTom.start}–${sTom.end}${sTom.half?' (половина смены)':''}`, view:'sched' }); }
  if (ty.report){ const hasRep = d => (S.data.reports||[]).some(r => r.date===d);
    if (shiftsOn(T).some(x => x.adminId===me) && new Date().getHours() >= 20 && !hasRep(T)) out.push({ id:'rp-'+T, at:T+'T20:00:00', icon:'🧾', title:'Сдайте отчёт смены', text:'Выручка, продления, касса и фото чека', view:'rep', urgent:true });
    if ((isOwner(S.user) || isManager(S.user)) && shiftsOn(addDays(T,-1)).length && !hasRep(addDays(T,-1))) out.push({ id:'rpm-'+addDays(T,-1), at:T+'T09:00:00', icon:'🧾', title:'Нет отчёта за вчера', text:`Смена: ${shiftsOn(addDays(T,-1)).map(x => nameOf(x.adminId)).join(', ')}`, view:'rep', date:addDays(T,-1) }); }
  if (ty.signup && isOwner(S.user)) pendingUsers().forEach(u => out.push({ id:'su-'+u.id, at:u.createdAt, icon:'👤', title:'Заявка на доступ', text:`${u.fullName} — ${ROLES[u.role].toLowerCase()}`, view:'team', urgent:true }));
  if (ty.payout) (S.data.payouts||[]).filter(p => p.recipient===me && p.issuedAt && now - new Date(p.issuedAt).getTime() < 7*864e5)
    .forEach(p => out.push({ id:'po-'+p.id, at:p.issuedAt, icon:'✉️', title:'Конверт выдан', text:`${p.periodFrom?periodLabel(p.periodFrom,p.periodTo):p.period} — выдал(а) ${nameOf(p.issuedBy)}`, view:'pay' }));
  return out.sort((a,b) => String(b.at).localeCompare(String(a.at)));
}
const readKey = () => 'sp_notif_read_' + (S.user?.id||'');
const getRead = () => { try { return new Set(JSON.parse(safeLS.get(readKey())||'[]')); } catch(e){ return new Set(); } };
const setRead = set => safeLS.set(readKey(), JSON.stringify([...set].slice(-400)));
function notifModal(){
  const list = computeNotifications(); const read = getRead(); const muted = isMutedNow();
  return `<div class="overlay" data-act="close-bg"><div class="modal" style="max-width:560px"><div class="modal-h"><h3>Уведомления</h3>${closeX}</div>
    ${muted ? `<div class="note">Сейчас уведомления на телефон не приходят: ${esc(muted)}. В панели они всё равно видны.</div>` : ''}
    <div class="ntf-list">${list.length ? list.map(n => `<button class="ntf${read.has(n.id)?'':' unread'}${n.urgent?' urgent':''}" data-act="ntf-open" data-nid="${esc(n.id)}" ${n.task?`data-task="${n.task}"`:''} ${n.view?`data-view="${n.view}"`:''} ${n.date?`data-date="${n.date}"`:''}>
      <span class="ic" aria-hidden="true">${n.icon}</span><span class="tx"><b>${esc(n.title)}</b><span>${esc(n.text)}</span><span class="small muted">${fmtDT(n.at)}</span></span></button>`).join('') : '<p class="muted">Новых уведомлений нет.</p>'}</div>
    <div class="modal-f"><button class="btn ghost" data-act="ntf-readall">Прочитать все</button><span class="spacer"></span><button class="btn" data-act="notifyset">Настроить уведомления</button></div></div></div>`;
}
function notifySetModal(){
  const st = { ...defaultNotify(S.user.role), ...(S.data.notify||{}) }; const ty = st.types||{};
  const TYPES = [['assigned','Мне поставили задачу'],['deadline','Скоро дедлайн моей задачи'],['overdue','Моя задача просрочена'],['comments','Комментарии к моим задачам'],
    ...(isAdminRole(S.user)?[['schedule','Напоминание о смене (сегодня и завтра)']]:[]), ['report', isOwner(S.user)||isManager(S.user) ? 'Отчёт смены не сдан' : 'Пора сдать отчёт смены'],
    ...(isOwner(S.user)?[['signup','Новые заявки на доступ']]:[]), ['payout','Конверт с зарплатой выдан']];
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return `<div class="overlay" data-act="close-bg"><form class="modal" id="notify-form" style="max-width:600px"><div class="modal-h"><h3>Мой профиль и уведомления</h3>${closeX}</div>
    <div class="field"><span class="small muted" style="font-weight:600">Аватар</span>${avatarPicker((userById(S.user.id)||S.user).avatar, 'my-avatar')}</div>
    <div class="install"><div class="app-ic" aria-hidden="true">${ICON_LOTUS}</div><div><b>Панель как приложение на iPhone</b>
      <ol class="small"><li>Откройте панель в Safari.</li><li>Нажмите «Поделиться» <span aria-hidden="true">⬆︎</span> → «На экран „Домой“».</li><li>Запустите Sukha Prana с иконки и разрешите уведомления.</li></ol>
      <span class="small muted">${standalone ? 'Панель уже открыта как приложение.' : ios ? 'Вы на iPhone — можно установить прямо сейчас.' : 'Уведомления на iPhone работают с iOS 16.4 и только у панели, добавленной на экран «Домой».'}</span></div></div>
    <div class="field"><span class="small muted" style="font-weight:600">Куда присылать</span>
      <label class="sw"><input type="checkbox" id="nt-push"${st.push?' checked':''}><span>На телефон (уведомления приложения)</span></label>
      <label class="sw"><input type="checkbox" id="nt-tg"${st.telegram?' checked':''}><span>В Telegram (бот студии)</span></label>
      <div class="toolbar" style="margin-top:4px">${st.tgChatId ? '<span class="tag">✓ Telegram подключён</span>' : '<span class="small muted">Telegram ещё не подключён</span>'}
        <button type="button" class="btn sm" data-act="tg-link">${st.tgChatId ? 'Подключить заново' : 'Подключить Telegram'}</button></div></div>
    <div class="field"><span class="small muted" style="font-weight:600">О чём сообщать</span>${TYPES.map(([k,l]) => `<label class="sw"><input type="checkbox" data-nt="${k}"${ty[k]?' checked':''}><span>${l}</span></label>`).join('')}</div>
    <div class="grid3"><div class="field"><label for="nt-rem">Напомнить о дедлайне за</label><select class="input" id="nt-rem">${[15,30,60,120,180].map(n => `<option value="${n}"${Number(st.remindMin)===n?' selected':''}>${n<60?n+' мин':n/60+' ч'}</option>`).join('')}</select></div>
      <div class="field"><label for="nt-qf">Тихие часы с</label><input class="input" id="nt-qf" type="time" value="${st.quietFrom||''}"></div><div class="field"><label for="nt-qt">до</label><input class="input" id="nt-qt" type="time" value="${st.quietTo||''}"></div></div>
    <div class="field"><span class="small muted" style="font-weight:600">Не беспокоить по дням недели</span>${dayChips('nt-days', st.offDays||[])}</div>
    ${isAdminRole(S.user) ? `<label class="sw"><input type="checkbox" id="nt-only"${st.onlyShifts?' checked':''}><span>Присылать только в дни моих смен по графику</span></label>` : ''}
    <div class="field"><span class="small muted" style="font-weight:600">Отдельные нерабочие дни (отпуск, отгул)</span>
      <div class="chips" id="nt-dates">${(st.offDates||[]).slice().sort().map(d => `<span class="tag">${fmtDay(d)} <button type="button" class="btn ghost sm" style="min-height:0;padding:0 4px" data-act="nt-date-del" data-d="${d}" aria-label="Убрать">✕</button></span>`).join('') || '<span class="small muted">не выбраны</span>'}</div>
      <div class="toolbar"><input class="input pill" type="date" id="nt-newdate" min="${todayStr()}" aria-label="Нерабочий день"><button type="button" class="btn sm" data-act="nt-date-add">Добавить день</button></div></div>
    <div class="modal-f"><button type="button" class="btn ghost" data-act="nt-test">Проверить уведомление</button><span class="spacer"></span><button type="button" class="btn" data-act="close">Отмена</button><button class="btn primary" type="submit">Сохранить</button></div></form></div>`;
}
/* Всплывающее уведомление внутри панели (так выглядит пуш на телефоне) */
const shownPush = new Set();
function showPush(n){
  app.querySelector('.push')?.remove();
  const el = document.createElement('button'); el.className = 'push'; el.type = 'button';
  el.innerHTML = `<span class="app-ic sm" aria-hidden="true">${ICON_LOTUS}</span><span class="tx"><span class="small muted">SUKHA PRANA · сейчас</span><b>${esc(n.title)}</b><span>${esc(n.text)}</span></span>`;
  el.addEventListener('click', () => { el.remove(); if (n.task){ const t = S.data.tasks.find(x => x.id===n.task); if (t){ S.modal = { type:'task', task:JSON.parse(JSON.stringify(t)) }; render(); } } else if (n.view){ S.view = n.view; render(); } });
  app.appendChild(el); setTimeout(() => el.remove(), 6000);
}
function pushNew(){
  if (!S.user || isMutedNow() || !(S.data.notify||{}).push) return;
  const read = getRead(); const fresh = computeNotifications().filter(n => !read.has(n.id) && !shownPush.has(n.id) && n.urgent);
  if (fresh.length){ fresh.forEach(n => shownPush.add(n.id)); showPush(fresh[0]); }
}

/* --- Мобильная навигация: нижняя панель как в приложении --- */
function bottomNav(tabs){
  const main = ['day','sched','rep'].filter(k => tabs.some(t => t[0]===k));
  const ic = { day:'✓', sched:'🗓', rep:'🧾' };
  const more = tabs.filter(t => !main.includes(t[0]));
  return `<nav class="bnav" aria-label="Разделы">${main.map(k => { const t = tabs.find(x => x[0]===k); return `<button class="bn${S.view===k?' on':''}" data-act="view" data-v="${k}"><span class="bi" aria-hidden="true">${ic[k]}</span><span>${k==='day'?'Задачи':t[1]}</span>${t[2]?`<span class="cnt">${t[2]}</span>`:''}</button>`; }).join('')}
    <button class="bn" data-act="ntf"><span class="bi" aria-hidden="true">🔔</span><span>Уведомл.</span>${unreadCount()?`<span class="cnt">${unreadCount()}</span>`:''}</button>
    <button class="bn${more.some(t=>t[0]===S.view)?' on':''}" data-act="more"><span class="bi" aria-hidden="true">☰</span><span>Ещё</span></button></nav>`;
}
function moreSheet(tabs){
  const more = tabs.filter(t => !['day','sched','rep'].includes(t[0]));
  return `<div class="overlay sheet-o" data-act="close-bg"><div class="sheet"><div class="grab" aria-hidden="true"></div>
    ${more.map(([k,l,c]) => `<button class="sheet-i${S.view===k?' on':''}" data-act="view" data-v="${k}">${l}${c?`<span class="cnt">${c}</span>`:''}</button>`).join('')}
    <button class="sheet-i" data-act="notifyset">Мои уведомления и установка на iPhone</button><button class="sheet-i" data-act="logout">Выйти</button></div></div>`;
}
const unreadCount = () => { const r = getRead(); return computeNotifications().filter(n => !r.has(n.id)).length; };

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 8 · ВЫГРУЗКИ CSV И PDF
   Что делает:   скачивание таблиц и отчётов.
   Можно менять: заголовки столбцов.
   Не трогать:   остальное.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 8. ОТЧЁТЫ ---------- */
function reportTasks(){
  const b = dayBuckets(S.date);
  return [...b.carried, ...b.recurring, ...b.dueToday];
}
function csvFor(kind){
  const sep = ';'; const q = v => `"${String(v??'').replace(/"/g,'""')}"`;
  if (kind==='stats'){
    const rows = loadRows(); const ws = weeklySeries();
    return '﻿' + [['Сотрудник','Создал','Выполнил','Открыто','Просрочено'].join(sep), ...rows.map(r => [r.u.name,r.created,r.done,r.open,r.over].map(q).join(sep)),
      '', ['Неделя с','Выполнено, %','Задач'].join(sep), ...ws.map(w => [w.label, w.value??'', w.n].map(q).join(sep))].join('\r\n');
  }
  const head = ['ID','Название','Ответственный','Статус','Прогресс, %','Дедлайн','Дата создания','Создатель'];
  return '﻿' + [head.join(sep), ...reportTasks().map(t => [t.id, t.title, t.assignee?nameOf(t.assignee):'Админ смены', STATUS[dispStatus(t)]+(t.late?' (с опозданием)':''), t.progress,
    `${fmtDayShort(t.due)}.${t.due.slice(0,4)} ${t.dueTime}`, fmtDT(t.createdAt), nameOf(t.createdBy)].map(q).join(sep))].join('\r\n');
}
function reportHtml(kind){
  const now = new Date(); const stamp = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (kind==='stats'){
    const rows = loadRows(); const ws = weeklySeries(); const m = dayMetrics(S.date);
    return `<div id="report-src"><h2>Статистика задач на ${fmtDay(S.date)}</h2><p>Sukha Prana · сформирован ${stamp} · ${esc(S.user.name)}</p>
      <p><b>Выполнено за день:</b> ${m.pct??'—'}% (${m.done} из ${m.total}) · <b>Просрочено сейчас:</b> ${allOverdue().length}</p>
      <table><thead><tr><th>Сотрудник</th><th>Создал</th><th>Выполнил</th><th>Открыто</th><th>Просрочено</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.u.name)}</td><td>${r.created}</td><td>${r.done}</td><td>${r.open}</td><td>${r.over}</td></tr>`).join('')}</tbody></table>
      <p style="margin-top:12px"><b>По неделям:</b> ${ws.map(w=>`${w.label}: ${w.value??'—'}%`).join(' · ')}</p></div>`;
  }
  const list = reportTasks(); const m = dayMetrics(S.date);
  return `<div id="report-src"><h2>Отчёт по задачам за ${fmtDay(S.date)} ${S.date.slice(0,4)}</h2><p>Sukha Prana · сформирован ${stamp} · ${esc(S.user.name)}</p>
    <p><b>Процент выполнения:</b> ${m.pct??'—'}% (${m.done} из ${m.total}) · <b>Просрочено:</b> ${list.filter(isOverdue).length}</p>
    <table><thead><tr><th>ID</th><th>Задача</th><th>Ответственный</th><th>Статус</th><th>%</th><th>Дедлайн</th><th>Создал</th></tr></thead><tbody>
    ${list.map(t=>`<tr><td>${esc(t.id)}</td><td>${esc(t.title)}</td><td>${esc(t.assignee?nameOf(t.assignee):'Админ смены')}</td><td>${STATUS[dispStatus(t)]}${t.late?' (с опозданием)':''}</td><td>${t.progress}</td><td>${fmtDayShort(t.due)} ${t.dueTime}</td><td>${esc(nameOf(t.createdBy))}</td></tr>`).join('')}</tbody></table></div>`;
}
function exportModal(m){
  return `<div class="overlay" data-act="close-bg"><div class="modal wide"><div class="modal-h"><h3>Выгрузить отчёт</h3><button class="iconbtn" data-act="close" aria-label="Закрыть">✕</button></div>
    <div class="report-preview">${reportHtml(m.kind)}</div>
    ${CONFIG.MODE==='demo' ? '<div class="note">В прототипе браузер может не дать скачать файл. На странице Тильды CSV и PDF скачиваются сразу. Кнопка «Скопировать CSV» работает везде.</div>' : ''}
    <div class="modal-f"><button class="btn" data-act="copy-csv" data-kind="${m.kind}">Скопировать CSV</button><button class="btn" data-act="dl-csv" data-kind="${m.kind}">Скачать CSV</button><button class="btn primary" data-act="dl-pdf" data-kind="${m.kind}">Скачать PDF</button></div></div></div>`;
}
function downloadBlob(text, name, type){
  const blob = new Blob([text], { type }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function loadScript(src, globalName){ return new Promise((ok,fail) => { if (window[globalName]) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Не удалось загрузить нужную библиотеку. Проверьте интернет и повторите.')); document.head.appendChild(s); }); }
async function downloadPdf(kind){
  await loadScript(CONFIG.HTML2PDF_URL, 'html2pdf');
  const el = document.getElementById('report-src');
  const name = kind==='stats' ? `statistika_${S.date}.pdf` : `otchet_zadachi_${S.date}.pdf`;
  await window.html2pdf().set({ margin:10, filename:name, html2canvas:{ scale:2, backgroundColor:'#ffffff' }, jsPDF:{ unit:'mm', format:'a4', orientation:'landscape' } }).from(el).save();
}

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 9 · КНОПКИ И ФОРМЫ
   Что делает:   что происходит при нажатии кнопок и отправке форм. Каждое действие — строка case 'имя-действия'.
   Можно менять: тексты всплывающих сообщений (toast).
   Не трогать:   имена действий — они совпадают с data-act в БЛОКЕ 7.
   ════════════════════════════════════════════════════════════════════════ */
/* ---------- 9. СОБЫТИЯ ---------- */
let toastTimer;
function toast(msg, isErr){
  app.querySelector('.toast')?.remove(); clearTimeout(toastTimer);
  const el = document.createElement('div'); el.className = 'toast'+(isErr?' err':''); el.textContent = msg; el.setAttribute('role','status'); app.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), isErr ? 4200 : 2200);
}
async function run(fn, okMsg){
  if (S.busy) return; S.busy = true;
  try { await fn(); if (okMsg) toast(okMsg); }
  catch(e){ toast(e.message || 'Что-то пошло не так. Повторите.', true); if (S.data) render(); }
  finally { S.busy = false; }
}
const replaceIn = (arr, item) => { const i = arr.findIndex(x => x.id===item.id); if (i>=0) arr[i]=item; else arr.push(item); };
/* Сохранение задачи: сервер возвращает задачу и пересчитанные общие задачи (прогресс по связке) */
async function saveTask(task){
  const r = await Api.call('saveTask', { task });
  replaceIn(S.data.tasks, r.task); if (r.parent) replaceIn(S.data.tasks, r.parent); if (r.oldParent) replaceIn(S.data.tasks, r.oldParent);
  return r.task;
}
/* Окно задачи после действия: показываем свежую версию, не теряя несохранённых правок в полях формы */
function refreshTaskModal(id){
  if (S.modal?.type!=='task' || S.modal.task.id!==id) return;
  const fresh = S.data.tasks.find(x => x.id===id); if (!fresh) return;
  S.modal.task = document.getElementById('task-form') ? { ...fresh, ...readTaskForm() } : JSON.parse(JSON.stringify(fresh));
}
function keepFormAndRerender(t){ refreshTaskModal(t.id); render(); document.getElementById('cmt-list')?.scrollTo(0, 1e6); }
function addComment(id){
  const ta = document.getElementById('cmt-text'); const text = (ta?.value||'').trim();
  if (!text){ ta?.focus(); toast('Напишите текст комментария.', true); return; }
  run(async () => { const t = await Api.call('addComment', { id, text }); replaceIn(S.data.tasks, t); keepFormAndRerender(t); document.getElementById('cmt-text')?.focus(); }, 'Комментарий добавлен');
}
const blankTask = extra => ({ id:'', title:'', desc:'', level: isPureSmm(S.user) ? 'smm' : Rules.levelsFor(S.user).slice(-1)[0], assignee: (isPureAdmin(S.user) || isPureSmm(S.user))?S.user.id:'', helper:'', start:S.date, due:S.date,
  dueTime:CONFIG.DEFAULT_DUE_TIME, priority:'mid', status:'todo', progress:0, block:'', parentId:'', ...extra });
const finMonthData = () => S.data.finance[S.finMonth];
async function saveFin(data){ S.data.finance = await Api.call('saveFinance', { month:S.finMonth, data }); }

root.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, id = el.dataset.id;
  if (act==='close-bg' && e.target!==el) return;
  switch(act){
    /* вход и регистрация */
    case 'pick-login': S.loginPick = el.dataset.l; render(); document.getElementById('lg-btn')?.focus(); break;
    case 'auth-mode': S.authMode = el.dataset.m; render(); break;
    case 'logout': Auth.logout(); break;
    case 'boot-retry': S.bootError=''; run(async () => { await loadAll(); }); break;
    case 'reset-demo': S.modal = { type:'confirm', title:'Сбросить демо-данные?', text:'Все изменения в прототипе удалятся, вернутся задачи из ваших таблиц.', yes:'Сбросить', on: async () => { DemoServer.reset(); await loadAll(); toast('Демо-данные восстановлены'); } }; render(); break;
    /* навигация */
    case 'view': S.view = el.dataset.v; S.overdueOnly=false; S.modal=null; render(); window.scrollTo({ top:0 }); break;
    case 'show-overdue': S.view='day'; S.overdueOnly=true; render(); break;
    case 'hide-overdue': S.overdueOnly=false; render(); break;
    case 'day-shift': S.date = addDays(S.date, Number(el.dataset.n)); S.overdueOnly=false; render(); break;
    case 'go-today': S.date = todayStr(); render(); break;
    case 'toggle-sec': S.expanded[el.dataset.k] = !S.expanded[el.dataset.k]; render(); break;
    case 'cal-shift': { const [y,m] = S.calMonth.split('-').map(Number); const d = new Date(y, m-1+Number(el.dataset.n), 1); S.calMonth = ymd(d).slice(0,7); render(); break; }
    case 'cal-pick': S.date = el.dataset.d; S.view='day'; S.overdueOnly=false; render(); break;
    /* задачи */
    case 'new-task': S.modal = { type:'task', task:blankTask() }; render(); document.getElementById('tf-title')?.focus(); break;
    case 'new-child': { const p = S.data.tasks.find(x => x.id===id); S.modal = { type:'task', task:blankTask({ parentId:id, level:p.level, block:p.block, due:p.due, assignee:p.assignee }), backTo:id }; render(); document.getElementById('tf-title')?.focus(); break; }
    case 'edit': { const t = S.data.tasks.find(x => x.id===id); if (t){ S.modal = { type:'task', task:JSON.parse(JSON.stringify(t)) }; render(); } break; }
    case 'close': if (S.modal?.backTo){ const p = S.data.tasks.find(x => x.id===S.modal.backTo); S.modal = p ? { type:'task', task:JSON.parse(JSON.stringify(p)) } : null; } else S.modal=null; render(); break;
    case 'close-bg': S.modal=null; render(); break;
    case 'comments': { const t = S.data.tasks.find(x => x.id===id); if (t){ S.modal = { type:'task', task:JSON.parse(JSON.stringify(t)) }; render(); const ta = document.getElementById('cmt-text'); ta?.focus(); document.getElementById('cmt-list')?.scrollTo(0, 1e6); ta?.scrollIntoView({ block:'center' }); } break; }
    case 'add-comment': addComment(id); break;
    case 'del-comment': run(async () => { const t = await Api.call('deleteComment', { id, cid:el.dataset.cid }); replaceIn(S.data.tasks, t); keepFormAndRerender(t); }, 'Комментарий удалён'); break;
    case 'take': run(async () => { const t = S.data.tasks.find(x => x.id===id); await saveTask({ ...t, assignee:S.user.id }); render(); }, 'Задача ваша'); break;
    case 'quick-done': run(async () => { const t = S.data.tasks.find(x => x.id===id); await saveTask({ ...t, status:'done' }); refreshTaskModal(id); render(); }, 'Готово! Задача выполнена'); break;
    case 'reopen': run(async () => { const t = S.data.tasks.find(x => x.id===id); await saveTask({ ...t, status:'work' }); refreshTaskModal(id); render(); }, 'Задача снова в работе'); break;
    case 'unlink': run(async () => { const k = S.data.tasks.find(x => x.id===id); const pid = k.parentId; await saveTask({ ...k, parentId:'' }); refreshTaskModal(pid); render(); }, 'Задача отвязана'); break;
    case 'del-task': { const back = S.modal; S.modal = { type:'confirm', title:'Удалить задачу?', text:'Задача удалится у всех. Связанные с ней задачи останутся, но станут самостоятельными.', on: async () => {
      await Api.call('deleteTask', { id }); const t = S.data.tasks.find(x => x.id===id); S.data.tasks = S.data.tasks.filter(x => x.id!==id);
      S.data.tasks.forEach(c => { if (c.parentId===id) c.parentId=''; }); if (t?.parentId){ const p = S.data.tasks.find(x => x.id===t.parentId); if (p){ const v = computeLinkedProgress(S.data.tasks, p.id); p.progress = v===null ? (p.status==='done'?100:0) : v; } }
      toast('Задача удалена'); } }; render(); break; }
    case 'confirm-yes': { const fn = S.modal.on; S.modal=null; run(async () => { await fn(); render(); }); render(); break; }
    /* регулярные дела */
    case 'tpls': S.modal = { type:'tpls' }; render(); break;
    case 'tpl-edit': S.modal = { type:'tpl', tpl: id ? JSON.parse(JSON.stringify(S.data.templates.find(x => x.id===id))) : {} }; render(); document.getElementById('rp-t')?.focus(); break;
    case 'toggle-tpl': run(async () => { const t = S.data.templates.find(x => x.id===id); const r = await Api.call('saveTemplate', { tpl:{ ...t, active:!t.active } }); replaceIn(S.data.templates, r.tpl); S.data.tasks = r.tasks; render(); }, 'Сохранено'); break;
    case 'tpl-del': S.modal = { type:'confirm', title:'Удалить регулярное дело?', text:'Будущие ещё не начатые дела удалятся. Прошлые останутся в истории.', on: async () => { const r = await Api.call('deleteTemplate', { id }); S.data.templates = S.data.templates.filter(x => x.id!==id); S.data.tasks = r.tasks; S.modal = { type:'tpls' }; toast('Регулярное дело удалено'); } }; render(); break;
    /* отчёты */
    case 'export': S.modal = { type:'export', kind: el.dataset.kind }; render(); break;
    case 'copy-csv': { const txt = csvFor(el.dataset.kind).replace(/^﻿/,''); navigator.clipboard?.writeText(txt).then(() => toast('CSV скопирован — вставьте в Excel или Google Таблицу'), () => toast('Не удалось скопировать. Выделите таблицу вручную.', true)); break; }
    case 'dl-csv': try { downloadBlob(csvFor(el.dataset.kind), el.dataset.kind==='stats'?`statistika_${S.date}.csv`:`otchet_zadachi_${S.date}.csv`, 'text/csv;charset=utf-8'); toast('CSV сформирован'); } catch(err){ toast('Скачивание заблокировано. Используйте «Скопировать CSV».', true); } break;
    case 'dl-pdf': run(() => downloadPdf(el.dataset.kind), 'PDF сформирован'); break;
    /* выплаты, отзывы, гайд */
    case 'issue': run(async () => { const p = await Api.call('issuePayout', { id }); replaceIn(S.data.payouts, p); render(); toast(isOwner(S.user) && p.amount ? `Конверт выдан — ${money(p.amount)} учтено в финансах за ${monthName(payoutMonth(p)).toLowerCase()}` : 'Отмечено: конверт выдан'); }); break;
    case 'del-pay': S.modal = { type:'confirm', title:'Удалить выплату?', text:'Запись исчезнет из журнала.', on: async () => { await Api.call('deletePayout', { id }); S.data.payouts = S.data.payouts.filter(x => x.id!==id); toast('Выплата удалена'); } }; render(); break;
    case 'rev-filter': S.revFilter = el.dataset.k; render(); break;
    case 'sync-reviews': run(async () => { const r = await Api.call('syncReviews'); S.data.reviews = r.reviews; S.data.settings = r.settings; render(); toast(r.added ? `Загружено новых отзывов: ${r.added}` : 'Новых отзывов нет'); }); break;
    case 'confirm-rev': run(async () => { const r = await Api.call('confirmReview', { id, value: el.dataset.v==='1' }); replaceIn(S.data.reviews, r); render(); }, el.dataset.v==='1'?'Отзыв подтверждён':'Подтверждение снято'); break;
    case 'guide-edit': { const g = S.data.guide.find(x => x.id===id); S.guideDraft = { id:g.id, title:g.title, steps:normSteps(g), sourceFile:g.sourceFile||'' }; render(); break; }
    case 'guide-new': S.guideDraft = { id:'', title:'', steps:[{ t:'', img:'' }] }; render(); document.getElementById('gf-t')?.focus(); break;
    case 'guide-cancel': S.guideDraft = null; render(); break;
    case 'step-add': S.guideDraft.steps.push({ t:'', img:'' }); render(); root.querySelector(`[data-gstep="${S.guideDraft.steps.length-1}"]`)?.focus(); break;
    case 'step-del': S.guideDraft.steps.splice(Number(el.dataset.i),1); render(); break;
    case 'step-img-del': S.guideDraft.steps[Number(el.dataset.i)].img=''; render(); break;
    case 'zoom': S.modal = { type:'img', src: el.getAttribute('src') }; render(); break;
    case 'guide-import': S.modal = { type:'import', stage:'pick', mode:'replace' }; render(); break;
    case 'imp-again': S.modal = { type:'import', stage:'pick', mode:S.modal.mode }; render(); break;
    case 'imp-go': run(doImport); break;
    case 'guide-del': S.modal = { type:'confirm', title:'Удалить инструкцию?', text:'Её не будет видно никому из команды.', on: async () => { await Api.call('deleteGuide', { id }); S.data.guide = S.data.guide.filter(x => x.id!==id); S.guideDraft=null; toast('Инструкция удалена'); } }; render(); break;
    /* команда */
    case 'approve': { const role = document.getElementById('ap-'+id)?.value; run(async () => { const r = await Api.call('approveUser', { id, role }); replaceIn(S.data.users, r.user); S.data.notifications = r.notifications; render(); }, 'Доступ открыт'); break; }
    case 'reject': S.modal = { type:'confirm', title:'Отклонить заявку?', text:`${userById(id)?.fullName||''} не сможет войти в панель.`, yes:'Отклонить', on: async () => { const r = await Api.call('rejectUser', { id }); replaceIn(S.data.users, r.user); S.data.notifications = r.notifications; toast('Заявка отклонена'); } }; render(); break;
    case 'toggle-user': run(async () => { const u = userById(id); const r = await Api.call('saveUser', { user:{ id, active:!u.active } }); replaceIn(S.data.users, r); render(); }, 'Доступ изменён'); break;
    case 'pass': S.modal = { type:'pass', id }; render(); document.getElementById('pw-1')?.focus(); break;
    case 'user-edit': S.modal = { type:'user', id }; render(); break;
    case 'trainer-edit': S.modal = { type:'trainer', id }; render(); document.getElementById('trf-n')?.focus(); break;
    /* продажи и зарплата */
    case 'sal-tab': S.salTab = el.dataset.k; render(); break;
    case 'sal-admin': S.salAdmin = id; render(); break;
    case 'sale-edit': S.modal = { type:'sale', id, seller: el.dataset.seller }; render(); break;
    case 'sale-del': S.modal = { type:'confirm', title:'Удалить продажу?', text:'Она пропадёт из расчёта зарплаты и доходов.', on: async () => { await Api.call('deleteSale', { id }); S.data.sales = S.data.sales.filter(x => x.id!==id); toast('Продажа удалена'); } }; render(); break;
    case 'pen-edit': S.modal = { type:'penalty', id, admin: el.dataset.admin }; render(); break;
    case 'pen-del': S.modal = { type:'confirm', title:'Удалить нарушение?', text:'Неустойка пересчитается.', on: async () => { await Api.call('deletePenalty', { id }); S.data.penalties = S.data.penalties.filter(x => x.id!==id); toast('Нарушение удалено'); } }; render(); break;
    case 'sal-payout': { const a = userById(S.salAdmin); const c = calcPayroll(S.salMonth, S.salAdmin); const adv = el.dataset.kind==='advance';
      const amount = adv ? c.advance : Math.max(0, c.net - c.advance); if (!(amount>0)){ toast('Сумма к выплате — 0 ₽.', true); break; }
      run(async () => { const p = await Api.call('savePayout', { p:{ recipient:a.id, periodFrom:`${S.salMonth}-01`, periodTo: adv ? `${S.salMonth}-15` : ymd(new Date(Number(S.salMonth.slice(0,4)), Number(S.salMonth.slice(5)), 0)), amount, plannedDate: adv ? `${S.salMonth}-20` : todayStr(), comment: adv ? 'Аванс' : 'Окончательный расчёт (за вычетом аванса)' } }); S.data.payouts.push(p); render(); }, `Выплата ${money(amount)} добавлена в «Выплаты»`); break; }
    /* перенос задачи */
    case 'move': S.modal = { type:'move', id, back: S.modal?.type==='task' ? S.modal.task.id : '' }; render(); break;
    case 'mv-quick': { const i = document.getElementById('mv-d'); if (i) i.value = el.dataset.d; root.querySelectorAll('[data-act=mv-quick]').forEach(c => c.classList.toggle('on', c===el)); break; }
    /* график */
    case 'sch-shift': { const [y,m] = (S.schMonth||todayStr().slice(0,7)).split('-').map(Number); S.schMonth = ymd(new Date(y, m-1+Number(el.dataset.n), 1)).slice(0,7); render(); break; }
    case 'sch-day': { const date = el.dataset.d; S.modal = { type:'shifts', date, rows: shiftsOn(date).map(x => ({ ...x })) }; render(); break; }
    case 'sr-add': { const half = el.dataset.half==='1'; const used = S.modal.rows.map(r => r.adminId); const a = adminsList().find(x => !used.includes(x.id)) || shiftStaff().find(x => !used.includes(x.id)) || shiftStaff()[0];
      const rows = S.modal.rows; const lastEnd = rows.map(r => r.end).sort().pop();
      if (half && rows.length===1 && rows[0].start < '15:00' && rows[0].end > '15:00'){ rows[0].end = '15:00'; rows[0].half = true; }
      const start = half ? (lastEnd && lastEnd < '21:00' && rows.length>1 ? lastEnd : '15:00') : SHIFT_DEFAULT.start;
      rows.push({ adminId:a?.id||'', start, end:SHIFT_DEFAULT.end, half, type:'auto', note:'' }); render(); break; }
    case 'sr-del': S.modal.rows.splice(Number(el.dataset.i),1); render(); break;
    case 'sr-save': { const m = S.modal; run(async () => { S.data.schedule = await Api.call('saveShifts', { date:m.date, shifts:m.rows }); S.modal = null; render(); }, 'График сохранён'); break; }
    /* отчёт смены */
    case 'rep-date': S.repDate = el.dataset.d; S.repEdit = false; S.repDraft = null; render(); break;
    case 'rep-shift': { const d = addDays(S.repDate||todayStr(), Number(el.dataset.n)); if (d <= todayStr()){ S.repDate = d; S.repEdit=false; S.repDraft=null; render(); } break; }
    case 'rep-edit': S.repEdit = true; S.repDraft = null; render(); break;
    case 'rep-cancel': S.repEdit = false; S.repDraft = null; render(); break;
    case 'rp-photo-del': S.repDraft.photo = ''; render(); break;
    case 'repfields': S.modal = { type:'repfields', list: repFields().map(f => ({ ...f })) }; render(); break;
    case 'rf-add': S.modal.list.push({ k:'', label:'', emoji:'', type:el.dataset.t, inTotal:false }); render(); root.querySelectorAll('.rf-row input[data-k=label]')[S.modal.list.length-1]?.focus(); break;
    case 'rf-del': S.modal.list.splice(Number(el.dataset.i),1); render(); break;
    case 'rf-up': case 'rf-down': { const i = Number(el.dataset.i), j = act==='rf-up' ? i-1 : i+1; const L = S.modal.list; [L[i], L[j]] = [L[j], L[i]]; render(); break; }
    case 'rf-reset': S.modal.list = DEFAULT_REPORT_FIELDS.map(f => ({ ...f })); render(); break;
    case 'rf-save': { const list = S.modal.list.filter(f => f.label.trim()); if (!list.length){ toast('Оставьте хотя бы одно поле.', true); break; }
      run(async () => { S.data.settings = await Api.call('saveReportFields', { fields:list }); S.modal = null; S.repDraft = null; render(); }, 'Поля отчёта сохранены'); break; }
    case 'rep-copy': { const r = (S.data.reports||[]).find(x => x.date===S.repDate); if (!r) break; navigator.clipboard?.writeText(reportText(r)).then(() => toast('Текст отчёта скопирован — вставьте в чат'), () => toast('Не удалось скопировать. Выделите текст вручную.', true)); break; }
    /* уведомления */
    case 'ntf': S.modal = { type:'ntf' }; render(); break;
    case 'ntf-open': { const read = getRead(); read.add(el.dataset.nid); setRead(read);
      if (el.dataset.task){ const t = S.data.tasks.find(x => x.id===el.dataset.task); S.modal = t ? { type:'task', task:JSON.parse(JSON.stringify(t)) } : null; }
      else if (el.dataset.view){ S.view = el.dataset.view; if (el.dataset.date) S.repDate = el.dataset.date; S.modal = null; }
      render(); break; }
    case 'ntf-readall': { const read = getRead(); computeNotifications().forEach(n => read.add(n.id)); setRead(read); render(); break; }
    case 'notifyset': S.modal = { type:'notifyset' }; S.ntDraftDates = null; render(); break;
    case 'nt-date-add': { const d = document.getElementById('nt-newdate')?.value; if (!d) { toast('Выберите дату.', true); break; } const st = S.data.notify;
      run(async () => { S.data.notify = await Api.call('saveNotify', { notify:{ offDates:[...new Set([...(st.offDates||[]), d])] } }); render(); }, 'День добавлен'); break; }
    case 'nt-date-del': { const st = S.data.notify; run(async () => { S.data.notify = await Api.call('saveNotify', { notify:{ offDates:(st.offDates||[]).filter(x => x!==el.dataset.d) } }); render(); }); break; }
    case 'nt-test': showPush({ title:'Проверка уведомления', text:'Так будут выглядеть напоминания о задачах и сменах.' });
      if (CONFIG.MODE==='gas') run(async () => { const r = await Api.call('testNotify'); toast(r.sent ? `Отправлено: ${r.sent.join(', ')}` : 'Пока некуда отправить: подключите Telegram или пуш на телефоне.'); }); break;
    case 'tg-link':
      if (CONFIG.MODE!=='gas' || !CONFIG.TG_BOT){ toast('В рабочей версии здесь откроется бот студии в Telegram — нажмите в нём «Старт», и уведомления начнут приходить.'); break; }
      run(async () => { const r = await Api.call('tgLinkCode'); S.tgPending = true; window.open(`https://t.me/${CONFIG.TG_BOT}?start=${r.code}`, '_blank'); toast('В Telegram нажмите «Старт». Потом вернитесь сюда — статус обновится в течение минуты.'); }); break;
    case 'more': S.modal = { type:'more' }; render(); break;
    /* выплаты: быстрый выбор периода */
    case 'pf-range': { const M = S.payMonth; const last = ymd(new Date(Number(M.slice(0,4)), Number(M.slice(5)), 0)); const k = el.dataset.k;
      document.getElementById('pf-from').value = k==='h2' ? M+'-16' : M+'-01'; document.getElementById('pf-to').value = k==='h1' ? M+'-15' : last; break; }
    case 'extra-role': { const u = userById(id); const r = el.dataset.r; const has = (u.extraRoles||[]).includes(r);
      run(async () => { const x = await Api.call('saveUser', { user:{ id, extraRoles: has ? u.extraRoles.filter(z => z!==r) : [...(u.extraRoles||[]), r] } }); replaceIn(S.data.users, x); render(); }, has ? 'Совмещение снято' : 'Совмещение добавлено'); break; }
    /* финансы: режим редактирования */
    case 'cle-add': S.modal.cl.push({ id:'n'+Date.now().toString(36), text:'', p:0, done:false }); redrawCl(); { const ins = root.querySelectorAll('[data-cle]'); ins[ins.length-1]?.focus(); } break;
    case 'cle-del': S.modal.cl.splice(Number(el.dataset.i),1); redrawCl(); break;
    case 'cle-up': { const i = Number(el.dataset.i); const L = S.modal.cl; [L[i-1], L[i]] = [L[i], L[i-1]]; redrawCl(); break; }
    case 'pp-pick': { const t = S.data.tasks.find(x => x.id===id); document.getElementById('tf-parent').value = id; document.getElementById('tf-parent-q').value = t?.title || ''; document.getElementById('pp-list').hidden = true; break; }
    case 'my-avatar': run(async () => { const u = await Api.call('saveAvatar', { avatar:el.dataset.a }); replaceIn(S.data.users, u); S.user = { ...S.user, avatar:u.avatar }; render(); }, 'Аватар обновлён'); break;
    case 'set-avatar': run(async () => { const u = await Api.call('saveAvatar', { id, avatar:el.dataset.a }); replaceIn(S.data.users, u); render(); }, 'Аватар обновлён'); break;
    case 'au-avatar': S.modal.d.avatar = el.dataset.a; root.querySelectorAll('[data-act=au-avatar]').forEach(b => b.classList.toggle('on', b===el)); break;
    case 'user-add': S.modal = { type:'adduser' }; render(); document.getElementById('au-fio')?.focus(); break;
    case 'cfg-ren': S.modal = { type:'cfgren', kind:el.dataset.kind, k:el.dataset.k }; render(); document.getElementById('cr-n')?.select(); break;
    case 'pay-out': { const key = el.dataset.key; const [, id] = key.split(':'); const M = S.salMonth; const a = payAccrual(M, key); const amount = a.sum - paidTo(M, id);
      if (!(amount>0)) break; const last = ymd(new Date(Number(M.slice(0,4)), Number(M.slice(5)), 0));
      run(async () => { const p = await Api.call('savePayout', { p:{ recipient:id, periodFrom:M+'-01', periodTo:last, amount, plannedDate:todayStr(), comment:`${PAY_KINDS[a.kind].title}: начисление за ${monthName(M).toLowerCase()}` } }); S.data.payouts.push(p); render(); }, `Выплата ${money(amount)} добавлена в «Выплаты»`); break; }
    case 'cfg-del': { const kind = el.dataset.kind, k = el.dataset.k; const cfg = JSON.parse(JSON.stringify(S.data.finConfig)); const item = cfg[kind].find(x => x.k===k);
      S.modal = { type:'confirm', title:`Удалить «${item?.name||''}»?`, text: kind==='income' ? 'Строка пропадёт из доходов во всех месяцах. Если к ней шли продажи из журнала, они попадут в «Прочие продажи».' : 'Статья пропадёт из расходов во всех месяцах.',
        on: async () => { cfg[kind] = cfg[kind].filter(x => x.k!==k); S.data.finConfig = await Api.call('saveFinConfig', { config:cfg }); toast('Удалено'); } }; render(); break; }
    /* финансы */
    case 'fin-del': { const kind = el.dataset.kind; run(async () => { await saveFin({ [kind]: (finMonthData()[kind]||[]).filter(x => x.id!==id) }); render(); }, 'Удалено'); break; }
    case 'debt-del': S.modal = { type:'confirm', title:'Удалить запись о долге?', text:'Остаток долга пересчитается.', on: async () => { S.data.debt = await Api.call('deleteDebt', { id }); toast('Удалено'); } }; render(); break;
    case 'debt-from-personal': { const c = calcFinance(S.finMonth); run(async () => {
      for (const o of ['u1','u2']) if (c.personal[o]) S.data.debt = await Api.call('saveDebt', { d:{ owner:o, type:'loan', amount:c.personal[o], date:todayStr(), note:`Личные траты за ${monthName(S.finMonth).toLowerCase()}` } });
      render(); }, 'Добавлено в долг студии'); break; }
  }
});
root.addEventListener('toggle', e => { if (e.target.matches?.('details.inline-d')) S.finOpen = e.target.open; if (e.target.dataset?.clOpen){ S.clOpen = S.clOpen||{}; S.clOpen[e.target.dataset.clOpen] = e.target.open; } }, true);

root.addEventListener('keydown', e => {
  if ((e.key==='Enter' || e.key===' ') && e.target.matches('h4[data-act="edit"]')){ e.preventDefault(); e.target.click(); }
  if (e.key==='Enter' && e.target.id==='tf-parent-q'){ e.preventDefault(); root.querySelector('#pp-list .pp-i')?.click(); return; }
  if (e.key==='Escape' && S.modal){ S.modal=null; render(); }
  if (e.key==='Enter' && (e.ctrlKey||e.metaKey) && e.target.id==='cmt-text'){ e.preventDefault(); addComment(root.querySelector('[data-act="add-comment"]').dataset.id); }
});

root.addEventListener('input', e => {
  const r = e.target;
  if (r.dataset.gstep!=null && S.guideDraft){ S.guideDraft.steps[Number(r.dataset.gstep)].t = r.value; return; }
  if (r.id==='gf-t' && S.guideDraft){ S.guideDraft.title = r.value; return; }
  if (r.id==='f-guide'){ S.guideQuery = r.value; const pos = r.selectionStart; render(); const n = document.getElementById('f-guide'); n.focus(); n.setSelectionRange(pos,pos); return; }
  if (r.dataset.clp){ root.querySelectorAll(`output[id^="clp-${CSS.escape(r.dataset.item)}"]`).forEach(o => o.textContent = r.value+'%'); paintRange(r); return; }
  if (r.dataset.cl){ const t = S.data.tasks.find(x => x.id===r.dataset.cl); const n = t.checklist.length; const v = Number(r.value);
    if (Rules.isLockedFor(S.user,t) && v < t.checklist.filter(x=>x.done).length){ r.value = t.checklist.filter(x=>x.done).length; }
    root.querySelectorAll(`output[id^="clo-${t.id}"]`).forEach(o => o.textContent = `${r.value}/${n} · ${Math.round(r.value*100/n)}%`); paintRange(r); return; }
  if (r.dataset.cle!=null && S.modal?.cl){ S.modal.cl[Number(r.dataset.cle)].text = r.value; return; }
  if (r.id==='tf-parent-q'){ const t = S.modal.task; const list = document.getElementById('pp-list'); const q = r.value.trim();
    if (!q){ document.getElementById('tf-parent').value = ''; list.hidden = true; return; }
    const found = parentMatches(q, t); document.getElementById('tf-parent').value = '';
    list.innerHTML = found.length ? found.map(x => `<button type="button" class="pp-i" data-act="pp-pick" data-id="${x.id}"><b>${esc(x.title)}</b><span class="small muted">${x.assignee?esc(nameOf(x.assignee)):'Админ смены'} · до ${fmtDayShort(x.due)}</span></button>`).join('') : '<div class="pp-none small muted">Ничего не найдено — общая задача должна быть открытой и не регулярной</div>';
    list.hidden = false; return; }
  if (r.dataset.rf!=null && S.modal?.type==='repfields' && r.type!=='checkbox' && r.tagName==='INPUT'){ S.modal.list[Number(r.dataset.rf)][r.dataset.k] = r.value; return; }
  if (r.dataset.rpC && S.repDraft){ S.repDraft.comment = r.value; return; }
  if (r.dataset.rp && S.repDraft){ S.repDraft.values[r.dataset.rp] = r.value; const tt = document.getElementById('rp-total'); if (tt) tt.textContent = fmtN(repFields().filter(f => f.inTotal).reduce((a,f) => a + (Number(S.repDraft.values[f.k])||0), 0)); return; }
  // живой пересчёт процента в окне продажи
  if (r.closest?.('#sale-form')){ const box = document.getElementById('sf-calc'); if (box){ const c = commission(readSaleForm()); box.innerHTML = `Администратору: <b>${c.rate}% — ${money(c.sum)}</b>${c.note?` · ${esc(c.note)}`:''}`; } }
});
function readSaleForm(){
  const v = id => document.getElementById(id)?.value ?? '';
  return { date:v('sf-date'), client:v('sf-client').trim(), product:v('sf-prod'), price:Number(v('sf-price'))||0, discount:Number(v('sf-disc'))||0, sellerId:v('sf-seller'),
    clientType: document.querySelector('input[name="sf-ct"]:checked')?.value || 'current', crmTouch: !!document.getElementById('sf-crm')?.checked, note:v('sf-note').trim() };
}
/* чипы-переключатели (радио и чекбоксы внутри .chip) подсвечиваем сразу */
function syncChip(input){ if (input.type==='radio') input.closest('.chips')?.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.querySelector('input')?.checked)); else input.closest('.chip')?.classList.toggle('on', input.checked); }

root.addEventListener('change', e => {
  const r = e.target;
  if (r.closest?.('.chip') && (r.type==='radio' || r.type==='checkbox')) syncChip(r);
  if (r.name==='rg-role'){ S.regRole = r.value; return; }
  if (r.name==='au-role'){ S.modal.d.role = r.value; return; }
  if (r.name==='au-extra'){ S.modal.d.extra = [...root.querySelectorAll('input[name=au-extra]:checked')].map(i => i.value); return; }
  if (r.dataset.cl){ const t = S.data.tasks.find(x => x.id===r.dataset.cl); const before = t.checklist.filter(x=>x.done).length; const v = Number(r.value); if (v===before) return;
    run(async () => { const res = await Api.call('setChecklist', { id:t.id, count:v }); replaceIn(S.data.tasks, res.task); if (res.parent) replaceIn(S.data.tasks, res.parent); refreshTaskModal(t.id); render(); }, v===t.checklist.length ? 'Готово! Все пункты выполнены' : null); return; }
  if (r.dataset.cli || r.dataset.clp){ const id = r.dataset.cli || r.dataset.clp; const t0 = S.data.tasks.find(x => x.id===id); const it = t0.checklist.find(x => x.id===r.dataset.item);
    const p = r.dataset.cli ? (r.checked ? 100 : 0) : Number(r.value); if (p===itemP(it)) return;
    const willDone = t0.checklist.every(x => x.id===it.id ? p>=100 : x.done);
    run(async () => { const res = await Api.call('setChecklist', { id, itemId:it.id, p }); replaceIn(S.data.tasks, res.task); if (res.parent) replaceIn(S.data.tasks, res.parent); refreshTaskModal(id); render(); },
      willDone && t0.status!=='done' ? 'Готово! Все пункты выполнены' : null); return; }
  if (r.dataset.sr!=null && S.modal?.type==='shifts'){ const row = S.modal.rows[Number(r.dataset.sr)]; row[r.dataset.k] = r.type==='checkbox' ? r.checked : r.value; render(); return; }
  if (r.id==='rp-photo' && r.files?.[0]){ const fr = new FileReader(); fr.onload = async () => { const img = await compressImg(fr.result); if (!img){ toast('Не удалось прочитать фото. Нужен JPG или PNG.', true); return; } S.repDraft.photo = img; render(); }; fr.readAsDataURL(r.files[0]); return; }
  if (r.id==='f-repdate' && r.value){ S.repDate = r.value > todayStr() ? todayStr() : r.value; S.repEdit=false; S.repDraft=null; render(); return; }
  if (r.dataset.rate){ run(async () => { S.data.settings = await Api.call('saveRates', { rates:{ [r.dataset.rate]: r.value } }); render(); }, 'Ставка сохранена'); return; }
  if ((r.id==='pf-from' || r.id==='pf-to')){ const a = document.getElementById('pf-from'), b = document.getElementById('pf-to'); if (a.value && b.value && a.value.slice(0,7)!==b.value.slice(0,7)){ toast('Период выплаты — в пределах одного месяца.', true); b.value = a.value; } return; }
  if (r.matches('select[data-act="status"]')){
    const t = S.data.tasks.find(x => x.id===r.dataset.id);
    run(async () => { await saveTask({ ...t, status:r.value }); render(); }, r.value==='done' ? 'Готово! Задача выполнена' : 'Статус обновлён');
    return;
  }
  if (r.matches('select[data-act="role"]')){
    run(async () => { const u = await Api.call('saveUser', { user:{ id:r.dataset.id, role:r.value } }); replaceIn(S.data.users, u); render(); }, 'Роль изменена');
    return;
  }
  if (r.id==='tf-repeat'){ S.modal.task = { ...S.modal.task, ...readTaskForm() }; S.modal.repeat = r.checked; render(); return; }
  if (r.id==='link-existing' && r.value){ const k = S.data.tasks.find(x => x.id===r.value); const pid = r.dataset.id; run(async () => { await saveTask({ ...k, parentId:pid }); refreshTaskModal(pid); render(); }, 'Задача привязана'); return; }
  if (r.dataset.gimg!=null && r.files?.[0]){
    const i = Number(r.dataset.gimg); const fr = new FileReader();
    fr.onload = async () => { const img = await compressImg(fr.result); if (!img){ toast('Этот формат фото не поддерживается. Нужен JPG или PNG.', true); return; } S.guideDraft.steps[i].img = img; render(); };
    fr.readAsDataURL(r.files[0]); return;
  }
  if (r.id==='imp-file' && r.files?.[0]){ importDocx(r.files[0]); return; }
  if (r.dataset.imp!=null){ S.modal.sections[Number(r.dataset.imp)].on = r.checked; render(); return; }
  if (r.name==='imp-mode'){ S.modal.mode = r.value; render(); return; }
  if (r.id==='sf-prod'){ const p = PRODUCT[r.value]; const pr = document.getElementById('sf-price'); if (p?.price && pr) pr.value = p.price; r.dispatchEvent(new Event('input', { bubbles:true })); return; }
  if (r.closest?.('#sale-form')){ r.dispatchEvent(new Event('input', { bubbles:true })); return; }
  if (r.id==='pf-code'){ const keep = { date:document.getElementById('pf-date').value, adminId:document.getElementById('pf-adm').value, note:document.getElementById('pf-note').value };
    const pid = S.modal.id; S.modal = { ...S.modal, draft:{ ...keep, code:r.value } }; render();
    const set = (id,v) => { const x = document.getElementById(id); if (x) x.value = v; }; set('pf-date', keep.date); set('pf-adm', keep.adminId); set('pf-note', keep.note); document.getElementById('pf-code').value = r.value; return; }
  // поля расчёта зарплаты: сохраняем сразу
  if (r.dataset.paymode){ const id = r.dataset.paymode; const cur = ((S.data.rates||{}).staff||{})[id] || {};
    run(async () => { S.data.rates = await Api.call('saveRate', { kind:'staff', id, rate:{ ...cur, mode:r.value } }); render(); }, r.value==='shift' ? 'Теперь только фикс за смену' : r.value==='contract' ? 'Теперь расчёт по договору' : 'Тип оплаты изменён'); return; }
  if (r.dataset.pr){ const [grp, key] = r.dataset.pr.split('.'); const val = r.value==='' ? '' : Number(r.value);
    const data = key ? { [grp]:{ [key]:val } } : { [grp]:val };
    run(async () => { const rec = await Api.call('savePayroll', { month:S.salMonth, adminId:S.salAdmin, data }); S.data.payroll[S.salMonth] = S.data.payroll[S.salMonth] || {}; S.data.payroll[S.salMonth][S.salAdmin] = rec; render(); }); return; }
  if (r.id==='sal-plan'){ run(async () => { S.data.plans = await Api.call('savePlan', { month:S.salMonth, amount:r.value }); render(); }, 'План сохранён'); return; }
  // поля финансов: сохраняем сразу
  if (r.dataset.prate){ const kind = r.dataset.prate; const rk = PAY_KINDS[kind].rates; const id = r.dataset.id; const cur = { ...PAY_DEFAULT[kind], ...(((S.data.rates||{})[rk]||{})[id]||{}) };
    run(async () => { S.data.rates = await Api.call('saveRate', { kind:rk, id, rate:{ ...cur, [r.dataset.f]: r.value } }); render(); }, 'Сохранено'); return; }
  if (r.dataset.pay){ const key = r.dataset.pay;
    run(async () => { S.data.pay = await Api.call('savePay', { month:S.salMonth, key, data:{ [r.dataset.f]: r.value } }); render(); }, 'Сохранено'); return; }
  if (r.dataset.fot){ const key = r.dataset.fot; const M = S.finMonth;
    run(async () => { if (key.startsWith('adm:')){ const id = key.slice(4); const rec = await Api.call('savePayroll', { month:M, adminId:id, data:{ manual: r.value==='' ? '' : Number(r.value) } }); S.data.payroll[M] = S.data.payroll[M] || {}; S.data.payroll[M][id] = rec; }
      else S.data.pay = await Api.call('savePay', { month:M, key, data:{ manual:r.value } }); render(); }, r.value==='' ? 'Сумма снова считается автоматически' : 'Сумма сохранена — она же в «Продажи и зарплата»'); return; }
  if (r.dataset.cfg){ const [kind, k, field] = r.dataset.cfg.split('.'); const cfg = JSON.parse(JSON.stringify(S.data.finConfig)); const item = cfg[kind].find(x => x.k===k); if (!item) return;
    if (!r.value.trim()){ toast('Название не может быть пустым.', true); render(); return; } item[field] = r.value.trim();
    run(async () => { S.data.finConfig = await Api.call('saveFinConfig', { config:cfg }); render(); }, 'Сохранено'); return; }
  if (r.dataset.rateMode || r.dataset.rateAmt){ const kind = r.dataset.rateMode || r.dataset.rateAmt; const id = r.dataset.id; const cur = ((S.data.rates||{})[kind]||{})[id] || {};
    const rate = r.dataset.rateMode ? { ...cur, mode:r.value } : { ...cur, mode: cur.mode || (kind==='trainers'?'perClass':'contract'), amount:r.value };
    run(async () => { S.data.rates = await Api.call('saveRate', { kind, id, rate }); render(); }, 'Ставка сохранена'); return; }
  if (r.dataset.fin){ const [grp, key] = r.dataset.fin.split('.'); const val = r.value==='' ? (grp==='adminsManual' ? '' : 0) : Number(r.value);
    run(async () => { await saveFin(key ? { [grp]:{ [key]:val } } : { [grp]:val }); render(); }); return; }
  if (r.id==='f-date' && r.value){ S.date = r.value; S.overdueOnly=false; render(); }
  if (r.id==='f-person'){ S.person = r.value; render(); }
  if (r.id==='f-level'){ S.level = r.value; render(); }
  if (r.id==='f-block'){ S.block = r.value; render(); }
  if (r.id==='f-seller'){ S.salesSeller = r.value; render(); }
  if (r.id==='f-paymonth' && r.value){ S.payMonth = r.value; render(); }
  if (r.id==='f-salmonth' && r.value){ S.salMonth = r.value; render(); }
  if (r.id==='f-finmonth' && r.value){ S.finMonth = r.value; render(); }
  if (r.id==='tf-level'){ S.modal.task = { ...S.modal.task, ...readTaskForm(), level:r.value }; render(); }
});

function readTaskForm(){
  const v = id => document.getElementById(id)?.value ?? '';
  const t = S.modal?.task || {};
  return { title:v('tf-title').trim(), desc:v('tf-desc').trim(), level:v('tf-level') || t.level, assignee:v('tf-ass'), helper:v('tf-help'),
    start: document.getElementById('tf-start') ? (v('tf-start')||v('tf-due')) : t.start, due: document.getElementById('tf-due') ? v('tf-due') : t.due,
    dueTime:v('tf-time')||CONFIG.DEFAULT_DUE_TIME, priority:v('tf-prio'), status: document.getElementById('tf-status') ? v('tf-status') : t.status,
    block:v('tf-block').trim(), parentId: document.getElementById('tf-parent') ? v('tf-parent') : (t.parentId||''),
    ...(S.modal?.cl ? { checklist: S.modal.cl.filter(x => x.text.trim()).map(x => ({ ...x, text:x.text.trim() })) } : {}) };
}
/* Пункты из текстового поля: у совпадающих по тексту пунктов сохраняем отметки */
function mergeChecklist(old, text){
  const prev = (old||[]).filter(x => typeof x!=='string');
  return text.split('\n').map(x => x.trim()).filter(Boolean).map((txt,i) => { const m = prev.find(p => p.text===txt); return m ? { ...m } : { id:'n'+Date.now().toString(36)+i, text:txt, done:false, p:0, by:'', at:'' }; });
}

root.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target; const v = id => document.getElementById(id)?.value ?? '';
  if (f.id==='login-form'){
    const btn = document.getElementById('lg-btn'); btn.disabled = true; btn.textContent = 'Входим…';
    Auth.login(v('lg-login'), v('lg-pass')).catch(err => { const box = document.getElementById('lg-err'); if (box) box.textContent = err.message; btn.disabled=false; btn.textContent='Войти'; });
    return;
  }
  if (f.id==='reg-form'){
    const box = document.getElementById('rg-err');
    if (v('rg-p1') !== v('rg-p2')){ box.textContent = 'Пароли не совпадают.'; return; }
    if (!document.getElementById('rg-agree').checked){ box.textContent = 'Нужно согласие на обработку персональных данных.'; return; }
    const btn = document.getElementById('rg-btn'); btn.disabled = true;
    Api.call('register', { fullName:v('rg-fio'), role: document.querySelector('input[name="rg-role"]:checked')?.value, phone:v('rg-phone'), email:v('rg-mail'), pass:v('rg-p1') })
      .then(() => { S.authMode = 'done'; render(); }).catch(err => { box.textContent = err.message; btn.disabled = false; });
    return;
  }
  if (f.id==='task-form'){
    const data = readTaskForm(); const errBox = document.getElementById('tf-err');
    if (document.getElementById('tf-parent-q')?.value.trim() && !data.parentId){ errBox.textContent = 'Выберите общую задачу из списка или очистите поле.'; return; }
    if (!data.title){ errBox.textContent = 'Укажите название задачи.'; return; }
    const m = S.modal; const old = m.task;
    if (m.repeat){
      const days = [...document.querySelectorAll('#tf-days input:checked')].map(i => Number(i.value));
      if (!days.length){ errBox.textContent = 'Выберите хотя бы один день недели.'; return; }
      run(async () => { const r = await Api.call('saveTemplate', { tpl:{ title:data.title, desc:data.desc, days, level:data.level, assignee:data.assignee, helper:data.helper, dueTime:data.dueTime, priority:data.priority, checklist:(data.checklist||[]).map(x => x.text) } });
        S.data.templates.push(r.tpl); S.data.tasks = r.tasks; S.modal = null; render(); }, 'Регулярная задача создана — появится в чек-листе в выбранные дни');
      return;
    }
    if (!data.due){ errBox.textContent = 'Укажите срок.'; return; }
    if (data.start > data.due){ errBox.textContent = 'Старт не может быть позже срока.'; return; }
    run(async () => {
      if (!old.id){
        const t = await saveTask({ ...data }); const c = (document.getElementById('tf-com')?.value||'').trim();
        if (c){ const t2 = await Api.call('addComment', { id:t.id, text:c }); replaceIn(S.data.tasks, t2); }
        if (m.backTo){ const p = S.data.tasks.find(x => x.id===m.backTo); S.modal = p ? { type:'task', task:JSON.parse(JSON.stringify(p)) } : null; } else S.modal = null;
      } else {
        let cur = S.data.tasks.find(x => x.id===old.id);
        // смена срока из формы — это тоже перенос, отмечаем его
        if (data.due && (data.due!==cur.due || data.dueTime!==cur.dueTime)){ cur = await Api.call('moveTask', { id:cur.id, due:data.due, dueTime:data.dueTime, reason:'изменён срок в задаче' }); replaceIn(S.data.tasks, cur); }
        await saveTask({ ...cur, ...data, due:cur.due, dueTime:cur.dueTime, start: data.start > cur.due ? cur.due : data.start }); S.modal = null;
      }
      render();
    }, old.id ? 'Задача сохранена' : 'Задача создана');
    return;
  }
  if (f.id==='adduser-form'){ const d = S.modal.d; const pw = v('au-pw');
    run(async () => { const u = await Api.call('addUser', { user:{ fullName:v('au-fio'), role:d.role, extraRoles:d.extra, phone:v('au-ph'), email:v('au-em'), login:v('au-lg'), pass:pw, avatar:d.avatar } });
      S.data.users.push(u); S.modal = null; render(); toast(`${u.name} добавлен(а). Логин: ${u.login}, пароль: ${pw}`); }); return; }
  if (f.id==='cfgren-form'){ const m = S.modal; const cfg = JSON.parse(JSON.stringify(S.data.finConfig)); const it = cfg[m.kind].find(x => x.k===m.k); if (!it) return;
    it.name = v('cr-n').trim() || it.name; if (m.kind==='income') it.group = v('cr-g').trim() || it.group;
    run(async () => { S.data.finConfig = await Api.call('saveFinConfig', { config:cfg }); S.modal = null; render(); }, 'Переименовано'); return; }
  if (f.id==='cfg-add-income' || f.id==='cfg-add-expenses'){
    const kind = f.id==='cfg-add-income' ? 'income' : 'expenses'; const fd = Object.fromEntries(new FormData(f).entries()); const cfg = JSON.parse(JSON.stringify(S.data.finConfig));
    cfg[kind].push(kind==='income' ? { k:'', name:fd.name, group:fd.group||'Прочее' } : { k:'', name:fd.name, def:Number(fd.def)||0 });
    run(async () => { S.data.finConfig = await Api.call('saveFinConfig', { config:cfg }); render(); }, 'Добавлено');
    return;
  }
  if (f.id==='move-form'){
    const id = f.dataset.id; const back = S.modal.back;
    run(async () => { const t = await Api.call('moveTask', { id, due:v('mv-d'), dueTime:v('mv-t'), reason:v('mv-r') }); replaceIn(S.data.tasks, t);
      S.modal = back ? { type:'task', task:JSON.parse(JSON.stringify(t)) } : null; render(); }, `Перенесено на ${fmtDay(v('mv-d'))}`);
    return;
  }
  if (f.id==='rep-form'){
    const d = S.repDraft; if (!d.photo){ toast('Прикрепите фото чека — без него отчёт не сохранится.', true); return; }
    run(async () => { const r = await Api.call('saveReport', { r:{ ...d, date:S.repDate } }); replaceIn(S.data.reports, r.report); if (r.task) replaceIn(S.data.tasks, r.task); S.repEdit=false; S.repDraft=null; render(); }, 'Отчёт сдан и сохранён');
    return;
  }
  if (f.id==='notify-form'){
    const types = {}; f.querySelectorAll('[data-nt]').forEach(i => types[i.dataset.nt] = i.checked);
    const notify = { push:document.getElementById('nt-push').checked, telegram:document.getElementById('nt-tg').checked, types, remindMin:Number(v('nt-rem')),
      quietFrom:v('nt-qf'), quietTo:v('nt-qt'), offDays:[...f.querySelectorAll('#nt-days input:checked')].map(i => Number(i.value)), onlyShifts: !!document.getElementById('nt-only')?.checked };
    run(async () => { S.data.notify = await Api.call('saveNotify', { notify }); S.modal = null; render(); if (notify.push) Push.enable(); }, 'Настройки уведомлений сохранены');
    return;
  }
  if (f.id==='pay-form'){
    run(async () => { const p = await Api.call('savePayout', { p:{ recipient:v('pf-r'), periodFrom:v('pf-from'), periodTo:v('pf-to'), amount:v('pf-a'), plannedDate:v('pf-d'), comment:v('pf-c') } }); S.data.payouts.push(p); render(); }, 'Конверт подготовлен');
    return;
  }
  if (f.id==='rev-form'){
    run(async () => { const r = await Api.call('saveReview', { r:{ client:v('rf-c').trim(), date:v('rf-d'), source:v('rf-s'), rating:v('rf-r'), text:v('rf-t').trim() } }); S.data.reviews.push(r); render(); }, 'Отзыв сохранён');
    return;
  }
  if (f.id==='guide-form'){
    const d = S.guideDraft; const steps = d.steps.map(x => ({ t:x.t.trim(), img:x.img })).filter(x => x.t || x.img);
    if (!v('gf-t').trim()){ toast('Укажите название инструкции.', true); return; }
    if (!steps.length){ toast('Добавьте хотя бы один шаг.', true); return; }
    const old = S.data.guide.find(x => x.id===d.id) || {};
    run(async () => { const g = await Api.call('saveGuide', { item:{ ...old, id:d.id, title:v('gf-t').trim(), steps } }); replaceIn(S.data.guide, g); S.guideDraft=null; render(); }, 'Инструкция сохранена');
    return;
  }
  if (f.id==='user-form'){
    run(async () => { const u = await Api.call('saveUser', { user:{ id:f.dataset.id, fullName:v('uf-fio').trim(), phone:v('uf-ph').trim(), email:v('uf-em').trim() } }); replaceIn(S.data.users, u); S.modal=null; render(); }, 'Сохранено');
    return;
  }
  if (f.id==='trainer-form'){
    run(async () => { const t = await Api.call('saveTrainer', { t:{ id:f.dataset.id, fullName:v('trf-n').trim(), phone:v('trf-p').trim(), note:v('trf-note').trim(), active:document.getElementById('trf-a').checked } }); replaceIn(S.data.trainers, t); S.modal=null; render(); }, 'Тренер сохранён');
    return;
  }
  if (f.id==='pass-form'){
    const p = v('pw-1');
    if (p.length < 6){ toast('Пароль — минимум 6 символов.', true); return; }
    run(async () => { await Api.call('saveUser', { user:{ id:f.dataset.id, pass:p } }); S.modal=null; render(); }, 'Пароль изменён');
    return;
  }
  if (f.id==='maps-form'){
    run(async () => { S.data.settings = await Api.call('saveSettings', { settings:{ yandexOrgId:v('mf-y').trim(), twogisFirmId:v('mf-g').trim(), twogisCity:v('mf-c').trim()||'moscow' } }); render(); }, 'Сохранено');
    return;
  }
  if (f.id==='tpl-form'){
    const days = [...document.querySelectorAll('#rp-days input:checked')].map(i => Number(i.value));
    if (!days.length){ toast('Выберите хотя бы один день.', true); return; }
    run(async () => { const r = await Api.call('saveTemplate', { tpl:{ id:f.dataset.id||undefined, ...(S.modal.tpl||{}), title:v('rp-t').trim(), desc:v('rp-d').trim(), days, level:v('rp-l'), assignee:v('rp-a'), helper:v('rp-h'), dueTime:v('rp-tm'), priority:v('rp-p'), checklist:(S.modal.cl||[]).map(x => x.text.trim()).filter(Boolean) } });
      replaceIn(S.data.templates, r.tpl); S.data.tasks = r.tasks; S.modal = { type:'tpls' }; render(); }, 'Регулярное дело сохранено');
    return;
  }
  if (f.id==='sale-form'){
    const s = readSaleForm();
    if (!(s.price>0)){ toast('Укажите сумму продажи.', true); return; }
    run(async () => { const rec = await Api.call('saveSale', { s:{ ...((S.data.sales||[]).find(x => x.id===f.dataset.id)||{}), ...s, id:f.dataset.id||undefined } }); replaceIn(S.data.sales, rec); S.modal=null; render(); }, 'Продажа сохранена');
    return;
  }
  if (f.id==='pen-form'){
    run(async () => { const rec = await Api.call('savePenalty', { p:{ ...((S.data.penalties||[]).find(x => x.id===f.dataset.id)||{}), id:f.dataset.id||undefined, adminId:v('pf-adm'), date:v('pf-date'), code:v('pf-code'), extra:Number(v('pf-extra'))||0, note:v('pf-note').trim() } });
      replaceIn(S.data.penalties, rec); S.modal=null; render(); }, 'Нарушение записано');
    return;
  }
  if (f.id==='debt-form'){
    const fd = new FormData(f);
    run(async () => { S.data.debt = await Api.call('saveDebt', { d:{ owner:fd.get('owner'), type:fd.get('type'), date:fd.get('date'), amount:fd.get('amount'), note:fd.get('note') } }); render(); }, 'Записано');
    return;
  }
  if (f.classList.contains('fin-add')){
    const kind = f.dataset.kind; const fd = Object.fromEntries(new FormData(f).entries());
    if (!(Number(fd.amount)>0)){ toast('Укажите сумму.', true); return; }
    const item = { id:uid('f'), ...fd, amount:Number(fd.amount) };
    run(async () => { await saveFin({ [kind]: [...(finMonthData()[kind]||[]), item] }); render(); }, 'Добавлено');
  }
});

/* Проверка дедлайнов: каждую минуту пересчитываем просрочку (без перезагрузки страницы) */
setInterval(() => {
  if (!S.user) return; pushNew();
  if (S.modal || document.activeElement?.matches('input,textarea,select')) return;
  render();
}, 60000);

/* ════════════════════════════════════════════════════════════════════════
   БЛОК 10 · ОБНОВЛЕНИЕ, ПУШ, СТАРТ
   Что делает:   раз в минуту подтягивает изменения коллег, включает пуш на телефоне, запускает панель.
   Можно менять: частоту обновления — в config.js (REFRESH_SEC).
   Не трогать:   порядок запуска внизу.
   ════════════════════════════════════════════════════════════════════════ */
/* Рабочая версия: раз в REFRESH_SEC секунд подтягиваем изменения коллег (если ничего не редактируется) */
async function refreshData(){
  if (CONFIG.MODE==='gas' && S.user && S.tgPending && document.visibilityState!=='hidden'){
    try { const r = await Api.call('tgCheck'); if (r.linked){ S.tgPending = false; S.data.notify = r.notify; toast('Telegram подключён ✓'); if (S.modal?.type==='notifyset') render(); } } catch(e){}
  }
  if (CONFIG.MODE!=='gas' || !S.user || S.busy || S.modal || document.visibilityState==='hidden') return;
  if (document.activeElement?.matches('input,textarea,select')) return;
  try { const d = await Api.call('bootstrap'); if (S.modal || S.busy) return; S.data = d; S.user = d.user; render(); pushNew(); } catch(e){}
}
if (CONFIG.MODE==='gas'){
  setInterval(refreshData, Math.max(20, CONFIG.REFRESH_SEC||60) * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState==='visible') refreshData(); });
}

/* Пуш-уведомления на телефон (Firebase Cloud Messaging).
   Работают в панели, открытой с отдельного адреса (app.sukhaprana.ru) и установленной на экран «Домой».
   На странице Тильды пуши не включаются — там остаётся Telegram. */
const Push = {
  FB_VER: '10.12.2',
  ready(){ return CONFIG.MODE==='gas' && CONFIG.FIREBASE && CONFIG.VAPID_KEY && 'serviceWorker' in navigator && 'Notification' in window; },
  loadScript(src){ return new Promise((ok, bad) => { if (document.querySelector(`script[src="${src}"]`)) return ok(); const el = document.createElement('script'); el.src = src; el.onload = ok; el.onerror = () => bad(new Error('Не удалось загрузить '+src)); document.head.appendChild(el); }); },
  async enable(){
    if (!this.ready()){ if (CONFIG.MODE==='gas' && !('Notification' in window)) toast('Пуш на этом устройстве недоступны. На iPhone установите панель на экран «Домой» (iOS 16.4+) и включите снова.', true); return; }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg){ toast('Пуш работают в приложении панели (адрес app…), а не на странице сайта. Здесь остаётся Telegram.', true); return; }
      const perm = await Notification.requestPermission();
      if (perm!=='granted'){ toast('Уведомления запрещены в настройках телефона. Разрешите их для Sukha Prana и включите снова.', true); return; }
      const base = `https://www.gstatic.com/firebasejs/${this.FB_VER}/`;
      await this.loadScript(base+'firebase-app-compat.js'); await this.loadScript(base+'firebase-messaging-compat.js');
      if (!firebase.apps.length) firebase.initializeApp(CONFIG.FIREBASE);
      const token = await firebase.messaging().getToken({ vapidKey:CONFIG.VAPID_KEY, serviceWorkerRegistration:reg });
      if (!token) throw new Error('Firebase не выдал токен');
      await Api.call('savePushToken', { token, device: navigator.userAgent.slice(0,120) });
      toast('Пуш-уведомления включены на этом устройстве');
    } catch(e){ toast('Не получилось включить пуш: '+(e.message||e), true); }
  }
};

/* Старт */
(async function start(){
  if (Api.token){ try { await loadAll(); return; } catch(e){ if (e.code==='AUTH'){ Api.token=''; tokenStore.del('sp_token'); } else { S.bootError = e.message; } } }
  render();
})();
})();
