import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface VersionInfo {
  commitHash: string | null;
  buildTime: string | null;
  shortHash: string | null;
  commitTime?: string | null;
}

// Глобальные переменные, инжектированные Vite
declare global {
  const __COMMIT_HASH__: string;
  const __SHORT_HASH__: string;
  const __COMMIT_TIME__: string;
  const __BUILD_TIME__: string;
}

export const useVersion = (): VersionInfo => {
  const [versionInfo, setVersionInfo] = useState<VersionInfo>({
    commitHash: null,
    buildTime: null,
    shortHash: null,
    commitTime: null
  });

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        // Сначала пытаемся получить версию из API (для продакшена)
        const response = await fetch('/api/version');
        if (response.ok) {
          const data = await response.json();
          setVersionInfo(data);
          return;
        }
      } catch (error) {
        logger.info('API version not available, using build-time version');
      }

      // Fallback на версию, инжектированную во время сборки
      try {
        setVersionInfo({
          commitHash: typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'unknown',
          shortHash: typeof __SHORT_HASH__ !== 'undefined' ? __SHORT_HASH__ : 'unknown',
          buildTime: typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'unknown',
          commitTime: typeof __COMMIT_TIME__ !== 'undefined' ? __COMMIT_TIME__ : 'unknown'
        });
      } catch (error) {
        logger.error('Failed to get version info:', error);
        setVersionInfo({
          commitHash: 'unknown',
          shortHash: 'unknown',
          buildTime: 'unknown',
          commitTime: 'unknown'
        });
      }
    };

    fetchVersion();
  }, []);

  return versionInfo;
}; 