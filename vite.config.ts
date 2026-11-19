import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Guard against uncatchable AssertionError in Node.js 24 undici TLS socket closure (assert(!this.paused))
if (typeof process !== 'undefined' && process.on) {
  process.on('uncaughtException', (err: unknown) => {
    const error = err as { code?: string; message?: string }
    if (error?.code === 'ERR_ASSERTION' && String(error?.message || '').includes('!this.paused')) {
      return
    }
    console.error('Uncaught server exception:', err)
  })
}

import { tvbVaultBridge } from './src/vault-bridge/plugin'
import { tvbTedBridge } from './src/live-source/ted-bridge/plugin'
import { tvbUsaSpendingBridge } from './src/live-source/usaspending-bridge/plugin'
import { tvbGrantsGovBridge } from './src/live-source/grantsgov-bridge/plugin'
import { tvbEuSediaBridge } from './src/live-source/eu-sedia-bridge/plugin'
import { tvbFtsBridge } from './src/live-source/fts-bridge/plugin'
import { tvbGleifBridge } from './src/live-source/gleif-bridge/plugin'
import { tvbSecBridge } from './src/live-source/sec-bridge/plugin'
import { tvbGemBridge } from './src/live-source/gem-bridge/plugin'
import { tvbIndiaGrantsBridge } from './src/live-source/india-grants-bridge/plugin'
import { tvbWorldBankBridge } from './src/live-source/worldbank-bridge/plugin'
import { tvbEnrichmentBridge } from './src/live-source/enrichment-bridge/plugin'
import { tvbSamBridge } from './src/live-source/sam-bridge/plugin'
import { tvbSbirBridge } from './src/live-source/sbir-bridge/plugin'
import { tvbChallengeBridge } from './src/live-source/challenge-bridge/plugin'
import { tvbStartupIndiaBridge } from './src/live-source/startup-india-bridge/plugin'
import { tvbThubBridge } from './src/live-source/thub-bridge/plugin'
import { tvbIcreateBridge } from './src/live-source/icreate-bridge/plugin'

// Frontend-only prototype. No proxy, no external API. The Phase V vault
// bridge is local middleware on the dev and preview servers
// (POST /__tvb/vault/{preview,write}); it reaches the filesystem writer only
// when the server's own TVB_VAULT_ROOT environment variable names an
// intended vault, and refuses honestly when that variable is unset.
// Verified live read-only source calls run in server-side bridges. Legacy
// sample-catalog bridges return explicit source_not_live errors; they never
// emit the sample records formerly bundled with them.
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tvbVaultBridge(),
      tvbTedBridge(),
      tvbUsaSpendingBridge(),
      tvbGrantsGovBridge(),
      tvbEuSediaBridge(),
      tvbFtsBridge(),
      tvbGleifBridge(),
      tvbSecBridge(),
      tvbGemBridge(),
      tvbIndiaGrantsBridge(),
      tvbWorldBankBridge(),
      tvbEnrichmentBridge(),
      tvbSamBridge(),
      tvbSbirBridge(),
      tvbChallengeBridge(),
      tvbStartupIndiaBridge(),
      tvbThubBridge(),
      tvbIcreateBridge(),
    ],
    server: {
      port: 5173,
      strictPort: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  }
})
