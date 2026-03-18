import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Конвертирует Markdown в HTML, убирает mention:// ссылки и смайлики
 * @param markdown - Markdown текст для обработки
 * @returns HTML строка
 */
export function processMarkdownContent(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Убираем mention:// ссылки полностью
  html = html.replace(/\[([^\]]*)\]\(mention:\/\/[^)]*\)/g, '$1');
  
  // Убираем смайлики (базовые эмодзи)
  html = html.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
  
  // Убираем :emoji_name: формат
  html = html.replace(/:[a-zA-Z0-9_+-]+:/g, '');

  // Заголовки (### ## #)
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-gray-800 mt-4 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-6 mb-4">$1</h1>');

  // Жирный текст **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>');
  
  // Курсивный текст *text*
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic text-gray-700">$1</em>');
  
  // Подчеркнутый текст __text__
  html = html.replace(/__([^_]+)__/g, '<u class="underline">$1</u>');

  // Зачеркнутый текст ~~text~~
  html = html.replace(/~~([^~]+)~~/g, '<del class="line-through text-gray-500">$1</del>');

  // Ссылки [text](url) (исключая уже обработанные mention://)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">$1</a>');

  // Код в строке `code`
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800">$1</code>');

  // Блоки кода ```code```
  html = html.replace(/```([^`]+)```/g, '<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto my-3"><code class="text-sm font-mono text-gray-800">$1</code></pre>');

  // Обработка списков - все списки делаем ненумерованными с точками
  // Сначала обрабатываем вложенные элементы (с двумя или более пробелами/табами)
  html = html.replace(/^(\s{4,}|\t{2,})[-*+] (.+)$/gm, '<li class="ml-12 text-gray-700 py-0.5 list-disc">$2</li>');
  html = html.replace(/^(\s{4,}|\t{2,})\d+\. (.+)$/gm, '<li class="ml-12 text-gray-700 py-0.5 list-disc">$2</li>');
  
  // Обрабатываем средний уровень вложенности (2-3 пробела)
  html = html.replace(/^(\s{2,3}|\t+)[-*+] (.+)$/gm, '<li class="ml-8 text-gray-700 py-0.5 list-disc">$2</li>');
  html = html.replace(/^(\s{2,3}|\t+)\d+\. (.+)$/gm, '<li class="ml-8 text-gray-700 py-0.5 list-disc">$2</li>');
  
  // Обрабатываем основные элементы списка (все преобразуем в ненумерованные)
  html = html.replace(/^[-*+] (.+)$/gm, '<li class="ml-4 text-gray-800 py-1 font-medium list-disc">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-gray-800 py-1 font-medium list-disc">$1</li>');

  // Группируем элементы списков в <ul> теги с улучшенными стилями
  html = html.replace(/(<li[^>]*>.*<\/li>\s*)+/g, '<ul class="space-y-1 my-3 pl-2 list-disc">$&</ul>');

  // Горизонтальная линия ---
  html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-300">');

  // Цитаты > text
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-3 bg-blue-50 py-2 rounded-r-lg">$1</blockquote>');

  // Обрабатываем подзаголовки, которые заканчиваются двоеточием
  html = html.replace(/^([А-Яа-яA-Za-z0-9\s]+:)$/gm, '<h4 class="font-semibold text-gray-800 mt-4 mb-2 text-base">$1</h4>');

  // Переводы строк - сначала двойные, потом одинарные
  html = html.replace(/\n\n+/g, '</p><p class="mb-3 text-gray-700 leading-relaxed">');
  html = html.replace(/\n/g, '<br>');

  // Оборачиваем в параграфы, если контент не начинается с HTML тега
  if (html && !html.match(/^\s*<[h1-6h]/)) {
    html = '<p class="mb-3 text-gray-700 leading-relaxed">' + html + '</p>';
  }

  // Очищаем лишние пробелы и переводы строк
  html = html.replace(/\s+/g, ' ').trim();
  
  // Финальная очистка - убираем пустые параграфы
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
  
  return html;
}

// Knowledge Base favorites helpers
const FAVORITES_STORAGE_KEY = 'kb_favorites_v1'

export type KnowledgeFavoriteId = string

export const getKnowledgeFavorites = (): Set<KnowledgeFavoriteId> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as KnowledgeFavoriteId[]
    return new Set(arr)
  } catch {
    return new Set()
  }
}

export const isKnowledgeFavorite = (id: KnowledgeFavoriteId): boolean => {
  return getKnowledgeFavorites().has(id)
}

export const toggleKnowledgeFavorite = (id: KnowledgeFavoriteId): boolean => {
  if (typeof window === 'undefined') return false
  const set = getKnowledgeFavorites()
  if (set.has(id)) set.delete(id)
  else set.add(id)
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(set)))
    // Notify listeners in this tab
    try {
      window.dispatchEvent(new CustomEvent('kb:favorites-changed', { detail: { id, value: set.has(id) } }))
    } catch {}
  } catch {}
  return set.has(id)
}

export const setKnowledgeFavorite = (id: KnowledgeFavoriteId, value: boolean) => {
  if (typeof window === 'undefined') return
  const set = getKnowledgeFavorites()
  if (value) set.add(id)
  else set.delete(id)
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(set)))
    try {
      window.dispatchEvent(new CustomEvent('kb:favorites-changed', { detail: { id, value } }))
    } catch {}
  } catch {}
}

export const clearKnowledgeFavorites = () => {
  if (typeof window === 'undefined') return
  try { window.localStorage.removeItem(FAVORITES_STORAGE_KEY) } catch {}
}