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
