/*
  Unit tests for the profile token icon view model.

  The profile sidebar shows a small icon for each SLP token held by the
  profile address. Each icon prefers the token's mutable-data image, with an
  http fullSizedUrl winning over tokenIcon, and falls back to a jdenticon
  derived from the token id. These tests pin those pure decisions and the
  Tokentiger explorer link independent of the React shell.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const {
  TOKENTIGER_BASE,
  tokenExplorerUrl,
  tokenIconUrl,
  tokenLabel,
  buildTokenIcon,
  buildTokenIcons
} = require('../../src/services/profile-token-icons')

const ALPHA_ID = '1'.repeat(64)
const BETA_ID = '2'.repeat(64)
const GAMMA_ID = '3'.repeat(64)

const ALPHA = {
  tokenId: ALPHA_ID,
  ticker: 'ALPHA',
  name: 'Alpha Token',
  mutableData: { tokenIcon: 'https://example.com/icons/alpha.png' }
}
const BETA = { tokenId: BETA_ID, ticker: 'BETA', name: 'Beta Token' }
const GAMMA = {
  tokenId: GAMMA_ID,
  ticker: 'GAMMA',
  name: 'Gamma Token',
  mutableData: {
    tokenIcon: 'https://example.com/icons/gamma.png',
    fullSizedUrl: 'https://example.com/icons/gamma-full.png'
  }
}

test('tokenExplorerUrl builds the Tokentiger explorer link for a token', () => {
  assert.equal(tokenExplorerUrl(ALPHA_ID), `${TOKENTIGER_BASE}${ALPHA_ID}`)
})

test('tokenIconUrl uses the mutable-data token icon', () => {
  assert.equal(tokenIconUrl(ALPHA), 'https://example.com/icons/alpha.png')
})

test('tokenIconUrl prefers an http fullSizedUrl over the token icon', () => {
  assert.equal(tokenIconUrl(GAMMA), 'https://example.com/icons/gamma-full.png')
})

test('tokenIconUrl ignores a non-http fullSizedUrl and uses the token icon', () => {
  const token = {
    tokenId: ALPHA_ID,
    mutableData: {
      tokenIcon: 'https://example.com/icons/alpha.png',
      fullSizedUrl: 'ipfs://QmExample'
    }
  }

  assert.equal(tokenIconUrl(token), 'https://example.com/icons/alpha.png')
})

test('tokenIconUrl is null without mutable data', () => {
  assert.equal(tokenIconUrl(BETA), null)
  assert.equal(tokenIconUrl({ tokenId: BETA_ID, mutableData: null }), null)
})

test('tokenLabel prefers the ticker', () => {
  assert.equal(tokenLabel(ALPHA), 'ALPHA')
})

test('tokenLabel falls back to the name and then the token id', () => {
  assert.equal(tokenLabel({ tokenId: BETA_ID, name: 'Beta Token' }), 'Beta Token')
  assert.equal(tokenLabel({ tokenId: BETA_ID }), BETA_ID)
})

test('buildTokenIcon carries the token id, label, explorer link, and tooltip', () => {
  const icon = buildTokenIcon(ALPHA)

  assert.equal(icon.tokenId, ALPHA_ID)
  assert.equal(icon.label, 'ALPHA')
  assert.equal(icon.imageUrl, 'https://example.com/icons/alpha.png')
  assert.equal(icon.isJdenticon, false)
  assert.equal(icon.explorerUrl, `${TOKENTIGER_BASE}${ALPHA_ID}`)
  assert.equal(icon.tooltip, ALPHA_ID)
})

test('buildTokenIcon marks a token without an image as a jdenticon', () => {
  const icon = buildTokenIcon(BETA)

  assert.equal(icon.imageUrl, null)
  assert.equal(icon.isJdenticon, true)
})

test('buildTokenIcons maps every token and tolerates a missing list', () => {
  const icons = buildTokenIcons([ALPHA, BETA, GAMMA])

  assert.deepEqual(icons.map((icon) => icon.tokenId), [ALPHA_ID, BETA_ID, GAMMA_ID])
  assert.deepEqual(buildTokenIcons(), [])
})
