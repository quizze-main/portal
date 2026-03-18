import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Toaster } from "@/components/ui/sonner";

// PWA Detection and Telegram WebView handling
function handlePWAInTelegram() {
  const isTelegramWebView = window.Telegram?.WebApp !== undefined;
  const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  
  console.log('🔍 Environment Check:');
  console.log('- Is Telegram WebView:', isTelegramWebView);
  console.log('- Is Standalone PWA:', isStandalone);
  console.log('- User Agent:', navigator.userAgent);
}

// Инициализируем Telegram WebApp если доступно
if (window.Telegram?.WebApp) {
  window.Telegram.WebApp.ready();
  // Отключаем вертикальные свайпы, чтобы сворачивание было только по шапке
  try {
    window.Telegram.WebApp.disableVerticalSwipes?.();
  } catch (err) {
    console.warn('disableVerticalSwipes is not available in this environment', err);
  }
  window.Telegram.WebApp.expand();
  console.log('✅ Telegram WebApp initialized');
}


// Запускаем PWA логику
handlePWAInTelegram();

// Microsoft Clarity был удалён, оставлена только Яндекс.Метрика

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Toaster />
  </React.StrictMode>,
);
