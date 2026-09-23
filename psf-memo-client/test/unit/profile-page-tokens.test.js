/*
  Unit tests for the profile page token icon loading.

  The profile page loads the SLP tokens held by the target address through an
  injected token source, enriches them with their mutable data when needed, and
  builds the icon view models. A token lookup failure must be silent: the page
  shows no token icons and does not error.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const ProfilePage = require('../../src/services/profile-page')

const ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const ALPHA_ID = '1'.repeat(64)
const BETA_ID = '2'.repeat(64)

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

test('loadTokenIcons lists the tokens held by the profile address', async () => {
  const listed = []
  const tokenSource = {
    async listTokens (addr) {
      listed.push(addr)
      return [makeToken(ALPHA_ID, { mutableData: { tokenIcon: 'https://example.com/a.png' } })]
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  assert.deepEqual(listed, [ADDR])
  assert.equal(page.getTokenIcons().length, 1)
  assert.equal(page.getTokenIcons()[0].imageUrl, 'https://example.com/a.png')
})

test('loadTokenIcons enriches tokens with their mutable data', async () => {
  const requested = []
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    },
    async getTokenData (tokenId) {
      requested.push(tokenId)
      return { mutableData: { tokenIcon: 'https://example.com/a.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  assert.deepEqual(requested, [ALPHA_ID])
  assert.equal(page.getTokenIcons()[0].imageUrl, 'https://example.com/a.png')
})

test('loadTokenIcons prefers getTokenData2 when the wallet exposes it', async () => {
  const calls = []
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID)]
    },
    async getTokenData2 (tokenId) {
      calls.push(['data2', tokenId])
      return { mutableData: { tokenIcon: 'https://example.com/a.png' } }
    },
    async getTokenData (tokenId) {
      calls.push(['data', tokenId])
      return { mutableData: { tokenIcon: 'https://example.com/other.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  assert.deepEqual(calls, [['data2', ALPHA_ID]])
  assert.equal(page.getTokenIcons()[0].imageUrl, 'https://example.com/a.png')
})

test('loadTokenIcons does not re-fetch mutable data already on the token', async () => {
  let requested = 0
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID, { mutableData: { tokenIcon: 'https://example.com/a.png' } })]
    },
    async getTokenData () {
      requested++
      return { mutableData: { tokenIcon: 'https://example.com/other.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  assert.equal(requested, 0)
  assert.equal(page.getTokenIcons()[0].imageUrl, 'https://example.com/a.png')
})

test('loadTokenIcons keeps other tokens when one mutable-data lookup fails', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID), makeToken(BETA_ID)]
    },
    async getTokenData (tokenId) {
      if (tokenId === ALPHA_ID) throw new Error('metadata unavailable')
      return { mutableData: { tokenIcon: 'https://example.com/b.png' } }
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  await page.loadTokenIcons()

  const icons = page.getTokenIcons()
  assert.equal(icons.length, 2)
  assert.equal(icons[0].isJdenticon, true)
  assert.equal(icons[1].imageUrl, 'https://example.com/b.png')
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

test('load returns the token icons it loaded', async () => {
  const tokenSource = {
    async listTokens () {
      return [makeToken(ALPHA_ID, { mutableData: { tokenIcon: 'https://example.com/a.png' } })]
    }
  }
  const page = new ProfilePage({ memoDb: makeMemoDb(), addr: ADDR, tokenSource })

  const result = await page.load()

  assert.equal(result.tokenIcons.length, 1)
  assert.equal(page.getTokenIcons()[0].tokenId, ALPHA_ID)
})
