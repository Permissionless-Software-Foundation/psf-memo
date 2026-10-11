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
  memoDbUrl: resolveMemoDbUrl({ envUrl: process.env.MEMO_DB_URL }),

  // The bch-file-hosting REST API used by the file-* commands. Local
  // development defaults to the API's own default; production is served at
  // https://file-hosting-api.blippost.com (set HOSTING_API_URL).
  hostingApiUrl: process.env.HOSTING_API_URL || 'http://localhost:5050'
}

export default config

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-11T16:25:35.785Z","module_hash":"75e3f90055310fcd8c46a4ffbecb481040796e11ff5e91eb11d5dcd074fd962b","functions":[]}
// mutate4javascript-manifest-end
