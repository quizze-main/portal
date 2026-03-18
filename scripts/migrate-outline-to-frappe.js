#!/usr/bin/env node

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Загружаем переменные окружения из .env.migrate если файл существует
const envPath = '.env.migrate';
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !value.startsWith('#')) {
        process.env[key] = value;
      }
    }
  });
  console.log('📋 Загружены переменные окружения из .env.migrate');
}

// Конфигурация из переменных окружения
const OUTLINE_BASE_URL = process.env.OUTLINE_BASE_URL || 'https://outline.loov.ru';
const OUTLINE_API_KEY = process.env.OUTLINE_API_KEY;
const FRAPPE_BASE_URL = process.env.FRAPPE_BASE_URL || 'https://loovtest.erpnext.com';
const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY || '2a06bb8d1c393a3';
const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET || '550343f86db2294';

console.log('🚀 Запуск миграции Wiki Pages из Outline во Frappe Wiki');
console.log(`📚 Outline URL: ${OUTLINE_BASE_URL}`);
console.log(`🏢 Frappe URL: ${FRAPPE_BASE_URL}`);

class OutlineToFrappeMigrator {
  constructor() {
    this.outlineHeaders = {
      'Authorization': `Bearer ${OUTLINE_API_KEY}`,
      'Content-Type': 'application/json',
    };
    
    this.frappeHeaders = {
      'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
      'Content-Type': 'application/json',
    };
  }

  // Получить ID документа из URL Outline
  extractDocumentId(outlineUrl) {
    // Поддерживаем разные форматы URL:
    // https://outline.loov.ru/doc/merchendajzing-s-uchetom-prioriteta-loov-hSBN3LQ9bq
    // https://outline.loov.ru/s/hSBN3LQ9bq
    const urlMatch = outlineUrl.match(/\/(?:doc\/[^\/]+-|s\/)([a-zA-Z0-9]+)$/);
    return urlMatch ? urlMatch[1] : null;
  }

