import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue2';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@bksLogger': path.resolve(__dirname, './src/lib/logger.ts'),
    },
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json']
  },

  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to the backend server during development
      '/api': {
        target: process.env.VUE_APP_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/ws': {
        target: (process.env.VUE_APP_API_URL || 'http://localhost:3000').replace(/^http/, 'ws'),
        ws: true
      }
    }
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vuex', 'axios'],
        }
      }
    }
  },

  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
      VUE_APP_API_URL: JSON.stringify(process.env.VUE_APP_API_URL || 'http://localhost:3000')
    }
  }
});
