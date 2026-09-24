/*
  Property tests for the profile token icons view model and page loader.

  The unit tests pin the icon decisions at fixed fixtures. These properties
  exercise them over broad random token shapes:

    - icon: every buildTokenIcon view model carries the token id, derives the
      label and explorer link, and marks a jdenticon exactly when it has no
      image.
    - precedence: tokenIconUrl prefers an http fullSizedUrl, then a tokenIcon,
      then null, for every combination of present and absent fields.
    - order: buildTokenIcons maps every token one-to-one and preserves order,
      and tolerates a non-array input as an empty list.
    - determinism: building and rendering the same tokens twice is identical.
    - render: the rendered row has exactly one link per token.
    - loader: loadTokenIcons enriches every token, keeps the order, never
      re-fetches a token that already has mutable data, and isolates a
      per-token metadata failure or empty response to that token alone.

  All generation is seeded, so runs are reproducible.
*/

'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const React = require('react')
const ReactDOMServer = require('react-dom/server')
const { seededRandom, forAll } = require('./harness')
const { randomString } = require('../support/random')
const ProfilePage = require('../../src/services/profile-page')
const ProfileTokenIcons = require('../../src/components/app-body/profile/profile-token-icons')
const viewModel = require('../../src/services/profile-token-icons')

const rng = seededRandom(20260923)

const ADDR = 'bitcoincash:qr95sy3j9xwd2ap32xkykttr4cvcu7as4y0qverfuy'
const HEX = Array.from('0123456789abcdef')
const WORD_CHARS = Array.from('abcdefghijklmnopqrstuvwxyz ')

function randomTokenId () {
  return randomString(rng, HEX, 64, 64)
}

// An optional URL: an http URL, a non-http URL, or absent.
function randomOptionalUrl () {
  const kind = rng()
  const slug = randomString(rng, WORD_CHARS, 1, 8).trim() || 'icon'
  if (kind < 0.45) return `https://example.com/${slug}.png`
  if (kind < 0.7) return `http://example.com/${slug}.png`
  if (kind < 0.85) return `ipfs://${slug}`
  return undefined
}

// A token's mutable data: absent, null, or an object with optional fields.
function randomMutableData () {
  const kind = rng()
  if (kind < 0.2) return undefined
  if (kind < 0.35) return null

  const data = {}
  if (rng() < 0.8) data.tokenIcon = randomOptionalUrl()
  if (rng() < 0.8) data.fullSizedUrl = randomOptionalUrl()
  return data
}

function randomToken () {
  const token = { tokenId: randomTokenId() }
  if (rng() < 0.8) token.ticker = randomString(rng, WORD_CHARS, 0, 6).trim().toUpperCase()
  if (rng() < 0.8) token.name = randomString(rng, WORD_CHARS, 0, 12).trim()

  const mutableData = randomMutableData()
  if (mutableData !== undefined) token.mutableData = mutableData
  return token
}

function randomTokenList () {
  const size = Math.floor(rng() * 6)
  const tokens = []
  for (let i = 0; i < size; i++) tokens.push(randomToken())
  return tokens
}

// Independent restatements of the expected decisions.
function expectedImage (token) {
  const mutableData = token.mutableData || {}
  if (typeof mutableData.fullSizedUrl === 'string' && mutableData.fullSizedUrl.includes('http')) {
    return mutableData.fullSizedUrl
  }
  return mutableData.tokenIcon || null
}

function expectedLabel (token) {
  return token.ticker || token.name || token.tokenId
}

function renderRow (tokens) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileTokenIcons, { tokens })
  )
}

test('buildTokenIcon carries the token id and a consistent image flag', async () => {
  await forAll(
    () => randomToken(),
    (token) => {
      const icon = viewModel.buildTokenIcon(token)

      return icon.tokenId === token.tokenId &&
        icon.tooltip === token.tokenId &&
        icon.explorerUrl === `${viewModel.TOKENTIGER_BASE}${token.tokenId}` &&
        icon.label === expectedLabel(token) &&
        icon.imageUrl === expectedImage(token) &&
        icon.isJdenticon === (icon.imageUrl === null)
    },
    { label: 'profile token icon view model', samples: 1000 }
  )
})

