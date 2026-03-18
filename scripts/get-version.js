import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { join } from 'path';

try {
  // Получаем полный хеш коммита
  const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  
  // Получаем короткий хеш (7 символов)
  const shortHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  
  // Получаем время коммита
  const commitTime = execSync('git log -1 --format=%cd --date=iso', { encoding: 'utf8' }).trim();
  
  // Текущее время сборки
  const buildTime = new Date().toISOString();
  
  // Создаем объект с версией
  const versionInfo = {
    commitHash,
    shortHash,
    commitTime,
    buildTime
  };
  
  // Записываем в файл для использования в Vite
  const versionPath = join(process.cwd(), 'src', 'version.json');
  writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));
  
  // Устанавливаем переменные окружения
  process.env.COMMIT_HASH = commitHash;
  process.env.SHORT_HASH = shortHash;
  process.env.COMMIT_TIME = commitTime;
  process.env.BUILD_TIME = buildTime;
  
  console.log('✅ Version info generated:');
  console.log(`   Commit: ${shortHash}`);
  console.log(`   Build time: ${buildTime}`);
  
} catch (error) {
  console.warn('⚠️  Could not get git version info, using fallback values');
  
  const fallbackInfo = {
    commitHash: 'unknown',
    shortHash: 'unknown',
    commitTime: 'unknown',
    buildTime: new Date().toISOString()
  };
  
  const versionPath = join(process.cwd(), 'src', 'version.json');
  writeFileSync(versionPath, JSON.stringify(fallbackInfo, null, 2));
  
  process.env.COMMIT_HASH = fallbackInfo.commitHash;
  process.env.SHORT_HASH = fallbackInfo.shortHash;
  process.env.COMMIT_TIME = fallbackInfo.commitTime;
  process.env.BUILD_TIME = fallbackInfo.buildTime;
} 