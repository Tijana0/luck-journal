import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// On GitHub Pages the site lives under /<repo-name>/.
// The deploy workflow sets BASE_PATH automatically; locally it is just "/".
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
})
