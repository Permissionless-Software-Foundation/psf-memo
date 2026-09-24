/*
  Unit tests for the profile page token icon loading.

  Loading happens in two phases. First the profile's token list is listed and
  the icons are built immediately, with the token ID as each tooltip. Then the
  token data (the genesis record and the mutable-data record) is retrieved
  asynchronously and the icons are rebuilt, replacing the tooltip with the
  genesis name and resolving the icon image. A token lookup failure is silent:
  the page shows no token icons and does not error.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ProfilePage = require('../../src/services/profile-page')

const ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const ALPHA_ID = '1'.repeat(64)
const BETA_ID = '2'.repeat(64)
const DELTA_ID = '4'.repeat(64)

function makeMemoDb () {
  return {
    async getPostsByAddr () {
      return { posts: [], pagination: { total: 0 } }
    },
    async getFollowState () {
      return false
    },
    async getMuteState () {
      return false
    }
  }
}

function makeToken (tokenId, extras = {}) {
  return { tokenId, ticker: tokenId.slice(0, 5), ...extras }
}

test('loadTokenIcons lists the tokens and shows them with the token ID tooltip', async () => {
  const listed = []
  const tokenSource = {
    async listTokens (addr) {
      listed.push(addr)
      return [makeToken(ALPHA_ID, { name: 'Alpha Token' })]
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  assert.deepEqual(listed, [ADDR])
  assert.equal(page.getTokenIcons().length, 1)
  assert.equal(page.getTokenIcons()[0].tooltip, ALPHA_ID)
  assert.equal(page.getTokenIcons()[0].isJdenticon, true)
})

test('loadTokenIcons does not fetch the token data', async () => {
  let requested = 0
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    },
    async getTokenData () {
      requested++
      return { genesisData: { name: 'Alpha Token' }, mutableData: null }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  assert.equal(requested, 0)
})

test('loadTokenData resolves the mutable-data image and the genesis name', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    },
    async getTokenData (tokenId) {
      assert.equal(tokenId, ALPHA_ID)
      return { genesisData: { name: 'Alpha Token' }, mutableData: 'ipfs://bafyAlpha' }
    },
    async cid2json ({ cid }) {
      assert.equal(cid, 'bafyAlpha')
      return { json: { tokenIcon: 'https://example.com/a.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  const icon = page.getTokenIcons()[0]
  assert.equal(icon.imageUrl, 'https://example.com/a.png')
  assert.equal(icon.tooltip, 'Alpha Token')
  assert.equal(icon.label, '11111')
})

test('loadTokenData falls back to the token ID when the genesis record has no name', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(DELTA_ID, { ticker: 'DELTA' })]
    },
    async getTokenData () {
      return { genesisData: {}, mutableData: null }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  const icon = page.getTokenIcons()[0]
  assert.equal(icon.tooltip, DELTA_ID)
  assert.equal(icon.isJdenticon, true)
})

test('loadTokenData isolates a per-token token-data failure', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID), makeToken(BETA_ID)]
    },
    async getTokenData (tokenId) {
      if (tokenId === ALPHA_ID) throw new Error('token data unavailable')
      return { genesisData: { name: 'Beta Token' }, mutableData: { tokenIcon: 'https://example.com/b.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  const icons = page.getTokenIcons()
  assert.equal(icons.length, 2)
  assert.equal(icons[0].tooltip, ALPHA_ID)
  assert.equal(icons[0].isJdenticon, true)
  assert.equal(icons[1].tooltip, 'Beta Token')
  assert.equal(icons[1].imageUrl, 'https://example.com/b.png')
})

test('loadTokenData isolates a per-token cid2json failure', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID), makeToken(BETA_ID)]
    },
    async getTokenData (tokenId) {
      return { genesisData: { name: tokenId }, mutableData: `ipfs://cid-${tokenId.slice(0, 1)}` }
    },
    async cid2json ({ cid }) {
      if (cid === 'cid-1') throw new Error('ipfs unavailable')
      return { json: { tokenIcon: 'https://example.com/b.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  const icons = page.getTokenIcons()
  assert.equal(icons[0].isJdenticon, true)
  assert.equal(icons[1].imageUrl, 'https://example.com/b.png')
})

test('loadTokenData does not re-fetch token data already resolved', async () => {
  let requested = 0
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID, { mutableData: { tokenIcon: 'https://example.com/a.png' }, genesisName: 'Alpha Token' })]
    },
    async getTokenData () {
      requested++
      return { genesisData: { name: 'Other' }, mutableData: { tokenIcon: 'https://example.com/other.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  assert.equal(requested, 0)
  assert.equal(page.getTokenIcons()[0].imageUrl, 'https://example.com/a.png')
  assert.equal(page.getTokenIcons()[0].tooltip, 'Alpha Token')
})

test('loadTokenData does not re-fetch a token that already has a genesis name', async () => {
  let requested = 0
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID, { genesisName: 'Alpha Token' })]
    },
    async getTokenData () {
      requested++
      return { genesisData: { name: 'Other' }, mutableData: null }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  assert.equal(requested, 0)
  assert.equal(page.getTokenIcons()[0].tooltip, 'Alpha Token')
})

test('loadTokenData does not re-fetch a token that already has mutable data', async () => {
  let requested = 0
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID, { mutableData: { tokenIcon: 'https://example.com/a.png' } })]
    },
    async getTokenData () {
      requested++
      return { genesisData: { name: 'Other' }, mutableData: null }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  await page.loadTokenData()

  assert.equal(requested, 0)
  assert.equal(page.getTokenIcons()[0].imageUrl, 'https://example.com/a.png')
  assert.equal(page.getTokenIcons()[0].tooltip, ALPHA_ID)
})

test('loadTokenData leaves the icons untouched when the wallet cannot fetch token data', async () => {
  const tokens = [makeToken(ALPHA_ID)]
  const tokenSource = {
    async listTokens () {
      return tokens
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()
  const before = page.getTokenIcons()
  await page.loadTokenData()

  assert.equal(page.getTokenIcons(), before)
})

test('loadTokenData does nothing when the token list is empty', async () => {
  const changes = []
  const tokenSource = {
    async listTokens () {
      return []
    },
    async getTokenData () {
      return { genesisData: { name: 'Other' }, mutableData: null }
    }
  }
  const page = new ProfilePage({
    memoDb: makeMemoDb(),
    addr: ADDR,
    tokenSource,
    onTokenIconsChange: (icons) => changes.push(icons)
  })

  await page.loadTokenIcons()
  const before = page.getTokenIcons()
  await page.loadTokenData()

  assert.equal(page.getTokenIcons(), before)
  assert.equal(changes.length, 1)
})

test('loadTokenIcons shows no icons and does not throw when the lookup fails', async () => {
  const tokenSource = {
    async listTokens () {
      throw new Error('token lookup failed')
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await assert.doesNotReject(() => page.loadTokenIcons())
  assert.deepEqual(page.getTokenIcons(), [])
})

test('loadTokenIcons shows no icons without a token source', async () => {
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR })

  await page.loadTokenIcons()

  assert.deepEqual(page.getTokenIcons(), [])
})

test('loadTokenIcons does not list tokens when the page has no address', async () => {
  let listed = 0
  const tokenSource = {
    async listTokens () {
      listed++
      return [makeToken(ALPHA_ID)]
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: null, tokenSource })

  const icons = await page.loadTokenIcons()

  assert.deepEqual(icons, [])
  assert.deepEqual(page.getTokenIcons(), [])
  assert.equal(listed, 0)
})

test('load returns the phase-one token icons', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  const result = await page.load()

  assert.equal(result.tokenIcons.length, 1)
  assert.equal(page.getTokenIcons()[0].tokenId, ALPHA_ID)
})

test('loadTokenIcons and loadTokenData notify the token icons change callback', async () => {
  const changes = []
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    },
    async getTokenData () {
      return { genesisData: { name: 'Alpha Token' }, mutableData: null }
    }
  }
  const page = new ProfilePage({
    memoDb: makeMemoDb(),
    addr: ADDR,
    tokenSource,
    onTokenIconsChange: (icons) => changes.push(icons.map((icon) => icon.tooltip))
  })

  await page.loadTokenIcons()
  await page.loadTokenData()

  assert.deepEqual(changes, [[ALPHA_ID], ['Alpha Token']])
})

test('a destroyed page does not notify the token icons change callback', async () => {
  const changes = []
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    },
    async getTokenData () {
      return { genesisData: { name: 'Alpha Token' }, mutableData: null }
    }
  }
  const page = new ProfilePage({
    memoDb: makeMemoDb(),
    addr: ADDR,
    tokenSource,
    onTokenIconsChange: (icons) => changes.push(icons)
  })

  await page.loadTokenIcons()
  page.destroy()
  await page.loadTokenData()

  assert.equal(changes.length, 1)
})
