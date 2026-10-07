/*
  Unit tests for the memo-* wallet-source resolver.

  The resolver must accept exactly one source (-n name or --wif), delegate WIF
  and name handling to the injected wallet factory, and report a usage error
  for zero or two sources.
*/

// Global npm libraries
import { assert } from 'chai'

// Local libraries
import { resolveWalletSource } from '../../../src/lib/wallet-source.js'
import { UsageError } from '../../../src/lib/reporter.js'

// A factory stand-in that maps names and WIFs to cash addresses.
function fakeWalletUtil (saved = {}, wifs = {}) {
  return {
    async instanceWallet (name) {
      if (!(name in saved)) throw new Error(`Unknown wallet ${name}`)
      return { walletInfo: { cashAddress: saved[name] } }
    },
    async instanceWalletFromWif (wif) {
      if (!(wif in wifs)) throw new Error(`Unknown wif ${wif}`)
      return { walletInfo: { cashAddress: wifs[wif] } }
    }
  }
}

describe('#wallet-source', () => {
  it('resolves a saved wallet name to its address', async () => {
    const walletUtil = fakeWalletUtil({ wallet1: 'bitcoincash:qone' })

    const result = await resolveWalletSource({ name: 'wallet1' }, { walletUtil })

    assert.property(result, 'wallet')
    assert.equal(result.address, 'bitcoincash:qone')
  })

  it('resolves a WIF to its address', async () => {
    const walletUtil = fakeWalletUtil({}, { 'wif-one': 'bitcoincash:qtwo' })

    const result = await resolveWalletSource({ wif: 'wif-one' }, { walletUtil })

    assert.equal(result.address, 'bitcoincash:qtwo')
  })

  it('rejects no source with a usage error', async () => {
    let err
    try {
      await resolveWalletSource({}, { walletUtil: fakeWalletUtil() })
    } catch (e) {
      err = e
    }

    assert.instanceOf(err, UsageError)
    assert.include(err.message, '-n flag')
  })

  it('rejects both sources with a usage error', async () => {
    let err
    try {
      await resolveWalletSource(
        { name: 'wallet1', wif: 'wif-one' },
        { walletUtil: fakeWalletUtil() }
      )
    } catch (e) {
      err = e
    }

    assert.instanceOf(err, UsageError)
    assert.include(err.message, 'not both')
  })

  it('uses a real WalletUtil when none is injected', async () => {
    let err
    try {
      await resolveWalletSource({ name: 'wallet-source-default-missing' })
    } catch (e) {
      err = e
    }

    assert.instanceOf(err, Error)
  })
})
