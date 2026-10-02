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

module.exports = {
  listTokens,
  resolveTokens,
  applyTokenIcons,
  loadTokenIcons,
  loadTokenData
}
