import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'screenshots', 'app');

function img(filename) {
  const p = path.join(screenshotsDir, filename);
  if (!fs.existsSync(p)) return null;
  const data = fs.readFileSync(p).toString('base64');
  return `image/png;base64,${data}`;
}

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches
pptx.author = 'IS';
pptx.title = 'IS – Корпоративный портал для повышения эффективности Retail сетей';

const C = {
  black: '000000',
  text: '333333',
  muted: '888888',
  line: 'E0E0E0',
  red: 'E53935',
  blue: '1E88E5',
  green: '43A047',
  purple: '7364E3',
  white: 'FFFFFF',
  lightGray: 'F5F5F5',
  lightGreen: 'F0FDF4',
};

pptx.defineSlideMaster({
  title: 'CLEAN',
  background: { color: C.white },
});

function addTitle(slide, text, fontSize = 32) {
  slide.addText(text, {
    x: 0.7, y: 0.35, w: 11.9, h: 0.65,
    fontSize, fontFace: 'Inter', bold: true, color: C.black,
  });
}

function addSubtitle(slide, text, y = 0.95) {
  slide.addText(text, {
    x: 0.7, y, w: 11.9, h: 0.35,
    fontSize: 14, fontFace: 'Inter', color: C.muted,
  });
}

function addScreenshot(slide, x, y, w, h, filename) {
  const imgData = img(filename);
  if (imgData) {
    slide.addImage({
      data: imgData, x, y, w, h,
      rounding: true,
      shadow: { type: 'outer', blur: 8, offset: 2, color: '000000', opacity: 0.08 },
    });
  }
}

function addColHeader(slide, text, x, y, w, underlineColor) {
  slide.addText(text, {
    x, y, w, h: 0.3,
    fontSize: 14, fontFace: 'Inter', bold: true, color: C.black,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x, y: y + 0.28, w: w * 0.6, h: 0.04,
    fill: { color: underlineColor },
  });
}

function addCheckList(slide, items, x, y, w, color = C.green) {
  items.forEach((item, i) => {
    slide.addText([
      { text: '✓  ', options: { fontSize: 11, color, bold: true } },
      { text: item, options: { fontSize: 11, color: C.text } },
    ], { x, y: y + i * 0.28, w, h: 0.28, fontFace: 'Inter' });
  });
}

function addProblemList(slide, items, x, y, w) {
  items.forEach((item, i) => {
    slide.addText([
      { text: '○  ', options: { fontSize: 11, color: C.black } },
      { text: item, options: { fontSize: 11, color: C.text } },
    ], { x, y: y + i * 0.28, w, h: 0.28, fontFace: 'Inter' });
  });
}

// ===== SLIDE 1: TITLE =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  slide.addText('IS – Корпоративный портал', {
    x: 0, y: 2.2, w: '100%', h: 1.2,
    align: 'center', fontSize: 44, fontFace: 'Inter', bold: true, color: C.black,
  });
  slide.addText('Повышение эффективности\nRetail сетей', {
    x: 0, y: 3.5, w: '100%', h: 0.9,
    align: 'center', fontSize: 20, fontFace: 'Inter', color: C.text, lineSpacingMultiple: 1.3,
  });
}

// ===== SLIDE 2: ЧТО ТАКОЕ IS =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Что такое IS', 36);

  slide.addText('Корпоративный портал для сотрудников розничных сетей. Объединяет задачи, аналитику, графики смен, зарплатный калькулятор и базу знаний в одном окне.', {
    x: 0.7, y: 1.1, w: 5.8, h: 0.9,
    fontSize: 13, fontFace: 'Inter', color: C.text, lineSpacingMultiple: 1.4,
  });
  slide.addText('Разработан на основе реального опыта управления филиалами — от исследования проблем до запуска MVP за 3 месяца с применением AI-инструментов.', {
    x: 0.7, y: 2.1, w: 5.8, h: 0.7,
    fontSize: 13, fontFace: 'Inter', color: C.text, lineSpacingMultiple: 1.4,
  });
  slide.addText('Telegram WebApp — ноль установок, мгновенный доступ для всей команды.', {
    x: 0.7, y: 2.9, w: 5.8, h: 0.4,
    fontSize: 13, fontFace: 'Inter', color: C.muted,
  });

  addScreenshot(slide, 7.0, 0.9, 5.5, 3.3, '11_dashboard_desktop.png');
  addScreenshot(slide, 7.0, 4.4, 2.6, 2.6, '02_dashboard.png');
  addScreenshot(slide, 9.9, 4.4, 2.6, 2.6, '04_tasks.png');
}

