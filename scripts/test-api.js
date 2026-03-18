import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

const BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_SECRET_KEY || process.env.VITE_API_SECRET_KEY;

if (!API_KEY) {
  console.log('❌ API_SECRET_KEY не задан в переменных окружения');
  console.log('💡 Запустите: npm run generate-api-key');
  process.exit(1);
}

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
  'Origin': 'http://localhost:3000'
};

async function testEndpoint(name, url, method = 'GET', body = null) {
  try {
    console.log(`🧪 Тестируем ${name}...`);
    
    const options = {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) })
    };
    
    const response = await fetch(url, options);
    const data = await response.text();
    
    console.log(`   📊 Статус: ${response.status}`);
    console.log(`   📄 Ответ: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
    
    if (response.ok) {
      console.log(`   ✅ ${name} - УСПЕХ`);
    } else {
      console.log(`   ❌ ${name} - ОШИБКА`);
    }
    
    console.log('');
    return response.ok;
  } catch (error) {
    console.log(`   💥 ${name} - ИСКЛЮЧЕНИЕ: ${error.message}`);
    console.log('');
    return false;
  }
}

async function runTests() {
  console.log('🚀 Запуск тестов API...');
  console.log(`🔗 Базовый URL: ${BASE_URL}`);
  console.log(`🔑 API ключ: ${API_KEY.substring(0, 8)}...`);
  console.log('');
  
  const tests = [
    {
      name: 'Health Check',
      url: `${BASE_URL}/health`,
      method: 'GET'
    },
    {
      name: 'Outline Documents (без API ключа)',
      url: `${BASE_URL}/api/outline/documents`,
      method: 'GET',
      headers: { 'Content-Type': 'application/json' } // Без авторизации
    },
    {
      name: 'Outline Documents (с API ключом)',
      url: `${BASE_URL}/api/outline/documents`,
      method: 'GET'
    },
    {
      name: 'Outline Search',
      url: `${BASE_URL}/api/outline/search`,
      method: 'POST',
      body: { query: 'test' }
    },
    {
      name: 'Outline Attachments',
      url: `${BASE_URL}/api/outline/attachments/redirect`,
      method: 'POST',
      body: { id: 'test-attachment-id' }
    },
    {
      name: 'Version Info',
      url: `${BASE_URL}/api/version`,
      method: 'GET'
    }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.url, test.method, test.body);
    if (success) passed++;
  }
  
  console.log(`📊 Результаты: ${passed}/${total} тестов прошли успешно`);
  
  if (passed === total) {
    console.log('🎉 Все тесты прошли успешно!');
  } else {
    console.log('⚠️  Некоторые тесты не прошли. Проверьте конфигурацию.');
  }
}

runTests().catch(console.error); 