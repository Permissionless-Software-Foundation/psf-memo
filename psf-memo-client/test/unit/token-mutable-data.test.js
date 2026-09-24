/*
  Unit tests for the shared token mutable-data resolution.

  The /slp-tokens page resolves a token's mutable data by fetching the token
  data (getTokenData), reading the IPFS mutable-data URI, and asking the wallet
  to resolve that CID to JSON (cid2json). The profile token icon row resolves
  it the same way. These tests pin that shared resolution and the icon field
  precedence (an http fullSizedUrl wins over the tokenIcon).
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  parseMutableDataCid,
  tokenIconFromMutableData,
  resolveTokenData,
  resolveTokenMutableData
} = require('../../src/services/token-mutable-data')

const TOKEN_ID = '1'.repeat(64)

test('parseMutableDataCid strips the ipfs:// prefix', () => {
  assert.equal(parseMutableDataCid('ipfs://bafyExample'), 'bafyExample')
})

test('parseMutableDataCid returns a non-ipfs value unchanged', () => {
  assert.equal(parseMutableDataCid('bafyExample'), 'bafyExample')
})

test('parseMutableDataCid is null for a non-string', () => {
  assert.equal(parseMutableDataCid(null), null)
  assert.equal(parseMutableDataCid({ tokenIcon: 'https://example.com/a.png' }), null)
})

test('tokenIconFromMutableData prefers an http fullSizedUrl', () => {
  const record = {
    tokenIcon: 'https://example.com/a.png',
    fullSizedUrl: 'https://example.com/big.png'
  }

  assert.equal(tokenIconFromMutableData(record), 'https://example.com/big.png')
})

test('tokenIconFromMutableData falls back to the tokenIcon', () => {
  assert.equal(
    tokenIconFromMutableData({ tokenIcon: 'https://example.com/a.png' }),
    'https://example.com/a.png'
  )
  assert.equal(
    tokenIconFromMutableData({ tokenIcon: 'https://example.com/a.png', fullSizedUrl: 'ipfs://cid' }),
    'https://example.com/a.png'
  )
})

test('tokenIconFromMutableData is null without a record', () => {
  assert.equal(tokenIconFromMutableData(null), null)
  assert.equal(tokenIconFromMutableData(undefined), null)
  assert.equal(tokenIconFromMutableData({}), null)
})

test('resolveTokenMutableData resolves the IPFS record through the wallet', async () => {
  const calls = []
  const wallet = {
    async getTokenData (tokenId) {
      calls.push(['getTokenData', tokenId])
      return { mutableData: 'ipfs://bafyExample' }
    },
    async cid2json ({ cid }) {
      calls.push(['cid2json', cid])
      return { json: { tokenIcon: 'https://example.com/a.png' } }
    }
  }

  const record = await resolveTokenMutableData(wallet, TOKEN_ID)

  assert.deepEqual(calls, [['getTokenData', TOKEN_ID], ['cid2json', 'bafyExample']])
  assert.deepEqual(record, { tokenIcon: 'https://example.com/a.png' })
})

test('resolveTokenMutableData returns an already-resolved record', async () => {
  const wallet = {
    async getTokenData () {
      return { mutableData: { tokenIcon: 'https://example.com/a.png' } }
    }
  }

  assert.deepEqual(
    await resolveTokenMutableData(wallet, TOKEN_ID),
    { tokenIcon: 'https://example.com/a.png' }
  )
})

test('resolveTokenMutableData is null without mutable data', async () => {
  const emptyMutable = { async getTokenData () { return { mutableData: null } } }
  const emptyTokenData = { async getTokenData () { return null } }

  assert.equal(await resolveTokenMutableData(emptyMutable, TOKEN_ID), null)
  assert.equal(await resolveTokenMutableData(emptyTokenData, TOKEN_ID), null)
})

test('resolveTokenMutableData is null when the wallet cannot resolve the CID', async () => {
  const noCid2json = {
    async getTokenData () {
      return { mutableData: 'ipfs://bafyExample' }
    }
  }
  const emptyJson = {
    async getTokenData () {
      return { mutableData: 'ipfs://bafyExample' }
    },
    async cid2json () {
      return {}
    }
  }

  assert.equal(await resolveTokenMutableData(noCid2json, TOKEN_ID), null)
  assert.equal(await resolveTokenMutableData(emptyJson, TOKEN_ID), null)
})

test('resolveTokenData resolves the genesis name and mutable-data record once', async () => {
  const calls = []
  const wallet = {
    async getTokenData (tokenId) {
      calls.push(['getTokenData', tokenId])
      return { genesisData: { name: 'Alpha Token' }, mutableData: 'ipfs://bafyAlpha' }
    },
    async cid2json ({ cid }) {
      calls.push(['cid2json', cid])
      return { json: { tokenIcon: 'https://example.com/a.png' } }
    }
  }

  const tokenData = await resolveTokenData(wallet, TOKEN_ID)

  assert.deepEqual(calls, [['getTokenData', TOKEN_ID], ['cid2json', 'bafyAlpha']])
  assert.equal(tokenData.name, 'Alpha Token')
  assert.deepEqual(tokenData.mutableData, { tokenIcon: 'https://example.com/a.png' })
})

test('resolveTokenData returns null when the wallet has no token data', async () => {
  const wallet = { async getTokenData () { return null } }

  assert.equal(await resolveTokenData(wallet, TOKEN_ID), null)
})

test('resolveTokenData has a null name and record without genesis or mutable data', async () => {
  const wallet = {
    async getTokenData () {
      return { genesisData: {}, mutableData: null }
    }
  }

  assert.deepEqual(await resolveTokenData(wallet, TOKEN_ID), { name: null, mutableData: null })
})

test('resolveTokenMutableData still exposes only the mutable-data record', async () => {
  const wallet = {
    async getTokenData () {
      return { genesisData: { name: 'Alpha Token' }, mutableData: { tokenIcon: 'https://example.com/a.png' } }
    }
  }

  assert.deepEqual(
    await resolveTokenMutableData(wallet, TOKEN_ID),
    { tokenIcon: 'https://example.com/a.png' }
  )
})

test('resolveTokenMutableData is null for an empty CID and does not query the gateway', async () => {
  let queried = 0
  const wallet = {
    async getTokenData () {
      return { mutableData: 'ipfs://' }
    },
    async cid2json () {
      queried++
      return { json: { tokenIcon: 'https://example.com/a.png' } }
    }
  }

  assert.equal(await resolveTokenMutableData(wallet, TOKEN_ID), null)
  assert.equal(queried, 0)
})