// ===== SLIDE 3: IS v1.0 =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'IS v1.0', 36);

  // 3 columns
  addColHeader(slide, 'Проблемы', 0.7, 1.1, 3.7, C.red);
  addProblemList(slide, [
    'Данные разбросаны по 5+ системам',
    'Менеджеры не видят свои KPI',
    'Графики смен в Excel и WhatsApp',
    'Зарплата — чёрный ящик для сотрудников',
    'Стандарты теряются в чатах',
    'Нет единого канала уведомлений',
  ], 0.7, 1.5, 3.7);

  addColHeader(slide, 'Решения IS', 4.8, 1.1, 3.7, C.blue);
  addCheckList(slide, [
    'Единый дашборд с выручкой, маржой, CSI',
    'Персональные KPI в реальном времени',
    'Онлайн-график смен с автозаполнением',
    'Калькулятор зарплаты — прозрачный расчёт',
    'База знаний с поиском и категориями',
    'Push-уведомления через Telegram Bot',
  ], 4.8, 1.5, 3.7, C.blue);

  addColHeader(slide, 'Результаты для бизнеса', 8.9, 1.1, 3.7, C.green);
  addCheckList(slide, [
    'Экономия 2-3 часа/день на рутине',
    'Рост выполнения планов на 15-25%',
    'Снижение текучести кадров',
    'Прозрачность мотивации для команды',
    'Единый стандарт обслуживания',
    'Быстрый онбординг новых сотрудников',
  ], 8.9, 1.5, 3.7);
}

// ===== SLIDE 4: ЕДИНОЕ ОКНО =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Единое окно к эффективности', 36);
  addSubtitle(slide, 'IS — корпоративный портал. Все инструменты менеджера в одном приложении.');

  const screenshots = [
    ['02_dashboard.png', 'Дашборд'],
    ['04_tasks.png', 'Задачи'],
    ['06_shifts.png', 'Смены'],
    ['08_calculator.png', 'Калькулятор ЗП'],
    ['03_knowledge.png', 'База знаний'],
  ];
  screenshots.forEach(([file, label], i) => {
    const x = 0.8 + i * 2.5;
    addScreenshot(slide, x, 1.5, 2.1, 4.2, file);
    slide.addText(label, {
      x, y: 5.9, w: 2.1, h: 0.3,
      align: 'center', fontSize: 9, fontFace: 'Inter', color: C.muted,
    });
  });
}

// ===== SLIDE 5: ПОЧЕМУ TELEGRAM =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Почему Telegram', 36);

  addColHeader(slide, 'Проблемы текущих решений', 0.7, 1.1, 5.5, C.red);
  addProblemList(slide, [
    'Корпоративные порталы — низкая вовлечённость',
    'Отдельные приложения — никто не ставит',
    'Email-рассылки — не читают',
    'WhatsApp/Viber — нет структуры, всё теряется',
  ], 0.7, 1.5, 5.5);

  addColHeader(slide, 'Преимущества TWA', 0.7, 2.8, 5.5, C.green);
  addCheckList(slide, [
    'Telegram установлен у 95% сотрудников',
    'Ноль установок — открыл и работаешь',
    'Push через бота — 100% доставка',
    'Авторизация без паролей',
  ], 0.7, 3.2, 5.5);

  addScreenshot(slide, 7.5, 1.0, 3.5, 5.5, '02_dashboard.png');
  slide.addText('IS работает как WebApp внутри Telegram', {
    x: 7.5, y: 6.6, w: 3.5, h: 0.3,
    align: 'center', fontSize: 9, fontFace: 'Inter', color: C.muted,
  });
}

