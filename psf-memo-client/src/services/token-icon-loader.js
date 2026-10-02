/*
  SLP token icon loading shared by the profile and account page controllers.

  Both pages show the SLP tokens held by an address in a sidebar. Loading
  happens in two phases: list the tokens and build the icons immediately (the
  token ID is the tooltip), then resolve each token's genesis name and
  mutable-data record and rebuild. A missing token source or a failed lookup is
  silent, and a per-token resolution failure leaves that token unchanged.

  The page supplies its own token source, address, and change listener; this
  module owns the loading algorithm so the two controllers do not duplicate it.
*/

const { buildTokenIcons } = require('./profile-token-icons')
const { resolveTokenData } = require('./token-mutable-data')

// List the tokens held by an address. A missing source or a failed lookup
// yields no tokens rather than an error.
async function listTokens (tokenSource, address) {
  if (!tokenSource || typeof tokenSource.listTokens !== 'function' || !address) {
    return []
  }

  try {
    const tokens = await tokenSource.listTokens(address)
    return Array.isArray(tokens) ? tokens : []
  } catch (err) {
    return []
  }
}

// Resolve each token's genesis name and mutable-data record through the source.
// Tokens that already carry that data, or whose lookup fails, pass through
// unchanged.
async function resolveTokens (tokenSource, tokens) {
  if (!Array.isArray(tokens) || tokens.length === 0) return tokens
  if (!tokenSource || typeof tokenSource.getTokenData !== 'function') return tokens

  return Promise.all(tokens.map(async (token) => {
    if (!token || token.genesisName || token.mutableData) return token
    try {
      const tokenData = await resolveTokenData(tokenSource, token.tokenId)
      if (!tokenData) return token
      return {
        ...token,
        genesisName: tokenData.name || null,
        mutableData: tokenData.mutableData || null
      }
    } catch (err) {
      return token
    }
  }))
}

// Store the tokens and their view models on the page and notify its listener
// so the shell can re-render. A destroyed page does not notify.
function applyTokenIcons (page, tokens) {
  page.tokens = tokens
  page.tokenIcons = buildTokenIcons(tokens)
  if (!page.destroyed && page.onTokenIconsChange) page.onTokenIconsChange(page.tokenIcons)
  return page.tokenIcons
}

// Phase one: list the page's tokens and build their icons.
async function loadTokenIcons (page, address) {
  return applyTokenIcons(page, await listTokens(page.tokenSource, address))
}

// Phase two: resolve the loaded tokens' data and rebuild their icons. Leaves
// the icons untouched when there are no tokens or no token-data source.
async function loadTokenData (page) {
  if (!Array.isArray(page.tokens) || page.tokens.length === 0) return page.tokenIcons
  if (!page.tokenSource || typeof page.tokenSource.getTokenData !== 'function') return page.tokenIcons
  return applyTokenIcons(page, await resolveTokens(page.tokenSource, page.tokens))
}

// Only the two phase entry points are public; the list/resolve/apply steps are
// implementation details shared by them.
module.exports = {
  loadTokenIcons,
  loadTokenData
}

// mutate4javascript-manifest-begin
// {"version":1,"tested_at":"2026-10-02T16:08:48.151Z","module_hash":"59c796697610d5933f845ab67902a40a848e3c847b4ef9bde21b893c51f33020","functions":[{"id":"func/listTokens","name":"listTokens","line":19,"end_line":30,"hash":"0e9449da81d9cf396910a5910cbfbac07059fb419f7b85c47c3f2040f8109407"},{"id":"func/resolveTokens","name":"resolveTokens","line":35,"end_line":53,"hash":"0abbdf6c7b7dd551e5b54cb2d66c3c87b78fd264922ddff0c465db55dd7c6a1b"},{"id":"func/applyTokenIcons","name":"applyTokenIcons","line":57,"end_line":62,"hash":"fa47a089ba34a6d8063d791cf570ded983d711370af79e0868da58baf4f12aba"},{"id":"func/loadTokenIcons","name":"loadTokenIcons","line":65,"end_line":67,"hash":"181bc776372352508a96850f338e160901dc095d18eeb1beb641b81faeba70e7"},{"id":"func/loadTokenData","name":"loadTokenData","line":71,"end_line":75,"hash":"c9d95f5bb48621b17574c88f223ad8a8f9812b676e3ad2f4cfb546601d51f69c"}]}
// mutate4javascript-manifest-end
