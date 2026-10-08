/*
  Shared scaffolding for wallet-scoped address-list read commands.

  The wallet-scoped list commands (memo-following and memo-muted) resolve the
  signing wallet to an address and report an unpaginated list of addresses.
  This factory owns that pipeline -- the wallet-source normalization, the
  wallet resolution, the unpaginated list summary -- so each command declares
  only its route and result field.
*/

// Local libraries
import { ListReadCommand } from './list-command.js'
import { parseWalletSourceFlags, formatFollowListMessage } from './follow-list.js'
import { resolveWalletSource } from './wallet-source.js'
import WalletUtil from './wallet-util.js'

// Build a command class that resolves the wallet source, reads an unpaginated
// address list through `clientMethod`, and reports the `listField` array with
// the shared address-list summary under `label`.
export function defineWalletListCommand ({ readMethod, clientMethod, listField, label }) {
  return class extends ListReadCommand {
    constructor (options = {}) {
      super(options, readMethod)
      this.walletUtil = options.walletUtil || new WalletUtil()
      this.listField = listField
      this.label = label
      this.clientMethod = clientMethod
    }

    // Normalize the wallet name/WIF before any request. The missing or double
    // source is reported as a UsageError (exit 2) when it is resolved.
    parseFlags (flags) {
      return parseWalletSourceFlags(flags)
    }

    // Render the reported address list with the shared summary.
    format (result) {
      const addresses = result[this.listField] || []

      return {
        message: formatFollowListMessage(addresses, this.label),
        data: { [this.listField]: addresses }
      }
    }

    // Resolve the wallet address and fetch the list it scopes.
    async [readMethod] ({ name, wif, dbUrl }) {
      const { address } = await resolveWalletSource(
        { name, wif },
        { walletUtil: this.walletUtil }
      )

      return this.createClient(dbUrl)[this.clientMethod](address)
    }
  }
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:58:45.503Z","module_hash":"c4fc67faadb81f9e19f71a47f5892d72290c8321aa6e04eba5c0c8518b8f3389","functions":[{"id":"func/defineWalletListCommand","name":"defineWalletListCommand","line":20,"end_line":56,"hash":"3c017fd5c3b92e6d616a8b311b1a326fd9d342ae3cf5007d51cf4c03e869654f"},{"id":"func/AnonymousClass.constructor","name":"AnonymousClass.constructor","line":22,"end_line":28,"hash":"b5248c4923f8cdaf336950a94c7ed17682d7e78f2972d453cba0e61b261e819a"},{"id":"func/AnonymousClass.parseFlags","name":"AnonymousClass.parseFlags","line":32,"end_line":34,"hash":"d34b4768a10c6484165c7392614a050091d8083dc5bba0a0d019b646250172f3"},{"id":"func/AnonymousClass.format","name":"AnonymousClass.format","line":37,"end_line":44,"hash":"f5d606236617c94c4538e90f55844982f72b54816ab1a02cd18987717ed5ec51"},{"id":"func/AnonymousClass.readMethod","name":"AnonymousClass.readMethod","line":47,"end_line":54,"hash":"d02fc0ff976c74e47a44f4e95877bc75a1e941e14b7639346d1eb98e5f57cdc1"}]}
// mutate4javascript-manifest-end
