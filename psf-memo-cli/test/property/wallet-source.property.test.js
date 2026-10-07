/*
  Property test for the memo-* wallet-source resolver.

  The resolver must accept exactly one source: a truthy name or a truthy WIF,
  but not both and not neither. This samples every combination over many
  iterations to confirm the exactly-one invariant and the resolved address.
*/

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { seededRandom } from './harness.js'
import { resolveWalletSource } from '../../src/lib/wallet-source.js'
import { UsageError } from '../../src/lib/reporter.js'

const walletUtil = {
  async instanceWallet (name) {
    return { walletInfo: { cashAddress: `bitcoincash:${name}` } }
  },
  async instanceWalletFromWif (wif) {
    return { walletInfo: { cashAddress: `bitcoincash:${wif}` } }
  }
}

test('exactly one wallet source is required', async () => {
  const rng = seededRandom(20261012)

  for (let i = 0; i < 200; i++) {
    const hasName = rng() < 0.5
    const hasWif = rng() < 0.5
    const source = {}
    if (hasName) source.name = `wallet-${i}`
    if (hasWif) source.wif = `wif-${i}`

    const shouldSucceed = hasName !== hasWif
    let result
    let err
    try {
      result = await resolveWalletSource(source, { walletUtil })
    } catch (e) {
      err = e
    }

    if (shouldSucceed) {
      assert.equal(err, undefined)
      assert.equal(
        result.address,
        `bitcoincash:${hasName ? source.name : source.wif}`
      )
    } else {
      assert.ok(err instanceof UsageError)
    }
  }
})
