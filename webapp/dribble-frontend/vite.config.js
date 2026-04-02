import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Keep SPA routes handled by Vite/React. Only backend actions and APIs are proxied.
      '/api':                'http://127.0.0.1:5000',
      '/logout':             'http://127.0.0.1:5000',
      '/generate_questions': 'http://127.0.0.1:5000',
      '/submit_answer':      'http://127.0.0.1:5000',
      '/view_result':        'http://127.0.0.1:5000',
      '/download':           'http://127.0.0.1:5000',
    }
  }
})