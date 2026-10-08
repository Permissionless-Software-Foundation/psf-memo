/*
  Configure your CLI app with these settings.
  Modify these values to suite your needs.

  More info at https://CashStack.info
*/

// Load environment variables from .env file
import 'dotenv/config'

// Local libraries
import { resolveMemoDbUrl } from '../src/lib/memo-db.js'

const config = {
  // The REST URL for the server used by minimal-slp-wallet.
  // Can be overridden by WALLET_URL environment variable
  restURL: process.env.WALLET_URL || 'https://free-bch.fullstack.cash',

  // consumer-api = web 3 Cash Stack (ipfs-bch-wallet-consumer)
  // rest-api = web 2 Cash Stack (bch-api)
  // Can be overridden by INTERFACE environment variable
  interface: process.env.INTERFACE || 'consumer-api',

  // The read-only psf-memo-db REST API. Production by default; local
  // development overrides it with MEMO_DB_URL or the --db-url flag.
  memoDbUrl: resolveMemoDbUrl({ envUrl: process.env.MEMO_DB_URL })
}

export default config

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:45:16.510Z","module_hash":"24ea13ed0b789156eec6238855b533454a80b3d00164ed620a65968488c409b6","functions":[]}
// mutate4javascript-manifest-end
