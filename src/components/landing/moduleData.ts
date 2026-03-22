import {
  BarChart3, LineChart, TrendingUp, Star,
  Wallet, CalendarDays, User,
  CheckSquare, AlertTriangle, ClipboardList,
  BookOpen, FileText,
  Link, MessageCircle, Shield,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleFeature {
  title: string;
  description: string;
  bullets?: string[];
  mockupType?: string;
}

export interface ModuleData {
  slug: string;
  name: string;
  category: string;
  icon: LucideIcon;
  color: string;        // bg color for icon tile
  iconColor: string;    // icon stroke color
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  features: ModuleFeature[];
  relatedModules: string[];
}

export const MODULE_CATEGORIES = [
  'Аналитика и KPI',
  'Мотивация и HR',
  'Операции',
  'Знания',
  'Платформа',
] as const;

export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Аналитика и KPI': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Мотивация и HR': { bg: 'bg-purple-50', text: 'text-purple-700' },
  'Операции': { bg: 'bg-amber-50', text: 'text-amber-700' },
  'Знания': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Платформа': { bg: 'bg-indigo-50', text: 'text-indigo-700' },
};

export const MODULES: ModuleData[] = [
  // ── Аналитика и KPI ──
  {
    slug: 'leader-dashboard',
    name: 'Дашборд руководителя',
    category: 'Аналитика и KPI',
    icon: BarChart3,
    color: 'bg-blue-500',
    iconColor: 'text-white',
    tagline: '40+ виджетов — вся сеть как на ладони',
    heroTitle: 'Вся сеть на одном экране',
    heroDescription: 'Больше не нужно собирать данные из разных систем. Дашборд руководителя показывает ключевые метрики всех филиалов в реальном времени — выручка, конверсия, средний чек, CSI и десятки других показателей.',
    features: [
      {
        title: 'Метрики, которые важны именно вам',
        description: 'Настройте дашборд под себя — перетащите нужные виджеты, скройте лишнее. У каждого руководителя свой набор метрик, и мы это учли.',
        bullets: [
          'Drag-and-drop настройка расположения виджетов',
          'Более 40 готовых метрик из коробки',
          'Фильтрация по филиалам, менеджерам и периодам',
          'Автоматическая синхронизация между устройствами',
        ],
        mockupType: 'dashboard-grid',
      },
      {
        title: 'Рейтинги команды в одном месте',
        description: 'Видите, кто лидирует, а кому нужна помощь. Рейтинги менеджеров по выручке, конверсии и CSI обновляются автоматически.',
        bullets: [
          'Рейтинги по выручке, конверсии, среднему чеку',
          'Сравнение план/факт по каждому сотруднику',
          'Филиальные и сетевые рейтинги',
        ],
        mockupType: 'ranking-table',
      },
      {
        title: 'Тренды и динамика',
        description: 'Графики показывают, как меняются показатели день за днём. Заметите проблему до того, как она станет критичной.',
        bullets: [
          'Линейные и столбчатые графики',
          'Сравнение периодов',
          'Выделение аномалий и отклонений',
        ],
        mockupType: 'dynamics-chart',
      },
    ],
    relatedModules: ['manager-dashboard', 'forecasting', 'customer-reviews'],
  },
  {
    slug: 'manager-dashboard',
    name: 'Дашборд менеджера',
    category: 'Аналитика и KPI',
    icon: LineChart,
    color: 'bg-indigo-500',
    iconColor: 'text-white',
    tagline: 'Персональные KPI — каждый знает свой результат',
    heroTitle: 'Каждый менеджер видит свой результат',
    heroDescription: 'Менеджеру не нужно ждать сводку от руководителя. Персональный дашборд показывает план, факт и прогресс — мотивация растёт, когда видишь, к чему идёшь.',
    features: [
      {
        title: 'Мои метрики — план и факт',
        description: 'Менеджер открывает приложение и сразу видит: сколько сделано, сколько осталось до плана, и как идёт дело по сравнению с прошлым месяцем.',
        bullets: [
          'Персональные KPI в реальном времени',
          'Прогресс-бары с цветовой индикацией',
          'Сравнение с прошлым периодом',
        ],
        mockupType: 'manager-metrics',
      },
      {
        title: 'Понятные графики прогресса',
        description: 'Визуальные графики показывают тренд — менеджер видит, набирает ли он темп или нужно ускориться.',
        bullets: [
          'График выручки по дням',
          'Воронка конверсии',
          'Динамика среднего чека',
        ],
        mockupType: 'manager-chart',
      },
    ],
    relatedModules: ['leader-dashboard', 'salary-calculator', 'forecasting'],
  },
  {
    slug: 'forecasting',
    name: 'Прогнозирование',
    category: 'Аналитика и KPI',
    icon: TrendingUp,
    color: 'bg-emerald-500',
    iconColor: 'text-white',
    tagline: 'Узнайте результат до конца месяца',
    heroTitle: 'Знайте результат заранее',
    heroDescription: 'Не ждите конца месяца, чтобы понять, выполнен ли план. Прогноз на основе текущей динамики подскажет, нужно ли корректировать курс — пока ещё есть время.',
    features: [
      {
        title: 'Прогноз выполнения плана',
        description: 'Система анализирует текущий темп продаж и прогнозирует, будет ли план выполнен к концу периода.',
        bullets: [
          'Линейная экстраполяция на основе текущей динамики',
          'Прогноз по каждой метрике отдельно',
          'Визуальная индикация: зелёный / жёлтый / красный',
        ],
        mockupType: 'forecast-progress',
      },
      {
        title: 'Корректируйте стратегию вовремя',
        description: 'Увидели, что конверсия падает? Прогноз покажет это на 10-й день месяца, а не на 30-й.',
        bullets: [
          'Раннее предупреждение о рисках',
          'Детализация по филиалам',
          'Сравнение прогноза с планом',
        ],
        mockupType: 'forecast-detail',
      },
    ],
    relatedModules: ['leader-dashboard', 'manager-dashboard', 'data-entry'],
  },
  {
    slug: 'customer-reviews',
    name: 'Отзывы клиентов',
    category: 'Аналитика и KPI',
    icon: Star,
    color: 'bg-amber-500',
    iconColor: 'text-white',
    tagline: 'Негатив → точка роста. Реагируйте быстро',
    heroTitle: 'Каждый отзыв — возможность стать лучше',
    heroDescription: 'Собираем отзывы из всех источников и выделяем те, которые требуют внимания. Негативный отзыв — это не проблема, а сигнал к действию.',
    features: [
      {
        title: 'Все отзывы в одном месте',
        description: 'Все отзывы агрегируются автоматически, с акцентом на негативные — чтобы вы могли отреагировать первым.',
        bullets: [
          'Агрегация из нескольких источников',
          'Фильтрация по тональности и рейтингу',
          'Привязка к конкретному филиалу',
        ],
        mockupType: 'reviews-list',
      },
      {
        title: 'Тренды удовлетворённости',
        description: 'Следите за тем, как меняется настроение клиентов. Рост негатива — повод разобраться.',
        bullets: [
          'CSI по филиалам и менеджерам',
          'Динамика за выбранный период',
          'Детализация до конкретного отзыва',
        ],
        mockupType: 'reviews-trend',
      },
    ],
    relatedModules: ['leader-dashboard', 'manager-dashboard', 'task-management'],
  },

  // ── Мотивация и HR ──
  {
    slug: 'salary-calculator',
    name: 'Калькулятор зарплаты',
    category: 'Мотивация и HR',
    icon: Wallet,
    color: 'bg-purple-500',
    iconColor: 'text-white',
    tagline: 'Каждая продажа = рост дохода',
    heroTitle: 'Прозрачная мотивация — без вопросов к бухгалтерии',
    heroDescription: 'Когда сотрудник видит, сколько он заработает от каждой продажи — мотивация растёт сама. Калькулятор зарплаты показывает расчёт в реальном времени.',
    features: [
      {
        title: 'Расчёт зарплаты в реальном времени',
        description: 'Сотрудник открывает калькулятор и видит актуальную сумму. Каждая продажа, каждый выполненный KPI — сразу отражается.',
        bullets: [
          'Автоматический расчёт по формуле мотивации',
          'Учёт всех KPI-множителей',
          'Понятная разбивка: оклад + бонусы + KPI',
        ],
        mockupType: 'salary-calc',
      },
      {
        title: 'Про-рейтинг под график сотрудника',
        description: 'Работаете 4 дня в неделю вместо 5? План автоматически скорректируется. Справедливый расчёт для каждого.',
        bullets: [
          'Автоматическая корректировка плана',
          'Учёт больничных и отпусков',
          'Справедливое сравнение между сотрудниками',
        ],
        mockupType: 'salary-prorating',
      },
      {
        title: 'Настройка для бухгалтера',
        description: 'Бухгалтер настраивает формулы мотивации через удобный интерфейс. Изменения применяются мгновенно.',
        bullets: [
          'Визуальный редактор формул',
          'Настройки по филиалам',
          'Переопределения для отдельных сотрудников',
        ],
        mockupType: 'salary-admin',
      },
    ],
    relatedModules: ['manager-dashboard', 'shift-schedule', 'data-entry'],
  },
  {
    slug: 'shift-schedule',
    name: 'Графики смен',
    category: 'Мотивация и HR',
    icon: CalendarDays,
    color: 'bg-teal-500',
    iconColor: 'text-white',
    tagline: 'Визуальное планирование без Excel',
    heroTitle: 'Графики смен без головной боли',
    heroDescription: 'Забудьте про Excel-таблицы. Визуальный календарь с шаблонами и контролем укомплектованности — планирование за минуты.',
    features: [
      {
        title: 'Визуальный календарь',
        description: 'Месячный календарь, где видно, кто когда работает. Перетаскивайте смены, применяйте шаблоны.',
        bullets: [
          'Месячное представление с цветовой кодировкой',
          'Шаблоны смен (2/2, 5/2 и кастомные)',
          'Контроль укомплектованности',
        ],
        mockupType: 'shift-calendar',
      },
      {
        title: 'Связь с мотивацией',
        description: 'График смен автоматически влияет на расчёт зарплаты. Про-рейтинг плана корректируется под реальный график.',
        bullets: [
          'Автоматический про-рейтинг',
          'Учёт фактических рабочих дней',
          'Интеграция с калькулятором',
        ],
        mockupType: 'shift-salary',
      },
    ],
    relatedModules: ['salary-calculator', 'employee-profile', 'task-management'],
  },
  {
    slug: 'employee-profile',
    name: 'Профиль сотрудника',
    category: 'Мотивация и HR',
    icon: User,
    color: 'bg-pink-500',
    iconColor: 'text-white',
    tagline: 'Карточка с командой и руководителем',
    heroTitle: 'Всё о сотруднике — в одной карточке',
    heroDescription: 'Имя, должность, филиал, руководитель, команда — вся информация под рукой.',
    features: [
      {
        title: 'Персональная карточка',
        description: 'Каждый сотрудник видит свой профиль с фото, должностью и контактами руководителя.',
        bullets: [
          'Фото профиля с автообработкой',
          'Должность и отдел',
          'Контакты руководителя',
          'Принадлежность к команде',
        ],
        mockupType: 'profile-card',
      },
    ],
    relatedModules: ['shift-schedule', 'salary-calculator', 'task-management'],
  },

  // ── Операции ──
  {
    slug: 'task-management',
    name: 'Управление задачами',
    category: 'Операции',
    icon: CheckSquare,
    color: 'bg-orange-500',
    iconColor: 'text-white',
    tagline: 'Задачи доходят мгновенно через Telegram',
    heroTitle: 'Задачи, которые точно будут выполнены',
    heroDescription: 'Поставьте задачу — сотрудник получит уведомление в Telegram и откроет её в один клик. Никаких потерянных писем.',
    features: [
      {
        title: 'Deep linking через Telegram',
        description: 'Сотрудник получает push-уведомление в Telegram. Один клик — и задача открыта.',
        bullets: [
          'Push-уведомления в Telegram',
          'Открытие задачи в один клик',
          'Статусы: новая → в работе → выполнена',
        ],
        mockupType: 'task-detail',
      },
      {
        title: 'Офлайн-режим',
        description: 'Нет интернета? Не проблема. Изменения сохраняются локально и синхронизируются автоматически.',
        bullets: [
          'Работа без интернета',
          'Автоматическая синхронизация',
          'Очередь изменений',
        ],
        mockupType: 'task-list',
      },
    ],
    relatedModules: ['attention-deals', 'telegram-bot', 'knowledge-base'],
  },
  {
    slug: 'attention-deals',
    name: 'Контроль сделок',
    category: 'Операции',
    icon: AlertTriangle,
    color: 'bg-red-500',
    iconColor: 'text-white',
    tagline: 'Ни одна сделка не потеряется',
    heroTitle: 'Ни одна сделка не останется без внимания',
    heroDescription: 'Алерты о просроченных и зависших заказах. Менеджер реагирует до того, как клиент уйдёт.',
    features: [
      {
        title: 'Автоматические алерты',
        description: 'Система следит за статусом сделок и сигнализирует, если заказ завис или просрочен.',
        bullets: [
          'Алерты по просроченным заказам',
          'Группировка по приоритету',
          'Детали заказа в один клик',
        ],
        mockupType: 'deals-alerts',
      },
      {
        title: 'Контроль для руководителя',
        description: 'Руководитель видит все незакрытые сделки по всей сети. Фильтрация по филиалам и менеджерам.',
        bullets: [
          'Сетевой обзор незакрытых сделок',
          'Фильтры по филиалу и менеджеру',
          'История действий',
        ],
        mockupType: 'deals-overview',
      },
    ],
    relatedModules: ['task-management', 'leader-dashboard', 'customer-reviews'],
  },
  {
    slug: 'data-entry',
    name: 'Ввод данных',
    category: 'Операции',
    icon: ClipboardList,
    color: 'bg-slate-500',
    iconColor: 'text-white',
    tagline: 'Plan/Fact ввод метрик без ошибок',
    heroTitle: 'Ввод данных — просто и без ошибок',
    heroDescription: 'Формы с валидацией, подсказки и автозаполнение. Данные сразу попадают на дашборды.',
    features: [
      {
        title: 'Формы ввода Plan/Fact',
        description: 'Руководитель вносит плановые и фактические значения метрик через удобные формы.',
        bullets: [
          'Ввод по датам и периодам',
          'Валидация данных на лету',
          'Моментальное отображение на дашбордах',
        ],
        mockupType: 'data-entry-form',
      },
    ],
    relatedModules: ['leader-dashboard', 'forecasting', 'salary-calculator'],
  },

  // ── Знания ──
  {
    slug: 'knowledge-base',
    name: 'База знаний',
    category: 'Знания',
    icon: BookOpen,
    color: 'bg-emerald-600',
    iconColor: 'text-white',
    tagline: 'Wiki с поиском — обучение без тренеров',
    heroTitle: 'Знания команды — всегда под рукой',
    heroDescription: 'Корпоративная wiki, где собраны инструкции, стандарты и ответы на частые вопросы. Новый сотрудник учится сам.',
    features: [
      {
        title: 'Поиск и навигация',
        description: 'Полнотекстовый поиск по всей базе знаний. Коллекции, категории и закладки.',
        bullets: [
          'Полнотекстовый поиск',
          'Организация по коллекциям',
          'Персональные закладки',
        ],
        mockupType: 'kb-search',
      },
      {
        title: 'Красивое оформление',
        description: 'Документы с форматированием, изображениями и видео. Не сухие инструкции, а понятные гайды.',
        bullets: [
          'Rich-text форматирование',
          'Вложения и изображения',
          'Интеграция с Outline Wiki',
        ],
        mockupType: 'kb-article',
      },
    ],
    relatedModules: ['standards', 'telegram-bot', 'employee-profile'],
  },
  {
    slug: 'standards',
    name: 'Стандарты',
    category: 'Знания',
    icon: FileText,
    color: 'bg-cyan-500',
    iconColor: 'text-white',
    tagline: 'Единые стандарты обслуживания',
    heroTitle: 'Единые стандарты для всей сети',
    heroDescription: 'Стандарты обслуживания доступны каждому сотруднику. Одинаковый уровень сервиса во всех филиалах.',
    features: [
      {
        title: 'Стандарты всегда под рукой',
        description: 'Открыл стандарты в приложении — и всё понятно. Не нужно звонить коллегам.',
        bullets: [
          'Структурированные стандарты обслуживания',
          'Быстрый доступ из любого устройства',
          'Актуальная версия — всегда последняя',
        ],
        mockupType: 'standards-list',
      },
    ],
    relatedModules: ['knowledge-base', 'task-management', 'employee-profile'],
  },

  // ── Платформа ──
  {
    slug: 'integrations',
    name: 'Интеграции',
    category: 'Платформа',
    icon: Link,
    color: 'bg-violet-500',
    iconColor: 'text-white',
    tagline: 'Подключение к ERP, CRM и аналитике',
    heroTitle: 'Подключается к вашим системам за дни',
    heroDescription: 'Overbrain — надстройка, а не замена. Подключаемся через API. Ваши системы продолжают работать как раньше.',
    features: [
      {
        title: 'Готовые коннекторы',
        description: 'Из коробки поддерживаем популярные системы для retail.',
        bullets: [
          'Frappe ERPNext — сотрудники, задачи, документы',
          'Аналитические платформы — метрики и KPI',
          'Outline Wiki — база знаний',
          'Telegram Bot API — уведомления',
        ],
        mockupType: 'integrations-list',
      },
      {
        title: 'Мониторинг здоровья',
        description: 'Панель администратора показывает статус каждой интеграции в реальном времени.',
        bullets: [
          'Health-check каждой интеграции',
          'Измерение задержки (latency)',
          'Автоматические алерты при сбоях',
        ],
        mockupType: 'integrations-health',
      },
    ],
    relatedModules: ['admin-panel', 'telegram-bot', 'leader-dashboard'],
  },
  {
    slug: 'telegram-bot',
    name: 'Telegram Bot',
    category: 'Платформа',
    icon: MessageCircle,
    color: 'bg-sky-500',
    iconColor: 'text-white',
    tagline: 'Уведомления без отдельного приложения',
    heroTitle: 'Telegram — единая точка входа',
    heroDescription: 'Не нужно устанавливать отдельное приложение. Всё работает через Telegram — уведомления, задачи, быстрые действия.',
    features: [
      {
        title: 'Push-уведомления',
        description: 'Новая задача, просроченный заказ — сотрудник узнает мгновенно. Без email, без SMS.',
        bullets: [
          'Мгновенные уведомления',
          'Deep links — один клик до нужного экрана',
          'Агрегация сообщений (без спама)',
        ],
        mockupType: 'telegram-notifications',
      },
      {
        title: 'Ноль затрат на мобильное приложение',
        description: 'Разработка мобильного приложения — сотни тысяч рублей. С Telegram — бесплатно.',
        bullets: [
          'Работает в Telegram WebApp',
          'Не нужно скачивать из сторов',
          'Автоматические обновления',
        ],
        mockupType: 'telegram-webapp',
      },
    ],
    relatedModules: ['task-management', 'integrations', 'attention-deals'],
  },
  {
    slug: 'admin-panel',
    name: 'Админ-панель',
    category: 'Платформа',
    icon: Shield,
    color: 'bg-gray-600',
    iconColor: 'text-white',
    tagline: 'Оргструктура и настройки',
    heroTitle: 'Полный контроль над платформой',
    heroDescription: 'Настройте оргструктуру, управляйте доступами и следите за здоровьем интеграций.',
    features: [
      {
        title: 'Организационная структура',
        description: 'Филиалы, отделы, сотрудники — вся оргструктура синхронизируется из ERP.',
        bullets: [
          'Автоматическая синхронизация с ERP',
          'Иерархия филиалов и отделов',
          'Управление ролями и доступами',
        ],
        mockupType: 'admin-org',
      },
      {
        title: 'Настройка зарплат',
        description: 'Бухгалтер настраивает формулы мотивации через понятный интерфейс.',
        bullets: [
          'Управление окладами и ставками',
          'Настройка KPI-множителей',
          'Журнал изменений',
        ],
        mockupType: 'admin-salary',
      },
    ],
    relatedModules: ['integrations', 'salary-calculator', 'shift-schedule'],
  },
];