test('buildTokenIcons maps every token in order and tolerates non-arrays', async () => {
  await forAll(
    () => randomTokenList(),
    (tokens) => {
      const icons = viewModel.buildTokenIcons(tokens)

      return Array.isArray(icons) &&
        icons.length === tokens.length &&
        icons.every((icon, i) => icon.tokenId === tokens[i].tokenId)
    },
    { label: 'profile token icon ordering', samples: 800 }
  )
})

test('buildTokenIcons treats a non-array input as an empty list', async () => {
  await forAll(
    () => [undefined, null, 'not-a-list', 42, {}][Math.floor(rng() * 5)],
    (value) => {
      const icons = viewModel.buildTokenIcons(value)
      return Array.isArray(icons) && icons.length === 0
    },
    { label: 'profile token icon non-array input', samples: 300 }
  )
})

test('building and rendering the same tokens is deterministic', async () => {
  await forAll(
    () => randomTokenList(),
    (tokens) => {
      const first = viewModel.buildTokenIcons(tokens)
      const second = viewModel.buildTokenIcons(tokens)
      return JSON.stringify(first) === JSON.stringify(second) &&
        renderRow(first) === renderRow(second)
    },
    { label: 'profile token icon determinism', samples: 500 }
  )
})

test('the rendered row has exactly one link per token', async () => {
  await forAll(
    () => randomTokenList(),
    (tokens) => {
      const icons = viewModel.buildTokenIcons(tokens)
      const html = renderRow(icons)
      const links = (html.match(/data-token-id=/g) || []).length
      return links === icons.length
    },
    { label: 'profile token icon render count', samples: 500 }
  )
})

test('ProfileTokenIcon renders nothing for a missing token', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ProfileTokenIcons.ProfileTokenIcon, { token: null })
  )

  assert.equal(html, '')
})

test('loadTokenIcons enriches every token and isolates per-token failures', async () => {
  await forAll(
    () => randomTokenList(),
    async (tokens) => {
      // Plan each token: tokens that already carry mutable data must not be
      // fetched; the rest either succeed, fail, or return no data.
      const plans = tokens.map((token) => {
        if (token.mutableData) return { kind: 'prefetched' }
        const roll = rng()
        if (roll < 0.2) return { kind: 'fail' }
        if (roll < 0.4) return { kind: 'null' }
        return { kind: 'ok', imageUrl: `https://example.com/${token.tokenId.slice(0, 8)}.png` }
      })

      const fetched = []
      const tokenSource = {
        async listTokens () {
          return tokens
        },
        async getTokenData (tokenId) {
          fetched.push(tokenId)
          const plan = plans[tokens.findIndex((token) => token.tokenId === tokenId)]
          if (plan.kind === 'fail') throw new Error('metadata unavailable')
          if (plan.kind === 'null') return null
          return { mutableData: { tokenIcon: plan.imageUrl } }
        }
      }

      const page = new ProfilePage({ addr: ADDR, tokenSource })
      await page.loadTokenIcons()
      await page.loadTokenData()
      const icons = page.getTokenIcons()
      if (icons.length !== tokens.length) return false

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const plan = plans[i]
        const icon = icons[i]

        if (icon.tokenId !== token.tokenId) return false

        if (plan.kind === 'prefetched') {
          if (icon.imageUrl !== expectedImage(token)) return false
          if (fetched.includes(token.tokenId)) return false
        } else if (plan.kind === 'ok') {
          if (icon.imageUrl !== plan.imageUrl) return false
        } else if (!icon.isJdenticon) {
          return false
        }
      }

      return true
    },
    { label: 'profile token icon loader', samples: 500 }
  )
})

test('loadTokenIcons shows no icons when the token list is not an array', async () => {
  await forAll(
    () => [undefined, null, 'not-a-list', 42][Math.floor(rng() * 4)],
    async (value) => {
      const tokenSource = {
        async listTokens () {
          return value
        }
      }
      const page = new ProfilePage({ addr: ADDR, tokenSource })

      await page.loadTokenIcons()

      return Array.isArray(page.getTokenIcons()) && page.getTokenIcons().length === 0
    },
    { label: 'profile token icon non-array list', samples: 200 }
  )
})