// ===== SLIDE 6: ДАШБОРД =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Дашборд', 36);
  addSubtitle(slide, 'Все цифры филиала в одном месте. Выручка, маржа, конверсия, CSI — в реальном времени.');

  addScreenshot(slide, 0.7, 1.4, 6.0, 3.8, '11_dashboard_desktop.png');
  addScreenshot(slide, 7.0, 1.4, 2.8, 3.0, '02_dashboard.png');
  addScreenshot(slide, 10.1, 1.4, 2.8, 3.0, '09_attention_deals.png');
  addScreenshot(slide, 7.0, 4.6, 2.8, 2.5, '05_profile.png');
  addScreenshot(slide, 10.1, 4.6, 2.8, 2.5, '07_reviews.png');
}

// ===== SLIDE 7: МОТИВАЦИЯ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Мотивация', 36);
  addSubtitle(slide, 'Прозрачная оплата. Каждый сотрудник видит, из чего складывается его зарплата.');

  addCheckList(slide, [
    'Персональный калькулятор зарплаты',
    'Декомпозиция: оклад + бонусы + KPI',
    'Расчёт для бухгалтерии — одна таблица',
    'Прозрачность убирает 90% вопросов «почему столько?»',
  ], 0.7, 1.5, 5.5);

  addScreenshot(slide, 6.8, 1.3, 2.5, 5.0, '08_calculator.png');
  addScreenshot(slide, 9.6, 1.3, 3.5, 5.0, '15_calculator_desktop.png');
}

// ===== SLIDE 8: СТАНДАРТЫ, БЗ, НОТИФИКАЦИИ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Стандарты, База знаний, Нотификации', 30);
  addSubtitle(slide, 'Управление знаниями и стандартами обслуживания. Бот напоминает, контролирует, обучает.');

  const items = [
    ['03_knowledge.png', 'База знаний'],
    ['04_tasks.png', 'Задачи'],
    ['10_admin.png', 'Админ-панель'],
    ['06_shifts.png', 'Графики смен'],
  ];
  items.forEach(([file, label], i) => {
    const x = 0.7 + i * 3.15;
    addScreenshot(slide, x, 1.5, 2.8, 4.8, file);
    slide.addText(label, {
      x, y: 6.5, w: 2.8, h: 0.3,
      align: 'center', fontSize: 9, fontFace: 'Inter', color: C.muted,
    });
  });
}

// ===== SLIDE 9: РЕЗУЛЬТАТЫ — МЕТРИКИ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Результаты: 3 месяца', 36);

  const stats = [
    ['10,000+', 'посещений за 3 мес', C.purple],
    ['65%', 'используют дашборд\nежедневно', C.blue],
    ['38', 'визитов в день\n(среднее)', C.green],
    ['4.5 мин', 'средняя сессия', C.red],
  ];
  stats.forEach(([num, label, color], i) => {
    const x = 0.7 + i * 3.15;
    slide.addText(num, {
      x, y: 1.2, w: 2.8, h: 0.6,
      align: 'center', fontSize: 36, fontFace: 'Inter', bold: true, color,
    });
    slide.addText(label, {
      x, y: 1.85, w: 2.8, h: 0.5,
      align: 'center', fontSize: 11, fontFace: 'Inter', color: C.muted, lineSpacingMultiple: 1.2,
    });
  });

  addColHeader(slide, 'Ключевые выводы', 0.7, 2.7, 5.8, C.blue);
  addCheckList(slide, [
    'Дашборд — самая популярная функция (65% трафика)',
    'Калькулятор ЗП — второй по востребованности',
    'Среднее время между визитами — 0.8 дней',
    'Пик использования — 9:00-11:00 и 14:00-16:00',
  ], 0.7, 3.1, 5.8, C.blue);

  addColHeader(slide, 'Вовлечённость', 7.0, 2.7, 5.5, C.green);
  addCheckList(slide, [
    '95% сотрудников зарегистрировались в первую неделю',
    'Органический рост — сотрудники приглашают коллег',
    'Запросы на новые функции от самих пользователей',
  ], 7.0, 3.1, 5.5);
}

