import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    chunkSizeWarningLimit: 550, // pdf-lib is ~520KB, can't be reduced
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['pdf-lib'],
          'vendor-ui': ['react-datepicker', 'date-fns', 'axios'],
        }
      }
    }
  }
})
