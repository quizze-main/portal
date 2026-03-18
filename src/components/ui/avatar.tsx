import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full transition-all duration-300 animate-fade-in-avatar hover:shadow-lg hover:ring-2 hover:ring-blue-300/40 hover:scale-105",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full object-cover object-center transition-all duration-300", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted transition-colors duration-300",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Кастомный компонент для аватаров сотрудников
interface EmployeeAvatarProps {
  name: string;
  image?: string;
  className?: string;
  fallbackColor?: 'blue' | 'green' | 'purple' | 'amber' | 'red' | 'gray';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  baseUrl?: string;
}

const EmployeeAvatar = React.forwardRef<
  HTMLDivElement,
  EmployeeAvatarProps
>(({ name, image, className, fallbackColor = 'blue', size = 'md', baseUrl }, ref) => {
  // Функция для получения инициалов
  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Размеры аватара
  const sizeClasses = {
    xs: 'h-6 w-6 text-xs', // 24x24px
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base', 
    lg: 'h-16 w-16 text-lg'
  } as const;

  // Ensure provided size key exists, fallback to "md"
  const sizeKey = (size in sizeClasses ? size : 'md') as keyof typeof sizeClasses;

  // Цвета fallback
  const colorClasses = {
    blue: 'bg-blue-500 dark:bg-blue-600',
    green: 'bg-green-500 dark:bg-green-600',
    purple: 'bg-purple-500 dark:bg-purple-600',
    amber: 'bg-amber-500 dark:bg-amber-600',
    red: 'bg-red-500 dark:bg-red-600',
    gray: 'bg-gray-500 dark:bg-gray-600'
  };

  const resolvedBaseUrl = (() => {
    if (baseUrl) return baseUrl;
    // Vite injects env into import.meta.env
    const fromEnv = (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FRAPPE_BASE_URL : undefined) || '';
    return fromEnv || 'https://loovtest.erpnext.com';
  })();

  // Формируем полный URL для изображения если оно есть
  const imageUrl = (() => {
    if (!image) return undefined;
    const raw = String(image).trim();
    if (!raw) return undefined;
    // already absolute (or data url)
    if (/^https?:\/\//i.test(raw) || /^data:/i.test(raw)) return encodeURI(raw);
    // internal api proxy URLs should be used as-is
    if (raw.startsWith('/api/')) return raw;
    if (/^blob:/i.test(raw)) return raw;
    const normalizedPath = raw.startsWith('/') ? raw : `/${raw}`;
    return encodeURI(`${resolvedBaseUrl}${normalizedPath}`);
  })();

  return (
    <Avatar 
      ref={ref}
      className={cn(
        sizeClasses[sizeKey],
        "border-2 border-white dark:border-gray-200 shadow-sm transition-all duration-300 animate-fade-in-avatar hover:shadow-lg hover:ring-2 hover:ring-blue-300/40 hover:scale-105",
        className
      )}
    >
      {imageUrl && (
        <AvatarImage 
          src={imageUrl} 
          alt={name}
          onError={(e) => {
            logger.error(`Ошибка загрузки изображения для ${name}:`, imageUrl);
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <AvatarFallback 
        className={cn(
          colorClasses[fallbackColor],
          "text-white font-semibold transition-colors duration-300"
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
});

EmployeeAvatar.displayName = "EmployeeAvatar";

// Fade-in анимация для аватаров
if (typeof window !== 'undefined' && !document.head.querySelector('style[data-avatar-fade]')) {
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes fadeInAvatar {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in-avatar { animation: fadeInAvatar 0.4s cubic-bezier(.4,0,.2,1); }
  `;
  style.setAttribute('data-avatar-fade', '');
  document.head.appendChild(style);
}

export { Avatar, AvatarImage, AvatarFallback, EmployeeAvatar }
