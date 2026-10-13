import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// HTTPS aktif secara default: wajib buat GPS + install PWA di HP lewat WiFi.
// Matikan dengan AYO_HTTPS=0 kalau mau HTTP biasa.
const useHttps = process.env.AYO_HTTPS !== '0'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
})