// ===== SLIDE 10: RETENTION =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Возвращаемость', 36);

  const retStats = [
    ['57.5%', 'возвращаются\nежедневно', C.green],
    ['37.4%', 'возвращаются\nв течение 1-7 дней', C.blue],
    ['<3%', 'не заходили\nболее 7 дней', C.muted],
  ];
  retStats.forEach(([num, label, color], i) => {
    const x = 1.0 + i * 4.0;
    slide.addText(num, {
      x, y: 1.5, w: 3.5, h: 1.0,
      align: 'center', fontSize: 52, fontFace: 'Inter', bold: true, color,
    });
    slide.addText(label, {
      x, y: 2.6, w: 3.5, h: 0.6,
      align: 'center', fontSize: 13, fontFace: 'Inter', color: C.text, lineSpacingMultiple: 1.3,
    });
  });

  slide.addText('Средний корпоративный портал: 10-15% daily retention', {
    x: 0, y: 4.0, w: '100%', h: 0.4,
    align: 'center', fontSize: 14, fontFace: 'Inter', color: C.muted,
  });
  slide.addText([
    { text: 'IS: ', options: { color: C.text } },
    { text: '57.5% daily retention', options: { color: C.green, bold: true } },
    { text: ' — в 4x выше рынка', options: { color: C.muted } },
  ], {
    x: 0, y: 4.4, w: '100%', h: 0.4,
    align: 'center', fontSize: 14, fontFace: 'Inter',
  });
}

// ===== SLIDE 11: ВЛИЯНИЕ НА БИЗНЕС — ФИЛИАЛЫ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Влияние на бизнес: филиалы', 36);

  const tableData = [
    [
      { text: 'Филиал', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Выполнение плана', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Визиты в IS', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Активных сотрудников', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Корреляция', options: { bold: true, fontSize: 12, color: C.black } },
    ],
    [
      { text: 'Санкт-Петербург', options: { bold: true, fontSize: 12 } },
      { text: '106%', options: { fontSize: 12, color: C.green, bold: true } },
      { text: '320', options: { fontSize: 12 } },
      { text: '12', options: { fontSize: 12 } },
      { text: '✓ Высокая', options: { fontSize: 12, color: C.green } },
    ],
    [
      { text: 'Москва', options: { bold: true, fontSize: 12 } },
      { text: '99%', options: { fontSize: 12, color: C.blue, bold: true } },
      { text: '109', options: { fontSize: 12 } },
      { text: '8', options: { fontSize: 12 } },
      { text: '✓ Средняя', options: { fontSize: 12, color: C.blue } },
    ],
    [
      { text: 'Казань', options: { bold: true, fontSize: 12 } },
      { text: '94%', options: { fontSize: 12, bold: true } },
      { text: '85', options: { fontSize: 12 } },
      { text: '6', options: { fontSize: 12 } },
      { text: '○ Растёт', options: { fontSize: 12 } },
    ],
  ];

  slide.addTable(tableData, {
    x: 0.7, y: 1.2, w: 11.9,
    border: { type: 'solid', pt: 0.5, color: C.line },
    colW: [2.8, 2.5, 2.2, 2.5, 1.9],
    rowH: [0.45, 0.45, 0.45, 0.45],
    fontFace: 'Inter',
    autoPage: false,
  });

  addColHeader(slide, 'Выводы', 0.7, 3.5, 11.9, C.green);
  addCheckList(slide, [
    'Филиалы с высокой активностью в IS показывают выполнение плана выше 100%',
    'Корреляция между частотой использования дашборда и выручкой',
    'Менеджеры, ежедневно проверяющие KPI, корректируют действия быстрее',
  ], 0.7, 3.9, 11.9);
}

