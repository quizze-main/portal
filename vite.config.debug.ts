import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { readFileSync } from "fs";

// Читаем информацию о версии
let versionInfo = {
  commitHash: 'unknown',
  shortHash: 'unknown',
  commitTime: 'unknown',
  buildTime: new Date().toISOString()
};

try {
  const versionPath = path.resolve(__dirname, 'src/version.json');
  versionInfo = JSON.parse(readFileSync(versionPath, 'utf8'));
} catch (error) {
  console.warn('Could not read version.json, using fallback values');
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.PORT || '3000';

  return {
  mode: 'development',
  server: {
    host: "::",
    port: 5175, // Используем другой порт для Vite dev server
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3010',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: false,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
    minify: false, // Отключаем минификацию для debug
    rollupOptions: {
      output: {
        // Разбиваем на чанки для лучшей отладки
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          utils: ['date-fns', 'clsx', 'class-variance-authority'],
        }
      }
    }
  },
  esbuild: {
    sourcemap: true,
  },
  plugins: [
    react(),
    {
      name: 'sw-build-time',
      generateBundle() {
        // Обрабатываем Service Worker для замены BUILD_TIME
        const swContent = readFileSync(path.resolve(__dirname, 'public/sw.js'), 'utf8')
          .replace('__BUILD_TIME__', versionInfo.buildTime);
        
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: swContent
        });
      }
    }
  ],
  optimizeDeps: {
    include: [
      '@blocknote/core',
      '@blocknote/react',
      '@blocknote/shadcn',
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: 'public',
  define: {
    // Инжектируем переменные версии в приложение
    __COMMIT_HASH__: JSON.stringify(versionInfo.commitHash),
    __SHORT_HASH__: JSON.stringify(versionInfo.shortHash),
    __COMMIT_TIME__: JSON.stringify(versionInfo.commitTime),
    __BUILD_TIME__: JSON.stringify(versionInfo.buildTime),
  },
};
});