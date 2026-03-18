import crypto from 'crypto';

// Генерируем случайный API ключ
const apiKey = crypto.randomBytes(32).toString('hex');

console.log('🔑 Сгенерированный API ключ:');
console.log(apiKey);
console.log('\n📝 Добавьте этот ключ в ваш .env файл:');
console.log(`API_SECRET_KEY=${apiKey}`);
console.log(`VITE_API_SECRET_KEY=${apiKey}`);
console.log('\n⚠️  ВАЖНО:');
console.log('   - Храните этот ключ в безопасности');
console.log('   - НЕ коммитьте .env файл в репозиторий');
console.log('   - .env файл уже добавлен в .gitignore');
console.log('   - Используйте разные ключи для разных окружений'); 