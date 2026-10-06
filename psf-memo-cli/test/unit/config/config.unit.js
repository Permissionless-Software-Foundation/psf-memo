/*
  Unit tests for the config module's environment handling.
*/

// Global npm libraries
import { assert } from 'chai'

describe('#config', () => {
  const originalWalletUrl = process.env.WALLET_URL
  const originalInterface = process.env.INTERFACE

  after(() => {
    if (originalWalletUrl === undefined) delete process.env.WALLET_URL
    else process.env.WALLET_URL = originalWalletUrl
    if (originalInterface === undefined) delete process.env.INTERFACE
    else process.env.INTERFACE = originalInterface
  })

  it('should fall back to the defaults when the env vars are unset', async () => {
    delete process.env.WALLET_URL
    delete process.env.INTERFACE

    // A cache-busting query forces a fresh evaluation of the module.
    const { default: config } = await import(
      `../../../config/index.js?defaults=${Date.now()}`
    )

    assert.equal(config.restURL, 'https://free-bch.fullstack.cash')
    assert.equal(config.interface, 'consumer-api')
  })

  it('should honor the WALLET_URL and INTERFACE overrides', async () => {
    process.env.WALLET_URL = 'https://example.test'
    process.env.INTERFACE = 'rest-api'

    const { default: config } = await import(
      `../../../config/index.js?override=${Date.now()}`
    )

    assert.equal(config.restURL, 'https://example.test')
    assert.equal(config.interface, 'rest-api')
  })
})
