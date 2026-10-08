/*
  memo-identity: report the wallet's own Memo identity.

  A read-only command. It resolves the signing wallet (-n <wallet> or
  --wif <wif>), derives the wallet's cash address, summarizes its BCH and SLP
  token balances, and reads the address's Memo name (0x6d01), profile text
  (0x6d05), and avatar URL (0x6d0a) from psf-memo-db. A missing profile
  resource reports an empty field; a memo-db transport failure is an error. It
  never broadcasts.
*/

// Local libraries
import { initReadCommand, createMemoDbClient, runReadCommand } from '../lib/read-command.js'
import { resolveWalletSource } from '../lib/wallet-source.js'
import WalletUtil from '../lib/wallet-util.js'
import { getTokenBalances } from '../lib/token-balances.js'
import {
  sumBchSats,
  satsToBch,
  walletTokenUtxos,
  formatIdentityMessage
} from '../lib/memo-identity.js'

class MemoIdentity {
  constructor (options = {}) {
    initReadCommand(this, options, 'readProfile')
    this.walletUtil = options.walletUtil || new WalletUtil()
  }

  // Resolve the wallet, read its balances and Memo profile, and report the
  // identity. Returns the exit code (0/1/2) and assigns process.exitCode.
  async run (flags = {}) {
    return runReadCommand({
      command: this,
      flags,
      outcome: async () => {
        const { wallet, address } = await resolveWalletSource(
          { name: flags.name, wif: flags.wif },
          { walletUtil: this.walletUtil }
        )

        await wallet.initialize()

        const bchBalance = satsToBch(sumBchSats(wallet.utxos?.utxoStore?.bchUtxos))
        const tokens = getTokenBalances(walletTokenUtxos(wallet))
        const profile = await this.readProfile(address, flags.dbUrl)

        const identity = { address, bchBalance, tokens, ...profile }

        return {
          message: formatIdentityMessage(identity),
          data: identity
        }
      }
    })
  }

  // memo-identity takes no required flags beyond the wallet source, which the
  // shared resolver validates; present for the shared read-command interface.
  validateFlags () {
    return true
  }

  // Build the read-only Memo DB client, honoring a --db-url override.
  createClient (dbUrl) {
    return createMemoDbClient(this, dbUrl)
  }

  // Read the address's name, profile text, and avatar. A missing resource
  // reports an empty field.
  async readProfile (address, dbUrl) {
    const client = this.createClient(dbUrl)
    const [nameDoc, profileDoc, avatarDoc] = await Promise.all([
      client.getName(address),
      client.getProfile(address),
      client.getProfilePic(address)
    ])

    return {
      name: nameDoc?.name || '',
      bio: profileDoc?.text || '',
      avatar: avatarDoc?.url || ''
    }
  }
}

export default MemoIdentity

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-08T14:45:33.269Z","module_hash":"16cdb0ae295a0018dde9da34062d5f4e8ede278b661587359d63a398c92eb356","functions":[{"id":"func/MemoIdentity.constructor","name":"MemoIdentity.constructor","line":25,"end_line":28,"hash":"32f8917d7d2ad5c5fa8cf4b0b00ac553c6cfeb8bb14a293e8502a70f4fb3c852"},{"id":"func/MemoIdentity.run","name":"MemoIdentity.run","line":32,"end_line":56,"hash":"92418d7b57781a005eea53a3f69c63c19559cd5adfed1dfb610e13260b348ba6"},{"id":"func/MemoIdentity.validateFlags","name":"MemoIdentity.validateFlags","line":60,"end_line":62,"hash":"9b55458bc5138dd8b9abc4c90c402883faf7547e3f0ea7ebc48b32e1ab9defe0"},{"id":"func/MemoIdentity.createClient","name":"MemoIdentity.createClient","line":65,"end_line":67,"hash":"54385637d7ccdbdb4482a273dbbf40bd7272b92032c0a6f5d6ac2de757b02e80"},{"id":"func/MemoIdentity.readProfile","name":"MemoIdentity.readProfile","line":71,"end_line":84,"hash":"ed400777aeb9b4fbff0f59354aa71f6b281774e1800b749d4129154cb8faba53"}]}
// mutate4javascript-manifest-end
