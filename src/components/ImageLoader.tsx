import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/Spinner';
import { FullScreenImageModal } from './FullScreenImageModal';

interface ImageLoaderProps {
  attachmentId: string;
  alt?: string;
  width?: string;
  height?: string;
  className?: string;
  caption?: string;
}

// Глобальный кэш для изображений
const imageCache = new Map<string, string>();
const loadingPromises = new Map<string, Promise<string>>();

export const ImageLoader: React.FC<ImageLoaderProps> = ({
  attachmentId,
  alt = 'Изображение',
  width,
  height,
  className = '',
  caption
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isViewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Проверяем кэш
        if (imageCache.has(attachmentId)) {
          const cachedUrl = imageCache.get(attachmentId)!;
          setImageUrl(cachedUrl);
          setIsLoading(false);
          return;
        }

        // Проверяем, не загружается ли уже это изображение
        if (loadingPromises.has(attachmentId)) {
          const cachedUrl = await loadingPromises.get(attachmentId)!;
          setImageUrl(cachedUrl);
          setIsLoading(false);
          return;
        }

        // Создаем промис для загрузки
        const loadingPromise = (async () => {
          const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const response = await fetch(`${baseUrl}/api/outline/attachments/redirect?id=${attachmentId}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          
          // Сохраняем в кэш
          imageCache.set(attachmentId, blobUrl);
          loadingPromises.delete(attachmentId);
          
          return blobUrl;
        })();

        // Сохраняем промис загрузки
        loadingPromises.set(attachmentId, loadingPromise);
        
        const blobUrl = await loadingPromise;
        setImageUrl(blobUrl);
      } catch (err) {
        console.error('Ошибка загрузки изображения:', err);
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
        loadingPromises.delete(attachmentId);
      } finally {
        setIsLoading(false);
      }
    };

    if (attachmentId) {
      loadImage();
    }

    // Cleanup function - НЕ удаляем blob URL из кэша для переиспользования
    return () => {
      // URL остается в кэше для других компонентов
    };
  }, [attachmentId]);

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2 text-gray-600">
          <Spinner size="sm" />
          <span>Загрузка изображения...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center p-4 bg-red-100 rounded-lg ${className}`}>
        <div className="text-red-600 text-center">
          <p className="font-medium">Ошибка загрузки изображения</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center p-4 bg-gray-100 rounded-lg ${className}`}>
        <span className="text-gray-600">Изображение не найдено</span>
      </div>
    );
  }

  return (
    <div className="text-center">
      <img
        src={imageUrl}
        alt={alt}
        width={width}
        height={height}
        onClick={() => setViewerOpen(true)}
        className={`rounded-lg cursor-zoom-in ${className}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      {caption && (
        <div className="mt-2 text-sm text-gray-600 italic">
          {caption}
        </div>
      )}

      {/* Полноэкранный просмотр изображения */}
      {imageUrl && (
        <FullScreenImageModal
          open={isViewerOpen}
          onOpenChange={setViewerOpen}
          src={imageUrl}
          alt={alt}
        />
      )}
    </div>
  );
}; 