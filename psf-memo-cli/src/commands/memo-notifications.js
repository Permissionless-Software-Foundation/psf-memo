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
// {"version":1,"tested_at":"2026-10-08T14:46:09.357Z","module_hash":"ad2688c11b9502255cd8ae6de28f91fb2e57eca2a553a0e9b746b8f645e9e2ac","functions":[{"id":"func/MemoNotifications.constructor","name":"MemoNotifications.constructor","line":19,"end_line":22,"hash":"80c5c638f3d6568034561bdfa2aeabd61485c3c1c60c8b62d6041d93c26c6255"},{"id":"func/MemoNotifications.run","name":"MemoNotifications.run","line":26,"end_line":51,"hash":"5b9a22d2552a48b5fbb0a79ce9837322dd67ad9bcdc6d2acb65c33ebe5608a35"},{"id":"func/MemoNotifications.validateFlags","name":"MemoNotifications.validateFlags","line":55,"end_line":57,"hash":"6ab3d9de6eb48ff3aa7b62d61bba63f282101f378fa2d32a361daac91b71fe03"},{"id":"func/MemoNotifications.createClient","name":"MemoNotifications.createClient","line":60,"end_line":62,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoNotifications.readNotifications","name":"MemoNotifications.readNotifications","line":65,"end_line":67,"hash":"9f4ed48bb9c6042a3ef2481bbe50e898e18e2c884a0d61da557fc886651b7927"}]}
// mutate4javascript-manifest-end
