/*
  memo-notifications: read the wallet address's Memo notifications.

  A read-only command for the psf-memo-db /posts/notifications/:addr feed. It
  resolves the signing wallet (-n <wallet> or --wif <wif>) to get the viewer
  address, reads one page of replies, likes, and follows for that address, and
  reports the notifications and the service pagination unchanged. A missing
  wallet source is a usage error (exit 2); a failed request is an error (exit
  1). No broadcast.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { parseNotificationsFlags, formatNotificationsMessage } from '../lib/memo-notifications.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import WalletUtil from '../lib/wallet-util.js'

class MemoNotifications {
  constructor (options = {}) {
    initReadCommand(this, options, 'readNotifications')
    this.walletUtil = options.walletUtil || new WalletUtil()
  }

  // Resolve the viewer wallet, read the notification page, and report it.
  // Returns the exit code (0/1/2) and assigns it to process.exitCode.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { limit, offset } = this.validateFlags(flags)

        const { address } = await resolveWalletSource(
          { name: flags.name, wif: flags.wif },
          { walletUtil: this.walletUtil }
        )

        const { notifications = [], pagination = {} } = await this.readNotifications({
          address,
          limit,
          offset,
          dbUrl: flags.dbUrl
        })

        return {
          message: formatNotificationsMessage(notifications, pagination),
          data: { notifications, pagination }
        }
      }
    })
  }

  // Validate and resolve the page flags before any request. Throws a UsageError
  // (exit 2) for a bad --limit or --offset.
  validateFlags (flags) {
    return parseNotificationsFlags(flags)
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Fetch one notification page for the viewer address.
  readNotifications ({ address, limit, offset, dbUrl }) {
    return this.createClient(dbUrl).getNotifications(address, { limit, offset })
  }
}

export default MemoNotifications

// mutate4javascript-manifest-begin
// {"version":1,"functions":[],"tested_at":null,"module_hash":null}
// mutate4javascript-manifest-end
