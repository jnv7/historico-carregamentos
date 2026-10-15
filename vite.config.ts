/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { buildChangelog, parseGitLog, readGitLog, toMarkdown } from './scripts/changelog.mjs'

/** Builds the changelog from git: `virtual:changelog` for the popup and CHANGELOG.md in the build. */
function changelogPlugin(): Plugin {
  const VIRTUAL_ID = 'virtual:changelog'
  const RESOLVED_ID = `\0${VIRTUAL_ID}`
  const commits = parseGitLog(readGitLog(process.cwd()) ?? '')
  return {
    name: 'changelog',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
    },
    load(id) {
      if (id === RESOLVED_ID) return `export default ${JSON.stringify(buildChangelog(commits))}`
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'CHANGELOG.md', source: toMarkdown(commits) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/historico-carregamentos/',
  define: {
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    react(),
    changelogPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.svg'],
      manifest: {
        name: 'Histórico de Carregamentos',
        short_name: 'Carregamentos',
        description: 'Diário de carregamentos elétricos do carro',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/historico-carregamentos/',
        scope: '/historico-carregamentos/',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    pool: 'vmThreads',
  },
})