  // Получить документ из Outline
  async getOutlineDocument(documentId) {
    try {
      console.log(`📖 Получение документа ${documentId} из Outline...`);
      
      const response = await fetch(`${OUTLINE_BASE_URL}/api/documents.info`, {
        method: 'POST',
        headers: this.outlineHeaders,
        body: JSON.stringify({ id: documentId })
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Получен документ: "${data.data.title}"`);
      
      return data.data;
    } catch (error) {
      console.error(`❌ Ошибка получения документа ${documentId}:`, error.message);
      throw error;
    }
  }

  // Получить содержимое документа в формате Markdown
  async getDocumentContent(documentId) {
    try {
      console.log(`📄 Получение содержимого документа ${documentId}...`);
      
      const response = await fetch(`${OUTLINE_BASE_URL}/api/documents.export`, {
        method: 'POST',
        headers: this.outlineHeaders,
        body: JSON.stringify({ id: documentId })
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      // Проверяем, JSON это или текст
      const contentType = response.headers.get('content-type') || '';
      let content;
      
      if (contentType.includes('application/json')) {
        // Если JSON, извлекаем из data.data
        const data = await response.json();
        content = data.data || data;
      } else {
        // Если текст, просто читаем
        content = await response.text();
      }
      
      // Заменяем \n на реальные переносы строк
      if (typeof content === 'string') {
        content = content.replace(/\\n/g, '\n');
      }
      
      console.log(`✅ Получено содержимое (${content.length} символов)`);
      
      return content;
    } catch (error) {
      console.error(`❌ Ошибка получения содержимого документа ${documentId}:`, error.message);
      throw error;
    }
  }

     // Проверить существует ли Wiki Page с таким названием во Frappe
   async checkArticleExists(title) {
     try {
       const filters = JSON.stringify([["title", "=", title]]);
       const fields = JSON.stringify(["name", "title"]);
       const url = `${FRAPPE_BASE_URL}/api/resource/Wiki Page?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent(fields)}`;
       
       const response = await fetch(url, {
         method: 'GET',
         headers: this.frappeHeaders,
       });

       if (!response.ok) {
         throw new Error(`Frappe API error: ${response.status} ${response.statusText}`);
       }

       const data = await response.json();
       return data.data && data.data.length > 0 ? data.data[0] : null;
     } catch (error) {
       console.error(`❌ Ошибка проверки существования Wiki Page:`, error.message);
       return null;
     }
   }

  // Извлечь все ссылки на изображения из контента
  extractImageUrls(content) {
    // Ищем все изображения в markdown формате ![alt](url) и HTML <img src="url">
    // Исключаем изображения-аттачменты (они обрабатываются отдельно)
    const markdownImages = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    const htmlImages = [...content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)];
    
    const images = [];
    
    // Обрабатываем markdown изображения
    markdownImages.forEach(match => {
      const fullMatch = match[0];
      let url = match[2];
      
      // Пропускаем аттачменты - они обрабатываются отдельно
      // Проверяем и в полном match и в URL (также проверяем сокращенную версию без outline)
      if (!fullMatch.includes('/api/outline/attachments.redirect') && 
          !fullMatch.includes('/api/attachments.redirect') && 
          !url.includes('/api/outline/attachments.redirect') && 
          !url.includes('/api/attachments.redirect')) {
        // Очищаем URL от параметров размера и лишних символов
        const cleanUrl = url.replace(/\s*=\d+x\d+.*$/, '').replace(/\s*["']\s*$/, '').trim();
        
        // Извлекаем размеры из параметров если есть
        const sizeMatch = url.match(/\s*=(\d+)x(\d+)/);
        
        const imageData = {
          type: 'markdown',
          full: match[0],
          alt: match[1],
          url: cleanUrl,
          width: sizeMatch ? sizeMatch[1] : null,
          height: sizeMatch ? sizeMatch[2] : null
        };
        
        if (sizeMatch) {
          console.log(`🖼️ Найдено изображение с размерами: ${cleanUrl} (${sizeMatch[1]}x${sizeMatch[2]})`);
        }
        
        images.push(imageData);
      }
    });
    
    // Обрабатываем HTML изображения
    htmlImages.forEach(match => {
      const imgTag = match[0];
      let url = match[1];
      
      // Пропускаем аттачменты - они обрабатываются отдельно
      // Проверяем и в полном tag и в URL (также проверяем сокращенную версию без outline)
      if (!imgTag.includes('/api/outline/attachments.redirect') && 
          !imgTag.includes('/api/attachments.redirect') && 
          !url.includes('/api/outline/attachments.redirect') && 
          !url.includes('/api/attachments.redirect')) {
        // Очищаем URL от параметров размера и лишних символов
        const cleanUrl = url.replace(/\s*=\d+x\d+.*$/, '').replace(/\s*["']\s*$/, '').trim();
        
        // Извлекаем alt, width, height
        const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
        const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
        const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
        // Также проверяем размеры в URL
        const sizeMatch = url.match(/\s*=(\d+)x(\d+)/);
        
        const imageData = {
          type: 'html',
          full: imgTag,
          alt: altMatch ? altMatch[1] : '',
          url: cleanUrl,
          width: widthMatch ? widthMatch[1] : (sizeMatch ? sizeMatch[1] : null),
          height: heightMatch ? heightMatch[1] : (sizeMatch ? sizeMatch[2] : null)
        };
        
        if (sizeMatch || widthMatch) {
          const w = imageData.width || 'авто';
          const h = imageData.height || 'авто';
          console.log(`🖼️ Найдено HTML изображение с размерами: ${cleanUrl} (${w}x${h})`);
        }
        
        images.push(imageData);
      }
    });
    
    console.log(`🖼️ Найдено ${images.length} изображений в статье (исключая аттачменты)`);
    return images;
  }

  // Извлечь все аттачменты из контента (по примеру MarkdownWithAttachments)
  extractAllAttachments(content) {
    const attachments = [];
    
    console.log(`🔍 Ищем аттачменты в контенте...`);
    console.log(`📝 Длина контента: ${content.length} символов`);
    
    // Сначала найдем все изображения вообще для отладки
    const allImages = [...content.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)];
    console.log(`🖼️ Всего найдено изображений: ${allImages.length}`);
    allImages.forEach((img, i) => {
      console.log(`  ${i+1}. ${img[0]}`);
    });
    
    // Ищем все ссылки на аттачменты формата [name](/api/outline/attachments.redirect?id=attachmentId) или /api/attachments.redirect
    const attachmentRegex = /\[([^\]]+)\]\(\/api\/(?:outline\/)?attachments\.redirect\?id=([^)]+)\)/g;
    let match;
    while ((match = attachmentRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const name = match[1];
      const idWithParams = match[2];
      
      console.log(`📎 Найден аттачмент-ссылка: ${fullMatch}`);
      
      // Очищаем ID от параметров размера и лишних символов
      const cleanId = idWithParams.replace(/\s*=\d+x\d+.*$/, '').replace(/\s*["']\s*$/, '').trim();
      
      attachments.push({
        type: 'link',
        fullMatch: fullMatch,
        name: name,
        id: cleanId,
        originalId: idWithParams
      });
    }
    
    // Ищем все изображения-аттачменты формата ![alt](/api/outline/attachments.redirect?id=attachmentId)
    const imageAttachmentRegex = /!\[([^\]]*)\]\(\/api\/(?:outline\/)?attachments\.redirect\?id=([^)]+)\)/g;
    while ((match = imageAttachmentRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const alt = match[1] || 'Изображение';
      const idWithParams = match[2];
      
      console.log(`🖼️ Найден аттачмент-изображение: ${fullMatch}`);
      
      // Очищаем ID от параметров размера и лишних символов
      const cleanId = idWithParams.replace(/\s*=\d+x\d+.*$/, '').replace(/\s*["']\s*$/, '').trim();
      
      // Извлекаем размеры если есть
      const sizeMatch = idWithParams.match(/\s*=(\d+)x(\d+)/);
      
      attachments.push({
        type: 'image',
        fullMatch: fullMatch,
        name: alt,
        id: cleanId,
        originalId: idWithParams,
        width: sizeMatch ? sizeMatch[1] : null,
        height: sizeMatch ? sizeMatch[2] : null
      });
    }
    
    console.log(`📎 Найдено ${attachments.length} аттачментов в статье`);
    return attachments;
  }

  // Получить информацию об аттачменте из Outline (по примеру outlineClient)
  async getOutlineAttachment(attachmentId) {
    try {
      console.log(`📎 Получение информации об аттачменте ${attachmentId}...`);
      
      const url = `${OUTLINE_BASE_URL}/api/outline/attachments/redirect`;
      const body = JSON.stringify({ id: attachmentId });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: this.outlineHeaders,
        body: body
      });

      if (!response.ok) {
        throw new Error(`Outline API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Получен аттачмент: "${data.data.name}" (${data.data.contentType})`);
      
      return data.data;
    } catch (error) {
      console.error(`❌ Ошибка получения аттачмента ${attachmentId}:`, error.message);
      throw error;
    }
  }

  // Скачать аттачмент по URL
  async downloadAttachment(attachmentUrl) {
    try {
      // Формируем полный URL если это относительный путь
      let fullUrl = attachmentUrl;
      if (attachmentUrl.startsWith('/api/')) {
        fullUrl = `${OUTLINE_BASE_URL}${attachmentUrl}`;
      }
      
      console.log(`⬇️ Загрузка аттачмента: ${fullUrl}`);
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      
      console.log(`✅ Аттачмент загружен (${buffer.byteLength} байт, ${contentType})`);
      
      return {
        buffer: Buffer.from(buffer),
        contentType: contentType,
        size: buffer.byteLength
      };
    } catch (error) {
      console.error(`❌ Ошибка загрузки аттачмента ${attachmentUrl}:`, error.message);
      throw error;
    }
  }

  // Скачать изображение
  async downloadImage(imageUrl) {
    try {
      // Формируем полный URL если это относительный путь
      let fullUrl = imageUrl;
      if (imageUrl.startsWith('/api/')) {
        fullUrl = `${OUTLINE_BASE_URL}${imageUrl}`;
      }
      
      console.log(`⬇️ Загрузка изображения: ${fullUrl}`);
      
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      
      console.log(`✅ Изображение загружено (${buffer.byteLength} байт, ${contentType})`);
      
      return {
        buffer: Buffer.from(buffer),
        contentType: contentType,
        size: buffer.byteLength
      };
    } catch (error) {
      console.error(`❌ Ошибка загрузки изображения ${imageUrl}:`, error.message);
      throw error;
    }
  }

  // Загрузить файл во Frappe
  async uploadFileToFrappe(fileBuffer, fileName, contentType) {
    try {
      console.log(`📤 Загрузка файла во Frappe: ${fileName}`);
      
      // Создаем FormData
      const FormData = (await import('form-data')).default;
      const form = new FormData();
      
      form.append('file', fileBuffer, {
        filename: fileName,
        contentType: contentType
      });
      form.append('is_private', '0'); // Публичный файл
      form.append('folder', 'Home/Attachments');
      
      const response = await fetch(`${FRAPPE_BASE_URL}/api/method/upload_file`, {
        method: 'POST',
        headers: {
          'Authorization': `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`,
          ...form.getHeaders()
        },
        body: form
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Frappe upload error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Файл загружен во Frappe: ${data.message.file_url}`);
      
      return data.message;
    } catch (error) {
      console.error(`❌ Ошибка загрузки файла во Frappe:`, error.message);
      throw error;
    }
  }