export interface ScreenshotInfo {
  src: string;
  alt: string;
  variant: 'desktop' | 'mobile';
  url?: string;
}

export const SCREENSHOT_MAP: Record<string, ScreenshotInfo> = {
  // Leader Dashboard
  'dashboard-grid':     { src: '/screenshots/dashboard-full.png', alt: 'KPI-дашборд с виджетами', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'ranking-table':      { src: '/screenshots/dashboard-rankings.png', alt: 'Рейтинг менеджеров', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'dynamics-chart':     { src: '/screenshots/dashboard-charts.png', alt: 'Графики выручки и KPI', variant: 'desktop', url: 'app.overbrain.io/dashboard' },

  // Manager Dashboard
  'manager-metrics':    { src: '/screenshots/dashboard-kpi-circles.png', alt: 'KPI-метрики менеджера', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'manager-chart':      { src: '/screenshots/dashboard-widgets.png', alt: 'Виджеты дашборда', variant: 'desktop', url: 'app.overbrain.io/dashboard' },

  // Forecasting
  'forecast-progress':  { src: '/screenshots/dashboard-charts.png', alt: 'Прогноз выполнения плана', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'forecast-detail':    { src: '/screenshots/dashboard-kpi-circles.png', alt: 'Детали прогноза', variant: 'desktop', url: 'app.overbrain.io/dashboard' },

  // Salary
  'salary-calc':        { src: '/screenshots/salary-calc-mobile.png', alt: 'Калькулятор зарплаты', variant: 'mobile' },
  'salary-prorating':   { src: '/screenshots/salary-formula-mobile.png', alt: 'Формула расчёта зарплаты', variant: 'mobile' },
  'salary-admin':       { src: '/screenshots/salary-admin-table.png', alt: 'Администрирование зарплат', variant: 'desktop', url: 'app.overbrain.io/admin' },

  // Shift Schedule
  'shift-calendar':     { src: '/screenshots/profile-schedule-mobile.png', alt: 'Календарь смен', variant: 'mobile' },
  'shift-salary':       { src: '/screenshots/profile-schedule-mobile.png', alt: 'График и команда', variant: 'mobile' },

  // Profile
  'profile-card':       { src: '/screenshots/profile-mobile.png', alt: 'Профиль сотрудника', variant: 'mobile' },

  // Knowledge Base
  'kb-search':          { src: '/screenshots/kb-sections-mobile.png', alt: 'Разделы базы знаний', variant: 'mobile' },
  'kb-article':         { src: '/screenshots/admin-kb-articles.png', alt: 'Статьи базы знаний', variant: 'desktop', url: 'app.overbrain.io/admin' },

  // Admin
  'admin-org':          { src: '/screenshots/admin-org-tree.png', alt: 'Организационная структура', variant: 'desktop', url: 'app.overbrain.io/admin' },
  'admin-salary':       { src: '/screenshots/salary-admin-table.png', alt: 'Настройка зарплат', variant: 'desktop', url: 'app.overbrain.io/admin' },

  // Integrations
  'integrations-list':  { src: '/screenshots/admin-kb-connections.png', alt: 'API-подключения', variant: 'desktop', url: 'app.overbrain.io/admin' },
  'integrations-health':{ src: '/screenshots/admin-system-health.png', alt: 'Здоровье интеграций', variant: 'desktop', url: 'app.overbrain.io/admin' },

  // Data Entry
  'data-entry-form':    { src: '/screenshots/salary-admin-table.png', alt: 'Ввод Plan/Fact данных', variant: 'desktop', url: 'app.overbrain.io/admin' },
};

/** Hero screenshot for each module (first feature's best screenshot) */
export const MODULE_HERO_SCREENSHOTS: Record<string, ScreenshotInfo> = {
  'leader-dashboard':   { src: '/screenshots/dashboard-full.png', alt: 'Дашборд руководителя', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'manager-dashboard':  { src: '/screenshots/dashboard-kpi-circles.png', alt: 'Дашборд менеджера', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'forecasting':        { src: '/screenshots/dashboard-charts.png', alt: 'Прогнозирование', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'customer-reviews':   { src: '/screenshots/dashboard-widgets.png', alt: 'Отзывы клиентов', variant: 'desktop', url: 'app.overbrain.io/dashboard' },
  'salary-calculator':  { src: '/screenshots/salary-calc-mobile.png', alt: 'Калькулятор зарплаты', variant: 'mobile' },
  'shift-schedule':     { src: '/screenshots/profile-schedule-mobile.png', alt: 'Графики смен', variant: 'mobile' },
  'employee-profile':   { src: '/screenshots/profile-mobile.png', alt: 'Профиль сотрудника', variant: 'mobile' },
  'knowledge-base':     { src: '/screenshots/admin-kb-articles.png', alt: 'База знаний', variant: 'desktop', url: 'app.overbrain.io/admin' },
  'standards':          { src: '/screenshots/kb-sections-mobile.png', alt: 'Стандарты', variant: 'mobile' },
  'integrations':       { src: '/screenshots/admin-system-health.png', alt: 'Интеграции', variant: 'desktop', url: 'app.overbrain.io/admin' },
  'admin-panel':        { src: '/screenshots/admin-org-tree.png', alt: 'Админ-панель', variant: 'desktop', url: 'app.overbrain.io/admin' },
  'data-entry':         { src: '/screenshots/salary-admin-table.png', alt: 'Ввод данных', variant: 'desktop', url: 'app.overbrain.io/admin' },
};

export function getModuleBySlug(slug: string): ModuleData | undefined {
  return MODULES.find((m) => m.slug === slug);
}

export function getModulesByCategory(category: string): ModuleData[] {
  return MODULES.filter((m) => m.category === category);
}

export function getRelatedModules(slugs: string[]): ModuleData[] {
  return slugs.map((s) => MODULES.find((m) => m.slug === s)).filter(Boolean) as ModuleData[];
}