// ===== SLIDE 12: ВЛИЯНИЕ НА БИЗНЕС — МЕНЕДЖЕРЫ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Влияние на бизнес: менеджеры', 36);

  const tableData = [
    [
      { text: 'Менеджер', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Филиал', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Выполнение плана', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Визиты в IS / мес', options: { bold: true, fontSize: 12, color: C.black } },
      { text: 'Использует дашборд', options: { bold: true, fontSize: 12, color: C.black } },
    ],
    [
      { text: 'Айталина Тимофеева', options: { fontSize: 12 } },
      { text: 'СПб', options: { fontSize: 12 } },
      { text: '125%', options: { fontSize: 12, color: C.green, bold: true } },
      { text: '89', options: { fontSize: 12 } },
      { text: '✓ Ежедневно', options: { fontSize: 12, color: C.green } },
    ],
    [
      { text: 'Мария Козлова', options: { fontSize: 12 } },
      { text: 'СПб', options: { fontSize: 12 } },
      { text: '112%', options: { fontSize: 12, color: C.green, bold: true } },
      { text: '67', options: { fontSize: 12 } },
      { text: '✓ Ежедневно', options: { fontSize: 12, color: C.green } },
    ],
    [
      { text: 'Дмитрий Волков', options: { fontSize: 12 } },
      { text: 'Москва', options: { fontSize: 12 } },
      { text: '103%', options: { fontSize: 12, color: C.blue, bold: true } },
      { text: '45', options: { fontSize: 12 } },
      { text: '✓ 3-4 раза/нед', options: { fontSize: 12, color: C.blue } },
    ],
    [
      { text: 'Анна Петрова', options: { fontSize: 12 } },
      { text: 'Москва', options: { fontSize: 12 } },
      { text: '96%', options: { fontSize: 12, bold: true } },
      { text: '22', options: { fontSize: 12 } },
      { text: '○ 1-2 раза/нед', options: { fontSize: 12 } },
    ],
    [
      { text: 'Игорь Сидоров', options: { fontSize: 12 } },
      { text: 'Казань', options: { fontSize: 12 } },
      { text: '91%', options: { fontSize: 12, bold: true } },
      { text: '12', options: { fontSize: 12 } },
      { text: '○ Редко', options: { fontSize: 12, color: C.muted } },
    ],
  ];

  slide.addTable(tableData, {
    x: 0.7, y: 1.2, w: 11.9,
    border: { type: 'solid', pt: 0.5, color: C.line },
    colW: [2.8, 1.5, 2.5, 2.5, 2.6],
    rowH: [0.45, 0.45, 0.45, 0.45, 0.45, 0.45],
    fontFace: 'Inter',
    autoPage: false,
  });

  // Pattern box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7, y: 4.2, w: 11.9, h: 0.6,
    fill: { color: C.lightGray },
    rectRadius: 0.08,
  });
  slide.addText([
    { text: 'Паттерн: ', options: { bold: true, color: C.green } },
    { text: 'менеджеры, использующие IS ежедневно, выполняют план на 15-30% выше тех, кто заходит редко.', options: { color: C.text } },
  ], {
    x: 0.9, y: 4.2, w: 11.5, h: 0.6,
    fontSize: 12, fontFace: 'Inter', valign: 'middle',
  });
}

