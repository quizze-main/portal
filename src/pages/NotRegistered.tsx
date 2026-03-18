import { Button } from "@/components/ui/button";
import { AlertCircle } from 'lucide-react';

interface NotRegisteredProps {
  onEnterDemoMode: () => void;
}

export const NotRegistered = ({ onEnterDemoMode }: NotRegisteredProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg max-w-md w-full">
        <AlertCircle size={48} className="text-orange-500 mx-auto mb-4" />
        <h1 className="page-title mb-3">Ты не зарегистрирован</h1>
        <p className="text-gray-600 mb-6">
          Твой Telegram аккаунт не найден в системе LoovIS. Для получения доступа, пожалуйста, обратись в поддержку.
        </p>
        <a 
          href="https://forms.yandex.ru/cloud/67499d00d04688ac041223f4/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors mb-4"
        >
          Перейти в поддержку
        </a>
        <p className="text-sm text-gray-500">или</p>
        <Button onClick={onEnterDemoMode} variant="link" className="text-blue-600">
          войдите в демо-режим
        </Button>
      </div>
    </div>
  );
}; 