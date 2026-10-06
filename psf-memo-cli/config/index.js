/*
  Configure your CLI app with these settings.
  Modify these values to suite your needs.

  More info at https://CashStack.info
*/

// Load environment variables from .env file
import 'dotenv/config'

const config = {
  // The REST URL for the server used by minimal-slp-wallet.
  // Can be overridden by WALLET_URL environment variable
  restURL: process.env.WALLET_URL || 'https://free-bch.fullstack.cash',

  // consumer-api = web 3 Cash Stack (ipfs-bch-wallet-consumer)
  // rest-api = web 2 Cash Stack (bch-api)
  // Can be overridden by INTERFACE environment variable
  interface: process.env.INTERFACE || 'consumer-api'
}

export default config

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-06T22:17:42.848Z","module_hash":"bf3b745319ac5c5cc43447d0dd2ea7cf67b90c0d1c69ae5bc297c6dc22310582","functions":[]}
// mutate4javascript-manifest-end