// ===== SLIDE 13: ФИДБЕК =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Фидбек от команды', 36);

  const quotes = [
    ['«Раньше каждое утро тратила 40 минут, чтобы собрать цифры из разных таблиц. Сейчас открываю дашборд — всё на месте за 2 секунды.»', 'Айталина Т., менеджер, СПб'],
    ['«Калькулятор зарплаты — лучшее, что случилось. Сотрудники перестали задавать одни и те же вопросы каждый месяц.»', 'Мария К., менеджер, СПб'],
    ['«Графики смен в приложении — это удобно. Раньше каждый раз переспрашивали в чате, кто когда работает.»', 'Дмитрий В., менеджер, Москва'],
    ['«Нравится, что база знаний всегда под рукой. Новые сотрудники сами находят ответы, не дёргая старших.»', 'Анна П., менеджер, Москва'],
  ];
  quotes.forEach(([text, cite], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.7 + col * 6.3;
    const y = 1.2 + row * 2.8;

    // Quote box with left border
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 5.8, h: 2.3,
      fill: { color: 'F8F9FA' },
      rectRadius: 0.08,
    });
    slide.addShape(pptx.ShapeType.rect, {
      x, y, w: 0.04, h: 2.3,
      fill: { color: C.blue },
    });
    slide.addText(text, {
      x: x + 0.2, y: y + 0.1, w: 5.3, h: 1.6,
      fontSize: 12, fontFace: 'Inter', color: C.text, italic: true, lineSpacingMultiple: 1.3,
    });
    slide.addText(cite, {
      x: x + 0.2, y: y + 1.7, w: 5.3, h: 0.4,
      fontSize: 11, fontFace: 'Inter', color: C.text, bold: true,
    });
  });
}

// ===== SLIDE 14: ПРИНЦИП РАБОТЫ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Принцип работы', 36);
  addSubtitle(slide, '100% OpenSource. Модульная архитектура с API-интеграциями.');

  // Top row: external systems
  const topSystems = ['Frappe ERP', 'Outline Wiki', 'Loovis Tracker', 'Yandex Tracker'];
  topSystems.forEach((name, i) => {
    const x = 1.5 + i * 2.8;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.6, w: 2.4, h: 0.55,
      fill: { color: C.lightGray },
      rectRadius: 0.08,
    });
    slide.addText(name, {
      x, y: 1.6, w: 2.4, h: 0.55,
      align: 'center', fontSize: 12, fontFace: 'Inter', bold: true, color: C.black,
    });
  });

  // Arrow
  slide.addText('↕ API', {
    x: 0, y: 2.3, w: '100%', h: 0.5,
    align: 'center', fontSize: 18, fontFace: 'Inter', color: C.muted,
  });

  // Center: IS
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 3.5, y: 3.0, w: 6.3, h: 1.0,
    fill: { color: C.purple },
    rectRadius: 0.1,
  });
  slide.addText('IS — BFF Server', {
    x: 3.5, y: 3.0, w: 6.3, h: 0.6,
    align: 'center', fontSize: 16, fontFace: 'Inter', bold: true, color: C.white,
  });
  slide.addText('Express.js + React + Vite', {
    x: 3.5, y: 3.5, w: 6.3, h: 0.4,
    align: 'center', fontSize: 11, fontFace: 'Inter', color: 'DDDDFF',
  });

  // Arrow
  slide.addText('↕', {
    x: 0, y: 4.1, w: '100%', h: 0.5,
    align: 'center', fontSize: 18, fontFace: 'Inter', color: C.muted,
  });

  // Bottom: delivery
  const bottomSystems = ['Telegram WebApp', 'Telegram Bot', 'Web Browser'];
  bottomSystems.forEach((name, i) => {
    const x = 2.0 + i * 3.3;
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y: 4.7, w: 2.8, h: 0.55,
      fill: { color: C.lightGray },
      rectRadius: 0.08,
    });
    slide.addText(name, {
      x, y: 4.7, w: 2.8, h: 0.55,
      align: 'center', fontSize: 12, fontFace: 'Inter', bold: true, color: C.black,
    });
  });

  slide.addText('Адаптируется под любую ERP. Подключение нового филиала — 1 день. Новый модуль — 1-2 недели.', {
    x: 0, y: 5.7, w: '100%', h: 0.4,
    align: 'center', fontSize: 11, fontFace: 'Inter', color: C.muted,
  });
}

