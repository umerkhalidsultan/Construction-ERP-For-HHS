import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const repoRoot = fileURLToPath(new URL('../..', import.meta.url));
  const rootEnv = loadEnv(mode, repoRoot, '');
  const supabaseUrl = rootEnv.VITE_SUPABASE_URL || rootEnv.SUPABASE_URL || '';
  const supabaseAnonKey =
    rootEnv.VITE_SUPABASE_ANON_KEY || rootEnv.SUPABASE_ANON_KEY || '';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '@supabase/supabase-js': fileURLToPath(
          new URL('../../node_modules/@supabase/supabase-js', import.meta.url),
        ),
      },
    },
    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
