/*
  Unit tests for the config module's environment handling.
*/

// Global npm libraries
import { assert } from 'chai'

describe('#config', () => {
  const originalWalletUrl = process.env.WALLET_URL
  const originalInterface = process.env.INTERFACE
  const originalMemoDbUrl = process.env.MEMO_DB_URL
  const originalHostingApiUrl = process.env.HOSTING_API_URL

  after(() => {
    if (originalWalletUrl === undefined) delete process.env.WALLET_URL
    else process.env.WALLET_URL = originalWalletUrl
    if (originalInterface === undefined) delete process.env.INTERFACE
    else process.env.INTERFACE = originalInterface
    if (originalMemoDbUrl === undefined) delete process.env.MEMO_DB_URL
    else process.env.MEMO_DB_URL = originalMemoDbUrl
    if (originalHostingApiUrl === undefined) delete process.env.HOSTING_API_URL
    else process.env.HOSTING_API_URL = originalHostingApiUrl
  })

  it('should fall back to the defaults when the env vars are unset', async () => {
    delete process.env.WALLET_URL
    delete process.env.INTERFACE
    delete process.env.MEMO_DB_URL
    delete process.env.HOSTING_API_URL

    // A cache-busting query forces a fresh evaluation of the module.
    const { default: config } = await import(
      `../../../config/index.js?defaults=${Date.now()}`
    )

    assert.equal(config.restURL, 'https://free-bch.fullstack.cash')
    assert.equal(config.interface, 'consumer-api')
    assert.equal(config.memoDbUrl, 'https://api.blippost.com')
    assert.equal(config.hostingApiUrl, 'http://localhost:5050')
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

  it('should honor the MEMO_DB_URL override', async () => {
    process.env.MEMO_DB_URL = 'http://localhost:5021'

    const { default: config } = await import(
      `../../../config/index.js?memodb=${Date.now()}`
    )

    assert.equal(config.memoDbUrl, 'http://localhost:5021')
  })

  it('should honor the HOSTING_API_URL override', async () => {
    process.env.HOSTING_API_URL = 'https://file-hosting-api.blippost.com'

    const { default: config } = await import(
      `../../../config/index.js?hosting=${Date.now()}`
    )

    assert.equal(config.hostingApiUrl, 'https://file-hosting-api.blippost.com')
  })
})