// ===== SLIDE 15: ЭФФЕКТИВНОСТЬ РАЗРАБОТКИ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Эффективность разработки', 36);

  const circles = [
    ['12M ₽', 'Dodo IS (аналог)', C.red, 'Команда 15+ разработчиков\n12+ месяцев'],
    ['19M ₽', 'Рынок (среднее)', C.blue, 'Аутсорс / in-house\n8-18 месяцев'],
    ['3M ₽', 'IS (наш результат)', C.green, '1 разработчик + AI\n3 месяца'],
  ];
  circles.forEach(([num, label, color, desc], i) => {
    const x = 1.5 + i * 3.8;
    slide.addShape(pptx.ShapeType.ellipse, {
      x, y: 1.5, w: 2.8, h: 2.8,
      fill: { color },
    });
    slide.addText(num, {
      x, y: 2.1, w: 2.8, h: 0.7,
      align: 'center', fontSize: 28, fontFace: 'Inter', bold: true, color: C.white,
    });
    slide.addText(label, {
      x, y: 2.7, w: 2.8, h: 0.4,
      align: 'center', fontSize: 10, fontFace: 'Inter', color: C.white,
    });
    slide.addText(desc, {
      x, y: 4.5, w: 2.8, h: 0.6,
      align: 'center', fontSize: 10, fontFace: 'Inter', color: C.muted, lineSpacingMultiple: 1.2,
    });
  });

  slide.addText([
    { text: 'В 4-6 раз дешевле ', options: { color: C.green, bold: true } },
    { text: 'рыночных аналогов при сравнимой функциональности', options: { color: C.text } },
  ], {
    x: 0, y: 5.5, w: '100%', h: 0.5,
    align: 'center', fontSize: 16, fontFace: 'Inter',
  });
}

// ===== SLIDE 16: ПЛАНЫ =====
{
  const slide = pptx.addSlide({ masterName: 'CLEAN' });
  addTitle(slide, 'Планы и масштабирование', 34);

  // Left column
  addColHeader(slide, 'Масштабирование', 0.7, 1.1, 5.5, C.blue);
  addCheckList(slide, [
    'Подключение новых филиалов — 1 день',
    'Адаптация под другие ERP (1С, SAP, Bitrix)',
    'White-label для партнёров и франчайзи',
  ], 0.7, 1.5, 5.5, C.blue);

  addColHeader(slide, 'Новые модули', 0.7, 2.6, 5.5, C.purple);
  addCheckList(slide, [
    'AI-ассистент для менеджера',
    'Автоматическая отчётность',
    'Обучение и аттестация сотрудников',
    'Интеграция с системами лояльности',
  ], 0.7, 3.0, 5.5, C.purple);

  // Right column
  addColHeader(slide, 'Ценность для бизнеса', 7.0, 1.1, 5.5, C.green);
  addCheckList(slide, [
    'Рост выручки — менеджеры видят KPI и действуют',
    'Снижение затрат — автоматизация рутины',
    'Удержание персонала — прозрачность',
    'Быстрый онбординг — продуктивен с 1 дня',
    'Контроль стандартов — единые правила',
  ], 7.0, 1.5, 5.5);

  // ROI box
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 7.0, y: 3.2, w: 5.5, h: 0.8,
    fill: { color: C.lightGreen },
    rectRadius: 0.08,
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 7.0, y: 3.2, w: 0.05, h: 0.8,
    fill: { color: C.green },
  });
  slide.addText('ROI: окупаемость за 2-3 месяца', {
    x: 7.2, y: 3.2, w: 5.1, h: 0.45,
    fontSize: 13, fontFace: 'Inter', bold: true, color: C.green,
  });
  slide.addText('Рост выручки на 15-25% + экономия 2-3 ч/день', {
    x: 7.2, y: 3.6, w: 5.1, h: 0.35,
    fontSize: 11, fontFace: 'Inter', color: C.text,
  });
}

// Generate
const outPath = path.join(__dirname, 'IS_Presentation.pptx');
await pptx.writeFile({ fileName: outPath });
console.log('PPTX saved to:', outPath);
