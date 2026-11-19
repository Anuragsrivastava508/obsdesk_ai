import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const { VITE_API_BASE_URL: apiBaseUrl = '' } = loadEnv(mode, process.cwd(), 'VITE_');
  if (mode === 'production') {
    if (!apiBaseUrl.trim()) {
      throw new Error('VITE_API_BASE_URL is required for production builds.');
    }

    let apiUrl;
    try {
      apiUrl = new URL(apiBaseUrl);
    } catch {
      throw new Error('VITE_API_BASE_URL must be an absolute HTTPS URL ending in /api/v1.');
    }

    if (
      apiUrl.protocol !== 'https:'
      || apiUrl.username
      || apiUrl.password
      || apiUrl.search
      || apiUrl.hash
      || ['localhost', '127.0.0.1', '[::1]'].includes(apiUrl.hostname.toLowerCase())
      || !apiUrl.pathname.replace(/\/+$/, '').endsWith('/api/v1')
    ) {
      throw new Error('VITE_API_BASE_URL must be an absolute HTTPS URL ending in /api/v1.');
    }
  }

  return {
    plugins: [react()],
  };
});