  // Транслитерация для URL
  transliterate(text) {
    const translitMap = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
      'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
      'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
      'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
      'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
      'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
    };
    
    return text
      .split('')
      .map(char => translitMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // Создать Wiki Page в Frappe
  async createFrappeArticle(title, content, attachments = []) {
    try {
      console.log(`📝 Создание Wiki Page во Frappe: "${title}"`);
      
      const route = `standarts/${this.transliterate(title)}`;
      console.log(`🌐 URL будет: ${route}`);
      
      const articleData = {
        doctype: 'Wiki Page',
        title: title,
        content: content,
        route: route,
        published: 1,
        allow_guest: 1
      };

      // Добавляем аттачменты если есть
      if (attachments.length > 0) {
        articleData.attachments = attachments.map(attachment => ({
          file_name: attachment.fileName,
          file_url: attachment.file_url,
          is_private: 0
        }));
        console.log(`📎 Добавлено ${attachments.length} аттачментов к статье`);
      }

      const response = await fetch(`${FRAPPE_BASE_URL}/api/resource/Wiki Page`, {
        method: 'POST',
        headers: this.frappeHeaders,
        body: JSON.stringify(articleData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Frappe API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`✅ Wiki Page создана во Frappe: ${data.data.name}`);
      
      return data.data;
    } catch (error) {
      console.error(`❌ Ошибка создания Wiki Page во Frappe:`, error.message);
      throw error;
    }
  }

  // Обработать одну статью
  async migrateArticle(outlineUrl) {
    console.log(`\n🔄 Начинаю миграцию статьи: ${outlineUrl}`);
    
    try {
      // Извлекаем ID документа
      const documentId = this.extractDocumentId(outlineUrl);
      if (!documentId) {
        throw new Error('Не удалось извлечь ID документа из URL');
      }

      // Получаем информацию о документе
      const document = await this.getOutlineDocument(documentId);
      
      // Проверяем, существует ли уже Wiki Page с таким названием
      const existingArticle = await this.checkArticleExists(document.title);
      if (existingArticle) {
        console.log(`⚠️ Wiki Page "${document.title}" уже существует во Frappe, пропускаем`);
        return { skipped: true, reason: 'already_exists', title: document.title };
      }

      // Получаем содержимое документа
      let content = await this.getDocumentContent(documentId);
      
      // Дополнительная обработка переносов строк если нужно
      content = content.replace(/\\n/g, '\n');
      
      // Извлекаем все изображения и аттачменты
      console.log(`🔍 Анализируем контент статьи...`);
      const images = this.extractImageUrls(content);
      const attachments = this.extractAllAttachments(content);
      
      console.log(`📊 Статистика контента: ${images.length} обычных изображений, ${attachments.length} аттачментов`);
      
      // Отладочная информация
      if (images.length > 0) {
        console.log(`🖼️ Найденные обычные изображения:`);
        images.forEach((img, i) => console.log(`  ${i+1}. ${img.url} (${img.type})`));
      }
      
      if (attachments.length > 0) {
        console.log(`📎 Найденные аттачменты:`);
        attachments.forEach((att, i) => console.log(`  ${i+1}. ${att.id} (${att.type}) - ${att.name}`));
      }
      
      const uploadedAttachments = [];
      
      // Обрабатываем каждое изображение
      for (const image of images) {
        try {
          // Скачиваем изображение
          const imageData = await this.downloadImage(image.url);
          
          // Генерируем имя файла
          const urlParts = new URL(image.url);
          const originalFileName = path.basename(urlParts.pathname) || 'image.jpg';
          const fileName = `${Date.now()}_${originalFileName}`;
          
          // Загружаем во Frappe
          const uploadResult = await this.uploadFileToFrappe(
            imageData.buffer, 
            fileName, 
            imageData.contentType
          );
          
          // Формируем новый HTML тег изображения с оригинальными размерами
          const width = image.width || '100';
          const height = image.height || '100';
          const alt = image.alt || '';
          const newImageTag = `<img src="${uploadResult.file_url}" alt="${alt}" width="${width}" height="${height}"><br>`;
          
          // Заменяем в контенте
          content = content.replace(image.full, newImageTag);
          
          console.log(`✅ Изображение обработано: ${image.url} -> ${uploadResult.file_url} (размер: ${width}x${height})`);
          
        } catch (imageError) {
          console.error(`❌ Ошибка обработки изображения ${image.url}:`, imageError.message);
          // Продолжаем обработку других изображений
        }
      }
      
      // Обрабатываем каждый аттачмент
      for (const attachment of attachments) {
        try {
          // Получаем информацию об аттачменте из Outline
          const attachmentInfo = await this.getOutlineAttachment(attachment.id);
          
          if (attachmentInfo.url) {
            // Скачиваем аттачмент
            const attachmentData = await this.downloadAttachment(attachmentInfo.url);
            
            // Генерируем имя файла
            const fileName = attachmentInfo.name || `attachment_${Date.now()}`;
            
            // Загружаем во Frappe
            const uploadResult = await this.uploadFileToFrappe(
              attachmentData.buffer, 
              fileName, 
              attachmentData.contentType
            );
            
            // Сохраняем информацию о загруженном аттачменте
            uploadedAttachments.push({
              fileName: fileName,
              file_url: uploadResult.file_url,
              originalName: attachment.name
            });
            
            // Формируем новый тег в зависимости от типа аттачмента
            let newAttachmentTag;
            if (attachment.type === 'image') {
              // Если это изображение-аттачмент, создаем img тег с размерами из оригинала
              const width = attachment.width || '100';
              const height = attachment.height || '100';
              newAttachmentTag = `<img src="${uploadResult.file_url}" alt="${attachment.name}" width="${width}" height="${height}"><br>`;
            } else {
              // Если это файл-аттачмент, создаем ссылку для скачивания
              newAttachmentTag = `<a href="${uploadResult.file_url}" target="_blank" class="attachment-link">📎 ${attachment.name}</a>`;
            }
            
            // Заменяем в контенте
            content = content.replace(attachment.fullMatch, newAttachmentTag);
            
            const sizeInfo = attachment.type === 'image' && attachment.width && attachment.height 
              ? ` (размер: ${attachment.width}x${attachment.height})` 
              : '';
            console.log(`✅ Аттачмент обработан: ${attachment.name} -> ${uploadResult.file_url}${sizeInfo}`);
          } else {
            console.warn(`⚠️ У аттачмента ${attachment.id} нет URL, пропускаем`);
          }
          
        } catch (attachmentError) {
          console.error(`❌ Ошибка обработки аттачмента ${attachment.name}:`, attachmentError.message);
          // Продолжаем обработку других аттачментов
        }
      }
      
      // Создаем статью во Frappe с аттачментами
      const article = await this.createFrappeArticle(document.title, content, uploadedAttachments);
      
      console.log(`🎉 Миграция завершена успешно: "${document.title}"`);
      return { 
        success: true, 
        title: document.title, 
        articleName: article.name,
        imagesProcessed: images.length,
        attachmentsProcessed: attachments.length
      };
      
    } catch (error) {
      console.error(`❌ Ошибка миграции статьи:`, error.message);
      return { 
        success: false, 
        error: error.message,
        url: outlineUrl
      };
    }
  }

  // Мигрировать список Wiki Pages
  async migrateArticles(outlineUrls) {
    console.log(`\n🚀 Начинаю миграцию ${outlineUrls.length} Wiki Pages\n`);
    
    const results = [];
    
    for (let i = 0; i < outlineUrls.length; i++) {
      const url = outlineUrls[i].trim();
      if (!url) continue;
      
      console.log(`\n📊 Прогресс: ${i + 1}/${outlineUrls.length}`);
      const result = await this.migrateArticle(url);
      results.push(result);
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
         // Выводим итоговую статистику
     console.log('\n📈 ИТОГОВАЯ СТАТИСТИКА:');
     console.log('==================================================');
    
    const successful = results.filter(r => r.success);
    const skipped = results.filter(r => r.skipped);
    const failed = results.filter(r => !r.success && !r.skipped);
    
    console.log(`✅ Успешно мигрированы: ${successful.length}`);
    console.log(`⚠️ Пропущены (уже существуют): ${skipped.length}`);
    console.log(`❌ Ошибки: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 Успешно мигрированные статьи:');
      successful.forEach(r => console.log(`  - ${r.title} (${r.imagesProcessed} изображений, ${r.attachmentsProcessed} аттачментов)`));
    }
    
    if (skipped.length > 0) {
      console.log('\n⚠️ Пропущенные статьи:');
      skipped.forEach(r => console.log(`  - ${r.title}`));
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Статьи с ошибками:');
      failed.forEach(r => console.log(`  - ${r.url}: ${r.error}`));
    }
    
    return results;
  }
}

// Основная функция
async function main() {
  try {
    // Проверяем наличие необходимых переменных окружения
    if (!OUTLINE_API_KEY) {
      console.error('❌ OUTLINE_API_KEY не установлен');
      process.exit(1);
    }
    
    if (!FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
      console.error('❌ FRAPPE_API_KEY или FRAPPE_API_SECRET не установлены');
      process.exit(1);
    }
    
    // Получаем список URL из переменной окружения или файла
    let outlineUrls = [];
    
    // Сначала проверяем переменную окружения MIGRATION_URLS
    if (process.env.MIGRATION_URLS) {
      outlineUrls = process.env.MIGRATION_URLS.split(',').map(url => url.trim()).filter(url => url);
      console.log(`📋 Загружены URL из переменной окружения: ${outlineUrls.length} Wiki Pages`);
    }
    // Если URLs не заданы в ENV, пробуем загрузить из файла
    else {
      const urlsFilePath = process.env.MIGRATION_URLS_FILE || 'migration-input/urls.txt';
      
      if (fs.existsSync(urlsFilePath)) {
        const fileContent = fs.readFileSync(urlsFilePath, 'utf8');
        outlineUrls = fileContent.split('\n').map(line => line.trim()).filter(line => line);
        console.log(`📄 Загружены URL из файла ${urlsFilePath}: ${outlineUrls.length} Wiki Pages`);
      } else {
        console.error(`❌ Не найдены URL для миграции:`);
        console.error(`   - Переменная окружения MIGRATION_URLS не задана`);
        console.error(`   - Файл ${urlsFilePath} не найден`);
        console.log('');
        console.log('🔧 Настройте один из способов:');
        console.log('  1. Установите MIGRATION_URLS="url1,url2,url3"');
        console.log('  2. Создайте файл с URL (по умолчанию migration-input/urls.txt)');
        console.log('  3. Укажите другой файл через MIGRATION_URLS_FILE');
        process.exit(1);
      }
    }
    
    if (outlineUrls.length === 0) {
      console.error('❌ Не найдено URL для миграции');
      process.exit(1);
    }
    
    // Создаем мигратор и запускаем процесс
    const migrator = new OutlineToFrappeMigrator();
    await migrator.migrateArticles(outlineUrls);
    
    console.log('\n🏁 Миграция завершена!');
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
  }
}

// Запускаем скрипт
main();

export default OutlineToFrappeMigrator;