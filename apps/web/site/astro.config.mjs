import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: 'https://qristifier.pages.dev',
  output: 'static',
  vite: { plugins: [tailwindcss()] },
})
